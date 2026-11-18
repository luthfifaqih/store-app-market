<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 80)->unique();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->foreignId('category_id')->nullable()->constrained();
            $table->string('image_path')->nullable();
        });

        DB::table('products')->select('category')->distinct()->orderBy('category')->chunk(200, function ($rows): void {
            foreach ($rows as $row) {
                $categoryId = DB::table('categories')->insertGetId([
                    'name' => $row->category, 'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('products')->where('category', $row->category)->update(['category_id' => $categoryId]);
            }
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->unsignedBigInteger('category_id')->nullable(false)->change();
            $table->dropIndex(['category']);
            $table->dropColumn('category');
        });

        Schema::rename('shipping_zones', 'delivery_zones');

        Schema::create('banners', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 150);
            $table->string('image_url', 500);
            $table->string('link_url', 500)->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 100)->unique();
            $table->json('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('banners');
        Schema::rename('delivery_zones', 'shipping_zones');

        Schema::table('products', fn (Blueprint $table) => $table->string('category', 80)->nullable()->index());
        DB::table('categories')->select(['id', 'name'])->chunkById(200, function ($rows): void {
            foreach ($rows as $row) {
                DB::table('products')->where('category_id', $row->id)->update(['category' => $row->name]);
            }
        });
        Schema::table('products', function (Blueprint $table): void {
            $table->string('category', 80)->nullable(false)->change();
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn('image_path');
        });

        Schema::dropIfExists('categories');
    }
};
