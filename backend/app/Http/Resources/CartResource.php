<?php

namespace App\Http\Resources;

use App\Models\ProductUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $units = ProductUnit::query()->with('product.category')->whereKey(array_keys($this->items))->get()->keyBy('id');
        $items = [];
        foreach ($this->items as $unitId => $quantity) {
            $unit = $units->get($unitId);
            $product = $unit?->product;
            $items[] = [
                'product_id' => $product?->id,
                'image_url' => $product?->image_path ? Storage::disk('public')->url($product->image_path) : $product?->image_url,
                'stock' => $unit?->stock ?? '0.000',
                'active' => (bool) ($unit?->active && $product?->active && $product?->category?->active),
                'unit_price' => $unit?->price,
                'product_unit_id' => $unitId,
                'product_name' => $unit?->product?->name ?? 'Produk tidak tersedia',
                'unit_name' => $unit?->name ?? '',
                'quantity' => $quantity,
                'fractional' => $unit?->fractional ?? false,
            ];
        }

        return ['items' => $items];
    }

    public function withResponse(Request $request, JsonResponse $response): void
    {
        $response->headers->set('Cache-Control', 'private, no-store');
    }
}
