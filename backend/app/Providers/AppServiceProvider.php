<?php

namespace App\Providers;

use App\Models\Banner;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\PriceTier;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Services\CatalogCache;
use App\Services\StoreProfile;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(StoreProfile::class);
    }

    public function boot(): void
    {
        foreach (['catalog' => 120, 'cart' => 120, 'cart-create' => 12, 'checkout' => 8, 'tracking' => 15, 'proof' => 6, 'login' => 8] as $name => $count) {
            RateLimiter::for($name, fn (Request $request): Limit => Limit::perMinute($count)->by($request->ip()));
        }

        foreach ([
            Category::class => ['categories', 'products'],
            Product::class => ['products'],
            ProductUnit::class => ['products'],
            PriceTier::class => ['products'],
            DeliveryZone::class => ['zones'],
            Banner::class => ['banners'],
        ] as $model => $groups) {
            $invalidate = static fn () => CatalogCache::invalidateAfterCommit(...$groups);
            $model::saved($invalidate);
            $model::deleted($invalidate);
        }
    }
}
