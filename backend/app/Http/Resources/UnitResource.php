<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'price' => $this->price, 'stock' => $this->stock,
            'fractional' => $this->fractional, 'active' => $this->active,
            'tiers' => $this->tiers->map->only(['min_quantity', 'price']),
        ];
    }
}
