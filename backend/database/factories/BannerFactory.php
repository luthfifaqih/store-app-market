<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class BannerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->words(4, true),
            'image_url' => 'https://example.test/banner.webp',
            'position' => 0,
            'active' => true,
        ];
    }
}
