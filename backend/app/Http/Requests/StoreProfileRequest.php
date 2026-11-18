<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'address' => ['present', 'nullable', 'string', 'max:500'],
            'phone' => ['present', 'nullable', 'regex:/^\+?[0-9 ()-]{6,25}$/'],
            'whatsapp' => ['present', 'nullable', 'regex:/^[1-9][0-9]{7,14}$/'],
            'low_stock_threshold' => ['required', 'integer', 'between:0,10000'],
            'transfer_bank' => ['present', 'nullable', 'string', 'max:80', 'required_with:transfer_account,transfer_holder'],
            'transfer_account' => ['present', 'nullable', 'regex:/^[0-9]{4,40}$/', 'required_with:transfer_bank,transfer_holder'],
            'transfer_holder' => ['present', 'nullable', 'string', 'max:120', 'required_with:transfer_bank,transfer_account'],
        ];
    }
}
