<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkPriceRequest;
use App\Services\BulkPriceService;
use Illuminate\Http\JsonResponse;

class AdminPriceController extends Controller
{
    public function update(BulkPriceRequest $request, BulkPriceService $prices): JsonResponse
    {
        return response()->json(['data' => ['updated' => $prices->update($request->validated('prices'))]]);
    }
}
