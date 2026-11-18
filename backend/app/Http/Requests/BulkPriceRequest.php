<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkPriceRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'prices' => ['required', 'array', 'min:1', 'max:100'],
            'prices.*' => ['required', 'array:unit_id,price,expected_price'],
            'prices.*.unit_id' => ['required', 'integer', 'min:1', 'distinct'],
            'prices.*.price' => ['required', 'integer', 'between:1,100000000'],
            'prices.*.expected_price' => ['required', 'integer', 'between:1,100000000'],
        ];
    }
}
