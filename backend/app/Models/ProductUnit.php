<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductUnit extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'name', 'price', 'stock', 'fractional', 'active'];

    protected function casts(): array
    {
        return ['stock' => 'decimal:3', 'fractional' => 'boolean', 'active' => 'boolean', 'price' => 'integer'];
    }

    public function scopeInActiveCatalog(Builder $query): Builder
    {
        return $query->where('active', true)
            ->whereRelation('product', 'active', true)->whereRelation('product.category', 'active', true);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function tiers(): HasMany
    {
        return $this->hasMany(PriceTier::class)->orderBy('min_quantity');
    }
}
