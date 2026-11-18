<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\ProductUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderItemFactory extends Factory
{
    public function definition(): array
    {
        return ['order_id' => Order::factory(), 'product_unit_id' => ProductUnit::factory(), 'product_name' => 'Beras', 'unit_name' => 'kg', 'quantity' => 1, 'unit_price' => 12500, 'line_total' => 12500];
    }
}
