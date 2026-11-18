<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\Setting;
use App\Services\StockService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(AdminSeeder::class);

        $categories = ['Beras & Tepung', 'Minyak', 'Gula', 'Telur', 'Mi Instan', 'Bumbu Dapur', 'Kacang & Biji', 'Minuman'];
        $categoryIds = collect($categories)->mapWithKeys(fn (string $name): array => [
            $name => Category::firstOrCreate(['name' => $name])->id,
        ]);

        $products = [
            ['Beras Pandan Wangi', 'Beras & Tepung', [['kg', 15500, '75.500', true], ['kemasan 5 kg', 75000], ['karung 25 kg', 360000]], 'Beras pulen beraroma pandan untuk hidangan sehari-hari.'],
            ['Minyak Goreng Sawit', 'Minyak', [['botol 1 L', 18500], ['pouch 2 L', 35500]], 'Minyak goreng jernih untuk menumis dan menggoreng.'],
            ['Telur Ayam Negeri', 'Telur', [['kg', 28500, '35.500', true], ['rak 30 butir', 55000]], 'Telur ayam segar untuk kebutuhan dapur keluarga.'],
            ['Gula Pasir Putih', 'Gula', [['kg', 17000, '62.750', true], ['kemasan 5 kg', 82000]], 'Gula berbutir halus untuk minuman dan masakan.'],
            ['Tepung Terigu Serbaguna', 'Beras & Tepung', [['kg', 12500, '48', true]], 'Tepung protein sedang untuk adonan dan gorengan.'],
            ['Bawang Merah', 'Bumbu Dapur', [['kg', 32000, '23.500', true]], 'Bawang merah untuk bumbu dasar masakan.'],
            ['Kecap Manis', 'Bumbu Dapur', [['botol 600 ml', 23500]], 'Kecap manis untuk pelengkap hidangan.'],
            ['Mi Instan Goreng', 'Mi Instan', [['bungkus', 3500, '150'], ['dus 40 bungkus', 125000]], 'Mi goreng praktis untuk stok di rumah.'],
            ['Beras Setra Ramos', 'Beras & Tepung', [['kg', 14500, '67.500', true], ['kemasan 5 kg', 70000]]],
            ['Beras Merah', 'Beras & Tepung', [['kg', 23500, '25.500', true]]],
            ['Tepung Tapioka', 'Beras & Tepung', [['kg', 14000, '30', true]]],
            ['Minyak Goreng Kelapa', 'Minyak', [['botol 1 L', 32000], ['jeriken 5 L', 150000]]],
            ['Minyak Jagung', 'Minyak', [['botol 1 L', 43500]]],
            ['Minyak Kedelai', 'Minyak', [['botol 1 L', 39700]]],
            ['Minyak Kelapa Murni', 'Minyak', [['botol 250 ml', 39000]]],
            ['Gula Merah Kelapa', 'Gula', [['kg', 24000, '20.500', true], ['blok 500 g', 12500]]],
            ['Gula Aren Bubuk', 'Gula', [['kemasan 250 g', 17500], ['kemasan 1 kg', 62000]]],
            ['Gula Batu', 'Gula', [['kemasan 250 g', 8500]]],
            ['Gula Halus', 'Gula', [['kemasan 500 g', 12500]]],
            ['Telur Ayam Kampung', 'Telur', [['butir', 3500], ['rak 30 butir', 94000]]],
            ['Telur Bebek', 'Telur', [['butir', 4000], ['rak 30 butir', 112000]]],
            ['Telur Puyuh', 'Telur', [['kemasan 10 butir', 7800], ['rak 30 butir', 21500]]],
            ['Telur Asin', 'Telur', [['butir', 4800]]],
            ['Mi Kuah Ayam Bawang', 'Mi Instan', [['bungkus', 3200], ['dus 40 bungkus', 118000]]],
            ['Mi Kuah Soto', 'Mi Instan', [['bungkus', 3200], ['dus 40 bungkus', 118000]]],
            ['Mi Goreng Pedas', 'Mi Instan', [['bungkus', 4000], ['dus 40 bungkus', 146000]]],
            ['Mi Kuah Kari', 'Mi Instan', [['bungkus', 3400], ['dus 40 bungkus', 125000]]],
            ['Bawang Putih', 'Bumbu Dapur', [['kg', 36000, '26.750', true]]],
            ['Garam Halus', 'Bumbu Dapur', [['kemasan 250 g', 4500], ['kemasan 1 kg', 15000]]],
            ['Lada Bubuk', 'Bumbu Dapur', [['kemasan 50 g', 14000]]],
            ['Kacang Hijau', 'Kacang & Biji', [['kg', 27000, '27.250', true], ['kemasan 500 g', 14500]]],
            ['Kacang Tanah Kupas', 'Kacang & Biji', [['kg', 36500, '32.500', true]]],
            ['Kedelai Kuning', 'Kacang & Biji', [['kg', 18500, '41.500', true], ['karung 25 kg', 430000]]],
            ['Kacang Merah', 'Kacang & Biji', [['kg', 31500, '22.750', true]]],
            ['Wijen Putih', 'Kacang & Biji', [['kemasan 100 g', 9500], ['kemasan 500 g', 42000]]],
            ['Teh Melati', 'Minuman', [['kotak 25 kantong', 9500]]],
            ['Kopi Bubuk Robusta', 'Minuman', [['kemasan 200 g', 22500], ['kemasan 1 kg', 99500]]],
            ['Susu Kental Manis', 'Minuman', [['kaleng 370 g', 14500], ['dus 24 kaleng', 312000]]],
            ['Susu UHT Cokelat', 'Minuman', [['kotak 250 ml', 7500], ['dus 24 kotak', 163000]]],
            ['Teh Hitam Celup', 'Minuman', [['kotak 50 kantong', 14500]]],
        ];

        foreach ($products as $entry) {
            [$name, $category, $units, $description] = $entry + [3 => null];
            DB::transaction(function () use ($name, $category, $description, $units, $categoryIds): void {
                $product = Product::firstOrCreate(['name' => $name], ['category_id' => $categoryIds[$category], 'description' => $description]);
                foreach ($units as $unitData) {
                    [$label, $price, $quantity, $fractional] = $unitData + [2 => '30', 3 => false];
                    $unit = $product->units()->firstOrCreate(['name' => $label], ['price' => $price, 'fractional' => $fractional]);
                    if ($unit->wasRecentlyCreated) {
                        app(StockService::class)->record($unit->refresh(), $quantity, 'stok_awal');
                        $unit->tiers()->createMany([
                            ['min_quantity' => 5, 'price' => intdiv($price * 97, 100)],
                            ['min_quantity' => 10, 'price' => intdiv($price * 94, 100)],
                        ]);
                    }
                }
            });
        }

        DeliveryZone::firstOrCreate(['name' => 'Zona Dekat'], ['fee' => 7000, 'minimum' => 50000]);
        DeliveryZone::firstOrCreate(['name' => 'Zona Sekitar'], ['fee' => 12000, 'minimum' => 75000]);
        $frontend = rtrim(config('cors.allowed_origins.0'), '/');
        Banner::firstOrCreate(['title' => 'Kebutuhan dapur, lebih dekat.'], [
            'image_url' => $frontend.'/hero.webp', 'link_url' => $frontend.'/#katalog',
        ]);
        Setting::firstOrCreate(['key' => 'store_profile'], ['value' => ['name' => 'Pasar Sembako', 'currency' => 'IDR']]);
    }
}
