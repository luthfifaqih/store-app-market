<?php

use App\Http\Controllers\AdminBannerController;
use App\Http\Controllers\AdminCatalogController;
use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AdminPriceController;
use App\Http\Controllers\AdminProductImageController;
use App\Http\Controllers\AdminSalesController;
use App\Http\Controllers\AdminSessionController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\GuestCartController;
use App\Http\Controllers\GuestOrderController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\PrivateResponse;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

Route::prefix('cart')->middleware('throttle:cart')->group(function (): void {
    Route::post('/', [GuestCartController::class, 'store'])->middleware('throttle:cart-create');
    Route::get('/', [GuestCartController::class, 'show']);
    Route::post('items', [GuestCartController::class, 'add']);
    Route::put('items/{unit}', [GuestCartController::class, 'update'])->whereNumber('unit');
    Route::delete('items/{unit}', [GuestCartController::class, 'destroy'])->whereNumber('unit');
});

Route::middleware('throttle:catalog')->group(function (): void {
    Route::get('catalog/sitemap', [CatalogController::class, 'sitemapProducts']);
    Route::get('products', [CatalogController::class, 'products']);
    Route::get('products/{product}', [CatalogController::class, 'product'])->whereNumber('product');
    Route::get('banners', [CatalogController::class, 'banners']);
    Route::get('catalog/facets', [CatalogController::class, 'facets']);
    Route::get('delivery-zones', [CatalogController::class, 'zones']);
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('store', [CatalogController::class, 'store']);
    Route::get('shipping-zones', [CatalogController::class, 'zones']);
    Route::post('orders/quote', [GuestOrderController::class, 'quote'])->middleware(PrivateResponse::class);
});
Route::post('orders', [GuestOrderController::class, 'checkout'])->middleware([PrivateResponse::class, 'throttle:checkout']);
Route::post('orders/track', [GuestOrderController::class, 'track'])->middleware([PrivateResponse::class, 'throttle:tracking']);
Route::post('orders/proof', [GuestOrderController::class, 'proof'])->middleware([PrivateResponse::class, 'throttle:proof']);

Route::prefix('admin')->middleware(PrivateResponse::class)->group(function (): void {
    Route::post('login', [AdminSessionController::class, 'login'])->middleware(['web', 'throttle:login']);
    Route::middleware([EnsureFrontendRequestsAreStateful::class, 'auth:sanctum', EnsureAdmin::class])->scopeBindings()->group(function (): void {
        Route::get('dashboard', [AdminSalesController::class, 'dashboard']);
        Route::get('dashboard/analytics', [AdminSalesController::class, 'analytics']);
        Route::get('reports/sales', [AdminSalesController::class, 'report']);
        Route::get('reports/sales/export', [AdminSalesController::class, 'export']);
        Route::get('settings', [AdminSettingsController::class, 'show']);
        Route::put('settings', [AdminSettingsController::class, 'update']);
        Route::patch('units/prices', [AdminPriceController::class, 'update']);
        Route::get('me', [AdminSessionController::class, 'show']);
        Route::apiResource('categories', AdminCategoryController::class)->except('update');
        Route::put('categories/{category}', [AdminCategoryController::class, 'update']);
        Route::apiResource('banners', AdminBannerController::class)->except('update');
        Route::put('banners/{banner}', [AdminBannerController::class, 'update']);
        Route::get('session', [AdminSessionController::class, 'show']);
        Route::post('logout', [AdminSessionController::class, 'logout']);
        Route::get('products', [AdminCatalogController::class, 'products']);
        Route::post('products', [AdminCatalogController::class, 'createProduct']);
        Route::put('products/{product}', [AdminCatalogController::class, 'updateProduct']);
        Route::get('products/{product}', [AdminCatalogController::class, 'product']);
        Route::delete('products/{product}', [AdminCatalogController::class, 'deleteProduct']);
        Route::post('products/{product}/image', [AdminProductImageController::class, 'store']);
        Route::get('products/{product}/units/{unit}', [AdminCatalogController::class, 'unit']);
        Route::delete('products/{product}/units/{unit}', [AdminCatalogController::class, 'deleteUnit']);
        Route::post('products/{product}/units', [AdminCatalogController::class, 'createUnit']);
        Route::put('products/{product}/units/{unit}', [AdminCatalogController::class, 'updateUnit']);
        Route::post('units/{unit}/stock', [AdminCatalogController::class, 'adjust']);
        Route::get('low-stock', [AdminSalesController::class, 'lowStock']);
        Route::get('stock-movements', [AdminCatalogController::class, 'movements']);
        Route::get('shipping-zones', [AdminCatalogController::class, 'zones']);
        Route::post('shipping-zones', [AdminCatalogController::class, 'createZone']);
        Route::put('shipping-zones/{zone}', [AdminCatalogController::class, 'updateZone']);
        Route::get('delivery-zones', [AdminCatalogController::class, 'zones']);
        Route::post('delivery-zones', [AdminCatalogController::class, 'createZone']);
        Route::get('delivery-zones/{zone}', [AdminCatalogController::class, 'zone']);
        Route::put('delivery-zones/{zone}', [AdminCatalogController::class, 'updateZone']);
        Route::delete('delivery-zones/{zone}', [AdminCatalogController::class, 'deleteZone']);
        Route::get('orders', [AdminOrderController::class, 'index']);
        Route::get('orders/{order}', [AdminOrderController::class, 'show']);
        Route::patch('orders/{order}/status', [AdminOrderController::class, 'status']);
        Route::patch('orders/{order}/payment', [AdminOrderController::class, 'review']);
        Route::get('orders/{order}/proof', [AdminOrderController::class, 'proof']);
    });
});
