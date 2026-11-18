<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CatalogRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:80'],
            'category_id' => ['nullable', 'integer', 'min:1'],
            'unit' => ['sometimes', 'string', 'max:80'],
            'min_price' => ['sometimes', 'integer', 'between:0,100000000'],
            'max_price' => ['sometimes', 'integer', 'between:0,100000000'],
            'sort' => ['sometimes', 'in:default,newest,name_asc,name_desc,price_asc,price_desc,bestsellers'],
            'stock' => ['sometimes', 'in:available,sold-out'],
            'wholesale' => ['sometimes', 'boolean'],
            'exclude' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'between:1,50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
