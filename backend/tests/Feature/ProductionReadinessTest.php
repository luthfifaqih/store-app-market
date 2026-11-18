<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Banner;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\PriceTier;
use App\Models\ProductUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductionReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_cache_skips_product_queries_and_is_invalidated_after_stock_changes(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => '2.000']);
        PriceTier::factory()->create(['product_unit_id' => $unit->id]);
        $path = '/api/products/'.$unit->product_id;
        $this->getJson($path)->assertOk()->assertJsonPath('data.units.0.stock', '2.000');
        $this->getJson('/api/products')->assertOk()->assertJsonPath('data.0.units.0.stock', '2.000');

        DB::enableQueryLog();
        try {
            DB::flushQueryLog();
            $this->getJson($path)->assertOk();
            $this->getJson('/api/products')->assertOk();
            $this->assertSame([], DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }

        $order = $this->postJson('/api/orders', [
            'items' => [['product_unit_id' => $unit->id, 'quantity' => '1']],
            'customer_name' => 'Uji', 'phone' => '08123456789', 'fulfillment' => 'pickup', 'payment_method' => 'cod',
        ])->assertCreated()->json('data.id');
        $this->getJson($path)->assertOk()->assertJsonPath('data.units.0.stock', '1.000');
        $this->getJson('/api/products')->assertOk()->assertJsonPath('data.0.units.0.stock', '1.000');
        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/admin/orders/{$order}/status", ['status' => OrderStatus::Cancelled->value])->assertOk();
        $this->getJson($path)->assertOk()->assertJsonPath('data.units.0.stock', '2.000');
    }

    public function test_repeated_catalog_requests_work_with_the_database_cache_driver(): void
    {
        config(['cache.default' => 'database']);
        $unit = ProductUnit::factory()->create(['stock' => '3.500']);
        PriceTier::factory()->create(['product_unit_id' => $unit->id]);
        Banner::factory()->create();
        DeliveryZone::factory()->create();

        $legacyKey = 'catalog:products:'.hash('sha256', 'list:default:1:8');
        $version = Cache::get('catalog:version:products', 'initial');
        Cache::put($legacyKey, ['version' => $version, 'data' => [ProductUnit::all(), 1]], 60);

        foreach (['/api/products?per_page=8', '/api/products/'.$unit->product_id, '/api/categories', '/api/banners', '/api/delivery-zones', '/api/catalog/sitemap'] as $path) {
            $cold = $this->getJson($path)->assertOk();
            $this->getJson($path)->assertOk()->assertExactJson($cold->json());
        }

        $this->getJson('/api/products?per_page=8')->assertOk()
            ->assertJsonPath('data.0.units.0.stock', '3.500')->assertJsonPath('meta.per_page', 8);
    }

    public function test_sitemap_and_cached_references_follow_catalog_visibility(): void
    {
        $unit = ProductUnit::factory()->create();
        $banner = Banner::factory()->create();
        $this->getJson('/api/catalog/sitemap')->assertOk()->assertJsonPath('data.0', $unit->product_id);
        $this->getJson('/api/categories')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/banners')->assertOk()->assertJsonPath('data.0.id', $banner->id);

        $this->actingAs(User::factory()->admin()->create());
        $this->deleteJson("/api/admin/categories/{$unit->product->category_id}")->assertNoContent();
        $this->deleteJson("/api/admin/banners/{$banner->id}")->assertNoContent();
        $this->getJson('/api/catalog/sitemap')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/categories')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/banners')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_search_eager_loading_does_not_add_queries_per_product(): void
    {
        $unit = ProductUnit::factory()->create();
        $unit->product->update(['name' => 'Beras A']);
        PriceTier::factory()->create(['product_unit_id' => $unit->id]);

        DB::enableQueryLog();
        try {
            DB::flushQueryLog();
            $this->getJson('/api/products?q=Beras')->assertOk()->assertJsonCount(1, 'data');
            $before = count(DB::getQueryLog());

            ProductUnit::factory()->count(5)->create()->each(function (ProductUnit $unit): void {
                $unit->product->update(['name' => 'Beras '.$unit->id]);
                PriceTier::factory()->create(['product_unit_id' => $unit->id]);
            });

            DB::flushQueryLog();
            $this->getJson('/api/products?q=Beras')->assertOk()->assertJsonCount(6, 'data');
            $this->assertGreaterThan(0, $before);
            $this->assertSame($before, count(DB::getQueryLog()));
        } finally {
            DB::disableQueryLog();
        }
    }

    public function test_private_responses_are_not_cacheable_and_untrusted_forwarded_ips_cannot_bypass_throttling(): void
    {
        $order = Order::factory()->create();
        $tracked = $this->postJson('/api/orders/track', ['code' => $order->code, 'phone' => $order->phone])->assertOk();
        $this->assertTrue($tracked->headers->hasCacheControlDirective('no-store'));
        $tracked->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $authenticated = $this->actingAs(User::factory()->admin()->create())->getJson('/api/admin/orders')->assertOk();
        $this->assertTrue($authenticated->headers->hasCacheControlDirective('no-store'));

        config(['trustedproxy.proxies' => []]);
        for ($attempt = 1; $attempt <= 14; $attempt++) {
            $this->postJson('/api/orders/track', [], ['X-Forwarded-For' => "203.0.113.{$attempt}"])->assertUnprocessable();
        }
        $this->postJson('/api/orders/track', [], ['X-Forwarded-For' => '203.0.113.254'])->assertTooManyRequests();
    }

    public function test_credentialed_cors_only_accepts_the_configured_storefront(): void
    {
        config(['cors.allowed_origins' => ['https://toko.example.test']]);
        $preflight = [
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,x-xsrf-token',
        ];
        $this->call('OPTIONS', '/api/admin/login', server: $preflight + ['HTTP_ORIGIN' => 'https://toko.example.test'])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://toko.example.test')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
        $untrusted = $this->call('OPTIONS', '/api/admin/login', server: $preflight + ['HTTP_ORIGIN' => 'https://other.example.test'])
            ->assertNoContent();
        $this->assertNotSame('https://other.example.test', $untrusted->headers->get('Access-Control-Allow-Origin'));
    }
}
