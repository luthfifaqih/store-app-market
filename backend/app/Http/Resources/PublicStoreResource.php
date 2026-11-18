<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicStoreResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'name' => $this['name'],
            'address' => $this['address'],
            'phone' => $this['phone'],
            'whatsapp' => $this['whatsapp'],
            'hours' => $this['hours'] ?? config('store.hours'),
            'info_bar' => $this['info_bar'] ?? config('store.info_bar'),
            'promo_ends_at' => $this['promo_ends_at'] ?? config('store.promo_ends_at'),
            'transfer' => [
                'bank' => $this['transfer_bank'],
                'account' => $this['transfer_account'],
                'holder' => $this['transfer_holder'],
            ],
        ];
    }
}
