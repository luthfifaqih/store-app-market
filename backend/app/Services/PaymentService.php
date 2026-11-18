<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class PaymentService
{
    public function upload(Order $order, UploadedFile $proof): Order
    {
        $path = $proof->store('payment-proofs', 'local');
        abort_unless($path, 503, 'Bukti gagal disimpan. Coba lagi.');

        try {
            [$updated, $previous] = DB::transaction(function () use ($order, $path): array {
                $locked = Order::query()->with('items')->lockForUpdate()->findOrFail($order->id);
                if ($locked->payment_method !== 'transfer' || $locked->status !== OrderStatus::Pending ||
                    ! in_array($locked->payment_status, ['menunggu', 'ditolak'], true)) {
                    throw ValidationException::withMessages(['proof' => 'Pesanan ini belum dapat menerima bukti baru.']);
                }

                $previous = $locked->proof_path;
                $locked->update(['proof_path' => $path, 'payment_status' => 'ditinjau']);

                return [$locked, $previous];
            }, 3);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        if ($previous) {
            Storage::disk('local')->delete($previous);
        }

        return $updated;
    }

    public function review(Order $order, string $decision): Order
    {
        return DB::transaction(function () use ($order, $decision): Order {
            $locked = Order::query()->with('items')->lockForUpdate()->findOrFail($order->id);
            if ($locked->status !== OrderStatus::Pending || $locked->payment_status !== 'ditinjau' || ! $locked->proof_path) {
                throw ValidationException::withMessages(['decision' => 'Tidak ada bukti yang sedang menunggu verifikasi.']);
            }

            $locked->update(['payment_status' => $decision]);

            return $locked;
        }, 3);
    }
}
