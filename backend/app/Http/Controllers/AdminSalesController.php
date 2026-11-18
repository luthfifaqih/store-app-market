<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\AdminListRequest;
use App\Http\Requests\DashboardRequest;
use App\Http\Requests\SalesReportRequest;
use App\Http\Resources\LowStockResource;
use App\Http\Resources\SalesOrderResource;
use App\Models\Order;
use App\Models\ProductUnit;
use App\Services\DashboardAnalytics;
use App\Services\SalesReport;
use App\Services\StoreProfile;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminSalesController extends Controller
{
    public function dashboard(SalesReport $sales, StoreProfile $profile): JsonResponse
    {
        $today = CarbonImmutable::now(SalesReport::TIMEZONE)->startOfDay();
        $end = $today->addDay();
        $threshold = $profile->get()['low_stock_threshold'];
        $pending = Order::query()->where('status', OrderStatus::Pending->value);
        $low = ProductUnit::query()->inActiveCatalog()->where('stock', '<=', $threshold);

        return response()->json(['data' => [
            'today' => $today->toDateString(),
            'sales_today' => $sales->summary($sales->completedInRange($today, $end)),
            'sales_week' => $sales->summary($sales->completedInRange($today->subDays(6), $end)),
            'pending_count' => $pending->count(),
            'low_stock_count' => $low->count(),
            'low_stock_threshold' => $threshold,
            'pending_orders' => $pending->latest('id')->limit(6)->get(['id', 'code', 'customer_name', 'total', 'created_at']),
            'low_stock' => LowStockResource::collection($low->with('product:id,name,image_path,image_url')
                ->orderBy('stock')->orderBy('id')->limit(8)->get()),
        ]]);
    }

    public function lowStock(AdminListRequest $request, StoreProfile $profile): AnonymousResourceCollection
    {
        $units = ProductUnit::query()->inActiveCatalog()->where('stock', '<=', $profile->get()['low_stock_threshold'])
            ->with('product:id,name,image_path,image_url')
            ->when($request->filled('search'), fn ($query) => $query->whereRelation('product', 'name', 'like', '%'.$request->validated('search').'%'))
            ->orderBy('stock')->orderBy('id')->paginate(20);

        return LowStockResource::collection($units);
    }

    public function analytics(DashboardRequest $request, DashboardAnalytics $analytics, StoreProfile $profile): JsonResponse
    {
        $day = CarbonImmutable::now(SalesReport::TIMEZONE)->startOfDay();
        $category = $request->validated('category_id');

        return response()->json(['data' => [
            ...$analytics->stats($day),
            'low_stock_trend' => $analytics->lowStockTrend($day, $profile->get()['low_stock_threshold']),
            'sales_chart' => $analytics->salesChart($day, $request->validated('sales_period', '7d')),
            'recent_orders' => $analytics->recentOrders($day, $request->validated('order_period', 'today')),
            'best_sellers' => $analytics->bestSellers($day, $request->validated('top_period') === '30d' ? 30 : 7, $category === null ? null : (int) $category),
        ]]);
    }

    public function report(SalesReportRequest $request, SalesReport $sales): AnonymousResourceCollection
    {
        $query = $sales->forDates($request->validated('from'), $request->validated('to'));
        $summary = $sales->summary($query);

        return SalesOrderResource::collection($query->latest('completed_at')->latest('id')->paginate(25))
            ->additional(['summary' => $summary]);
    }

    public function export(SalesReportRequest $request, SalesReport $sales): StreamedResponse
    {
        $from = $request->validated('from');
        $to = $request->validated('to');
        $query = $sales->forDates($from, $to)->orderBy('completed_at')->orderBy('id');

        return response()->streamDownload(function () use ($query): void {
            $stream = fopen('php://output', 'wb');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Kode order', 'Selesai (WIB)', 'Pelanggan', 'Penerimaan', 'Pembayaran', 'Subtotal', 'Ongkir', 'Total'], escape: '');
            foreach ($query->lazy(500) as $order) {
                fputcsv($stream, [
                    $order->code,
                    $order->completed_at->setTimezone(SalesReport::TIMEZONE)->format('Y-m-d H:i:s'),
                    $this->csvText($order->customer_name),
                    $order->fulfillment === 'delivery' ? 'Diantar' : 'Ambil di toko',
                    $order->payment_method === 'transfer' ? 'Transfer' : 'COD',
                    $order->subtotal, $order->shipping_fee, $order->total,
                ], escape: '');
            }
            fclose($stream);
        }, "penjualan-{$from}-{$to}.csv", ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store']);
    }

    private function csvText(string $value): string
    {
        return preg_match('/^(?:[\s\x{FEFF}]*[=+@-]|[\t\r\n])/u', $value) ? "'".$value : $value;
    }
}
