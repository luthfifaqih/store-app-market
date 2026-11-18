<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return collect($this->resource)->only([
            'name', 'address', 'phone', 'whatsapp', 'low_stock_threshold',
            'transfer_bank', 'transfer_account', 'transfer_holder',
        ])->all();
    }
}
