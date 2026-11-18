<?php

namespace App\Support;

class IndonesianPhone
{
    public static function normalize(string $phone): string
    {
        $phone = preg_replace('/[\s-]+/', '', $phone);
        if (str_starts_with($phone, '+62')) {
            return substr($phone, 1);
        }
        if (str_starts_with($phone, '08')) {
            return '62'.substr($phone, 1);
        }

        return $phone;
    }
}
