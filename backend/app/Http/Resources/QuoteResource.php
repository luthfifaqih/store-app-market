<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...collect($this->resource)->only(['items', 'subtotal', 'shipping_fee', 'total'])->all(),
        ];
    }
}
