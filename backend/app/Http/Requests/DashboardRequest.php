<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DashboardRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'sales_period' => ['sometimes', Rule::in(['24h', '7d', '1m', '1y'])],
            'order_period' => ['sometimes', Rule::in(['today', '7d', 'all'])],
            'top_period' => ['sometimes', Rule::in(['7d', '30d'])],
            'category_id' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
