<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentReviewRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:terverifikasi,ditolak'],
        ];
    }
}
