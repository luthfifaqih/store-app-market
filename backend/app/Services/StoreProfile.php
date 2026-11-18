<?php

namespace App\Services;

use App\Models\Setting;

class StoreProfile
{
    private ?array $profile = null;

    public function get(): array
    {
        if ($this->profile === null) {
            $saved = Setting::query()->where('key', 'store_profile')->value('value') ?? [];
            $this->profile = array_replace([
                'name' => config('app.name'),
                'address' => null,
                'phone' => null,
                'whatsapp' => null,
                'low_stock_threshold' => 5,
                'transfer_bank' => config('store.transfer.bank'),
                'transfer_account' => config('store.transfer.account'),
                'transfer_holder' => config('store.transfer.holder'),
            ], $saved);
        }

        return $this->profile;
    }

    public function save(array $values): array
    {
        $values['low_stock_threshold'] = (int) $values['low_stock_threshold'];
        Setting::query()->updateOrCreate(['key' => 'store_profile'], ['value' => [...$values, 'currency' => 'IDR']]);
        $this->profile = null;

        return $this->get();
    }
}
