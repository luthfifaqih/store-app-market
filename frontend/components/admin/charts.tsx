"use client";

import { useId, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupiah } from "@/lib/api";

export function Sparkline({ values, tone = "purple" }: { values: number[]; tone?: "purple" | "pink" | "green" | "white" | "blue" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const difference = Math.max(...values) - min || 1;
  const points = values.map((value, index) => [2 + 66 * index / (values.length - 1), 24 - (value - min) / difference * 20]);
  const path = points.slice(1).reduce((result, [x, y], index) => {
    const [prevX, prevY] = points[index];
    const mid = (prevX + x) / 2;
    return result + " C " + mid + " " + prevY + " " + mid + " " + y + " " + x + " " + y;
  }, "M " + points[0].join(" "));
  return <svg aria-hidden className="admin-sparkline" data-tone={tone} viewBox="0 0 70 28"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export function ChangeBadge({ value }: { value: number | null }) {
  const formatted = value === null ? "—" : new Intl.NumberFormat("id-ID", { signDisplay: "exceptZero", maximumFractionDigits: 1 }).format(value) + "%";
  return <span className="admin-change" data-direction={value === null || value === 0 ? "flat" : value > 0 ? "up" : "down"} title={value === null ? "Pembanding belum tersedia" : "Dibandingkan periode sebelumnya"}>{formatted}</span>;
}

export function StatCard({ title, value, label, change, values, tone }: {
  title: string; value: string | number; label: string; change: number | null; values: number[];
  tone: "solid" | "lavender" | "pink" | "yellow" | "blue";
}) {
  return <article className="admin-stat" data-tone={tone}>
    <div className="admin-stat-head"><h2>{title}</h2><ChangeBadge value={change} /></div>
    <div className="admin-stat-body"><div><small>{label}</small><strong>{value}</strong></div>
      <Sparkline values={values} tone={tone === "solid" ? "white" : tone === "pink" ? "pink" : tone === "yellow" ? "green" : tone === "blue" ? "blue" : "purple"} />
    </div>
  </article>;
}

export function ChartCard({ total, points, filters, children }: {
  total?: number; points?: { label: string; value: number }[]; filters: ReactNode; children?: ReactNode;
}) {
  const label = useId();
  return <section className="admin-panel admin-sales-chart" aria-labelledby={label}>
    <div className="admin-panel-title"><h2 id={label}>Grafik Penjualan</h2>{filters}</div>
    {total !== undefined && <div className="admin-chart-total"><span>Total penjualan</span><strong>{rupiah(total)}</strong></div>}
    {points && <div className="admin-chart-canvas" role="group" aria-label="Penjualan dalam Rupiah per periode">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{width: 340, height: 200}}>
        <LineChart data={points} margin={{ top: 10, right: 8, bottom: 3, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--admin-border)" strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} tick={{ fill: "var(--admin-muted)", fontSize: 10 }} minTickGap={14} />
          <YAxis width={42} tickLine={false} axisLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 10 }} tickFormatter={(value: number) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(value)} />
          <Tooltip cursor={{ stroke: "var(--admin-action)", strokeDasharray: "4 4" }}
            content={({ active, payload, label: period }) => active && payload?.length ? <div className="admin-chart-tooltip">{period} · {rupiah(Number(payload[0].value))}</div> : null} />
          <Line type="monotone" dataKey="value" name="Penjualan" stroke="var(--admin-action)" strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: "var(--admin-action)", stroke: "var(--admin-surface)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>}
    {children}
  </section>;
}
