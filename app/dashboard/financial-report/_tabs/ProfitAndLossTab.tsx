'use client';

import { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import KPICard from '../_components/KPICard';
import HourlyHeatmap from '../_components/HourlyHeatmap';
import ChartDetailModal from '../_components/ChartDetailModal';
import { FinancialReportData } from '@/lib/api/analytics';

const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const GOLD         = '#A89250';
const GOLD_LIGHT   = '#C5A46D';
const GOLD_PALE    = '#F0E8D5';
const PRIMARY      = '#3B5D3B';
const PRIMARY_MID  = '#4E7A4E';
const PRIMARY_PALE = '#E8F0E8';
const DANGER       = '#C0392B';
const CHART_COLORS = ['#3B5D3B', '#A89250', '#6E9B6E', '#C5A46D', '#5D7A5D', '#8B7A3D'];

interface ClickDetail {
  title: string;
  heroLabel?: string;
  heroValue?: string | number;
  rows: { label: string; value: string | number }[];
}

export default function ProfitAndLossTab({ data }: { data?: FinancialReportData }) {
  const [detail, setDetail] = useState<ClickDetail | null>(null);
  if (!data) return null;

  const rev         = data.summary.totalRevenue || 0;
  const cogs        = rev * 0.4;
  const grossProfit = rev - cogs;
  const opex        = rev * 0.15;
  const netProfit   = grossProfit - opex;
  const grossMargin = rev > 0 ? (grossProfit / rev) * 100 : 0;
  const netMargin   = rev > 0 ? (netProfit / rev) * 100 : 0;
  const payTotal    = data.paymentBreakdown.reduce((s, p) => s + p.amount, 0);

  const handlePieClick = (entry: any, index: number) => {
    let e = null;
    if (entry === null && typeof index === 'number') { e = data.paymentBreakdown[index]; }
    else if (entry?.payload) { e = entry.payload; }
    else if (entry?.method) { e = entry; }
    else if (typeof index === 'number') { e = data.paymentBreakdown[index]; }
    
    if (!e) return;
    setDetail({
      title: `Payment — ${e.method}`,
      heroLabel: 'Total Amount', heroValue: formatINR(e.amount),
      rows: [
        { label: 'Method',            value: e.method },
        { label: 'Transactions',      value: e.count?.toLocaleString('en-IN') ?? '—' },
        { label: 'Share',             value: payTotal > 0 ? `${((e.amount / payTotal) * 100).toFixed(1)}%` : '—' },
        { label: 'Avg / Transaction', value: e.count > 0 ? formatINR(e.amount / e.count) : '—' },
      ],
    });
  };

  const handleBarClick = (entry: any) => {
    // entry from Bar onClick is the data point directly (has .payload for raw data, or is the raw data)
    const pt = entry?.payload || entry;
    if (!pt?.category) return;
    setDetail({
      title: `Category — ${pt.category}`,
      heroLabel: 'Revenue', heroValue: formatINR(pt.revenue),
      rows: [
        { label: 'Category',      value: pt.category },
        { label: 'Orders',        value: pt.orders?.toLocaleString('en-IN') ?? '—' },
        { label: 'Revenue Share', value: rev > 0 ? `${((pt.revenue / rev) * 100).toFixed(1)}%` : '—' },
        { label: 'Avg / Order',   value: pt.orders > 0 ? formatINR(pt.revenue / pt.orders) : '—' },
      ],
    });
  };

  const handleWaterfallClick = (item: typeof wfItems[number]) => {
    const isNeg = item.value < 0;
    setDetail({
      title: `P&L — ${item.label}`,
      heroLabel: item.label,
      heroValue: `${isNeg ? '−' : ''}${formatINR(Math.abs(item.value))}`,
      rows: [
        { label: 'Category',       value: item.label },
        { label: 'Amount',         value: `${isNeg ? '−' : ''}${formatINR(Math.abs(item.value))}` },
        { label: '% of Revenue',   value: rev > 0 ? `${item.pct.toFixed(1)}%` : '—' },
        { label: 'Type',           value: item.bold ? 'Subtotal' : (isNeg ? 'Deduction' : 'Income') },
        { label: 'Gross Revenue',  value: formatINR(rev) },
        { label: 'Net Profit',     value: formatINR(netProfit) },
      ],
    });
  };

  const handleProductClick = (p: { rank: number; name: string; productId: string; unitsSold: number; revenue: number }) => {
    setDetail({
      title: `#${p.rank} — ${p.name}`,
      heroLabel: 'Revenue', heroValue: formatINR(p.revenue),
      rows: [
        { label: 'Product ID',     value: p.productId },
        { label: 'Units Sold',     value: p.unitsSold.toLocaleString('en-IN') },
        { label: 'Revenue Share',  value: rev > 0 ? `${((p.revenue / rev) * 100).toFixed(1)}%` : '—' },
        { label: 'Avg Unit Price', value: p.unitsSold > 0 ? formatINR(p.revenue / p.unitsSold) : '—' },
      ],
    });
  };

  const wfItems = [
    { label: 'Gross Revenue',     value: rev,         pct: 100,         pos: true,  bold: false },
    { label: 'Est. COGS (−40%)',  value: -cogs,       pct: 40,          pos: false, bold: false },
    { label: 'Gross Profit',      value: grossProfit, pct: grossMargin, pos: true,  bold: true  },
    { label: 'Operating Exp.',    value: -opex,       pct: 15,          pos: false, bold: false },
    { label: 'Net Profit (Est.)', value: netProfit,   pct: netMargin,   pos: true,  bold: true  },
  ];

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value, fill } = payload[0];
    const pct = payTotal > 0 ? ((value / payTotal) * 100).toFixed(1) : '0';
    return (
      <div style={{ background:'var(--t-card-bg,#1C2A1C)', border:'1px solid rgba(168,146,80,0.22)', borderRadius:12, padding:'10px 14px', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, fontSize:10, fontWeight:700, color:GOLD, textTransform:'uppercase', letterSpacing:'0.08em' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:fill, display:'inline-block' }} />
          {name}
        </div>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:'var(--t-text-primary,#fff)', fontVariantNumeric:'tabular-nums' }}>
          {formatINR(value)} <span style={{ color:fill, fontSize:11 }}>({pct}%)</span>
        </p>
      </div>
    );
  };

  const BarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { category, revenue } = payload[0].payload;
    return (
      <div style={{ background:'var(--t-card-bg,#1C2A1C)', border:'1px solid rgba(168,146,80,0.22)', borderRadius:12, padding:'10px 14px', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', fontFamily:"'DM Sans',sans-serif" }}>
        <p style={{ fontSize:10, fontWeight:700, color:GOLD, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{category}</p>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:'var(--t-text-primary,#fff)', fontVariantNumeric:'tabular-nums' }}>{formatINR(revenue)}</p>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .plv2 { display:flex; flex-direction:column; gap:20px; font-family:'DM Sans',sans-serif; animation:plv2-in 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes plv2-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

        .plv2-card {
          background:var(--t-card-bg,#1C2A1C);
          border:1px solid rgba(168,146,80,0.13);
          border-radius:18px; padding:24px;
          display:flex; flex-direction:column;
          transition:box-shadow 0.2s, transform 0.2s;
        }
        .plv2-card:hover { box-shadow:0 6px 28px rgba(168,146,80,0.10); transform:translateY(-2px); }

        .plv2-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .plv2-sh-left { display:flex; align-items:center; gap:10px; }
        .plv2-sh-bar { width:3px; height:16px; border-radius:2px; flex-shrink:0; background:linear-gradient(to bottom,${GOLD},${GOLD_LIGHT}); }
        .plv2-sh-title { font-size:11px; font-weight:700; letter-spacing:0.10em; text-transform:uppercase; color:var(--t-text-muted,#888); }
        .plv2-sh-badge { font-size:10px; letter-spacing:0.03em; color:var(--t-text-muted,#888); background:var(--t-page-bg,rgba(255,255,255,0.04)); border:1px solid rgba(168,146,80,0.10); border-radius:999px; padding:3px 10px; }
        .plv2-rule { height:1px; margin:14px 0; background:linear-gradient(90deg,transparent,${GOLD} 30%,${GOLD_LIGHT} 50%,${GOLD} 70%,transparent); opacity:0.18; }

        .plv2-row2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .plv2-row3 { display:grid; grid-template-columns:1.5fr 1fr; gap:20px; }
        @media(max-width:900px){ .plv2-row2,.plv2-row3{ grid-template-columns:1fr; } }

        .plv2-kpi-strip { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; }
        @media(max-width:1100px){ .plv2-kpi-strip{ grid-template-columns:repeat(3,1fr); } }
        @media(max-width:640px) { .plv2-kpi-strip{ grid-template-columns:1fr 1fr; } }

        /* waterfall */
        .plv2-wf-item { display:grid; grid-template-columns:176px 1fr 116px; align-items:center; gap:14px; padding:11px 6px; border-bottom:1px solid rgba(168,146,80,0.07); opacity:0; animation:plv2-in 0.38s cubic-bezier(0.22,1,0.36,1) forwards; border-radius:10px; transition:background 0.15s; }
        .plv2-wf-item:last-child { border-bottom:none; }
        .plv2-wf-item:hover { background:rgba(255,255,255,0.04); }
        .plv2-wf-label { font-size:12px; font-weight:400; color:var(--t-text-secondary,#aaa); }
        .plv2-wf-label--bold { font-size:13px; font-weight:700; color:var(--t-text-primary,#fff); }
        .plv2-wf-track { height:7px; border-radius:999px; background:rgba(255,255,255,0.06); overflow:hidden; }
        .plv2-wf-fill { height:100%; border-radius:999px; transition:width 0.8s cubic-bezier(0.22,1,0.36,1); }
        .plv2-wf-val { font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:700; text-align:right; font-variant-numeric:tabular-nums; }
        .plv2-wf-val--bold { font-size:20px; }

        /* payment */
        .plv2-pie-wrap { position:relative; height:210px; }
        .plv2-pie-centre { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; gap:2px; }
        .plv2-pie-label { font-size:9px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--t-text-muted,#777); }
        .plv2-pie-val { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:700; color:${GOLD}; line-height:1.1; font-variant-numeric:tabular-nums; }
        .plv2-pay-row { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-radius:10px; cursor:pointer; border-bottom:1px solid rgba(168,146,80,0.07); transition:background 0.15s; }
        .plv2-pay-row:last-child { border-bottom:none; }
        .plv2-pay-row:hover { background:rgba(255,255,255,0.04); }

        /* products */
        .plv2-prod-hdr { display:grid; grid-template-columns:36px 1fr 60px 96px 52px; gap:8px; padding:0 8px 10px; border-bottom:1px solid rgba(168,146,80,0.10); }
        .plv2-prod-th { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.10em; color:var(--t-text-muted,#777); }
        .plv2-prod-row { display:grid; grid-template-columns:36px 1fr 60px 96px 52px; align-items:center; gap:8px; padding:9px 8px; border-radius:10px; cursor:pointer; border-bottom:1px solid rgba(168,146,80,0.06); transition:background 0.15s; opacity:0; animation:plv2-in 0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
        .plv2-prod-row:last-child{ border-bottom:none; }
        .plv2-prod-row:hover { background:rgba(255,255,255,0.04); }
        .plv2-rank { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:13px; font-weight:700; }
      `}</style>

      <div className="plv2">
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
        <div className="plv2-kpi-strip">
          <KPICard label="Gross Revenue"     value={formatINR(rev)} />
          <KPICard label="Est. COGS"         value={formatINR(cogs)}        tooltip="Estimated at 40% of revenue." />
          <KPICard label="Gross Profit"      value={formatINR(grossProfit)} />
          <KPICard label="Gross Margin"      value={`${grossMargin.toFixed(1)}%`} tooltip="(Gross Profit / Revenue) × 100" />
          <KPICard label="Net Profit Margin" value={`${netMargin.toFixed(1)}%`}   tooltip="Estimated — excludes untracked operating expenses." />
        </div>

        {/* Row 1: Waterfall + Payment */}
        <div className="plv2-row2">

          {/* Waterfall */}
          <div className="plv2-card">
            <div className="plv2-sh">
              <div className="plv2-sh-left"><div className="plv2-sh-bar" /><span className="plv2-sh-title">P &amp; L Waterfall</span></div>
              <span className="plv2-sh-badge">Estimated</span>
            </div>
            <div className="plv2-rule" />
            {wfItems.map((item, i) => {
              const isNeg = item.value < 0;
              const fill  = item.bold
                ? (isNeg ? `linear-gradient(90deg,${DANGER},rgba(192,57,43,0.4))` : `linear-gradient(90deg,${GOLD},${GOLD_LIGHT})`)
                : (isNeg ? `linear-gradient(90deg,${DANGER},rgba(192,57,43,0.4))` : `linear-gradient(90deg,${PRIMARY_MID},${PRIMARY})`);
              return (
                <div key={item.label} className="plv2-wf-item" style={{ animationDelay:`${i*0.07}s`, cursor:'pointer' }} onClick={() => handleWaterfallClick(item)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleWaterfallClick(item); }}>
                  <span className={`plv2-wf-label${item.bold ? ' plv2-wf-label--bold' : ''}`}>{item.label}</span>
                  <div className="plv2-wf-track">
                    <div className="plv2-wf-fill" style={{ width:`${Math.min(Math.abs(item.pct),100)}%`, background:fill }} />
                  </div>
                  <span className={`plv2-wf-val${item.bold ? ' plv2-wf-val--bold' : ''}`} style={{ color: isNeg ? DANGER : (item.bold ? GOLD : 'var(--t-text-primary,#fff)') }}>
                    {isNeg ? '−' : ''}{formatINR(Math.abs(item.value))}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Payment Methods */}
          <div className="plv2-card">
            <div className="plv2-sh">
              <div className="plv2-sh-left"><div className="plv2-sh-bar" /><span className="plv2-sh-title">Payment Methods</span></div>
              <span className="plv2-sh-badge">Click a slice</span>
            </div>
            <div className="plv2-rule" />
            <div className="plv2-pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.paymentBreakdown} cx="50%" cy="50%" innerRadius={62} outerRadius={84} paddingAngle={3} dataKey="amount" nameKey="method" onClick={handlePieClick} style={{ cursor:'pointer', outline:'none' }} strokeWidth={0}>
                    {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="plv2-pie-centre">
                <span className="plv2-pie-label">Total</span>
                <span className="plv2-pie-val">{formatINR(payTotal)}</span>
              </div>
            </div>
            <div style={{ marginTop:8 }}>
              {data.paymentBreakdown.map((p, i) => {
                const pct = payTotal > 0 ? ((p.amount / payTotal) * 100).toFixed(1) : '0.0';
                const col = CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <div key={p.method} className="plv2-pay-row" onClick={() => handlePieClick(null, i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePieClick(null, i); }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <div style={{ width:9, height:9, borderRadius:'50%', background:col, flexShrink:0 }} />
                      <span style={{ fontSize:12, color:'var(--t-text-secondary,#bbb)' }}>{p.method}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--t-text-primary,#fff)', fontVariantNumeric:'tabular-nums' }}>{formatINR(p.amount)}</span>
                      <span style={{ fontSize:10, fontWeight:700, color:col, background:i===0 ? PRIMARY_PALE : GOLD_PALE, border:`1px solid ${col}33`, borderRadius:999, padding:'2px 8px', minWidth:44, textAlign:'center' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Categories + Products */}
        <div className="plv2-row3">

          {/* Top Categories */}
          <div className="plv2-card">
            <div className="plv2-sh">
              <div className="plv2-sh-left"><div className="plv2-sh-bar" /><span className="plv2-sh-title">Top Categories</span></div>
              <span className="plv2-sh-badge">Click a bar</span>
            </div>
            <div className="plv2-rule" />
            <div style={{ flex:1, minHeight:260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topCategories} layout="vertical" margin={{ left:10, right:20, top:4, bottom:4 }} onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    handleBarClick(state.activePayload[0].payload);
                  }
                }}>
                  <defs>
                    <linearGradient id="plv2bg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={1} />
                      <stop offset="100%" stopColor={GOLD_LIGHT} stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id="plv2gr" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={PRIMARY_MID} stopOpacity={1} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(168,146,80,0.07)" />
                  <XAxis type="number" stroke="var(--t-text-muted,#666)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="category" type="category" stroke="var(--t-text-muted,#666)" fontSize={11} tickLine={false} axisLine={false} width={116} tick={{ fill:'var(--t-text-secondary,#aaa)', fontFamily:"'DM Sans',sans-serif" }} />
                  <RechartsTooltip content={<BarTooltip />} cursor={{ fill:'rgba(168,146,80,0.06)' }} />
                  <Bar dataKey="revenue" radius={[0,8,8,0]} barSize={22} style={{ cursor:'pointer' }}>
                    {data.topCategories.map((_, i) => <Cell key={i} fill={i===0 ? 'url(#plv2bg)' : 'url(#plv2gr)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="plv2-card">
            <div className="plv2-sh">
              <div className="plv2-sh-left"><div className="plv2-sh-bar" /><span className="plv2-sh-title">Top Products</span></div>
              <span className="plv2-sh-badge">Click a row</span>
            </div>
            <div className="plv2-rule" />
            <div className="plv2-prod-hdr">
              {[['#','left'],['Product','left'],['Units','right'],['Revenue','right'],['%','right']].map(([h,a]) => (
                <span key={h} className="plv2-prod-th" style={{ textAlign: a as 'left'|'right' }}>{h}</span>
              ))}
            </div>
            <div style={{ overflowY:'auto', flex:1, marginTop:4 }}>
              {data.topProducts?.map((p, i) => {
                const isTop = p.rank === 1;
                const pct   = rev > 0 ? ((p.revenue / rev) * 100).toFixed(1) : '0';
                return (
                  <div key={p.productId} className="plv2-prod-row" style={{ animationDelay:`${0.05*i}s` }} onClick={() => handleProductClick(p)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleProductClick(p); }}>
                    <div className="plv2-rank" style={{ background:isTop ? GOLD_PALE : 'rgba(255,255,255,0.05)', color:isTop ? GOLD : 'var(--t-text-muted,#777)', border:isTop ? `1px solid rgba(168,146,80,0.35)` : '1px solid transparent' }}>
                      {isTop ? '✦' : p.rank}
                    </div>
                    <span style={{ fontSize:12, fontWeight:isTop?600:400, color:'var(--t-text-primary,#fff)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize:12, color:'var(--t-text-secondary,#aaa)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{p.unitsSold.toLocaleString('en-IN')}</span>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:700, color:GOLD, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{formatINR(p.revenue)}</span>
                    <span style={{ fontSize:10, fontWeight:700, textAlign:'right', color:isTop?GOLD:PRIMARY_MID, background:isTop?GOLD_PALE:PRIMARY_PALE, borderRadius:999, padding:'2px 7px', fontFamily:"'DM Sans',sans-serif" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 3: Heatmap */}
        <div className="plv2-card">
          <div className="plv2-sh">
            <div className="plv2-sh-left"><div className="plv2-sh-bar" /><span className="plv2-sh-title">Revenue by Hour</span></div>
            <span className="plv2-sh-badge">Peak hours</span>
          </div>
          <div className="plv2-rule" />
          <HourlyHeatmap data={data.revenueByHour} />
        </div>

      </div>
    </>
  );
}