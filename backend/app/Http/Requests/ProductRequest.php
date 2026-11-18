<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'category_id' => ['nullable', 'required_without:category', 'integer', 'exists:categories,id'],
            'category' => ['nullable', 'required_without:category_id', 'prohibits:category_id', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image_url' => ['nullable', 'url:http,https', 'max:500'],
            'active' => ['required', 'boolean'],
        ];
    }
}
