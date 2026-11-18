<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalesOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'customer_name' => $this->customer_name,
            'payment_method' => $this->payment_method, 'fulfillment' => $this->fulfillment,
            'subtotal' => $this->subtotal, 'shipping_fee' => $this->shipping_fee, 'total' => $this->total,
            'completed_at' => $this->completed_at?->toISOString(),
        ];
    }
}
