<?php

namespace Tests\Feature;

use App\Models\ProductUnit;
use App\Services\CartService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\InputStream;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ConcurrentCheckoutTest extends TestCase
{
    use DatabaseMigrations;

    public function test_two_checkouts_competing_for_the_same_stock_only_create_one_order(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('Memerlukan row locking MySQL dan dua koneksi independen.');
        }

        $unit = ProductUnit::factory()->create(['stock' => '1.500']);
        $carts = app(CartService::class);
        $workers = [];
        $inputs = [];

        try {
            for ($index = 0; $index < 2; $index++) {
                [$cart] = $carts->create();
                $carts->change($cart, $unit->id, '1.000');
                $input = new InputStream;
                $worker = $this->worker($cart->id, $input);
                $inputs[] = $input;
                $workers[] = $worker;
                $worker->start();
                $this->assertTrue($worker->waitUntil(fn (string $type, string $output): bool => str_contains($output, 'ready')));
            }

            DB::transaction(function () use ($unit, $inputs, $workers): void {
                ProductUnit::query()->lockForUpdate()->findOrFail($unit->id);
                foreach ($inputs as $input) {
                    $input->write("checkout\n");
                    $input->close();
                }
                foreach ($workers as $worker) {
                    $this->assertTrue($worker->waitUntil(fn (string $type, string $output): bool => str_contains($output, 'checkout-started')));
                }
            });

            $outcomes = [];
            foreach ($workers as $worker) {
                $this->assertSame(0, $worker->wait(), $worker->getErrorOutput());
                $outcomes[] = trim(str_replace(['ready', 'checkout-started'], '', $worker->getOutput()));
            }
            $this->assertEqualsCanonicalizing(['created', 'out-of-stock'], $outcomes);
            $this->assertSame('0.500', $unit->refresh()->stock);
            $this->assertDatabaseCount('orders', 1);
            $this->assertDatabaseCount('stock_movements', 1);
        } finally {
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
        }
    }

    private function worker(int $cartId, InputStream $input): Process
    {
        $connection = config('database.connections.mysql');
        $program = <<<'PHP'
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$cart = App\Models\Cart::query()->findOrFail((int) $argv[1]);
echo "ready\n";
if (trim(fgets(STDIN)) !== 'checkout') {
    exit(1);
}

echo "checkout-started\n";

try {
    $app->make(App\Services\OrderService::class)->checkout([
        'fulfillment' => 'pickup', 'payment_method' => 'cod',
        'customer_name' => 'Pelanggan Uji', 'phone' => '628123456789',
    ], $cart);
    echo "created\n";
} catch (Illuminate\Validation\ValidationException $exception) {
    if (! str_contains($exception->getMessage(), 'Stok ')) {
        throw $exception;
    }
    echo "out-of-stock\n";
}
PHP;

        return new Process([PHP_BINARY, '-r', $program, (string) $cartId], base_path(), [
            'APP_ENV' => 'testing',
            'DB_CONNECTION' => 'mysql',
            'DB_URL' => $connection['url'] ?? '',
            'DB_HOST' => $connection['host'],
            'DB_PORT' => (string) $connection['port'],
            'DB_DATABASE' => $connection['database'],
            'DB_USERNAME' => $connection['username'],
            'DB_PASSWORD' => $connection['password'],
        ], $input, 20);
    }
}
