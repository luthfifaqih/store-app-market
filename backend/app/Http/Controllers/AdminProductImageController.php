<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductImageRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AdminProductImageController extends Controller
{
    public function store(ProductImageRequest $request, Product $product): ProductResource
    {
        $disk = Storage::disk('public');
        $path = $request->file('image')->store('product-images', 'public');
        abort_unless($path, 503, 'Foto produk gagal disimpan.');

        try {
            [$updated, $previous] = DB::transaction(function () use ($product, $path): array {
                $locked = Product::query()->lockForUpdate()->findOrFail($product->id);
                $previous = $locked->image_path;
                $locked->update(['image_path' => $path]);

                return [$locked, $previous];
            }, 3);
        } catch (Throwable $exception) {
            $disk->delete($path);
            throw $exception;
        }

        if ($previous) {
            $disk->delete($previous);
        }

        return new ProductResource($updated->load('category', 'units.tiers'));
    }
}
