<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PriceTier;
use App\Models\ProductUnit;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_endpoints_are_protected_from_guests_and_non_admins(): void
    {
        $routes = [
            ['GET', '/api/admin/dashboard'], ['GET', '/api/admin/dashboard/analytics'],
            ['GET', '/api/admin/low-stock'], ['GET', '/api/admin/reports/sales'],
            ['GET', '/api/admin/reports/sales/export'], ['GET', '/api/admin/settings'],
            ['PUT', '/api/admin/settings'], ['PATCH', '/api/admin/units/prices'],
        ];

        foreach ($routes as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized();
        }

        $this->actingAs(User::factory()->create());
        foreach ($routes as [$method, $uri]) {
            $this->json($method, $uri)->assertForbidden();
        }
    }

    public function test_bulk_price_updates_are_atomic_and_validate_tiers_and_stale_prices(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $first = ProductUnit::factory()->create(['price' => 15000]);
        $second = ProductUnit::factory()->create(['price' => 20000]);
        PriceTier::factory()->create(['product_unit_id' => $second->id, 'price' => 18000]);
        $url = '/api/admin/units/prices';
        $changes = [
            ['unit_id' => $first->id, 'price' => 16000, 'expected_price' => 15000],
            ['unit_id' => $second->id, 'price' => 17000, 'expected_price' => 20000],
        ];

        $this->patchJson($url, ['prices' => $changes])->assertUnprocessable()->assertJsonValidationErrors('prices.1.price');
        $this->assertSame(15000, $first->refresh()->price);

        $changes[1]['price'] = 19000;
        $changes[1]['expected_price'] = 21000;
        $this->patchJson($url, ['prices' => $changes])->assertUnprocessable()->assertJsonValidationErrors('prices.1.expected_price');
        $this->assertSame(15000, $first->refresh()->price);

        $changes[1]['expected_price'] = 20000;
        $this->patchJson($url, ['prices' => $changes])->assertOk()->assertJsonPath('data.updated', 2);
        $this->assertSame(16000, $first->refresh()->price);
        $this->assertSame(19000, $second->refresh()->price);
        $this->assertSame(18000, $second->tiers()->firstOrFail()->price);
        $this->assertDatabaseCount('stock_movements', 0);
        $this->patchJson($url, ['prices' => [$changes[0], $changes[0]]])->assertUnprocessable();
    }

    public function test_dashboard_and_sales_report_use_completion_dates_and_wib_boundaries(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-17 10:00:00', 'Asia/Jakarta'));
        $this->actingAs(User::factory()->admin()->create());
        $today = $this->sale('2026-11-16 17:00:00', 27000);
        $this->sale('2026-11-16 16:59:59', 20000);
        $this->sale('2026-11-10 17:00:00', 10000);
        $this->sale('2026-11-10 16:59:59', 80000);
        $this->sale('2026-11-17 17:00:00', 90000);
        Order::factory()->create(['status' => OrderStatus::Cancelled, 'completed_at' => '2026-11-16 18:00:00']);
        $pending = Order::factory()->create();

        $low = ProductUnit::factory()->create(['stock' => '5.000']);
        ProductUnit::factory()->create(['stock' => '5.001']);
        ProductUnit::factory()->create(['stock' => 1, 'active' => false]);
        $hidden = ProductUnit::factory()->create(['stock' => 1]);
        $hidden->product->category->update(['active' => false]);

        $this->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonPath('data.today', '2026-11-17')
            ->assertJsonPath('data.sales_today.total', 27000)
            ->assertJsonPath('data.sales_week.total', 57000)
            ->assertJsonPath('data.pending_count', 1)
            ->assertJsonPath('data.pending_orders.0.id', $pending->id)
            ->assertJsonPath('data.low_stock_count', 1)
            ->assertJsonPath('data.low_stock.0.id', $low->id);

        $this->getJson('/api/admin/reports/sales?from=2026-11-17&to=2026-11-17')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $today->id)
            ->assertJsonPath('summary.orders', 1)->assertJsonPath('summary.total', 27000)
            ->assertJsonPath('summary.shipping_fee', 2000);
        $this->getJson('/api/admin/reports/sales?from=2026-11-18&to=2026-11-17')
            ->assertUnprocessable()->assertJsonValidationErrors('to');
        $this->getJson('/api/admin/reports/sales/export?from=2025-01-01&to=2026-11-17')
            ->assertUnprocessable()->assertJsonValidationErrors('to');
    }

    public function test_dashboard_analytics_uses_wib_and_ranks_completed_sales_by_unit(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-17 10:00:00', 'Asia/Jakarta'));
        $this->actingAs(User::factory()->admin()->create());
        $unit = ProductUnit::factory()->create(['price' => 12500, 'stock' => 8, 'created_at' => '2026-11-01 00:00:00']);
        $sale = $this->sale('2026-11-16 17:00:00', 27000);
        $older = $this->sale('2026-11-09 17:00:00', 12000);
        $other = ProductUnit::factory()->create(['product_id' => $unit->product_id, 'name' => 'Kemasan', 'stock' => 9]);
        $excluded = Order::factory()->create(['status' => OrderStatus::Processing]);
        OrderItem::factory()->create(['order_id' => $sale->id, 'product_unit_id' => $unit->id, 'quantity' => '2.500']);
        OrderItem::factory()->create(['order_id' => $sale->id, 'product_unit_id' => $other->id, 'quantity' => '1.000']);
        OrderItem::factory()->create(['order_id' => $older->id, 'product_unit_id' => $unit->id, 'quantity' => '1.000']);
        OrderItem::factory()->create(['order_id' => $excluded->id, 'product_unit_id' => $unit->id, 'quantity' => '100.000']);
        $this->postJson("/api/admin/units/{$unit->id}/stock", ['delta' => '-3.750', 'note' => 'Uji koreksi'])
            ->assertCreated();

        $path = '/api/admin/dashboard/analytics';
        $this->getJson($path.'?sales_period=24h&order_period=today&top_period=7d&category_id='.$unit->product->category_id)
            ->assertOk()->assertJsonCount(24, 'data.sales_chart.points')
            ->assertJsonPath('data.sales_chart.points.0.label', '00:00')
            ->assertJsonPath('data.sales_chart.points.0.value', 27000)
            ->assertJsonPath('data.sales_chart.total', 27000)
            ->assertJsonPath('data.processing_count', 1)
            ->assertJsonPath('data.recent_orders.0.id', $excluded->id)
            ->assertJsonPath('data.low_stock_trend', [0, 0, 0, 0, 0, 0, 1])
            ->assertJsonCount(2, 'data.best_sellers')
            ->assertJsonPath('data.best_sellers.0.unit_id', $unit->id)
            ->assertJsonPath('data.best_sellers.0.quantity', 2.5)
            ->assertJsonPath('data.best_sellers.0.change', 150)
            ->assertJsonPath('data.best_sellers.0.trend.6', 2.5)
            ->assertJsonPath('data.best_sellers.1.unit_id', $other->id);
        $this->getJson($path.'?sales_period=1y&top_period=30d&category_id=9999')
            ->assertOk()->assertJsonCount(12, 'data.sales_chart.points')
            ->assertJsonPath('data.sales_chart.total', 39000)->assertJsonCount(0, 'data.best_sellers');
        $this->getJson($path.'?top_period=invalid')->assertUnprocessable()->assertJsonValidationErrors('top_period');
        $this->getJson('/api/admin/low-stock')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $unit->id);
        $this->getJson('/api/admin/low-stock?search=not-a-match')->assertOk()->assertJsonCount(0, 'data');
        ProductUnit::factory()->create(['stock' => 0]);
        $this->getJson($path)->assertOk()->assertJsonPath('data.low_stock_trend', [0, 0, 0, 0, 0, 0, 2]);
    }

    public function test_order_completion_is_recorded_once_and_csv_escapes_spreadsheet_formulas(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-17 10:20:00', 'Asia/Jakarta'));
        $this->actingAs(User::factory()->admin()->create());
        $order = Order::factory()->create(['status' => OrderStatus::Processing, 'customer_name' => '=1+1']);
        $path = "/api/admin/orders/{$order->id}/status";
        $this->patchJson($path, ['status' => 'selesai'])->assertOk()
            ->assertJsonPath('data.payment_status', 'terverifikasi')
            ->assertJsonPath('data.completed_at', '2026-11-17T03:20:00.000000Z');
        $this->travel(2)->minutes();
        $this->patchJson($path, ['status' => 'selesai'])->assertOk()
            ->assertJsonPath('data.completed_at', '2026-11-17T03:20:00.000000Z');

        $this->sale('2026-11-16 16:59:59', 18500);
        $export = $this->get('/api/admin/reports/sales/export?from=2026-11-17&to=2026-11-17')
            ->assertOk()->assertDownload('penjualan-2026-11-17-2026-11-17.csv');
        $csv = $export->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $rows = explode("\n", trim($csv));
        $this->assertCount(2, $rows);
        $row = str_getcsv($rows[1], escape: '');
        $this->assertSame([$order->code, '2026-11-17 10:20:00', "'=1+1"], array_slice($row, 0, 3));
        $this->assertSame('12500', $row[7]);
    }

    public function test_settings_update_checkout_transfer_details_and_the_low_stock_threshold(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $settings = [
            'name' => 'Toko Uji', 'address' => 'Jalan Uji', 'phone' => '0211234567', 'whatsapp' => '628123456789',
            'low_stock_threshold' => 9, 'transfer_bank' => 'Bank Uji', 'transfer_account' => '000111222', 'transfer_holder' => 'Toko Uji',
        ];
        $this->putJson('/api/admin/settings', [...$settings, 'transfer_bank' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('transfer_bank');
        $this->putJson('/api/admin/settings', $settings)->assertOk()->assertJsonPath('data.name', 'Toko Uji');
        $this->getJson('/api/admin/settings')->assertOk()->assertJsonPath('data.transfer_account', '000111222');
        ProductUnit::factory()->create(['stock' => '8.500']);
        $this->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonPath('data.low_stock_threshold', 9)->assertJsonPath('data.low_stock_count', 1);
        $order = Order::factory()->create(['payment_method' => 'transfer']);
        $this->postJson('/api/orders/track', ['code' => $order->code, 'phone' => $order->phone])->assertOk()
            ->assertJsonPath('data.transfer.bank', 'Bank Uji')->assertJsonPath('data.store_whatsapp', '628123456789');
    }

    public function test_stock_history_can_be_filtered_by_unit_and_shows_the_admin(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Petugas Uji']);
        $this->actingAs($admin);
        $first = ProductUnit::factory()->create();
        $second = ProductUnit::factory()->create();
        $this->postJson("/api/admin/units/{$first->id}/stock", ['delta' => '2.500', 'note' => 'Barang masuk'])
            ->assertCreated()->assertJsonPath('data.actor', $admin->name);
        $this->postJson("/api/admin/units/{$second->id}/stock", ['delta' => '1.000', 'note' => 'Barang lain'])->assertCreated();
        $this->getJson("/api/admin/stock-movements?unit_id={$first->id}")->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.actor', $admin->name)
            ->assertJsonPath('data.0.balance', '2.500');
    }

    private function sale(string $completedAt, int $total): Order
    {
        return Order::factory()->create([
            'status' => OrderStatus::Completed,
            'completed_at' => $completedAt,
            'created_at' => '2026-10-01 10:00:00',
            'subtotal' => $total - 2000,
            'shipping_fee' => 2000,
            'total' => $total,
        ]);
    }
}
