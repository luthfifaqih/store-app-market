<?php

namespace App\Services;

use App\Models\ProductUnit;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BulkPriceService
{
    public function update(array $prices): int
    {
        return DB::transaction(function () use ($prices): int {
            $units = ProductUnit::query()
                ->whereKey(array_column($prices, 'unit_id'))->orderBy('id')->lockForUpdate()
                ->get()->load(['product', 'tiers'])->keyBy('id');

            foreach ($prices as $index => $change) {
                $unit = $units->get($change['unit_id']);
                if (! $unit) {
                    throw ValidationException::withMessages(["prices.{$index}.unit_id" => 'Satuan produk tidak ditemukan.']);
                }
                $name = $unit->product->name.' ('.$unit->name.')';
                if ($unit->price !== (int) $change['expected_price']) {
                    throw ValidationException::withMessages(["prices.{$index}.expected_price" => "Harga {$name} sudah berubah. Muat ulang daftar harga."]);
                }
                if ($unit->tiers->max('price') > $change['price']) {
                    throw ValidationException::withMessages(["prices.{$index}.price" => "Harga eceran {$name} tidak boleh di bawah harga grosir tertinggi."]);
                }
            }

            foreach ($prices as $change) {
                $units->get($change['unit_id'])->updateQuietly(['price' => $change['price']]);
            }

            CatalogCache::invalidateAfterCommit('products');

            return count($prices);
        }, 3);
    }
}
