<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\ProductUnit;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function __construct(private StockService $stock) {}

    public function create(): array
    {
        $token = bin2hex(random_bytes(32));
        $cart = Cart::create(['token_hash' => hash('sha256', $token), 'items' => []]);

        return [$cart, $token];
    }

    public function find(?string $token): Cart
    {
        abort_unless($token && preg_match('/\A[a-f0-9]{64}\z/', $token), 404, 'Keranjang tidak ditemukan.');
        $cart = Cart::query()->where('token_hash', hash('sha256', $token))->first();
        abort_unless($cart, 404, 'Keranjang tidak ditemukan.');

        return $cart;
    }

    public function change(Cart $cart, int $unitId, ?string $quantity, bool $increment = false): Cart
    {
        return DB::transaction(function () use ($cart, $unitId, $quantity, $increment): Cart {
            $locked = Cart::query()->lockForUpdate()->findOrFail($cart->id);
            $items = $locked->items;
            if ($quantity === null) {
                unset($items[$unitId]);
            } else {
                $quantity = bcadd($quantity, $increment ? ($items[$unitId] ?? '0') : '0', 3);
                if (! isset($items[$unitId]) && count($items) >= 100) {
                    throw ValidationException::withMessages(['items' => 'Keranjang maksimal berisi 100 satuan produk berbeda.']);
                }

                $unit = ProductUnit::query()->with('product.category')->find($unitId);
                $product = $unit?->product;
                $this->stock->validateForPurchase($unit, $product, $product?->category?->active ?? false, $quantity);
                $items[$unitId] = $quantity;
            }
            $locked->update(['items' => $items]);

            return $locked;
        }, 3);
    }
}
