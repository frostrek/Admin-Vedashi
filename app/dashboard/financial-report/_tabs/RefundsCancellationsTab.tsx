'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import KPICard from '../_components/KPICard';
import ChartDetailModal from '../_components/ChartDetailModal';
import type { RefundSummary } from '@/lib/api/analytics';

const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return iso; }
};

const GOLD = '#A89250';
const PRIMARY = '#3B5D3B';
const DANGER = '#8B3D3D';

interface ClickDetail {
  title: string;
  rows: { label: string; value: string | number }[];
}

export default function RefundsCancellationsTab({ data }: { data?: RefundSummary }) {
  const [detail, setDetail] = useState<ClickDetail | null>(null);

  if (!data) return null;

  const handleTimelineClick = (data: any) => {
    const pt = data?.activePayload?.[0]?.payload || data?.payload || data;
    if (!pt || !pt.date) return;
    setDetail({
      title: `🔄 Refunds — ${formatDate(pt.date)}`,
      rows: [
        { label: 'Date', value: formatDate(pt.date) },
        { label: 'Refund Count', value: pt.count },
        { label: 'Refund Amount', value: formatINR(pt.amount) },
        { label: 'Avg per Refund', value: pt.count > 0 ? formatINR(pt.amount / pt.count) : '—' },
      ],
    });
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-border bg-card-bg px-4 py-3 shadow-xl">
        <p className="text-xs font-semibold text-gold mb-1">{formatDate(String(label))}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm text-text-primary font-mono">{p.name}: {p.name === 'Amount' ? formatINR(p.value) : p.value}</p>
        ))}
      </div>
    );
  };

  // Summary bar data
  const summaryBars = [
    { name: 'Refund Total', value: data.refundTotal, color: GOLD },
    { name: 'Cancel Lost Rev', value: data.cancelLostRevenue, color: DANGER },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ref { display:flex; flex-direction:column; gap:20px; font-family:'DM Sans',sans-serif; animation:ref-in 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes ref-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

        .ref-card {
          background:var(--t-card-bg,#1C2A1C);
          border:1px solid rgba(168,146,80,0.13);
          border-radius:18px; padding:24px;
          display:flex; flex-direction:column;
          transition:box-shadow 0.2s, transform 0.2s;
        }
        .ref-card:hover { box-shadow:0 6px 28px rgba(168,146,80,0.10); transform:translateY(-2px); }

        .ref-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .ref-sh-left { display:flex; align-items:center; gap:10px; }
        .ref-sh-bar { width:3px; height:16px; border-radius:2px; flex-shrink:0; background:linear-gradient(to bottom,${GOLD},#C5A46D); }
        .ref-sh-title { font-size:11px; font-weight:700; letter-spacing:0.10em; text-transform:uppercase; color:var(--t-text-muted,#888); }
        .ref-sh-badge { font-size:10px; letter-spacing:0.03em; color:var(--t-text-muted,#888); background:var(--t-page-bg,rgba(255,255,255,0.04)); border:1px solid rgba(168,146,80,0.10); border-radius:999px; padding:3px 10px; }
        .ref-rule { height:1px; margin:14px 0; background:linear-gradient(90deg,transparent,${GOLD} 30%,#C5A46D 50%,${GOLD} 70%,transparent); opacity:0.18; }

        .ref-kpi { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media(max-width:1100px){ .ref-kpi{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:640px) { .ref-kpi{ grid-template-columns:1fr 1fr; } }

        .ref-kpi2 { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }

        .ref-row { display:grid; grid-template-columns:2fr 1fr; gap:20px; }
        @media(max-width:900px){ .ref-row{ grid-template-columns:1fr; } }

        .ref-impact-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .ref-impact-label { font-size:12px; color:var(--t-text-secondary,#aaa); }
        .ref-impact-val { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:700; color:var(--t-text-primary,#fff); font-variant-numeric:tabular-nums; }
      `}</style>
      
      <div className="ref">
        {detail && <ChartDetailModal title={detail.title} rows={detail.rows} onClose={() => setDetail(null)} />}

        {/* KPI Cards */}
        <div className="ref-kpi">
          <KPICard 
            label="Refund Count" 
            value={data.refundCount} 
            tooltip="Total number of items or orders that were returned and refunded." 
          />
          <KPICard 
            label="Total Refunded" 
            value={formatINR(data.refundTotal)} 
            tooltip="Sum total of the monetary value returned to customers." 
          />
          <KPICard 
            label="Avg Refund" 
            value={formatINR(data.avgRefund)} 
            tooltip="The average amount refunded per transaction (Total Refunded ÷ Refund Count)."
          />
          <KPICard 
            label="Refund Rate" 
            value={`${data.refundRate}%`} 
            isInvertedDelta 
            tooltip={`The percentage of orders that resulted in a refund (Out of ${data.totalOrders} total orders).`} 
          />
        </div>

        <div className="ref-kpi2">
          <KPICard 
            label="Cancellations" 
            value={data.cancelCount} 
            tooltip="Total number of orders cancelled by customers or the store before they were fulfilled." 
          />
          <KPICard 
            label="Lost Revenue" 
            value={formatINR(data.cancelLostRevenue)} 
            tooltip="Total potential revenue lost due to order cancellations." 
            isInvertedDelta 
          />
        </div>

        <div className="ref-row">
          {/* Refund Timeline Area Chart */}
          <div className="ref-card" style={{ minHeight: 380 }}>
            <div className="ref-sh">
              <div className="ref-sh-left"><div className="ref-sh-bar" /><span className="ref-sh-title">Refund Activity Timeline</span></div>
              <span className="ref-sh-badge">Click a point</span>
            </div>
            <div className="ref-rule" />
            <div style={{ flex: 1, minHeight: 280 }}>
              {data.timeline?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline} onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      handleTimelineClick(state.activePayload[0].payload);
                    }
                  }} style={{ cursor: 'pointer' }}>
                    <defs>
                      <linearGradient id="refundGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(168,146,80,0.07)" />
                    <XAxis dataKey="date" stroke="var(--t-text-muted,#666)" fontSize={10} tickFormatter={formatDate} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="var(--t-text-muted,#666)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--t-text-muted,#666)" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(168,146,80,0.2)' }} />
                    <Bar yAxisId="left" dataKey="count" name="Count" fill={PRIMARY} radius={[4, 4, 0, 0]} barSize={20} />
                    <Area yAxisId="right" type="monotone" dataKey="amount" name="Amount" stroke={GOLD} fill="url(#refundGrad)" strokeWidth={2}
                      dot={{ r: 4, fill: GOLD, stroke: 'var(--t-card-bg,#1C2A1C)', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: GOLD, stroke: PRIMARY, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 13, color: 'var(--t-text-muted,#888)' }}>
                  No refunds in this period 🎉
                </div>
              )}
            </div>
          </div>

          {/* Summary Bar */}
          <div className="ref-card">
            <div className="ref-sh">
              <div className="ref-sh-left"><div className="ref-sh-bar" /><span className="ref-sh-title">Impact Summary</span></div>
            </div>
            <div className="ref-rule" />
            <div style={{ flex: 1, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryBars} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(168,146,80,0.07)" />
                  <XAxis type="number" stroke="var(--t-text-muted,#666)" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--t-text-muted,#666)" fontSize={11} width={100} tick={{ fill:'var(--t-text-secondary,#aaa)', fontFamily:"'DM Sans',sans-serif" }} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(168,146,80,0.22)', backgroundColor: 'var(--t-card-bg,#1C2A1C)', fontFamily:"'DM Sans',sans-serif", fontSize: 12 }}
                    formatter={(val: number | undefined) => formatINR(val ?? 0)}
                    cursor={{ fill: 'rgba(168,146,80,0.06)' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {summaryBars.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(168,146,80,0.1)' }}>
              <div className="ref-impact-row">
                <span className="ref-impact-label">Total Impact</span>
                <span className="ref-impact-val" style={{ color: GOLD }}>{formatINR(data.refundTotal + data.cancelLostRevenue)}</span>
              </div>
              <div className="ref-impact-row" style={{ marginBottom: 0 }}>
                <span className="ref-impact-label">Refund Rate</span>
                <span className="ref-impact-val">{data.refundRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
