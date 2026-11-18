<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\ProductUnit;
use App\Models\StockMovement;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DashboardAnalytics
{
    public function __construct(private SalesReport $sales) {}

    public function stats(CarbonImmutable $day): array
    {
        $start = $day->startOfMonth();
        $end = $day->addDay();
        $yesterday = $this->sales->summary($this->sales->completedInRange($day->subDay(), $day));
        $month = $this->sales->summary($this->sales->completedInRange($start, $end));
        $previousStart = $start->subMonth();
        $previousEnd = $previousStart->addDays(min($day->day, $previousStart->daysInMonth));
        $previousMonth = $this->sales->summary($this->sales->completedInRange($previousStart, $previousEnd));
        $hourly = $this->series($day, $end, 'hour');
        $daily = $this->series($day->subDays(6), $end, 'day');

        $work = Order::query()->whereIn('status', [OrderStatus::Pending->value, OrderStatus::Processing->value])
            ->selectRaw('status, COUNT(*) AS amount')->groupBy('status')->pluck('amount', 'status');

        $queueDay = $this->bucket('created_at', 'day');
        $queue = Order::query()->toBase()
            ->whereIn('status', [OrderStatus::Pending->value, OrderStatus::Processing->value])
            ->where('created_at', '>=', $day->subDays(6)->utc())->where('created_at', '<', $end->utc())
            ->selectRaw("status, {$queueDay} AS bucket, COUNT(*) AS amount")
            ->groupBy('status', 'bucket')->get()->groupBy('status');

        return [
            'sales_yesterday' => $yesterday['total'],
            'sales_month' => $month,
            'sales_previous_month' => $previousMonth['total'],
            'processing_count' => (int) ($work[OrderStatus::Processing->value] ?? 0),
            'stat_trends' => [
                'today' => array_column($hourly, 'value'),
                'month' => array_column($daily, 'value'),
                'pending' => $this->points($day->subDays(6), $end, 'day', $queue->get(OrderStatus::Pending->value, collect())->pluck('amount', 'bucket')->all()),
                'processing' => $this->points($day->subDays(6), $end, 'day', $queue->get(OrderStatus::Processing->value, collect())->pluck('amount', 'bucket')->all()),
            ],
        ];
    }

    public function lowStockTrend(CarbonImmutable $day, int|float $threshold): array
    {
        $units = ProductUnit::query()->inActiveCatalog();
        $bucket = $this->bucket('stock_movements.created_at', 'day');
        $start = $day->subDays(5)->utc();
        $recent = StockMovement::query()->where('created_at', '>=', $start)
            ->whereIn('product_unit_id', (clone $units)->select('id'))
            ->selectRaw("product_unit_id, {$bucket} AS bucket, SUM(delta) AS amount")
            ->groupBy('product_unit_id', 'bucket')->get()->groupBy('product_unit_id');
        $changed = (clone $units)->where(fn ($query) => $query->whereIn('id', $recent->keys())->orWhere('created_at', '>=', $start))
            ->get(['id', 'stock', 'created_at']);
        $balances = $changed->pluck('stock', 'id');
        $created = $changed->mapWithKeys(fn (ProductUnit $unit) => [$unit->id => $unit->created_at?->setTimezone(SalesReport::TIMEZONE)->toDateString()]);
        $count = $units->where('stock', '<=', $threshold)->count();
        $points = [$count];

        for ($offset = 0; $offset < 6; $offset++) {
            $date = $day->subDays($offset)->toDateString();
            foreach ($balances as $unit => $balance) {
                if ($created[$unit] === $date) {
                    $count -= (int) ($balance <= $threshold);
                    $balances->forget($unit);

                    continue;
                }

                $amount = $recent->get($unit)?->firstWhere('bucket', $date)?->amount ?? 0;
                $previous = round((float) $balance - (float) $amount, 3);
                $count += (int) ($previous <= $threshold) - (int) ($balance <= $threshold);
                $balances[$unit] = $previous;
            }
            $points[] = $count;
        }

        return array_reverse($points);
    }

    public function salesChart(CarbonImmutable $day, string $period): array
    {
        [$start, $end, $step] = match ($period) {
            '24h' => [$day, $day->addDay(), 'hour'],
            '1m' => [$day->subDays(29), $day->addDay(), 'day'],
            '1y' => [$day->startOfMonth()->subMonths(11), $day->addDay(), 'month'],
            default => [$day->subDays(6), $day->addDay(), 'day'],
        };
        $points = $this->series($start, $end, $step);

        return ['total' => array_sum(array_column($points, 'value')), 'points' => $points];
    }

    public function recentOrders(CarbonImmutable $day, string $period): array
    {
        $query = Order::query()->latest('created_at')->latest('id');
        if ($period !== 'all') {
            $from = $period === 'today' ? $day : $day->subDays(6);
            $query->where('created_at', '>=', $from->utc())->where('created_at', '<', $day->addDay()->utc());
        }

        return $query->limit(5)->get(['id', 'code', 'customer_name', 'status', 'total', 'created_at'])->toArray();
    }

    public function bestSellers(CarbonImmutable $day, int $days, ?int $category): array
    {
        $end = $day->addDay();
        $start = $end->subDays($days);
        $query = $this->salesItems($start, $end)
            ->join('product_units', 'product_units.id', '=', 'order_items.product_unit_id')
            ->join('products', 'products.id', '=', 'product_units.product_id')
            ->when($category, fn (Builder $items) => $items->where('products.category_id', $category));

        $winners = $query->selectRaw('product_units.id AS unit_id, products.id AS product_id, products.name AS product_name,
                product_units.name AS unit_name, product_units.price, products.image_path, products.image_url, SUM(order_items.quantity) AS quantity')
            ->groupBy('product_units.id', 'products.id', 'products.name', 'product_units.name', 'product_units.price', 'products.image_path', 'products.image_url')
            ->orderByDesc('quantity')->orderBy('unit_id')->limit(5)->get();

        if ($winners->isEmpty()) {
            return [];
        }

        $unitIds = $winners->pluck('unit_id');
        $baseline = $this->salesItems($start->subDays($days), $start)->whereIn('order_items.product_unit_id', $unitIds)
            ->selectRaw('product_unit_id, SUM(quantity) AS quantity')->groupBy('product_unit_id')->pluck('quantity', 'product_unit_id');
        $bucket = $this->bucket('orders.completed_at', 'day');
        $daily = $this->salesItems($start, $end)->whereIn('order_items.product_unit_id', $unitIds)
            ->selectRaw("product_unit_id, {$bucket} AS bucket, SUM(quantity) AS amount")
            ->groupBy('product_unit_id', 'bucket')->get()->groupBy('product_unit_id');

        return $winners->map(function (object $item) use ($baseline, $daily, $start, $end): array {
            $previous = (float) ($baseline[$item->unit_id] ?? 0);
            $values = $daily->get($item->unit_id, collect())->pluck('amount', 'bucket')->all();

            return [
                'unit_id' => $item->unit_id, 'product_id' => $item->product_id, 'product_name' => $item->product_name,
                'unit_name' => $item->unit_name, 'price' => (int) $item->price,
                'image_url' => $item->image_path ? Storage::disk('public')->url($item->image_path) : $item->image_url,
                'quantity' => (float) $item->quantity,
                'change' => $previous > 0 ? round(((float) $item->quantity / $previous - 1) * 100, 1) : null,
                'trend' => array_column($this->points($start, $end, 'day', $values), 'value'),
            ];
        })->all();
    }

    private function salesItems(CarbonImmutable $start, CarbonImmutable $end): Builder
    {
        return $this->sales->completedInRange($start, $end)->toBase()
            ->join('order_items', 'order_items.order_id', '=', 'orders.id');
    }

    private function series(CarbonImmutable $start, CarbonImmutable $end, string $step): array
    {
        $bucket = $this->bucket('completed_at', $step);
        $values = $this->sales->completedInRange($start, $end)->toBase()
            ->selectRaw("{$bucket} AS bucket, SUM(total) AS amount")
            ->groupBy('bucket')->pluck('amount', 'bucket')->all();

        return $this->points($start, $end, $step, $values);
    }

    private function points(CarbonImmutable $start, CarbonImmutable $end, string $step, array $values): array
    {
        [$keyFormat, $labelFormat] = match ($step) {
            'hour' => ['Y-m-d H', 'HH:mm'],
            'month' => ['Y-m', 'MMM YY'],
            default => ['Y-m-d', 'D MMM'],
        };
        $points = [];
        for ($date = $start; $date->lessThan($end); $date = $date->add(1, $step)) {
            $points[] = [
                'label' => $date->locale('id')->isoFormat($labelFormat),
                'value' => (float) ($values[$date->format($keyFormat)] ?? 0),
            ];
        }

        return $points;
    }

    private function bucket(string $column, string $step): string
    {
        $sqlite = DB::connection()->getDriverName() === 'sqlite';
        $format = match ($step) {
            'hour' => '%Y-%m-%d %H',
            'month' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        return $sqlite
            ? "strftime('{$format}', {$column}, '+7 hours')"
            : "DATE_FORMAT(DATE_ADD({$column}, INTERVAL 7 HOUR), '{$format}')";
    }
}
