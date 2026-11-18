<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductUnitFactory extends Factory
{
    public function definition(): array
    {
        return ['product_id' => Product::factory(), 'name' => 'kg', 'price' => 12500, 'stock' => '0.000', 'fractional' => true, 'active' => true];
    }
}
