<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\CatalogRequest;
use App\Http\Resources\BannerResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\PublicStoreResource;
use App\Http\Resources\ZoneResource;
use App\Models\Banner;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Services\CatalogCache;
use App\Services\StoreProfile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\LengthAwarePaginator;

class CatalogController extends Controller
{
    public function __construct(private CatalogCache $cache) {}

    public function products(CatalogRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $page = (int) ($filters['page'] ?? 1);
        $perPage = (int) ($filters['per_page'] ?? 12);
        $sort = $filters['sort'] ?? 'default';
        $query = $this->withDetails($this->visibleProducts())
            ->when(array_intersect(['min_price', 'max_price', 'unit'], array_keys($filters)), fn (Builder $query) => $query->whereHas('units', fn (Builder $unit) => $unit
                ->where('active', true)
                ->when(isset($filters['unit']), fn (Builder $q) => $q->where('name', $filters['unit']))
                ->when(isset($filters['min_price']), fn (Builder $q) => $q->where('price', '>=', $filters['min_price']))
                ->when(isset($filters['max_price']), fn (Builder $q) => $q->where('price', '<=', $filters['max_price']))))
            ->when(isset($filters['q']), fn (Builder $query) => $query->where('name', 'like', '%'.$filters['q'].'%'))
            ->when(isset($filters['category_id']), fn (Builder $query) => $query->where('category_id', $filters['category_id']))
            ->when(isset($filters['category']), fn (Builder $query) => $query->whereRelation('category', 'name', $filters['category']))
            ->when(isset($filters['exclude']), fn (Builder $query) => $query->whereKeyNot($filters['exclude']))
            ->when(($filters['stock'] ?? '') === 'available', fn (Builder $query) => $query->whereHas('units', fn (Builder $unit) => $unit->where('active', true)->where('stock', '>', 0)))
            ->when(($filters['stock'] ?? '') === 'sold-out', fn (Builder $query) => $query->whereDoesntHave('units', fn (Builder $unit) => $unit->where('active', true)->where('stock', '>', 0)))
            ->when($request->boolean('wholesale'), fn (Builder $query) => $query->whereHas('units', fn (Builder $unit) => $unit->where('active', true)->whereHas('tiers')));

        match ($sort) {
            'bestsellers' => $query->joinSub($this->bestSellers(), 'sales', fn ($join) => $join->on('sales.product_id', '=', 'products.id'))
                ->select('products.*')->orderByDesc('sales.line_orders'),
            'newest' => $query->latest('id'),
            'name_asc' => $query->orderBy('name'),
            'name_desc' => $query->orderByDesc('name'),
            'price_asc', 'price_desc' => $query
                ->withMin(['units as lowest_price' => fn (Builder $units) => $units->where('active', true)], 'price')
                ->orderBy('lowest_price', $sort === 'price_asc' ? 'asc' : 'desc'),
            default => $query,
        };

        $load = function () use ($query, $perPage, $page): array {
            $products = $query->orderBy('products.id')->paginate($perPage, page: $page);

            return [$this->resourceData(ProductResource::collection($products->getCollection())), $products->total()];
        };
        $cacheable = $page <= 5 && in_array($perPage, [8, 12], true)
            && $sort !== 'bestsellers'
            && ! array_intersect(['q', 'category_id', 'category', 'stock', 'wholesale', 'exclude', 'min_price', 'max_price', 'unit'], array_keys($filters));
        [$products, $total] = $cacheable
            ? $this->cache->remember('products', "list:{$sort}:{$page}:{$perPage}", $load)
            : $load();

        return JsonResource::collection(
            (new LengthAwarePaginator($products, $total, $perPage, $page, ['path' => $request->url()]))->withQueryString()
        );
    }

    public function product(string $product): JsonResource
    {
        $data = $this->cache->remember('products', "detail:{$product}",
            fn () => $this->resourceData(new ProductResource($this->withDetails($this->visibleProducts())->findOrFail($product))));

        return new JsonResource($data);
    }

    public function store(StoreProfile $profile): PublicStoreResource
    {
        return new PublicStoreResource($profile->get());
    }

    private function bestSellers(): Builder
    {
        return OrderItem::query()->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('product_units', 'product_units.id', '=', 'order_items.product_unit_id')
            ->where('orders.status', OrderStatus::Completed->value)
            ->where('orders.completed_at', '>=', now()->subDays(30))
            ->where('orders.completed_at', '<=', now())
            ->selectRaw('product_units.product_id, COUNT(DISTINCT orders.id) AS line_orders')
            ->groupBy('product_units.product_id');
    }

    public function sitemapProducts(Request $request): JsonResponse
    {
        if ($request->boolean('names')) {
            $products = $this->cache->remember('products', 'sitemap-names', fn () => $this->visibleProducts()
                ->orderBy('id')->limit(49998)->get(['id', 'name'])->toArray());

            return response()->json(['data' => $products]);
        }

        $ids = $this->cache->remember('products', 'sitemap', fn () => $this->visibleProducts()
            ->orderBy('id')->limit(49998)->pluck('id')->all());

        return response()->json(['data' => $ids]);
    }

    private function visibleProducts(): Builder
    {
        return Product::query()
            ->where('active', true)
            ->whereRelation('category', 'active', true)
            ->whereHas('units', fn (Builder $units) => $units->where('active', true));
    }

    private function withDetails(Builder $query): Builder
    {
        return $query->with(['category', 'units' => fn ($units) => $units->where('active', true)->with('tiers')->orderBy('id')]);
    }

    public function facets(): JsonResponse
    {
        return response()->json(['data' => $this->cache->remember('products', 'facets-v1', function (): array {
            $units = ProductUnit::query()->where('active', true)
                ->whereIn('product_id', $this->visibleProducts()->select('id'));

            return [
                'categories' => $this->visibleProducts()->selectRaw('category_id, COUNT(*) AS total')->groupBy('category_id')->pluck('total', 'category_id')->all(),
                'units' => (clone $units)->distinct()->orderBy('name')->pluck('name')->all(),
                'max_price' => (int) $units->max('price'),
            ];
        })]);
    }

    public function categories(): AnonymousResourceCollection
    {
        return JsonResource::collection($this->cache->remember('categories', 'active',
            fn () => $this->resourceData(CategoryResource::collection(Category::query()->where('active', true)->orderBy('name')->get()))));
    }

    public function banners(): AnonymousResourceCollection
    {
        return JsonResource::collection($this->cache->remember('banners', 'active',
            fn () => $this->resourceData(BannerResource::collection(Banner::query()->where('active', true)->orderBy('position')->orderBy('id')->get()))));
    }

    public function zones(): AnonymousResourceCollection
    {
        return JsonResource::collection($this->cache->remember('zones', 'active',
            fn () => $this->resourceData(ZoneResource::collection(DeliveryZone::query()->where('active', true)->orderBy('name')->get()))));
    }

    private function resourceData(JsonResource $resource): array
    {
        return $resource->response()->getData(true)['data'];
    }
}
