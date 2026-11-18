<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class LowStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product->name,
            'unit_name' => $this->name,
            'stock' => $this->stock,
            'image_url' => $this->product->image_path ? Storage::disk('public')->url($this->product->image_path) : $this->product->image_url,
        ];
    }
}
