<?php

namespace App\Http\Requests;

use App\Support\IndonesianPhone;
use Illuminate\Foundation\Http\FormRequest;

class TrackingRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'code' => ['required', 'regex:/^PS-[A-F0-9]{16}$/'],
            'phone' => $this->phoneRules(),
        ];
    }

    protected function prepareForValidation(): void
    {
        $phone = $this->input('phone');
        if (is_string($phone)) {
            $this->merge(['phone' => IndonesianPhone::normalize($phone)]);
        }
        if (is_string($this->input('code'))) {
            $this->merge(['code' => strtoupper($this->input('code'))]);
        }
    }

    private function phoneRules(): array
    {
        return ['required', 'regex:/^628\d{7,11}$/'];
    }
}
