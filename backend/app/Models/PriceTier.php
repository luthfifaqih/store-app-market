<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PriceTier extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['min_quantity', 'price', 'product_unit_id'];

    protected function casts(): array
    {
        return ['min_quantity' => 'decimal:3', 'price' => 'integer'];
    }
}
