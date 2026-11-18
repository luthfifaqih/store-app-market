<?php

namespace Tests\Unit;

use App\Models\PriceTier;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Services\OrderService;
use App\Services\StockService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class GuestOrderServicesTest extends TestCase
{
    public function test_order_uses_the_highest_eligible_tier_and_rounds_once(): void
    {
        $unit = new ProductUnit(['price' => 12500]);
        $unit->setRelation('tiers', new Collection([
            new PriceTier(['min_quantity' => 5, 'price' => 11000]),
            new PriceTier(['min_quantity' => 10, 'price' => 10001]),
        ]));
        $service = new OrderService(new StockService);

        $this->assertSame(['unit_price' => 12500, 'line_total' => 50000], $service->priceLine($unit, '4.000'));
        $this->assertSame(['unit_price' => 11000, 'line_total' => 55000], $service->priceLine($unit, '5.000'));
        $this->assertSame(['unit_price' => 10001, 'line_total' => 105011], $service->priceLine($unit, '10.500'));
    }

    public function test_stock_service_rejects_insufficient_stock(): void
    {
        $unit = new ProductUnit(['name' => 'kg', 'stock' => '1.500', 'fractional' => true, 'active' => true]);
        $product = new Product(['name' => 'Beras', 'active' => true]);
        $service = new StockService;
        $service->validateForPurchase($unit, $product, true, '1.500');

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Stok Beras (kg) tersisa 1.500.');
        $service->validateForPurchase($unit, $product, true, '1.501');
    }

    public function test_stock_service_rejects_fractional_quantities_for_whole_units(): void
    {
        $unit = new ProductUnit(['name' => 'dus', 'stock' => '10', 'fractional' => false, 'active' => true]);
        $product = new Product(['name' => 'Mi', 'active' => true]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Jumlah Mi (dus) harus bulat.');
        (new StockService)->validateForPurchase($unit, $product, true, '1.125');
    }
}
