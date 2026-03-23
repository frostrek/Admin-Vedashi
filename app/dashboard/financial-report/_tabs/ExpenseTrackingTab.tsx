'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KPICard from '../_components/KPICard';
import ChartDetailModal from '../_components/ChartDetailModal';
import type { ExpenseBreakdown } from '@/lib/api/analytics';

const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return iso; }
};

const GOLD = '#A89250';
const GOLD_LIGHT = '#C5A46D';
const GOLD_PALE = '#F0E8D5';
const PRIMARY = '#3B5D3B';
const PRIMARY_LIGHT = '#8CAF8C';
const PRIMARY_MID = '#4E7A4E';
const PRIMARY_PALE = '#E8F0E8';
const PIE_COLORS = [PRIMARY, GOLD, PRIMARY_LIGHT, GOLD_LIGHT];

interface ClickDetail {
  title: string;
  heroLabel?: string;
  heroValue?: string | number;
  rows: { label: string; value: string | number }[];
}

export default function ExpenseTrackingTab({ data }: { data?: ExpenseBreakdown }) {
  const [detail, setDetail] = useState<ClickDetail | null>(null);

  if (!data) return (
    <div style={{
      minHeight: 360,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: 36, height: 36, border: `3px solid ${GOLD}`,
        borderTopColor: 'transparent', borderRadius: '50%',
        animation: 'exp-spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 13, color: 'var(--t-text-muted, #888)', fontWeight: 500 }}>Loading expenses…</p>
      <style>{`@keyframes exp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const t = data.totals;
  const computedTotalExpenses = Number(t.shipping || 0) + Number(t.tax || 0) + Number(t.discounts || 0) + Number(t.gatewayFees || 0);
  const computedGrossProfit = Number(t.revenue || 0) - computedTotalExpenses;
  const computedGrossMargin = t.revenue > 0 ? (computedGrossProfit / t.revenue) * 100 : 0;

  const pieData = [
    { name: 'Shipping', value: t.shipping },
    { name: 'Tax', value: t.tax },
    { name: 'Discounts', value: t.discounts },
    { name: 'Gateway Fees', value: t.gatewayFees },
  ].filter(d => d.value > 0);

  const pieTotal = pieData.reduce((s, p) => s + p.value, 0);

  const handleBarClick = (payload: any) => {
    const pt = payload;
    if (!pt || !pt.period) return;
    const total = Number(pt.shipping || 0) + Number(pt.tax || 0) + Number(pt.discounts || 0) + Number(pt.gatewayFees || 0);
    setDetail({
      title: `Expenses — ${formatDate(String(pt.period))}`,
      heroLabel: 'Total Expenses',
      heroValue: formatINR(total),
      rows: [
        { label: 'Period', value: formatDate(String(pt.period)) },
        { label: 'Shipping', value: formatINR(Number(pt.shipping || 0)) },
        { label: 'Tax', value: formatINR(Number(pt.tax || 0)) },
        { label: 'Discounts', value: formatINR(Number(pt.discounts || 0)) },
        { label: 'Gateway Fees', value: formatINR(Number(pt.gatewayFees || 0)) },
        { label: 'Total', value: formatINR(total) },
      ],
    });
  };

  const handlePieClick = (entry: any, index: number) => {
    let e = null;
    if (entry === null && typeof index === 'number') { e = pieData[index]; }
    else if (entry?.payload) { e = entry.payload; }
    else if (entry?.name) { e = entry; }
    else if (typeof index === 'number') { e = pieData[index]; }
    if (!e) return;
    setDetail({
      title: `${entry.name}`,
      heroLabel: entry.name,
      heroValue: formatINR(entry.value),
      rows: [
        { label: 'Category', value: entry.name },
        { label: 'Amount', value: formatINR(entry.value) },
        { label: 'Share', value: pieTotal > 0 ? `${((entry.value / pieTotal) * 100).toFixed(1)}%` : '—' },
        { label: 'Total Expenses', value: formatINR(computedTotalExpenses) },
        { label: 'Gross Profit Impact', value: computedGrossProfit > 0 ? `${((entry.value / computedGrossProfit) * 100).toFixed(1)}% of profit` : '—' },
      ],
    });
  };

  const BarTooltipContent = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--t-card-bg, #1C2A1C)',
        border: '1px solid rgba(168,146,80,0.22)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        fontFamily: "'DM Sans', sans-serif",
        minWidth: 160,
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: GOLD, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatDate(String(label))}</p>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, padding: '2px 0' }}>
            <span style={{ color: 'var(--t-text-secondary, #aaa)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
              {p.name}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--t-text-primary, #fff)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const PieTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value, fill } = payload[0];
    const pct = pieTotal > 0 ? ((value / pieTotal) * 100).toFixed(1) : '0';
    return (
      <div style={{
        background: 'var(--t-card-bg, #1C2A1C)',
        border: '1px solid rgba(168,146,80,0.22)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: fill, display: 'inline-block' }} />
          {name}
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: 'var(--t-text-primary, #fff)', fontVariantNumeric: 'tabular-nums' }}>
          {formatINR(value)} <span style={{ color: fill, fontSize: 11 }}>({pct}%)</span>
        </p>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ext { display:flex; flex-direction:column; gap:20px; font-family:'DM Sans',sans-serif; animation:ext-in 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes ext-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

        .ext-card {
          background:var(--t-card-bg,#1C2A1C);
          border:1px solid rgba(168,146,80,0.13);
          border-radius:18px; padding:24px;
          display:flex; flex-direction:column;
          transition:box-shadow 0.2s, transform 0.2s;
        }
        .ext-card:hover { box-shadow:0 6px 28px rgba(168,146,80,0.10); transform:translateY(-2px); }

        .ext-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .ext-sh-left { display:flex; align-items:center; gap:10px; }
        .ext-sh-bar { width:3px; height:16px; border-radius:2px; flex-shrink:0; background:linear-gradient(to bottom,${GOLD},${GOLD_LIGHT}); }
        .ext-sh-title { font-size:11px; font-weight:700; letter-spacing:0.10em; text-transform:uppercase; color:var(--t-text-muted,#888); }
        .ext-sh-badge { font-size:10px; letter-spacing:0.03em; color:var(--t-text-muted,#888); background:var(--t-page-bg,rgba(255,255,255,0.04)); border:1px solid rgba(168,146,80,0.10); border-radius:999px; padding:3px 10px; }
        .ext-rule { height:1px; margin:14px 0; background:linear-gradient(90deg,transparent,${GOLD} 30%,${GOLD_LIGHT} 50%,${GOLD} 70%,transparent); opacity:0.18; }

        .ext-kpi { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
        @media(max-width:1100px){ .ext-kpi{ grid-template-columns:repeat(3,1fr); } }
        @media(max-width:640px) { .ext-kpi{ grid-template-columns:1fr 1fr; } }

        .ext-row { display:grid; grid-template-columns:2fr 1fr; gap:20px; }
        @media(max-width:900px){ .ext-row{ grid-template-columns:1fr; } }

        .ext-pie-wrap { position:relative; height:220px; }
        .ext-pie-centre { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; gap:2px; }
        .ext-pie-label { font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--t-text-muted,#777); }
        .ext-pie-val { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:700; color:${GOLD}; line-height:1.1; font-variant-numeric:tabular-nums; }

        .ext-legend-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:8px 10px; border-radius:10px; cursor:pointer;
          border-bottom:1px solid rgba(168,146,80,0.07);
          transition:background 0.15s;
        }
        .ext-legend-row:last-child { border-bottom:none; }
        .ext-legend-row:hover { background:rgba(255,255,255,0.04); }
      `}</style>

      <div className="ext">
        {detail && (
          <ChartDetailModal
            title={detail.title}
            heroLabel={detail.heroLabel}
            heroValue={detail.heroValue}
            rows={detail.rows}
            onClose={() => setDetail(null)}
          />
        )}

        {/* KPI Strip */}
        <div className="ext-kpi">
          <KPICard label="Shipping Costs" value={formatINR(t.shipping)} tooltip="Total shipping charges from orders" />
          <KPICard label="Tax Collected" value={formatINR(t.tax)} tooltip="GST + VAT collected" />
          <KPICard label="Discounts Given" value={formatINR(t.discounts)} tooltip="Sale + Coupon + Loyalty discounts" />
          <KPICard label="Est. Gateway Fees" value={formatINR(t.gatewayFees)} tooltip="~2% of online payment revenue" />
          <KPICard label="Gross Profit" value={formatINR(computedGrossProfit)} tooltip="Revenue − All Expenses" delta={computedGrossMargin} />
        </div>

        {/* Charts Row */}
        <div className="ext-row">

          {/* Stacked Bar Chart */}
          <div className="ext-card" style={{ minHeight: 380 }}>
            <div className="ext-sh">
              <div className="ext-sh-left"><div className="ext-sh-bar" /><span className="ext-sh-title">Expense Breakdown Over Time</span></div>
              <span className="ext-sh-badge">Click a bar</span>
            </div>
            <div className="ext-rule" />
            <div style={{ flex: 1, minHeight: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    handleBarClick(state.activePayload[0].payload);
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(168,146,80,0.07)" />
                  <XAxis dataKey="period" stroke="var(--t-text-muted,#666)" fontSize={10} tickFormatter={formatDate} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--t-text-muted,#666)" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<BarTooltipContent />} cursor={{ fill: 'rgba(168,146,80,0.06)' }} />
                  <Bar dataKey="shipping" name="Shipping" stackId="a" fill={PRIMARY} radius={[0, 0, 0, 0]} style={{ cursor: 'pointer' }} />
                  <Bar dataKey="tax" name="Tax" stackId="a" fill={GOLD} style={{ cursor: 'pointer' }} />
                  <Bar dataKey="discounts" name="Discounts" stackId="a" fill={PRIMARY_LIGHT} style={{ cursor: 'pointer' }} />
                  <Bar dataKey="gatewayFees" name="Gateway" stackId="a" fill={GOLD_LIGHT} radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Proportions Donut */}
          <div className="ext-card">
            <div className="ext-sh">
              <div className="ext-sh-left"><div className="ext-sh-bar" /><span className="ext-sh-title">Proportions</span></div>
              <span className="ext-sh-badge">Click a slice</span>
            </div>
            <div className="ext-rule" />
            <div className="ext-pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={handlePieClick}
                    style={{ cursor: 'pointer', outline: 'none' }}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<PieTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="ext-pie-centre">
                <span className="ext-pie-label">Total</span>
                <span className="ext-pie-val">{formatINR(computedTotalExpenses)}</span>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              {pieData.map((p, i) => {
                const pct = pieTotal > 0 ? ((p.value / pieTotal) * 100).toFixed(1) : '0.0';
                const col = PIE_COLORS[i % PIE_COLORS.length];
                return (
                  <div key={p.name} className="ext-legend-row" onClick={() => handlePieClick(null, i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePieClick(null, i); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: col, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--t-text-secondary,#bbb)' }}>{p.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text-primary,#fff)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(p.value)}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: col,
                        background: i === 0 ? PRIMARY_PALE : GOLD_PALE,
                        border: `1px solid ${col}33`,
                        borderRadius: 999, padding: '2px 8px', minWidth: 44, textAlign: 'center',
                      }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
