<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            $table->index(['active', 'id'], 'products_active_id_idx');
            $table->index(['category_id', 'active', 'id'], 'products_category_active_id_idx');
            $table->index(['active', 'name', 'id'], 'products_active_name_id_idx');
        });
        Schema::table('product_units', function (Blueprint $table): void {
            $table->index(['product_id', 'active', 'price'], 'units_product_active_price_idx');
            $table->index(['active', 'stock', 'id'], 'units_active_stock_id_idx');
        });
        Schema::table('banners', fn (Blueprint $table) => $table->index(['active', 'position', 'id'], 'banners_active_position_id_idx'));
        Schema::table('delivery_zones', fn (Blueprint $table) => $table->index(['active', 'name'], 'zones_active_name_idx'));
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql' && ! Schema::hasIndex('products', ['category_id'])) {
            Schema::table('products', fn (Blueprint $table) => $table->index('category_id', 'products_category_fk_idx'));
        }
        Schema::table('products', function (Blueprint $table): void {
            $table->dropIndex('products_category_active_id_idx');
            $table->dropIndex('products_active_id_idx');
            $table->dropIndex('products_active_name_id_idx');
        });
        Schema::table('product_units', function (Blueprint $table): void {
            $table->dropIndex('units_product_active_price_idx');
            $table->dropIndex('units_active_stock_id_idx');
        });
        Schema::table('banners', fn (Blueprint $table) => $table->dropIndex('banners_active_position_id_idx'));
        Schema::table('delivery_zones', fn (Blueprint $table) => $table->dropIndex('zones_active_name_idx'));
    }
};
