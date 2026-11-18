<?php

namespace Database\Factories;

use App\Models\ProductUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockMovementFactory extends Factory
{
    public function definition(): array
    {
        return ['product_unit_id' => ProductUnit::factory(), 'delta' => 0, 'balance' => 0, 'reason' => 'stok_awal'];
    }
}
