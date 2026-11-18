<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'delta' => ['required', 'numeric', 'regex:/^-?\d{1,9}(?:\.\d{1,3})?$/', 'not_in:0'],
            'note' => ['required', 'string', 'max:250'],
        ];
    }
}
