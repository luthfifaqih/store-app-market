<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockMovementListRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'search' => ['sometimes', 'string', 'max:100'],
            'reason' => ['sometimes', Rule::in(['stok_awal', 'pesanan', 'pembatalan', 'penyesuaian'])],
            'unit_id' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
