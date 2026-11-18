<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'dikonfirmasi';
    case Processing = 'diproses';
    case Shipped = 'dikirim';
    case Completed = 'selesai';
    case Cancelled = 'dibatalkan';

    public function next(string $fulfillment): array
    {
        return match ($this) {
            self::Pending => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Processing, self::Cancelled],
            self::Processing => [$fulfillment === 'pickup' ? self::Completed : self::Shipped, self::Cancelled],
            self::Shipped => [self::Completed, self::Cancelled],
            self::Completed, self::Cancelled => [],
        };
    }
}
