<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use App\Http\Requests\ProofRequest;
use App\Http\Requests\QuoteRequest;
use App\Http\Requests\TrackingRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\QuoteResource;
use App\Models\Order;
use App\Services\CartService;
use App\Services\OrderService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;

class GuestOrderController extends Controller
{
    public function quote(QuoteRequest $request, OrderService $orders, CartService $carts): QuoteResource
    {
        $cart = $request->headers->has('X-Cart-Token') ? $carts->find($request->header('X-Cart-Token')) : null;

        return new QuoteResource($orders->quote($request->validated(), $cart));
    }

    public function checkout(CheckoutRequest $request, OrderService $orders, CartService $carts): JsonResponse
    {
        $cart = $request->headers->has('X-Cart-Token') ? $carts->find($request->header('X-Cart-Token')) : null;

        return (new OrderResource($orders->checkout($request->validated(), $cart)))->response()->setStatusCode(201);
    }

    public function track(TrackingRequest $request): OrderResource
    {
        return new OrderResource($this->findOrder($request)->load('items'));
    }

    public function proof(ProofRequest $request, PaymentService $payments): OrderResource
    {
        return new OrderResource($payments->upload($this->findOrder($request), $request->file('proof')));
    }

    private function findOrder(TrackingRequest $request): Order
    {
        $order = Order::query()->where($request->safe()->only(['code', 'phone']))->first();
        abort_unless($order, 404, 'Pesanan tidak ditemukan. Periksa kode dan nomor HP.');

        return $order;
    }
}
