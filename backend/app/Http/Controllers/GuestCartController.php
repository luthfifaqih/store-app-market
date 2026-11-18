<?php

namespace App\Http\Controllers;

use App\Http\Requests\CartItemRequest;
use App\Http\Resources\CartResource;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuestCartController extends Controller
{
    public function __construct(private CartService $carts) {}

    public function store(): JsonResponse
    {
        [$cart, $token] = $this->carts->create();

        return (new CartResource($cart))->additional(['token' => $token])->response()->setStatusCode(201);
    }

    public function show(Request $request): CartResource
    {
        return new CartResource($this->carts->find($request->header('X-Cart-Token')));
    }

    public function add(CartItemRequest $request): CartResource
    {
        return new CartResource($this->carts->change(
            $this->carts->find($request->header('X-Cart-Token')),
            (int) $request->validated('product_unit_id'),
            (string) $request->validated('quantity'),
            increment: true,
        ));
    }

    public function update(CartItemRequest $request, string $unit): CartResource
    {
        return new CartResource($this->carts->change(
            $this->carts->find($request->header('X-Cart-Token')),
            (int) $unit,
            (string) $request->validated('quantity'),
        ));
    }

    public function destroy(Request $request, string $unit): CartResource
    {
        return new CartResource($this->carts->change(
            $this->carts->find($request->header('X-Cart-Token')),
            (int) $unit,
            null,
        ));
    }
}
