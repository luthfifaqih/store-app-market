<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80', Rule::unique('product_units')->where('product_id', $this->route('product')->id)->ignore($this->route('unit')?->id)],
            'price' => ['required', 'integer', 'between:1,100000000'],
            'fractional' => ['required', 'boolean'],
            'active' => ['required', 'boolean'],
            'tiers' => ['present', 'array', 'max:12'],
            'tiers.*' => ['required', 'array:min_quantity,price'],
            'tiers.*.min_quantity' => ['required', 'numeric', 'regex:/^\d{1,5}(?:\.\d{1,3})?$/', 'min:0.001'],
            'tiers.*.price' => ['required', 'integer', 'min:1', 'lte:price'],
        ];
    }
}
