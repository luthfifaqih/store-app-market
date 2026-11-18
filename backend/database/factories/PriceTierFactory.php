<?php

namespace Database\Factories;

use App\Models\ProductUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

class PriceTierFactory extends Factory
{
    public function definition(): array
    {
        return ['product_unit_id' => ProductUnit::factory(), 'min_quantity' => 5, 'price' => 11000];
    }
}
