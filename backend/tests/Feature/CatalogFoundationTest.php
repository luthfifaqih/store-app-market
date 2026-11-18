<?php

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\StockMovement;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_management_and_upload_require_an_admin(): void
    {
        $product = Product::factory()->create();
        $endpoints = [
            ['GET', '/api/admin/me'],
            ['GET', '/api/admin/categories'],
            ['POST', '/api/admin/products'],
            ['POST', "/api/admin/products/{$product->id}/image"],
            ['DELETE', "/api/admin/products/{$product->id}"],
            ['GET', '/api/admin/delivery-zones'],
            ['GET', '/api/admin/banners'],
        ];
        foreach ($endpoints as [$method, $path]) {
            $this->json($method, $path)->assertUnauthorized();
        }

        $this->actingAs(User::factory()->create());
        foreach ($endpoints as [$method, $path]) {
            $this->json($method, $path)->assertForbidden();
        }

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->getJson('/api/admin/me')->assertOk()->assertJsonPath('data.id', $admin->id);
    }

    public function test_admin_can_create_update_and_archive_products_and_units(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $categoryId = $this->postJson('/api/admin/categories', ['name' => 'Beras', 'active' => true])
            ->assertCreated()->json('data.id');
        $payload = ['name' => 'Beras Merah', 'category_id' => $categoryId, 'active' => true];
        $id = $this->postJson('/api/admin/products', $payload)->assertCreated()
            ->assertJsonPath('data.category', 'Beras')->json('data.id');

        $this->putJson("/api/admin/products/{$id}", [...$payload, 'name' => 'Beras Merah Premium'])
            ->assertOk()->assertJsonPath('data.name', 'Beras Merah Premium');

        $unit = ['name' => 'kg', 'price' => 23000, 'fractional' => true, 'active' => true, 'tiers' => [
            ['min_quantity' => '5', 'price' => 21500],
        ]];
        $unitId = $this->postJson("/api/admin/products/{$id}/units", $unit)->assertCreated()->json('data.id');
        $unitPath = "/api/admin/products/{$id}/units/{$unitId}";
        $this->putJson($unitPath, [...$unit, 'price' => 22500])->assertOk()->assertJsonPath('data.price', 22500);
        $this->getJson($unitPath)->assertOk()->assertJsonPath('data.tiers.0.price', 21500);
        $other = Product::factory()->create();
        $this->getJson("/api/admin/products/{$other->id}/units/{$unitId}")->assertNotFound();

        $this->getJson("/api/products/{$id}")->assertOk()->assertJsonPath('data.units.0.id', $unitId);
        $this->deleteJson($unitPath)->assertNoContent();
        $this->getJson("/api/products/{$id}")->assertNotFound();
        $this->getJson("/api/admin/products/{$id}")->assertOk()->assertJsonPath('data.units.0.active', false);

        $this->putJson($unitPath, $unit)->assertOk();
        $this->deleteJson("/api/admin/products/{$id}")->assertNoContent();
        $this->getJson("/api/products/{$id}")->assertNotFound();
        $this->assertDatabaseHas('products', ['id' => $id, 'active' => false]);
    }

    public function test_upload_accepts_raster_images_and_replaces_the_previous_file(): void
    {
        $disk = Storage::fake('public');
        $product = Product::factory()->create();
        ProductUnit::factory()->create(['product_id' => $product->id]);
        $path = "/api/admin/products/{$product->id}/image";
        $this->actingAs(User::factory()->admin()->create());

        $this->postJson($path, ['image' => UploadedFile::fake()->create('image.svg', 1, 'image/svg+xml')])
            ->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->postJson($path, ['image' => UploadedFile::fake()->image('large.png')->size(2049)])
            ->assertUnprocessable()->assertJsonValidationErrors('image');

        $first = UploadedFile::fake()->image('beras.png');
        $this->post($path, ['image' => $first], ['Accept' => 'application/json'])->assertOk();
        $previous = $product->refresh()->image_path;
        $disk->assertExists($previous);
        $second = UploadedFile::fake()->image('beras-baru.jpg');
        $this->post($path, ['image' => $second], ['Accept' => 'application/json'])->assertOk();
        $disk->assertMissing($previous);
        $current = $product->refresh()->image_path;
        $disk->assertExists($current);
        $this->getJson("/api/products/{$product->id}")->assertOk()->assertJsonPath('data.image_url', $disk->url($current));
    }

    public function test_public_catalog_filters_sorts_and_excludes_archived_records(): void
    {
        $category = Category::factory()->create(['name' => 'Beras']);
        $other = Category::factory()->create(['name' => 'Tepung']);
        $premium = Product::factory()->for($category)->create(['name' => 'Beras Premium']);
        $economy = Product::factory()->for($category)->create(['name' => 'Beras Ekonomis']);
        $flour = Product::factory()->for($other)->create(['name' => 'Tepung Beras']);
        $premiumUnit = ProductUnit::factory()->for($premium)->create(['price' => 40000, 'stock' => 5]);
        ProductUnit::factory()->for($premium)->create(['name' => 'porsi', 'price' => 1000, 'active' => false]);
        ProductUnit::factory()->for($economy)->create(['price' => 20000]);
        ProductUnit::factory()->for($flour)->create(['price' => 12000]);
        $categoryId = $category->id;

        $this->getJson("/api/products?q=Beras&category_id={$categoryId}&sort=price_asc&per_page=1")
            ->assertOk()->assertJsonPath('data.0.id', $economy->id)->assertJsonPath('meta.total', 2);
        $this->getJson("/api/products?category_id={$categoryId}&sort=price_desc")
            ->assertOk()->assertJsonPath('data.0.id', $premium->id);
        $this->getJson('/api/products?sort=invalid')->assertUnprocessable();
        $this->getJson('/api/categories')->assertOk()->assertJsonPath('data.0.name', 'Beras');
        $this->getJson("/api/products/{$premium->id}")->assertOk()->assertJsonCount(1, 'data.units');

        $this->actingAs(User::factory()->admin()->create());
        $this->putJson("/api/admin/categories/{$categoryId}", ['name' => 'Beras & Tepung', 'active' => true])->assertOk();
        $this->getJson("/api/products/{$premium->id}")->assertOk()->assertJsonPath('data.category', 'Beras & Tepung');
        $this->deleteJson("/api/admin/categories/{$categoryId}")->assertNoContent();
        $this->getJson("/api/products/{$premium->id}")->assertNotFound();
        $this->getJson('/api/categories')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/orders/quote', [
            'fulfillment' => 'pickup',
            'items' => [['product_unit_id' => $premiumUnit->id, 'quantity' => '1']],
        ])->assertUnprocessable()->assertJsonValidationErrors('items');
    }

    public function test_admin_manages_zones_and_banners_with_public_visibility_rules(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $zone = ['name' => 'Zona Tengah', 'fee' => 7000, 'minimum' => 35000, 'active' => true];
        $zoneId = $this->postJson('/api/admin/delivery-zones', $zone)->assertCreated()->json('data.id');
        $this->putJson("/api/admin/delivery-zones/{$zoneId}", [...$zone, 'fee' => 8000])->assertOk();
        $this->getJson('/api/delivery-zones')->assertOk()->assertJsonPath('data.0.fee', 8000);
        $this->deleteJson("/api/admin/delivery-zones/{$zoneId}")->assertNoContent();
        $this->getJson('/api/delivery-zones')->assertOk()->assertJsonCount(0, 'data');

        $banner = ['title' => 'Belanja', 'image_url' => 'https://example.test/banner.webp', 'position' => 5, 'active' => true];
        $bannerId = $this->postJson('/api/admin/banners', $banner)->assertCreated()->json('data.id');
        $earlier = Banner::factory()->create(['position' => 1]);
        Banner::factory()->create(['position' => 0, 'active' => false]);
        $this->getJson('/api/banners')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.id', $earlier->id);
        $this->putJson("/api/admin/banners/{$bannerId}", [...$banner, 'position' => 0])->assertOk();
        $this->getJson('/api/banners')->assertOk()->assertJsonPath('data.0.id', $bannerId);
        $this->deleteJson("/api/admin/banners/{$bannerId}")->assertNoContent();
        $this->getJson("/api/admin/banners/{$bannerId}")->assertNotFound();
    }

    public function test_seeder_is_repeatable_and_records_initial_stock(): void
    {
        config(['store.seed_admin.email' => 'admin@example.test', 'store.seed_admin.password' => 'test-only-password']);
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', ['email' => 'admin@example.test', 'role' => 'admin']);
        $this->assertDatabaseCount('categories', 8);
        $this->assertDatabaseCount('products', 40);
        $this->assertDatabaseCount('delivery_zones', 2);
        $this->assertDatabaseCount('banners', 1);
        $this->assertDatabaseCount('settings', 1);
        $units = ProductUnit::count();
        $this->assertGreaterThan(40, $units);
        $this->assertSame($units, StockMovement::where('reason', 'stok_awal')->count());
        $this->assertDatabaseCount('price_tiers', $units * 2);
    }
}
