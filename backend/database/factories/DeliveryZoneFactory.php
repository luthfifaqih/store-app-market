<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class DeliveryZoneFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => fake()->unique()->city(), 'fee' => 7000, 'minimum' => 50000, 'active' => true];
    }
}
