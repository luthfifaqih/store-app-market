<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class SalesReport
{
    public const TIMEZONE = 'Asia/Jakarta';

    public function completedInRange(CarbonImmutable $from, CarbonImmutable $toExclusive): Builder
    {
        return Order::query()->where('status', OrderStatus::Completed->value)
            ->where('completed_at', '>=', $from->utc())
            ->where('completed_at', '<', $toExclusive->utc());
    }

    public function summary(Builder $query): array
    {
        $aggregate = (clone $query)->toBase()
            ->selectRaw('COUNT(*) AS orders, COALESCE(SUM(subtotal), 0) AS subtotal, COALESCE(SUM(shipping_fee), 0) AS shipping_fee, COALESCE(SUM(total), 0) AS total')
            ->first();

        return [
            'orders' => (int) $aggregate->orders, 'subtotal' => (int) $aggregate->subtotal,
            'shipping_fee' => (int) $aggregate->shipping_fee, 'total' => (int) $aggregate->total,
        ];
    }

    public function forDates(string $from, string $to): Builder
    {
        return $this->completedInRange(
            CarbonImmutable::parse($from, self::TIMEZONE)->startOfDay(),
            CarbonImmutable::parse($to, self::TIMEZONE)->startOfDay()->addDay(),
        );
    }
}
