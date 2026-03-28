'use client';

import { useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import KPICard from '../_components/KPICard';
import ChartDetailModal from '../_components/ChartDetailModal';
import { FinancialReportData } from '@/lib/api/analytics';

/* ── Formatters ─────────────────────────────────────────────── */
const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
};

/* ── Vedashi brand palette ──────────────────────────────────── */
const GOLD        = '#A89250';
const GOLD_LIGHT  = '#C5A46D';
const GOLD_PALE   = '#F0E8D5';
const PRIMARY     = '#3B5D3B';
const PRIMARY_LIGHT = '#8CAF8C';
const PRIMARY_PALE  = '#E8F0E8';

/* ── Types ──────────────────────────────────────────────────── */
interface ClickDetail {
  title: string;
  heroLabel?: string;
  heroValue?: string | number;
  rows: { label: string; value: string | number }[];
}

/* ── Clickable dot for area chart ───────────────────────────── */
function ClickableDot(props: {
  cx?: number;
  cy?: number;
  payload?: { period: string; revenue: number; orders: number; newCustomers?: number; returningOrders?: number };
  onDotClick: (p: { period: string; revenue: number; orders: number; newCustomers?: number; returningOrders?: number }) => void;
}) {
  const { cx, cy, payload, onDotClick } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx} cy={cy} r={7}
      fill={GOLD_LIGHT}
      stroke={GOLD}
      strokeWidth={2.5}
      style={{ cursor: 'pointer', filter: 'drop-shadow(0 0 5px rgba(168,146,80,0.45))' }}
      onClick={(e) => { e.stopPropagation(); onDotClick(payload); }}
    />
  );
}

/* ── Custom tooltip ─────────────────────────────────────────── */
function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: any;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const revenue = payload[0].value;
  const orders = payload[0].payload?.orders;

  return (
    <div
      style={{
        background: 'var(--t-card-bg)',
        border: '1px solid var(--t-border)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {formatDate(String(label))}
      </p>
      <div className="space-y-1">
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatINR(revenue)}
        </p>
        {orders !== undefined && (
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--t-text-secondary)' }}>
             {orders} Orders
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────── */
function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <span
          style={{
            display: 'inline-block',
            width: 3,
            height: 16,
            borderRadius: 2,
            background: `linear-gradient(to bottom, ${GOLD}, ${GOLD_LIGHT})`,
          }}
        />
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--t-text-muted)',
          }}
        >
          {title}
        </h3>
      </div>
      {hint && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--t-text-muted)',
            background: 'var(--t-page-bg)',
            border: `1px solid var(--t-border-subtle)`,
            borderRadius: 999,
            padding: '3px 10px',
            letterSpacing: '0.02em',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

/* ── Chart card wrapper ─────────────────────────────────────── */
function ChartCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card-bg shadow-sm hover-lift transition-shadow duration-200 p-6 flex flex-col ${className}`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {children}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function ExecutiveSummaryTab({
  data,
  prevData,
}: {
  data?: FinancialReportData;
  prevData?: FinancialReportData;
}) {
  const [detail, setDetail] = useState<ClickDetail | null>(null);
  if (!data) return null;

  const { summary, salesTrend } = data;

  /* deltas */
  const currentRev    = summary.totalRevenue      || 0;
  const prevRev       = prevData?.summary.totalRevenue || 0;
  const revDelta      = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : currentRev > 0 ? 100 : 0;

  const currentOrd    = summary.totalOrders       || 0;
  const prevOrd       = prevData?.summary.totalOrders || 0;
  const ordDelta      = prevOrd > 0 ? ((currentOrd - prevOrd) / prevOrd) * 100 : currentOrd > 0 ? 100 : 0;

  const currentAov    = summary.avgOrderValue     || 0;
  const prevAov       = prevData?.summary.avgOrderValue || 0;
  const aovDelta      = prevAov > 0 ? ((currentAov - prevAov) / prevAov) * 100 : currentAov > 0 ? 100 : 0;

  const currentCancel = summary.cancellationRate  || 0;
  const prevCancel    = prevData?.summary.cancellationRate || 0;
  const cancelDelta   = currentCancel - prevCancel;

  /* pie data */
  const pieData   = [
    { name: 'New',       value: summary.newVsReturning?.new       || 0 },
    { name: 'Returning', value: summary.newVsReturning?.returning || 0 },
  ];
  const PIE_COLORS = [PRIMARY_LIGHT, GOLD];
  const pieTotal  = pieData.reduce((s, p) => s + p.value, 0);

  /* handlers */
  const handleDotClick = useCallback(
    (pt: { period: string; revenue: number; orders: number; newCustomers?: number; returningOrders?: number }) => {
      setDetail({
        title: `📊 Sales — ${formatDate(pt.period)}`,
        heroLabel: 'Daily Revenue',
        heroValue: formatINR(pt.revenue),
        rows: [
          { label: 'Date',             value: formatDate(pt.period) },
          { label: 'Total Orders',      value: pt.orders?.toLocaleString('en-IN') || '—' },
          { label: 'New Customers',     value: pt.newCustomers?.toLocaleString('en-IN') || '0' },
          { label: 'Returning Orders',  value: pt.returningOrders?.toLocaleString('en-IN') || '0' },
          { label: 'Avg / Order',      value: pt.orders > 0 ? formatINR(pt.revenue / pt.orders) : '—' },
          { label: 'Rev Share',        value: currentRev > 0 ? `${((pt.revenue / currentRev) * 100).toFixed(1)}%` : '—' },
        ],
      });
    },
    [currentRev],
  );

  const handlePieClick = (_: unknown, index: number) => {
    const entry = pieData[index];
    setDetail({
      title: `👥 ${entry.name} Customers`,
      heroLabel: `${entry.name} Customers`,
      heroValue: entry.value.toLocaleString('en-IN'),
      rows: [
        { label: 'Share',            value: pieTotal > 0 ? `${((entry.value / pieTotal) * 100).toFixed(1)}%` : '—' },
        { label: 'Total Customers',  value: pieTotal.toLocaleString('en-IN') },
        { label: 'Repeat Rate',      value: `${summary.repeatCustomerRate ?? 0}%` },
      ],
    });
  };

  /* ── Custom Pie Tooltip ────────────────────────────────────── */
  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value, fill } = payload[0];
    const pct = pieTotal > 0 ? ((value / pieTotal) * 100).toFixed(1) : '0';
    
    return (
      <div
        style={{
          background: 'var(--t-card-bg)',
          border: '1px solid var(--t-border)',
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          zIndex: 1000,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: fill }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {name}
          </span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--t-text-primary)' }}>
          {value.toLocaleString('en-IN')}
          <span style={{ fontSize: 12, fontWeight: 600, color: fill, marginLeft: 6 }}>({pct}%)</span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-7 animate-fadeIn">
      {detail && (
        <ChartDetailModal
          title={detail.title}
          heroLabel={detail.heroLabel}
          heroValue={detail.heroValue}
          rows={detail.rows}
          onClose={() => setDetail(null)}
        />
      )}

      {/* ── KPI Grid ─────────────────────────────────────────── */ }
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={formatINR(currentRev)}
          delta={revDelta}
          tooltip="Gross revenue generated from all sales before deductions or refunds."
        />
        <KPICard
          label="Total Orders"
          value={currentOrd.toLocaleString('en-IN')}
          delta={ordDelta}
          tooltip="The total count of orders placed within the selected time range."
        />
        <KPICard
          label="Avg Order Value"
          value={formatINR(currentAov)}
          delta={aovDelta}
          tooltip="Average amount spent per order, calculated as total revenue divided by order count."
        />
        <KPICard
          label="Cancellation Rate"
          value={`${currentCancel}%`}
          delta={cancelDelta}
          isInvertedDelta
          tooltip="The percentage of placed orders that were cancelled. Lower is better."
        />
      </div>

      {/* ── Charts Row ───────────────────────────────────────── */ }
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Area Chart */}
        <ChartCard className="xl:col-span-2 min-h-[400px]">
          <SectionHeader title="Sales Trend" hint="Click a dot for details" />

          <div className="flex-1" style={{ minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={GOLD} stopOpacity={0.30} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.00} />
                  </linearGradient>
                  {/* subtle background band */}
                  <linearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={GOLD_PALE}    stopOpacity={0.25} />
                    <stop offset="100%" stopColor={PRIMARY_PALE} stopOpacity={0.10} />
                  </linearGradient>
                </defs>

                {/* tinted background rect */}
                <rect x="0" y="0" width="100%" height="100%" fill="url(#chartBg)" rx={8} />

                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="var(--t-border-subtle)"
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="period"
                  stroke="var(--t-text-muted)"
                  fontSize={10}
                  tickMargin={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatDate(v)}
                />
                <YAxis
                  stroke="var(--t-text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  fill="url(#goldFill)"
                  dot={{ r: 4, fill: GOLD_LIGHT, stroke: GOLD, strokeWidth: 2, cursor: 'pointer' }}
                  activeDot={<ClickableDot onDotClick={handleDotClick} />}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* mini stat bar below chart */}
          <div
            className="mt-5 pt-4 grid grid-cols-3 gap-4 border-t border-border"
          >
            {[
              { label: 'Peak Day', value: salesTrend?.length ? formatINR(Math.max(...salesTrend.map((d) => d.revenue))) : '—' },
              { label: 'Data Points', value: salesTrend?.length ?? 0 },
              { label: 'Period Avg', value: salesTrend?.length ? formatINR(currentRev / salesTrend.length) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p style={{ fontSize: 10, color: 'var(--t-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {label}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: GOLD, fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Donut Chart */}
        <ChartCard>
          <SectionHeader title="New vs Returning" hint="Click a slice" />

          {/* donut */}
          <div className="relative flex-1" style={{ minHeight: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={62} outerRadius={84}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={handlePieClick}
                  style={{ cursor: 'pointer', outline: 'none' }}
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* centred stat */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ gap: 2 }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--t-text-muted)' }}>
                Repeat Rate
              </span>
              <span style={{ fontSize: 26, fontWeight: 800, color: GOLD, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {summary.repeatCustomerRate ?? 0}%
              </span>
            </div>
          </div>

          {/* legend pills */}
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
            {pieData.map((entry, i) => {
              const pct = pieTotal > 0 ? ((entry.value / pieTotal) * 100).toFixed(1) : '0.0';
              return (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: PIE_COLORS[i],
                        display: 'inline-block', flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--t-text-secondary)' }}>{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {entry.value.toLocaleString('en-IN')}
                    </span>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600,
                        color: i === 1 ? GOLD : PRIMARY,
                        background: i === 1 ? GOLD_PALE : PRIMARY_PALE,
                        borderRadius: 999, padding: '2px 8px',
                        minWidth: 48, textAlign: 'center',
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* total row */}
          <div
            className="mt-3 pt-3 border-t border-border flex items-center justify-between"
          >
            <span style={{ fontSize: 12, color: 'var(--t-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Total
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {pieTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </ChartCard>

      </div>
    </div>
  );
}