<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'actor' => $this->whenLoaded('user', fn () => $this->user?->name),
            'id' => $this->id, 'product_unit_id' => $this->product_unit_id,
            'unit_name' => $this->unit->name, 'product_name' => $this->unit->product->name,
            'order_id' => $this->order_id, 'delta' => $this->delta, 'balance' => $this->balance,
            'reason' => $this->reason, 'note' => $this->note, 'created_at' => $this->created_at->toISOString(),
        ];
    }
}
