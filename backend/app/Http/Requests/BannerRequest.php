<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BannerRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'image_url' => ['required', 'url:http,https', 'max:500'],
            'link_url' => ['nullable', 'url:http,https', 'max:500'],
            'position' => ['required', 'integer', 'between:0,65535'],
            'active' => ['required', 'boolean'],
        ];
    }
}
