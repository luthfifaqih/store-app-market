<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Cart;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private StockService $stock) {}

    public function quote(array $data, ?Cart $cart = null): array
    {
        $data = $this->withCartLines($data, $cart);
        $units = $this->units(array_column($data['items'], 'product_unit_id'), false);

        return $this->calculate($data, $units, false);
    }

    public function checkout(array $data, ?Cart $cart = null): Order
    {
        return DB::transaction(function () use ($data, $cart): Order {
            $lockedCart = $cart ? Cart::query()->lockForUpdate()->findOrFail($cart->id) : null;
            $data = $this->withCartLines($data, $lockedCart);
            $units = $this->units(array_column($data['items'], 'product_unit_id'), true);
            $quote = $this->calculate($data, $units, true);
            $order = Order::create([
                ...collect($data)->only(['customer_name', 'phone', 'fulfillment', 'payment_method'])->all(),
                ...collect($quote)->except('items')->all(),
                'note' => $data['note'] ?? null,
                'address' => $data['fulfillment'] === 'delivery' ? $data['address'] : null,
                'code' => 'PS-'.Str::upper(bin2hex(random_bytes(8))),
                'status' => OrderStatus::Pending,
                'payment_status' => 'menunggu',
            ]);

            $order->items()->createMany($quote['items']);
            foreach ($quote['items'] as $item) {
                $this->stock->record($units->get($item['product_unit_id']), '-'.$item['quantity'], 'pesanan', $order);
            }

            $lockedCart?->update(['items' => []]);
            CatalogCache::invalidateAfterCommit('products');

            return $order->load('items');
        }, 3);
    }

    public function transition(Order $order, OrderStatus $next, User $user): Order
    {
        return DB::transaction(function () use ($order, $next, $user): Order {
            $locked = Order::query()->with('items')->lockForUpdate()->findOrFail($order->id);
            if ($locked->status === $next) {
                return $locked;
            }

            if (! in_array($next, $locked->status->next($locked->fulfillment), true)) {
                throw ValidationException::withMessages(['status' => 'Perubahan status ini tidak diizinkan.']);
            }

            if ($next === OrderStatus::Confirmed && $locked->payment_method === 'transfer' && $locked->payment_status !== 'terverifikasi') {
                throw ValidationException::withMessages(['status' => 'Verifikasi pembayaran transfer sebelum konfirmasi pesanan.']);
            }

            if ($next === OrderStatus::Cancelled) {
                $units = $this->units($locked->items->pluck('product_unit_id')->all(), true);
                foreach ($locked->items as $item) {
                    $this->stock->record($units->get($item->product_unit_id), $item->quantity, 'pembatalan', $locked, $user);
                }
                CatalogCache::invalidateAfterCommit('products');
            }

            $changes = ['status' => $next];
            if ($next === OrderStatus::Completed) {
                $changes['completed_at'] = now();
                if ($locked->payment_method === 'cod') {
                    $changes['payment_status'] = 'terverifikasi';
                }
            }
            $locked->update($changes);

            return $locked;
        }, 3);
    }

    private function withCartLines(array $data, ?Cart $cart): array
    {
        if ($cart) {
            $data['items'] = $cart->lines();
        }
        if (empty($data['items'])) {
            throw ValidationException::withMessages(['items' => 'Keranjang masih kosong.']);
        }

        return $data;
    }

    public function priceLine(ProductUnit $unit, string $quantity): array
    {
        $tier = $unit->tiers->last(fn ($tier): bool => bccomp($quantity, $tier->min_quantity, 3) >= 0);
        $price = $tier?->price ?? $unit->price;

        return [
            'unit_price' => $price,
            'line_total' => (int) bcadd(bcmul($quantity, (string) $price, 3), '0.5', 0),
        ];
    }

    private function units(array $ids, bool $lock): Collection
    {
        $query = ProductUnit::query()->whereKey($ids)->orderBy('id');
        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->get()->keyBy('id');
    }

    private function calculate(array $data, Collection $units, bool $lock): array
    {
        $productQuery = Product::query()->whereKey($units->pluck('product_id')->unique()->all())->orderBy('id');
        if ($lock) {
            $productQuery->sharedLock();
        }
        $products = $productQuery->get()->keyBy('id');
        $categoryQuery = Category::query()->whereKey($products->pluck('category_id')->unique()->all())->orderBy('id');
        if ($lock) {
            $categoryQuery->sharedLock();
        }
        $categories = $categoryQuery->pluck('active', 'id');
        $units->load('tiers');
        $items = [];
        $subtotal = 0;
        foreach ($data['items'] as $line) {
            $unit = $units->get($line['product_unit_id']);
            $product = $unit ? $products->get($unit->product_id) : null;
            $quantity = bcadd((string) $line['quantity'], '0', 3);
            $this->stock->validateForPurchase($unit, $product, (bool) $categories->get($product?->category_id), $quantity);
            $price = $this->priceLine($unit, $quantity);
            $subtotal += $price['line_total'];
            $items[] = [
                'product_unit_id' => $unit->id, 'product_name' => $product->name, 'unit_name' => $unit->name,
                'quantity' => $quantity, ...$price,
            ];
        }

        $zone = null;
        if ($data['fulfillment'] === 'delivery') {
            $query = DeliveryZone::query()->where('active', true);
            if ($lock) {
                $query->sharedLock();
            }
            $zone = $query->find($data['shipping_zone_id']);
            if (! $zone) {
                throw ValidationException::withMessages(['shipping_zone_id' => 'Zona pengiriman sudah tidak tersedia.']);
            }
            if ($subtotal < $zone->minimum) {
                $minimum = number_format($zone->minimum, 0, ',', '.');
                throw ValidationException::withMessages(['shipping_zone_id' => "Minimum belanja zona ini Rp {$minimum}."]);
            }
        }

        $fee = $zone?->fee ?? 0;

        return [
            'items' => $items, 'subtotal' => $subtotal, 'shipping_fee' => $fee, 'total' => $subtotal + $fee,
            'shipping_zone_id' => $zone?->id, 'zone_name' => $zone?->name,
        ];
    }
}
