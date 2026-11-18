<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StockService
{
    public function validateForPurchase(?ProductUnit $unit, ?Product $product, bool $categoryActive, string $quantity): void
    {
        if (! $unit?->active || ! $product?->active || ! $categoryActive) {
            throw ValidationException::withMessages(['items' => 'Salah satu produk sudah tidak tersedia.']);
        }
        if (bccomp($quantity, '0', 3) <= 0 || bccomp($quantity, '99999.999', 3) > 0) {
            throw ValidationException::withMessages(['items' => 'Jumlah per satuan produk harus antara 0,001 dan 99.999,999.']);
        }
        if (! $unit->fractional && bccomp($quantity, (string) (int) $quantity, 3) !== 0) {
            throw ValidationException::withMessages(['items' => "Jumlah {$product->name} ({$unit->name}) harus bulat."]);
        }
        if (bccomp($quantity, $unit->stock, 3) > 0) {
            throw ValidationException::withMessages(['items' => "Stok {$product->name} ({$unit->name}) tersisa {$unit->stock}."]);
        }
    }

    public function adjust(ProductUnit $unit, string $delta, User $user, ?string $note): StockMovement
    {
        return DB::transaction(function () use ($unit, $delta, $user, $note): StockMovement {
            $locked = ProductUnit::query()->lockForUpdate()->findOrFail($unit->id);

            $movement = $this->record($locked, $delta, 'penyesuaian', user: $user, note: $note);
            CatalogCache::invalidateAfterCommit('products');

            return $movement;
        }, 3);
    }

    public function record(ProductUnit $lockedUnit, string $delta, string $reason, ?Order $order = null, ?User $user = null, ?string $note = null): StockMovement
    {
        $balance = bcadd($lockedUnit->stock, $delta, 3);
        if (bccomp($balance, '0', 3) < 0 || bccomp($balance, '9999999999.999', 3) > 0) {
            throw ValidationException::withMessages(['stock' => 'Perubahan melebihi batas stok yang tersedia.']);
        }

        if (! $lockedUnit->fractional && $reason === 'penyesuaian' && bccomp($delta, (string) (int) $delta, 3) !== 0) {
            throw ValidationException::withMessages(['stock' => 'Satuan ini memerlukan perubahan stok bilangan bulat.']);
        }

        $lockedUnit->updateQuietly(['stock' => $balance]);

        return StockMovement::create([
            'product_unit_id' => $lockedUnit->id, 'order_id' => $order?->id,
            'user_id' => $user?->id, 'delta' => $delta, 'balance' => $balance,
            'reason' => $reason, 'note' => $note,
        ]);
    }
}
