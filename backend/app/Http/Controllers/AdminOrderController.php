<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\AdminListRequest;
use App\Http\Requests\PaymentReviewRequest;
use App\Http\Requests\StatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\PaymentService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminOrderController extends Controller
{
    public function index(AdminListRequest $request): AnonymousResourceCollection
    {
        return OrderResource::collection(Order::query()->with('items')
            ->when($request->validated('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->validated('payment_method'), fn ($query, $method) => $query->where('payment_method', $method))
            ->when($request->validated('payment_status'), fn ($query, $status) => $query->where('payment_status', $status))
            ->when($request->filled('search'), fn ($query) => $query->where(fn ($matches) => $matches
                ->where('code', 'like', '%'.$request->validated('search').'%')->orWhere('customer_name', 'like', '%'.$request->validated('search').'%')))
            ->latest('id')->paginate(15));
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load('items'));
    }

    public function status(StatusRequest $request, Order $order, OrderService $orders): OrderResource
    {
        return new OrderResource($orders->transition($order, OrderStatus::from($request->validated('status')), $request->user()));
    }

    public function review(PaymentReviewRequest $request, Order $order, PaymentService $payments): OrderResource
    {
        return new OrderResource($payments->review($order, $request->validated('decision')));
    }

    public function proof(Order $order): StreamedResponse
    {
        $storage = Storage::disk('local');
        abort_unless($order->proof_path && $storage->exists($order->proof_path), 404, 'Bukti pembayaran tidak ditemukan.');

        return $storage->download($order->proof_path, null, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
