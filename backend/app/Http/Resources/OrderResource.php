<?php

namespace App\Http\Resources;

use App\Services\StoreProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $store = app(StoreProfile::class)->get();

        return [
            'id' => $this->id, 'code' => $this->code, 'status' => $this->status->value,
            'customer_name' => $this->customer_name, 'phone' => $this->phone,
            'fulfillment' => $this->fulfillment, 'zone_name' => $this->zone_name, 'address' => $this->address, 'note' => $this->note,
            'subtotal' => $this->subtotal, 'shipping_fee' => $this->shipping_fee, 'total' => $this->total,
            'items' => $this->items->map->only(['product_unit_id', 'product_name', 'unit_name', 'quantity', 'unit_price', 'line_total']),
            'payment_method' => $this->payment_method, 'payment_status' => $this->payment_status,
            'has_proof' => $this->proof_path !== null, 'created_at' => $this->created_at->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'store_whatsapp' => $store['whatsapp'],
            'transfer' => $this->payment_method === 'transfer' ? [
                'bank' => $store['transfer_bank'], 'account' => $store['transfer_account'], 'holder' => $store['transfer_holder'],
            ] : null,
        ];
    }
}
