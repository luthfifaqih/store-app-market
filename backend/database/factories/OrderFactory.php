<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return ['code' => 'PS-'.strtoupper(bin2hex(random_bytes(8))), 'customer_name' => fake()->name(), 'phone' => '628123456789', 'fulfillment' => 'pickup', 'subtotal' => 12500, 'shipping_fee' => 0, 'total' => 12500, 'payment_method' => 'cod'];
    }
}
