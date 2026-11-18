<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\DeliveryZone;
use App\Models\PriceTier;
use App\Models\ProductUnit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestCartTest extends TestCase
{
    use RefreshDatabase;

    public function test_cart_belongs_to_its_token_and_can_add_update_and_remove_units(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => '3.500']);
        $headers = $this->cartHeaders();
        $this->assertDatabaseHas('carts', ['token_hash' => hash('sha256', $headers['X-Cart-Token'])]);
        $this->assertDatabaseMissing('carts', ['token_hash' => $headers['X-Cart-Token']]);

        $line = ['product_unit_id' => $unit->id, 'quantity' => '1.125'];
        $this->postJson('/api/cart/items', $line, $headers)->assertOk()->assertJsonPath('data.items.0.quantity', '1.125');
        $this->postJson('/api/cart/items', [...$line, 'quantity' => '1'], $headers)->assertOk()
            ->assertJsonPath('data.items.0.quantity', '2.125');
        $this->postJson('/api/cart/items', [...$line, 'quantity' => '2'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('items');

        $path = "/api/cart/items/{$unit->id}";
        $this->getJson('/api/cart')->assertNotFound();
        $this->getJson('/api/cart', ['X-Cart-Token' => str_repeat('0', 64)])->assertNotFound();
        $this->getJson('/api/cart', $this->cartHeaders())->assertOk()->assertJsonCount(0, 'data.items');
        $this->getJson('/api/cart', $headers)->assertOk()->assertJsonPath('data.items.0.quantity', '2.125')
            ->assertJsonMissingPath('data.token_hash');
        $this->putJson($path, ['quantity' => '1.500'], $headers)->assertOk()->assertJsonPath('data.items.0.quantity', '1.500');
        $this->deleteJson($path, [], $headers)->assertOk()->assertJsonCount(0, 'data.items');
        $this->assertSame('3.500', $unit->refresh()->stock);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_cart_validates_unit_availability_quantity_and_stock(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => 2, 'fractional' => false]);
        $headers = $this->cartHeaders();
        $this->postJson('/api/cart/items', ['product_unit_id' => $unit->id, 'quantity' => '1.5'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->postJson('/api/cart/items', ['product_unit_id' => $unit->id, 'quantity' => '1.0001'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');
        $this->postJson('/api/cart/items', ['product_unit_id' => 999999, 'quantity' => '1'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $unit->product->category->update(['active' => false]);
        $this->postJson('/api/cart/items', ['product_unit_id' => $unit->id, 'quantity' => '1'], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->getJson('/api/cart', $headers)->assertOk()->assertJsonCount(0, 'data.items');
    }

    public function test_checkout_uses_cart_and_keeps_it_on_failure_then_consumes_it_once(): void
    {
        $headers = $this->cartHeaders();
        $unit = ProductUnit::factory()->create(['stock' => 12, 'price' => 12000]);
        PriceTier::factory()->create(['product_unit_id' => $unit->id, 'min_quantity' => 5, 'price' => 10000]);
        $zone = DeliveryZone::factory()->create(['fee' => 6000, 'minimum' => 60000]);
        $this->postJson('/api/cart/items', ['product_unit_id' => $unit->id, 'quantity' => '5.500'], $headers)->assertOk();
        $fulfillment = ['fulfillment' => 'delivery', 'shipping_zone_id' => $zone->id];
        $payload = [...$fulfillment, 'customer_name' => 'Dina', 'phone' => '08123456789', 'address' => 'Jalan Pasar', 'payment_method' => 'cod', 'total' => 1];

        $this->postJson('/api/orders/quote', $fulfillment, $headers)->assertUnprocessable()->assertJsonValidationErrors('shipping_zone_id');
        $this->postJson('/api/orders', $payload, $headers)->assertUnprocessable()->assertJsonValidationErrors('shipping_zone_id');
        $this->assertSame('12.000', $unit->refresh()->stock);
        $this->getJson('/api/cart', $headers)->assertOk()->assertJsonPath('data.items.0.quantity', '5.500');

        $zone->update(['minimum' => 50000]);
        $this->postJson('/api/orders/quote', $fulfillment, $headers)->assertOk()->assertJsonPath('data.total', 61000);
        $this->postJson('/api/orders', [...$payload, 'items' => [['product_unit_id' => $unit->id, 'quantity' => '1']]], $headers)
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $response = $this->postJson('/api/orders', $payload, $headers)->assertCreated()
            ->assertJsonPath('data.total', 61000)->assertJsonPath('data.items.0.quantity', '5.500');
        $this->assertSame('6.500', $unit->refresh()->stock);
        $this->getJson('/api/cart', $headers)->assertOk()->assertJsonCount(0, 'data.items');
        $this->postJson('/api/orders', $payload, $headers)->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->postJson('/api/orders/track', ['code' => $response->json('data.code'), 'phone' => '0812-3456-789'])
            ->assertOk()->assertJsonPath('data.status', 'pending');
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('stock_movements', 1);
        $this->assertSame([], Cart::firstOrFail()->items);
    }

    public function test_checkout_and_tracking_are_rate_limited_independently(): void
    {
        for ($attempt = 0; $attempt < 8; $attempt++) {
            $this->postJson('/api/orders', [])->assertUnprocessable();
        }
        $this->postJson('/api/orders', [])->assertTooManyRequests();

        for ($attempt = 0; $attempt < 15; $attempt++) {
            $this->postJson('/api/orders/track', [])->assertUnprocessable();
        }
        $this->postJson('/api/orders/track', [])->assertTooManyRequests();
    }

    private function cartHeaders(): array
    {
        $token = $this->postJson('/api/cart')->assertCreated()->assertJsonCount(0, 'data.items')->json('token');

        return ['X-Cart-Token' => $token];
    }
}
