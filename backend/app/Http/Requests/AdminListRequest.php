<?php

namespace App\Http\Requests;

use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdminListRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(OrderStatus::class)],
            'search' => ['sometimes', 'string', 'max:100'],
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'payment_method' => ['sometimes', Rule::in(['cod', 'transfer'])],
            'payment_status' => ['sometimes', Rule::in(['menunggu', 'ditinjau', 'terverifikasi', 'ditolak'])],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
