<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryZone extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'fee', 'minimum', 'active'];

    protected function casts(): array
    {
        return ['fee' => 'integer', 'minimum' => 'integer', 'active' => 'boolean'];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'shipping_zone_id');
    }
}
