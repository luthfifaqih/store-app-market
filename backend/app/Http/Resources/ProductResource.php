<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name,
            'category_id' => $this->category_id,
            'category' => $this->category->name,
            'description' => $this->description,
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : $this->image_url,
            'active' => $this->active,
            'units' => UnitResource::collection($this->whenLoaded('units')),
        ];
    }
}
