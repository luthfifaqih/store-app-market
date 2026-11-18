<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PriceTier;
use App\Models\ProductUnit;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestStorefrontTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_shelves_filter_availability_wholesale_and_completed_sales(): void
    {
        $first = ProductUnit::factory()->create(['stock' => '12.000']);
        $anotherUnit = ProductUnit::factory()->create(['product_id' => $first->product_id, 'name' => 'pak', 'stock' => '3.000']);
        $second = ProductUnit::factory()->create(['stock' => '0.000']);
        $pendingOnly = ProductUnit::factory()->create(['stock' => 3]);
        PriceTier::factory()->create(['product_unit_id' => $first->id, 'min_quantity' => '3.000', 'price' => 11000]);
        $completed = Order::factory()->create(['status' => OrderStatus::Completed, 'completed_at' => now()->subDay()]);
        $secondSale = Order::factory()->create(['status' => OrderStatus::Completed, 'completed_at' => now()->subDays(2)]);
        $pending = Order::factory()->create();
        $expired = Order::factory()->create(['status' => OrderStatus::Completed, 'completed_at' => now()->subDays(31)]);
        foreach ([[$completed, $first], [$completed, $anotherUnit], [$secondSale, $first], [$completed, $second], [$pending, $pendingOnly], [$expired, $pendingOnly]] as [$order, $unit]) {
            OrderItem::factory()->create(['order_id' => $order->id, 'product_unit_id' => $unit->id]);
        }

        $this->getJson('/api/products?sort=bestsellers')->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $first->product_id)->assertJsonPath('data.1.id', $second->product_id);
        $this->getJson('/api/products?stock=sold-out')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $second->product_id);
        $this->getJson('/api/products?wholesale=1&stock=available')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $first->product_id);
        $this->getJson('/api/products?stock=available&exclude='.$first->product_id)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $pendingOnly->product_id);
        $this->getJson('/api/catalog/sitemap?names=1')->assertOk()->assertJsonPath('data.0.name', $first->product->name);
    }

    public function test_facets_and_price_filters_use_visible_units_on_the_same_product(): void
    {
        $unit = ProductUnit::factory()->create(['name' => 'kg', 'price' => 12000]);
        ProductUnit::factory()->create(['product_id' => $unit->product_id, 'name' => 'karung', 'price' => 80000]);
        ProductUnit::factory()->create(['product_id' => $unit->product_id, 'name' => 'lama', 'active' => false, 'price' => 150000]);
        $this->getJson('/api/catalog/facets')->assertOk()->assertJsonPath('data.max_price', 80000)
            ->assertJsonPath('data.categories.'.$unit->product->category_id, 1)->assertJsonCount(2, 'data.units');
        $this->getJson('/api/products?unit=kg&min_price=10000&max_price=15000')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/products?unit=kg&min_price=70000')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_store_profile_returns_public_contact_and_transfer_fields_only(): void
    {
        Setting::query()->create(['key' => 'store_profile', 'value' => [
            'name' => 'Toko Uji', 'transfer_bank' => 'Bank Uji', 'transfer_account' => '0012345678',
            'transfer_holder' => 'Toko Uji', 'hours' => '08.00–16.00', 'info_bar' => 'Antar sampai jam 16.00',
            'promo_ends_at' => '2026-12-01T00:00:00+07:00', 'internal_note' => 'Hanya staf',
        ]]);

        $this->getJson('/api/store')->assertOk()
            ->assertJsonPath('data.name', 'Toko Uji')
            ->assertJsonPath('data.promo_ends_at', '2026-12-01T00:00:00+07:00')
            ->assertJsonPath('data.hours', '08.00–16.00')
            ->assertJsonPath('data.info_bar', 'Antar sampai jam 16.00')
            ->assertJsonPath('data.transfer.account', '0012345678')
            ->assertJsonMissingPath('data.internal_note');
    }

    public function test_cart_exposes_live_unit_fields_and_checkout_saves_customer_note(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => '4.500', 'price' => 11500]);
        $token = $this->postJson('/api/cart')->assertCreated()->json('token');
        $headers = ['X-Cart-Token' => $token];
        $this->postJson('/api/cart/items', ['product_unit_id' => $unit->id, 'quantity' => '1.250'], $headers)
            ->assertSuccessful()->assertJsonPath('data.items.0.product_id', $unit->product_id)
            ->assertJsonPath('data.items.0.unit_price', 11500)->assertJsonPath('data.items.0.active', true);
        $unit->update(['price' => 12000]);
        $this->getJson('/api/cart', $headers)->assertOk()->assertJsonPath('data.items.0.unit_price', 12000);
        $payload = [
            'customer_name' => 'Pembeli Uji', 'phone' => '081234567890', 'fulfillment' => 'pickup', 'payment_method' => 'cod',
            'note' => 'Ambil saat siang',
        ];
        $this->postJson('/api/orders', [...$payload, 'note' => str_repeat('a', 251)], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('note');
        $order = $this->postJson('/api/orders', $payload, $headers)->assertCreated()
            ->assertJsonPath('data.note', 'Ambil saat siang')->assertJsonPath('data.total', 15000);
        $this->postJson('/api/orders/track', ['code' => $order->json('data.code'), 'phone' => $payload['phone']])
            ->assertOk()->assertJsonPath('data.note', 'Ambil saat siang');
    }
}
