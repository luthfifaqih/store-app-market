<?php

namespace Tests\Feature;

use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\PriceTier;
use App\Models\ProductUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_wholesale_rounding_delivery_and_snapshot_are_calculated_on_the_server(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => '20', 'price' => 12500]);
        PriceTier::factory()->create(['product_unit_id' => $unit->id, 'min_quantity' => 5, 'price' => 11111]);
        PriceTier::factory()->create(['product_unit_id' => $unit->id, 'min_quantity' => 10, 'price' => 10001]);
        $zone = DeliveryZone::factory()->create(['minimum' => 50000, 'fee' => 7000]);
        $payload = [
            ...$this->cart($unit, '10.500'), 'fulfillment' => 'delivery', 'shipping_zone_id' => $zone->id,
            'address' => 'Jalan Pasar 1', 'subtotal' => 1, 'shipping_fee' => 1, 'total' => 1,
        ];

        $this->postJson('/api/orders/quote', $payload)->assertOk()
            ->assertJsonPath('data.items.0.unit_price', 10001)
            ->assertJsonPath('data.subtotal', 105011)
            ->assertJsonPath('data.shipping_fee', 7000)
            ->assertJsonPath('data.total', 112011);
        $this->assertSame('20.000', $unit->refresh()->stock);

        $created = $this->postJson('/api/orders', $payload)->assertCreated()->assertJsonPath('data.total', 112011);
        $code = $created->json('data.code');
        $productName = $unit->product->name;
        $unit->product->update(['name' => 'Nama baru']);
        $unit->update(['name' => 'ons', 'price' => 99999]);
        $this->postJson('/api/orders/track', ['code' => strtolower($code), 'phone' => '+62 812-3456-789'])
            ->assertOk()->assertJsonPath('data.items.0.product_name', $productName)
            ->assertJsonPath('data.items.0.unit_name', 'kg')->assertJsonPath('data.items.0.unit_price', 10001);
        $this->postJson('/api/orders/track', ['code' => $code, 'phone' => '081999999999'])->assertNotFound();
    }

    public function test_stock_decrements_and_a_failed_cart_leaves_stock_and_orders_unchanged(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => '3.250']);
        $other = ProductUnit::factory()->create(['stock' => '1']);
        $this->postJson('/api/orders', $this->cart($unit, '1.125'))->assertCreated();
        $this->assertSame('2.125', $unit->refresh()->stock);
        $this->assertDatabaseHas('stock_movements', ['product_unit_id' => $unit->id, 'reason' => 'pesanan', 'delta' => -1.125]);

        $cart = $this->cart($unit, '1');
        $cart['items'][] = ['product_unit_id' => $other->id, 'quantity' => '2'];
        $this->postJson('/api/orders', $cart)->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->assertSame('2.125', $unit->refresh()->stock);
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_cancellation_restores_stock_once_even_if_the_product_is_inactive(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => '3']);
        $orderId = $this->postJson('/api/orders', $this->cart($unit, '1.250'))->assertCreated()->json('data.id');
        $unit->update(['active' => false]);

        $this->actingAs($this->admin());
        $this->patchJson("/api/admin/orders/{$orderId}/status", ['status' => 'dibatalkan'])->assertOk();
        $this->patchJson("/api/admin/orders/{$orderId}/status", ['status' => 'dibatalkan'])->assertOk();
        $this->patchJson("/api/admin/orders/{$orderId}/status", ['status' => 'dikonfirmasi'])->assertUnprocessable();

        $this->assertSame('3.000', $unit->refresh()->stock);
        $this->assertDatabaseCount('stock_movements', 2);
        $this->assertDatabaseHas('stock_movements', ['order_id' => $orderId, 'reason' => 'pembatalan', 'delta' => 1.25]);
    }

    public function test_admin_endpoints_require_an_authenticated_admin(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $this->postJson('/api/admin/products', [])->assertUnauthorized();

        $guest = User::factory()->create();
        $this->postJson('/api/admin/login', ['email' => $guest->email, 'password' => 'password'])->assertUnprocessable();
        $this->actingAs($guest)->getJson('/api/admin/orders')->assertForbidden();
        $this->postJson('/api/admin/products', [])->assertForbidden();

        $this->actingAs($this->admin())->getJson('/api/admin/orders')->assertOk();
    }

    public function test_admin_login_and_logout(): void
    {
        $admin = $this->admin();
        $this->postJson('/api/admin/login', ['email' => $admin->email, 'password' => 'password'])->assertOk();
        $this->getJson('/api/admin/session')->assertOk()->assertJsonPath('data.email', $admin->email);
        $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/admin/logout')->assertNoContent();
        $this->assertGuest('web');
    }

    public function test_payment_proof_is_private_and_transfer_requires_verification(): void
    {
        Storage::fake('local');
        $unit = ProductUnit::factory()->create(['stock' => 2]);
        $result = $this->postJson('/api/orders', [...$this->cart($unit, '1'), 'payment_method' => 'transfer'])->assertCreated();
        $id = $result->json('data.id');
        $credentials = ['code' => $result->json('data.code'), 'phone' => '08123456789'];
        $this->postJson('/api/orders/proof', [...$credentials, 'proof' => UploadedFile::fake()->create('bukti.txt', 1, 'text/plain')])
            ->assertUnprocessable()->assertJsonValidationErrors('proof');
        $file = UploadedFile::fake()->createWithContent('bukti.pdf', "%PDF-1.4\n%%EOF");
        $this->post('/api/orders/proof', [...$credentials, 'proof' => $file], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('data.payment_status', 'ditinjau')->assertJsonMissingPath('data.proof_path');
        Storage::disk('local')->assertExists(Order::findOrFail($id)->proof_path);
        $this->getJson("/api/admin/orders/{$id}/proof")->assertUnauthorized();

        $this->actingAs($this->admin());
        $this->patchJson("/api/admin/orders/{$id}/status", ['status' => 'dikonfirmasi'])->assertUnprocessable();
        $this->get("/api/admin/orders/{$id}/proof")->assertOk();
        $this->patchJson("/api/admin/orders/{$id}/payment", ['decision' => 'terverifikasi'])->assertOk();
        $this->patchJson("/api/admin/orders/{$id}/status", ['status' => 'dikonfirmasi'])->assertOk();
    }

    public function test_zone_minimum_and_integer_unit_are_enforced(): void
    {
        $unit = ProductUnit::factory()->create(['stock' => '5', 'fractional' => false]);
        $zone = DeliveryZone::factory()->create();
        $this->postJson('/api/orders', $this->cart($unit, '1.500'))->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->postJson('/api/orders', [
            ...$this->cart($unit, '1'), 'fulfillment' => 'delivery', 'shipping_zone_id' => $zone->id, 'address' => 'Jalan Pasar',
        ])->assertUnprocessable()->assertJsonValidationErrors('shipping_zone_id');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_admin_can_manage_units_and_stock_with_audit_history(): void
    {
        $this->actingAs($this->admin());
        $product = $this->postJson('/api/admin/products', ['name' => 'Beras', 'category' => 'Bahan Pokok', 'active' => true])
            ->assertCreated()->json('data.id');
        $unit = $this->postJson("/api/admin/products/{$product}/units", [
            'name' => 'kg', 'price' => 10000, 'fractional' => true, 'active' => true,
            'tiers' => [['min_quantity' => 5, 'price' => 9500]],
        ])->assertCreated()->json('data.id');
        $this->postJson("/api/admin/units/{$unit}/stock", ['delta' => '20.125', 'note' => 'Barang datang'])
            ->assertCreated()->assertJsonPath('data.balance', '20.125');
        $this->getJson('/api/products')->assertOk()->assertJsonPath('data.0.units.0.stock', '20.125');
        $this->getJson('/api/admin/stock-movements')->assertOk()->assertJsonPath('data.0.note', 'Barang datang');
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function cart(ProductUnit $unit, string $quantity): array
    {
        return [
            'items' => [['product_unit_id' => $unit->id, 'quantity' => $quantity]],
            'fulfillment' => 'pickup', 'payment_method' => 'cod',
            'customer_name' => 'Sari', 'phone' => '08123456789',
        ];
    }
}
