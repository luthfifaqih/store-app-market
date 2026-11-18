<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class QuoteRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'items' => [$this->headers->has('X-Cart-Token') ? 'prohibited' : 'required', 'array', 'min:1', 'max:100'],
            'items.*' => ['required', 'array:product_unit_id,quantity'],
            'items.*.product_unit_id' => ['required', 'integer', 'min:1', 'distinct'],
            'items.*.quantity' => CartItemRequest::quantityRules(),
            'fulfillment' => ['required', 'in:pickup,delivery'],
            'shipping_zone_id' => ['nullable', 'required_if:fulfillment,delivery', 'integer', 'min:1'],
        ];
    }
}
