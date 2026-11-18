<?php

namespace App\Http\Requests;

use App\Support\IndonesianPhone;

class CheckoutRequest extends QuoteRequest
{
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'customer_name' => ['required', 'string', 'max:120'],
            'phone' => $this->phoneRules(),
            'address' => ['nullable', 'required_if:fulfillment,delivery', 'string', 'max:500'],
            'note' => ['nullable', 'string', 'max:250'],
            'payment_method' => ['required', 'in:cod,transfer'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $phone = $this->input('phone');
        if (is_string($phone)) {
            $this->merge(['phone' => IndonesianPhone::normalize($phone)]);
        }
    }

    private function phoneRules(): array
    {
        return ['required', 'regex:/^628\d{7,11}$/'];
    }
}
