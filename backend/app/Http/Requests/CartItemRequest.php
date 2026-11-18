<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CartItemRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'product_unit_id' => [$this->isMethod('POST') ? 'required' : 'prohibited', 'integer', 'min:1'],
            'quantity' => self::quantityRules(),
        ];
    }

    public static function quantityRules(): array
    {
        return ['required', 'regex:/^\d{1,5}(?:\.\d{1,3})?$/', 'numeric', 'min:0.001'];
    }
}
