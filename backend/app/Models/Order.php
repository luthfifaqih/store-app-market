<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'customer_name', 'phone', 'status', 'fulfillment', 'shipping_zone_id', 'zone_name', 'address', 'note', 'subtotal', 'shipping_fee', 'total', 'payment_method', 'payment_status', 'proof_path', 'completed_at'];

    protected function casts(): array
    {
        return ['status' => OrderStatus::class, 'subtotal' => 'integer', 'shipping_fee' => 'integer', 'total' => 'integer', 'completed_at' => 'datetime'];
    }

    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'shipping_zone_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
