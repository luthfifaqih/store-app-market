<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->string('role', 16)->default('guest'));

        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->string('category', 80)->index();
            $table->text('description')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('product_units', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained();
            $table->string('name', 80);
            $table->unsignedInteger('price');
            $table->decimal('stock', 13, 3)->default(0);
            $table->boolean('fractional')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['product_id', 'name']);
        });

        Schema::create('price_tiers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_unit_id')->constrained();
            $table->decimal('min_quantity', 13, 3);
            $table->unsignedInteger('price');
            $table->unique(['product_unit_id', 'min_quantity']);
        });

        Schema::create('shipping_zones', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100);
            $table->unsignedInteger('fee');
            $table->unsignedBigInteger('minimum');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 24)->unique();
            $table->string('customer_name', 120);
            $table->string('phone', 16);
            $table->string('status', 16)->default('pending')->index();
            $table->string('fulfillment', 10);
            $table->foreignId('shipping_zone_id')->nullable()->constrained();
            $table->string('zone_name', 100)->nullable();
            $table->text('address')->nullable();
            $table->unsignedBigInteger('subtotal');
            $table->unsignedInteger('shipping_fee');
            $table->unsignedBigInteger('total');
            $table->string('payment_method', 10);
            $table->string('payment_status', 16)->default('menunggu');
            $table->string('proof_path')->nullable();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained();
            $table->foreignId('product_unit_id')->constrained();
            $table->string('product_name', 150);
            $table->string('unit_name', 80);
            $table->decimal('quantity', 13, 3);
            $table->unsignedInteger('unit_price');
            $table->unsignedBigInteger('line_total');
            $table->unique(['order_id', 'product_unit_id']);
        });

        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_unit_id')->constrained();
            $table->foreignId('order_id')->nullable()->constrained();
            $table->foreignId('user_id')->nullable()->constrained();
            $table->decimal('delta', 13, 3);
            $table->decimal('balance', 13, 3);
            $table->string('reason', 24);
            $table->string('note', 250)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['stock_movements', 'order_items', 'orders', 'shipping_zones', 'price_tiers', 'product_units', 'products'] as $name) {
            Schema::dropIfExists($name);
        }
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
    }
};
