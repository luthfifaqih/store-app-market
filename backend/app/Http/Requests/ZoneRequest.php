<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ZoneRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'fee' => ['required', 'integer', 'between:0,100000000'],
            'minimum' => ['required', 'integer', 'between:0,100000000'],
            'active' => ['required', 'boolean'],
        ];
    }
}
