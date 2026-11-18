<?php

namespace App\Http\Requests;

class ProofRequest extends TrackingRequest
{
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'proof' => ['required', 'file', 'mimetypes:image/jpeg,image/png,application/pdf', 'max:2048'],
        ];
    }
}
