<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $password = config('store.seed_admin.password');
        if (! $password) {
            $this->command?->warn('Isi SEED_ADMIN_PASSWORD untuk membuat akun admin.');

            return;
        }

        $admin = User::firstOrNew(['email' => config('store.seed_admin.email')]);
        if (! $admin->exists) {
            $admin->forceFill(['name' => 'Admin Pasar', 'password' => $password, 'role' => 'admin'])->save();
        }
    }
}
