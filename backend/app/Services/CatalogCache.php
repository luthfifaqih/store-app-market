<?php

namespace App\Services;

use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class CatalogCache
{
    public function remember(string $group, string $key, Closure $resolve): array
    {
        $key = "catalog:v2:{$group}:".hash('sha256', $key);
        try {
            $version = Cache::get("catalog:version:{$group}", 'initial');
            $entry = Cache::get($key);
        } catch (Throwable $exception) {
            report($exception);

            return $resolve();
        }
        if (is_array($entry) && ($entry['version'] ?? null) === $version && is_array($entry['data'] ?? null)) {
            return $entry['data'];
        }

        $data = $resolve();
        try {
            Cache::put($key, ['version' => $version, 'data' => $data], 60);
        } catch (Throwable $exception) {
            report($exception);
        }

        return $data;
    }

    public static function invalidateAfterCommit(string ...$groups): void
    {
        DB::afterCommit(function () use ($groups): void {
            foreach ($groups as $group) {
                try {
                    Cache::forever("catalog:version:{$group}", (string) Str::uuid());
                } catch (Throwable $exception) {
                    report($exception);
                }
            }
        });
    }
}
