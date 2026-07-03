'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import KPICard from '../_components/KPICard';
import HourlyHeatmap from '../_components/HourlyHeatmap';
import ChartDetailModal from '../_components/ChartDetailModal';
import { FinancialReportData } from '@/lib/api/analytics';

const formatINR = (n: number) => '$' + Math.round(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  const [cogsPercent, setCogsPercent] = useState(40);
  const [opexPercent, setOpexPercent] = useState(15);
  const [tempCogs, setTempCogs] = useState(40);
  const [tempOpex, setTempOpex] = useState(15);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [detail, setDetail] = useState<ClickDetail | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!data) return null;

  const rev         = data.summary.totalRevenue || 0;
  const cogs        = rev * (cogsPercent / 100);
  const grossProfit = rev - cogs;
  const opex        = rev * (opexPercent / 100);
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
        { label: 'Transactions',      value: e.count?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—' },
        { label: 'Share',             value: payTotal > 0 ? `${((e.amount / payTotal) * 100).toFixed(1)}%` : '—' },
        { label: 'Avg / Transaction', value: e.count > 0 ? formatINR(e.amount / e.count) : '—' },
      ],
    });
  };

  const handleBarClick = (entry: any) => {
    const pt = entry?.payload || entry;
    if (!pt?.category) return;
    
    // Performance context (imagination)
    const isHighVolume = pt.orders > 20; 
    const insight = isHighVolume ? 'High Demand' : 'Premium Niche';

    setDetail({
      title: `${pt.category} — Deep Analysis`,
      heroLabel: 'Total Revenue Generated', heroValue: formatINR(pt.revenue),
      rows: [
        { label: 'Category Name',      value: pt.category },
        { label: 'Orders Fulfilled',   value: pt.orders?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—' },
        { label: 'Revenue Share',      value: rev > 0 ? `${((pt.revenue / rev) * 100).toFixed(1)}%` : '—' },
        { label: 'Avg Order Value',    value: pt.orders > 0 ? formatINR(pt.revenue / pt.orders) : '—' },
        { label: 'Category Health',     value: insight },
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
        { label: 'Units Sold',     value: p.unitsSold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { label: 'Revenue Share',  value: rev > 0 ? `${((p.revenue / rev) * 100).toFixed(1)}%` : '—' },
        { label: 'Avg Unit Price', value: p.unitsSold > 0 ? formatINR(p.revenue / p.unitsSold) : '—' },
      ],
    });
  };

  const wfItems = [
    { label: 'Gross Revenue',     value: rev,         pct: 100,         pos: true,  bold: false },
    { label: `Est. COGS (−${cogsPercent}%)`,  value: -cogs,       pct: cogsPercent, pos: false, bold: false },
    { label: 'Gross Profit',      value: grossProfit, pct: grossMargin, pos: true,  bold: true  },
    { label: `Operating Exp. (−${opexPercent}%)`,    value: -opex,       pct: opexPercent, pos: false, bold: false },
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
        .plv2-sh-badge { font-size:10px; letter-spacing:0.04em; color:#444444; background:var(--t-page-bg,rgba(255,255,255,0.04)); border:1px solid rgba(168,146,80,0.10); border-radius:999px; padding:3px 10px; }
        .plv2-rule { height:1px; margin:14px 0; background:linear-gradient(90deg,transparent,${GOLD} 30%,${GOLD_LIGHT} 50%,${GOLD} 70%,transparent); opacity:0.18; }

        .plv2-row2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .plv2-row3 { display:grid; grid-template-columns:1.5fr 1fr; gap:20px; }
        @media(max-width:900px){ .plv2-row2,.plv2-row3{ grid-template-columns:1fr; } }

        .plv2-kpi-strip { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; position:relative; z-index:10; overflow:visible; }
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
        .plv2-pie-val { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:700; color:#000000; line-height:1.1; font-variant-numeric:tabular-nums; }
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

        .plv2-config-input { width:60px; background:var(--t-page-bg, #f4f1e8); border:1px solid rgba(168,146,80,0.35); border-radius:12px; padding:4px 8px; font-size:12px; font-weight:600; color:${GOLD}; outline:none; transition:all 0.2s; }
        .plv2-config-input:focus { border-color:${GOLD}; background:#fff; box-shadow:0 0 0 4px rgba(168,146,80,0.15); }
        /* Hide number spinners */
        .plv2-config-input::-webkit-outer-spin-button, .plv2-config-input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        .plv2-config-input { -moz-appearance:textfield; }

        .plv2-settings-btn { display:flex; align-items:center; gap:8px; padding:6px 14px; background:rgba(168,146,80,0.1); border:1px solid rgba(168,146,80,0.22); border-radius:10px; font-size:11px; font-weight:700; color:${GOLD}; cursor:pointer; transition:all 0.2s; text-transform:uppercase; letter-spacing:0.04em; }
        .plv2-settings-btn:hover { background:${GOLD}; color:#fff; transform:translateY(-1px); box-shadow:0 4px 12px rgba(168,146,80,0.25); }

        .plv2-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; animation:plv2-fade 0.3s forwards; }
        @keyframes plv2-fade { from{opacity:0} to{opacity:1} }
        .plv2-modal-content { background:var(--t-card-bg,#1C2A1C); border:1px solid rgba(168,146,80,0.25); border-radius:24px; width:100%; max-width:440px; padding:32px; box-shadow:0 24px 64px rgba(0,0,0,0.4); animation:plv2-pop 0.35s cubic-bezier(0.22,1,0.36,1); }
        @keyframes plv2-pop { from{opacity:0;transform:scale(0.9) translateY(10px)} to{opacity:1;transform:none} }

        /* Remove focus outlines from charts */
        .recharts-wrapper, .recharts-surface { outline: none !important; -webkit-tap-highlight-color: transparent; }
        *:focus { outline: none !important; }
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

        {isSettingsOpen && mounted && createPortal(
          <div className="plv2-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="plv2-modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:4, height:18, background:GOLD, borderRadius:2 }} />
                <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t-text-primary,#fff)', fontVariantNumeric:'tabular-nums' }}>Calculation Metrics</h3>
              </div>
              <p style={{ fontSize:12, color:'var(--t-text-muted,#888)', marginBottom:24, lineHeight:1.5 }}>
                Define the percentage values used to estimate your COGS and Operating Expenses for real-time profitability tracking.
              </p>

              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div className="flex flex-col gap-1">
                    <label style={{ fontSize:10, fontWeight:700, color:GOLD, textTransform:'uppercase', letterSpacing:'0.06em' }}>Cost of Goods Sold (COGS %)</label>
                    <p style={{ fontSize:10, color:'var(--t-text-muted,#888)', fontStyle:'italic' }}>The direct costs of producing your products, including materials and manufacturing.</p>
                  </div>
                  <div style={{ position:'relative' }}>
                    <input 
                      type="number" 
                      className="plv2-config-input" 
                      style={{ width:'100%', padding:'12px 16px', fontSize:15 }}
                      value={tempCogs} 
                      onChange={(e) => setTempCogs(Number(e.target.value))}
                    />
                    <span style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', fontSize:14, fontWeight:700, color:GOLD }}>%</span>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div className="flex flex-col gap-1">
                    <label style={{ fontSize:10, fontWeight:700, color:GOLD, textTransform:'uppercase', letterSpacing:'0.06em' }}>Operating Expenses (Opex %)</label>
                    <p style={{ fontSize:10, color:'var(--t-text-muted,#888)', fontStyle:'italic' }}>Day-to-day business costs such as marketing, rent, and administrative utilities.</p>
                  </div>
                  <div style={{ position:'relative' }}>
                    <input 
                      type="number" 
                      className="plv2-config-input" 
                      style={{ width:'100%', padding:'12px 16px', fontSize:15 }}
                      value={tempOpex} 
                      onChange={(e) => setTempOpex(Number(e.target.value))}
                    />
                    <span style={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)', fontSize:14, fontWeight:700, color:GOLD }}>%</span>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:12, marginTop:32 }}>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  style={{ flex:1, padding:'12px', borderRadius:12, fontSize:13, fontWeight:600, color:'var(--t-text-secondary,#aaa)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setCogsPercent(tempCogs);
                    setOpexPercent(tempOpex);
                    setIsSettingsOpen(false);
                  }}
                  style={{ flex:2, padding:'12px', borderRadius:12, fontSize:13, fontWeight:700, color:'#fff', background:GOLD, border:'none', boxShadow:'0 8px 20px rgba(168,146,80,0.3)' }}
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
          <button 
            className="plv2-settings-btn"
            onClick={() => {
              setTempCogs(cogsPercent);
              setTempOpex(opexPercent);
              setIsSettingsOpen(true);
            }}
          >
            Define Calculations
          </button>
        </div>

        {/* KPI Strip */}
        <div className="plv2-kpi-strip">
          <KPICard 
            label="Gross Revenue"   
            value={formatINR(rev)} 
            tooltip="Total sales revenue before deducting costs or expenses."
          />
          <KPICard 
            label="Est. COGS"       
            value={formatINR(cogs)}      
            tooltip={`Estimated Cost of Goods Sold, currently calculated at ${cogsPercent}% of revenue.`} 
          />
          <KPICard 
            label="Gross Profit"    
            value={formatINR(grossProfit)} 
            tooltip="Total revenue minus COGS. Represents profit before operating expenses."
          />
          <KPICard 
            label="Gross Margin"    
            value={`${grossMargin.toFixed(1)}%`} 
            tooltip="Percentage of revenue that exceeds COGS: (Gross Profit ÷ Revenue) × 100." 
          />
          <KPICard 
            label="Net Profit Margin" 
            value={`${netMargin.toFixed(1)}%`}   
            tooltip="Estimated profitability ratio after accounting for both COGS and operating expenses." 
          />
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
                  <span className={`plv2-wf-val${item.bold ? ' plv2-wf-val--bold' : ''}`} style={{ color: isNeg ? DANGER : (item.bold ? '#000000' : 'var(--t-text-primary,#fff)') }}>
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
                  <XAxis type="number" stroke="#333333" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="category" type="category" stroke="#333333" fontSize={11} tickLine={false} axisLine={false} width={116} tick={{ fill:'#333333', fontFamily:"'DM Sans',sans-serif" }} />
                  <RechartsTooltip content={<BarTooltip />} cursor={{ fill:'rgba(168,146,80,0.06)' }} />
                   <Bar 
                    dataKey="revenue" 
                    radius={[0,8,8,0]} 
                    barSize={22} 
                    style={{ cursor:'pointer' }}
                    onClick={(data: any) => handleBarClick(data)}
                  >
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
                    <span style={{ fontSize:12, color:'var(--t-text-secondary,#aaa)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{p.unitsSold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:700, color:'#000000', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{formatINR(p.revenue)}</span>
                    <span style={{ fontSize:10, fontWeight:700, textAlign:'right', color:isTop?GOLD:PRIMARY_MID, background:isTop?GOLD_PALE:PRIMARY_PALE, borderRadius:999, padding:'2px 7px', fontFamily:"'DM Sans',sans-serif" }}>{pct}%</span>
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