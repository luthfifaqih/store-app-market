"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, rupiah } from "@/lib/api";
import { dateWib, type Dashboard, type DashboardAnalytics } from "@/lib/admin";

import type { Category } from "@/lib/types";
import { Failure } from "@/components/feedback";
import { ChangeBadge, ChartCard, Sparkline, StatCard } from "./charts";
import { DataTable, EmptyState, ListItemCard, PillSelect, PillTabs, SkeletonCard, StatusBadge } from "./primitives";
import { QuickStock } from "./quick-stock";
import { initials } from "./topbar";
import { ProductThumb } from "./product-thumb";

const salesPeriods = [{ value: "24h", label: "24J" }, { value: "7d", label: "7H" }, { value: "1m", label: "1B" }, { value: "1y", label: "1T" }] as const;
const orderPeriods = [{ value: "today", label: "Hari ini" }, { value: "7d", label: "7 Hari" }, { value: "all", label: "Semua waktu" }] as const;
const topPeriods = [{ value: "7d", label: "7 Hari" }, { value: "30d", label: "30 Hari" }] as const;
const time = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
const number = new Intl.NumberFormat("id-ID");
const percent = (current: number, prior: number) => prior ? (current - prior) / prior * 100 : current ? null : 0;
const dailyChange = (trend: number[]) => percent(trend.at(-1) ?? 0, trend.at(-2) ?? 0);

export function AdminDashboard() {
  const [salesPeriod, setSalesPeriod] = useState<typeof salesPeriods[number]["value"]>("7d");
  const [orderPeriod, setOrderPeriod] = useState<typeof orderPeriods[number]["value"]>("today");
  const [topPeriod, setTopPeriod] = useState<typeof topPeriods[number]["value"]>("7d");
  const [category, setCategory] = useState("");
  const overview = useQuery({
    queryKey: ["admin", "dashboard"], queryFn: () => api<{ data: Dashboard }>("/admin/dashboard", "GET", undefined, true),
    staleTime: 30_000,
  });
  const params = new URLSearchParams({ sales_period: salesPeriod, order_period: orderPeriod, top_period: topPeriod });
  if (category) params.set("category_id", category);
  const analytics = useQuery({
    queryKey: ["admin", "dashboard", "analytics", salesPeriod, orderPeriod, topPeriod, category],
    queryFn: () => api<{ data: DashboardAnalytics }>("/admin/dashboard/analytics?" + params, "GET", undefined, true),
    placeholderData: keepPreviousData, staleTime: 30_000,
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"], queryFn: () => api<{ data: Category[] }>("/admin/categories", "GET", undefined, true),
  });
  const data = analytics.data?.data;
  const summary = overview.data?.data;
  const analyticsState = analytics.isPending || analytics.isPlaceholderData ? <SkeletonCard lines={3} /> :
    analytics.isError ? <Failure error={analytics.error} retry={() => analytics.refetch()} /> : null;
  const ready = !analyticsState && data;
  const stock = summary?.low_stock.slice(0, 4) ?? [];

  return <div className="admin-dashboard">
    <header className="admin-dashboard-heading"><h1>Dashboard</h1>{summary && <p>{dateWib(summary.today)} · WIB</p>}</header>
    {overview.isPending || analytics.isPending ? <div className="admin-stat-skeletons">{Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} />)}</div>
      : overview.isError ? <Failure error={overview.error} retry={() => overview.refetch()} />
      : analytics.isError ? <Failure error={analytics.error} retry={() => analytics.refetch()} />
      : summary && data && <Stats overview={summary} data={data} />}

    <div className="admin-dashboard-grid">
      <ChartCard total={ready ? ready.sales_chart.total : undefined}
        points={ready && ready.sales_chart.total > 0 ? ready.sales_chart.points : undefined}
        filters={<PillTabs label="Rentang grafik penjualan" value={salesPeriod} options={salesPeriods} onChange={setSalesPeriod} />}>
        {analyticsState}
        {ready && ready.sales_chart.total === 0 && <EmptyState>Belum ada penjualan pada periode ini.</EmptyState>}
      </ChartCard>
      <QuickStock />
      <section className="admin-panel admin-recent-orders">
        <div className="admin-panel-title"><h2>Pesanan Terbaru</h2>
          <PillSelect label="Periode pesanan terbaru" value={orderPeriod} options={orderPeriods} onChange={setOrderPeriod} />
        </div>
        {analyticsState}
        {ready && (ready.recent_orders.length ? <ul className="admin-list">
          {ready.recent_orders.map((order) => <ListItemCard key={order.id}
            leading={<span className="admin-list-avatar" aria-hidden>{initials(order.customer_name)}</span>}
            title={<Link className="admin-list-link" href={"/admin/pesanan?order=" + order.id}>{order.customer_name}</Link>}
            subtitle={<StatusBadge status={order.status} />}
            trailing={<><strong className="admin-order-amount" data-status={order.status}>{rupiah(order.total)}</strong>
              <time dateTime={order.created_at}>{orderPeriod === "today" ? time.format(new Date(order.created_at)) : dateWib(order.created_at, true)}</time></>} />)}
        </ul> : <EmptyState>Belum ada pesanan pada periode ini.</EmptyState>)}
      </section>
      <section className="admin-panel admin-low-stock">
        <div className="admin-panel-title"><h2>Stok Menipis</h2><Link className="text-link" href="/admin/stok?tab=menipis">Lihat semua <ArrowRight size={14} aria-hidden /></Link></div>
        {overview.isPending && <SkeletonCard />}
        {overview.isError && <Failure error={overview.error} retry={() => overview.refetch()} />}
        {summary && (stock.length ? <ul className="admin-list">
          {stock.map((unit) => <ListItemCard key={unit.id}
            title={<Link className="admin-list-link" href={"/admin/produk?produk=" + unit.product_id}>{unit.product_name}</Link>}
            subtitle={number.format(Number(unit.stock)) + " " + unit.unit_name + " tersisa"}
            trailing={<ProductThumb name={unit.product_name} url={unit.image_url} />} />)}
        </ul> : <EmptyState>Semua satuan aktif di atas ambang stok minimum.</EmptyState>)}
      </section>
      <section className="admin-panel admin-best-sellers">
        <div className="admin-panel-title"><h2>Produk Terlaris</h2><div className="admin-toolbar">
          <PillSelect label="Periode produk terlaris" value={topPeriod} options={topPeriods} onChange={setTopPeriod} />
          <PillSelect label="Kategori produk terlaris" value={category} options={[{ value: "", label: "Semua Kategori" }, ...(categories.data?.data ?? []).map((item) => ({ value: String(item.id), label: item.name }))]} onChange={setCategory} />
        </div></div>
        {categories.isError && <Failure error={categories.error} retry={() => categories.refetch()} />}
        {analyticsState}
        {ready && (ready.best_sellers.length ? <DataTable label="Produk terlaris" headings={["Nama", "Harga", "Terjual / " + (topPeriod === "7d" ? "7 hari" : "30 hari"), "Tren", "Aksi"]}>
          {ready.best_sellers.map((item, index) => <tr key={item.unit_id}>
            <td><div className="admin-product-cell"><ProductThumb name={item.product_name} url={item.image_url} /><div><strong>{item.product_name}</strong><small>{item.unit_name}</small></div></div></td>
            <td>{rupiah(item.price)}</td>
            <td><span className="admin-quantity-change">{number.format(item.quantity)} <ChangeBadge value={item.change} /></span></td>
            <td><Sparkline values={item.trend} tone={index % 2 ? "green" : "purple"} /></td>
            <td><Link className="admin-outline-action" href={"/admin/produk?produk=" + item.product_id}>Lihat Detail<span className="sr-only"> {item.product_name}</span></Link></td>
          </tr>)}
        </DataTable> : <EmptyState>Belum ada produk terjual pada pilihan ini.</EmptyState>)}
      </section>
    </div>
  </div>;
}

function Stats({ overview, data }: { overview: Dashboard; data: DashboardAnalytics }) {
  const track = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const trends = data.stat_trends;
  const pending = trends.pending.map((point) => point.value);
  const processing = trends.processing.map((point) => point.value);
  const cards = [
    { title: "Penjualan Hari Ini", value: rupiah(overview.sales_today.total), label: "Total penjualan", change: percent(overview.sales_today.total, data.sales_yesterday), values: trends.today, tone: "solid" },
    { title: "Pesanan Baru", value: number.format(overview.pending_count), label: "Menunggu konfirmasi", change: dailyChange(pending), values: pending, tone: "lavender" },
    { title: "Pesanan Diproses", value: number.format(data.processing_count), label: "Sedang disiapkan", change: dailyChange(processing), values: processing, tone: "pink" },
    { title: "Stok Menipis", value: number.format(overview.low_stock_count), label: "Satuan stok rendah", change: dailyChange(data.low_stock_trend), values: data.low_stock_trend, tone: "yellow" },
    { title: "Pendapatan Bulan Ini", value: rupiah(data.sales_month.total), label: "Total bulan berjalan", change: percent(data.sales_month.total, data.sales_previous_month), values: trends.month, tone: "blue" },
  ] as const;
  const ordered = [...cards.slice(offset), ...cards.slice(0, offset)];

  function advance() {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    if (max < 2) {
      setOffset((current) => (current + 1) % cards.length);
    } else {
      const step = element.firstElementChild?.getBoundingClientRect().width ?? element.clientWidth;
      element.scrollTo({ left: element.scrollLeft >= max - 3 ? 0 : Math.min(max, element.scrollLeft + step + 9) });
    }
  }

  return <section aria-label="Statistik toko" className="admin-stat-region">
    <div className="admin-stat-track" ref={track} tabIndex={0} role="region" aria-label="Kartu statistik toko">{ordered.map((card) => <StatCard key={card.title} {...card} />)}</div>
    <button type="button" className="admin-stat-next" aria-label="Kartu statistik berikutnya" onClick={advance}><ChevronRight size={19} aria-hidden /></button>
  </section>;
}
