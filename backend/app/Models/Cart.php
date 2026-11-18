<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $fillable = ['token_hash', 'items'];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return ['items' => 'array'];
    }

    public function lines(): array
    {
        $lines = [];
        foreach ($this->items as $unitId => $quantity) {
            $lines[] = ['product_unit_id' => $unitId, 'quantity' => $quantity];
        }

        return $lines;
    }
}
