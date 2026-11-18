<?php

namespace App\Http\Controllers;

use App\Http\Requests\AdminListRequest;
use App\Http\Requests\ProductRequest;
use App\Http\Requests\StockMovementListRequest;
use App\Http\Requests\StockRequest;
use App\Http\Requests\UnitRequest;
use App\Http\Requests\ZoneRequest;
use App\Http\Resources\MovementResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\UnitResource;
use App\Http\Resources\ZoneResource;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminCatalogController extends Controller
{
    public function products(AdminListRequest $request): AnonymousResourceCollection
    {
        return ProductResource::collection(Product::query()->with('category', 'units.tiers')
            ->when($request->filled('search'), fn ($query) => $query->where('name', 'like', '%'.$request->validated('search').'%'))
            ->when($request->validated('category_id'), fn ($query, $id) => $query->where('category_id', $id))
            ->latest('id')->paginate(12));
    }

    public function createProduct(ProductRequest $request): ProductResource
    {
        return new ProductResource(Product::create($this->productData($request))->load('category', 'units'));
    }

    public function updateProduct(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($this->productData($request));

        return new ProductResource($product->load('category', 'units.tiers'));
    }

    private function productData(ProductRequest $request): array
    {
        $data = $request->safe()->except('category');
        if (empty($data['category_id'])) {
            $data['category_id'] = Category::firstOrCreate(['name' => $request->validated('category')])->id;
        }

        return $data;
    }

    public function product(Product $product): ProductResource
    {
        return new ProductResource($product->load('category', 'units.tiers'));
    }

    public function deleteProduct(Product $product): Response
    {
        $product->update(['active' => false]);

        return response()->noContent();
    }

    public function unit(Product $product, ProductUnit $unit): UnitResource
    {
        return new UnitResource($unit->load('tiers'));
    }

    public function deleteUnit(Product $product, ProductUnit $unit): Response
    {
        $unit->update(['active' => false]);

        return response()->noContent();
    }

    public function createUnit(UnitRequest $request, Product $product): UnitResource
    {
        return $this->saveUnit($request, $product, null);
    }

    public function updateUnit(UnitRequest $request, Product $product, ProductUnit $unit): UnitResource
    {
        return $this->saveUnit($request, $product, $unit);
    }

    private function saveUnit(UnitRequest $request, Product $product, ?ProductUnit $unit): UnitResource
    {
        $data = $request->safe()->except('tiers');
        $tiers = $request->validated('tiers');
        $thresholds = [];
        foreach ($tiers as &$tier) {
            $threshold = bcadd((string) $tier['min_quantity'], '0', 3);
            if (isset($thresholds[$threshold]) || (! $data['fractional'] && bccomp($threshold, (string) (int) $threshold, 3) !== 0)) {
                throw ValidationException::withMessages(['tiers' => 'Batas grosir harus unik dan sesuai jenis satuan.']);
            }
            $thresholds[$threshold] = true;
            $tier['min_quantity'] = $threshold;
        }
        unset($tier);
        usort($tiers, fn (array $left, array $right): int => bccomp($left['min_quantity'], $right['min_quantity'], 3));
        $previousPrice = $data['price'];
        foreach ($tiers as $tier) {
            if ($tier['price'] > $previousPrice) {
                throw ValidationException::withMessages(['tiers' => 'Harga grosir tidak boleh naik saat jumlah bertambah.']);
            }
            $previousPrice = $tier['price'];
        }

        $updated = DB::transaction(function () use ($product, $unit, $data, $tiers): ProductUnit {
            $locked = $unit ? $product->units()->lockForUpdate()->findOrFail($unit->id) : $product->units()->make(['stock' => 0]);
            if ($unit && $locked->fractional !== (bool) $data['fractional']) {
                throw ValidationException::withMessages(['fractional' => 'Jenis satuan yang sudah dibuat tidak dapat diubah.']);
            }
            $locked->fill($data)->save();
            $locked->tiers()->delete();
            $locked->tiers()->createMany($tiers);

            return $locked->load('tiers');
        }, 3);

        return new UnitResource($updated);
    }

    public function adjust(StockRequest $request, ProductUnit $unit, StockService $stock): MovementResource
    {
        $delta = bcadd((string) $request->validated('delta'), '0', 3);
        if (bccomp($delta, '0', 3) === 0) {
            throw ValidationException::withMessages(['delta' => 'Perubahan stok harus selain nol.']);
        }
        $movement = $stock->adjust($unit, $delta, $request->user(), $request->validated('note'));

        return new MovementResource($movement->load('unit.product', 'user'));
    }

    public function movements(StockMovementListRequest $request): AnonymousResourceCollection
    {
        return MovementResource::collection(StockMovement::query()->with('unit.product', 'user')
            ->when($request->validated('unit_id'), fn ($query, $unit) => $query->where('product_unit_id', $unit))
            ->when($request->filled('search'), fn ($query) => $query->whereRelation('unit.product', 'name', 'like', '%'.$request->validated('search').'%'))
            ->when($request->validated('reason'), fn ($query, $reason) => $query->where('reason', $reason))
            ->latest('id')->paginate(20));
    }

    public function zones(): AnonymousResourceCollection
    {
        return ZoneResource::collection(DeliveryZone::query()->orderBy('name')->get());
    }

    public function createZone(ZoneRequest $request): ZoneResource
    {
        return new ZoneResource(DeliveryZone::create($request->validated()));
    }

    public function updateZone(ZoneRequest $request, DeliveryZone $zone): ZoneResource
    {
        $zone->update($request->validated());

        return new ZoneResource($zone);
    }

    public function zone(DeliveryZone $zone): ZoneResource
    {
        return new ZoneResource($zone);
    }

    public function deleteZone(DeliveryZone $zone): Response
    {
        $zone->update(['active' => false]);

        return response()->noContent();
    }
}
