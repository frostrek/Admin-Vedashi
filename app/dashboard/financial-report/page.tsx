'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  useFinancialReport, usePreviousPeriodReport,
  useOrdersFinancial, useRefundSummary,
} from '@/lib/api/analytics';
import type { FinancialReportParams } from '@/lib/api/analytics';
import { Calendar, RefreshCcw, TrendingUp, BarChart2, ShoppingCart, AlertCircle } from 'lucide-react';

import ExportButton from './_components/ExportButton';
import SkeletonCard from './_components/SkeletonCard';
import ExecutiveSummaryTab from './_tabs/ExecutiveSummaryTab';
import ProfitAndLossTab from './_tabs/ProfitAndLossTab';
import OrdersFinancialTab from './_tabs/OrdersFinancialTab';
import RefundsCancellationsTab from './_tabs/RefundsCancellationsTab';

/* ── Vedashi brand tokens ───────────────────────────────────── */
const GOLD       = '#A89250';
const GOLD_LIGHT = '#C5A46D';
const GOLD_PALE  = '#F0E8D5';
const PRIMARY    = '#3B5D3B';
const PRIMARY_PALE = '#E8F0E8';

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

const PERIOD_OPTS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const TABS = [
  { id: 'summary',  label: 'Executive Summary', icon: TrendingUp },
  { id: 'pl',       label: 'Profit & Loss',      icon: BarChart2 },
  { id: 'orders',   label: 'Orders',             icon: ShoppingCart },
  { id: 'refunds',  label: 'Refunds',            icon: AlertCircle },
];

/* ─────────────────────────────────────────────────────────────── */

export default function FinancialReportPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pathname     = usePathname();

  const tab    = searchParams.get('tab')    || 'summary';
  const period = searchParams.get('period') || 'daily';
  let preset   = searchParams.get('preset') || '7d';

  let qStart = searchParams.get('startDate');
  let qEnd   = searchParams.get('endDate');
  if (qStart && qEnd) preset = 'custom';

  const [effectiveStart, setEffectiveStart] = useState('');
  const [effectiveEnd,   setEffectiveEnd]   = useState('');
  const [ordersPage,     setOrdersPage]     = useState(1);
  const [ordersSearch,   setOrdersSearch]   = useState('');

  useEffect(() => {
    if (preset === 'custom' && qStart && qEnd) {
      setEffectiveStart(qStart);
      setEffectiveEnd(qEnd);
      return;
    }
    const today = new Date();
    const e = new Date(); e.setHours(23, 59, 59, 999);
    const s = new Date(today);
    if (preset === 'today') s.setHours(0, 0, 0, 0);
    if (preset === '7d')    s.setDate(today.getDate() - 7);
    if (preset === '30d')   s.setDate(today.getDate() - 30);
    if (preset === '90d')   s.setDate(today.getDate() - 90);
    setEffectiveStart(s.toISOString().split('T')[0]);
    const tomorrow = new Date(e); tomorrow.setDate(e.getDate() + 1);
    setEffectiveEnd(tomorrow.toISOString().split('T')[0]);
  }, [preset, qStart, qEnd]);

  const setUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === 'preset' && value !== 'custom') {
      params.delete('startDate');
      params.delete('endDate');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasDates    = !!effectiveStart && !!effectiveEnd;
  const queryParams: FinancialReportParams = {
    startDate: effectiveStart, endDate: effectiveEnd,
    period: period as 'daily' | 'weekly' | 'monthly',
  };

  const { data: reportData, isLoading, isError, error, refetch } = useFinancialReport(queryParams, hasDates);
  const { data: prevReportData } = usePreviousPeriodReport(queryParams, hasDates);
  const { data: ordersData,  isLoading: ordersLoading }   = useOrdersFinancial(
    { ...queryParams, page: ordersPage, limit: 20, search: ordersSearch },
    hasDates && tab === 'orders',
  );
  const { data: refundData, isLoading: refundsLoading } = useRefundSummary(queryParams, hasDates && tab === 'refunds');

  const isTabLoading =
    (tab === 'orders'   && ordersLoading)   ||
    (tab === 'refunds'  && refundsLoading)  ||
    (!['orders', 'refunds'].includes(tab) && isLoading);

  useEffect(() => { setOrdersPage(1); }, [ordersSearch, effectiveStart, effectiveEnd]);

  /* pretty date range label */
  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  return (
    <>
      {/* ── Injected styles ──────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        /* page root */
        .frp-root {
          font-family: 'DM Sans', sans-serif;
          background: var(--t-page-bg, #F7F4EE);
          min-height: 100vh;
          padding: 32px 24px 96px;
          max-width: 1600px;
          margin: 0 auto;
          color: var(--t-text-primary, #1a1a1a);
        }

        /* ── HEADER ── */
        .frp-header {
          position: relative;
          z-index: 10;
          display: flex; flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
          animation: frp-up 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        @media (min-width: 768px) {
          .frp-header { flex-direction: row; align-items: flex-end; justify-content: space-between; }
        }

        .frp-logo-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: ${GOLD};
          margin-right: 8px;
          vertical-align: middle;
          box-shadow: 0 0 8px rgba(168,146,80,0.55);
        }

        .frp-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--t-text-primary, #1a1a1a);
          line-height: 1.1;
        }

        .frp-subtitle {
          display: flex; align-items: center; gap: 6px;
          margin-top: 6px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: var(--t-text-muted, #888);
        }

        .frp-header-actions {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }

        .frp-refresh-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: var(--t-card-bg, #fff);
          border: 1px solid rgba(168,146,80,0.20);
          color: ${GOLD};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
        }
        .frp-refresh-btn:hover {
          border-color: ${GOLD};
          box-shadow: 0 0 12px rgba(168,146,80,0.30);
          transform: rotate(20deg);
        }
        .frp-refresh-btn:disabled { opacity: 0.45; pointer-events: none; }

        /* ── FILTER BAR ── */
        .frp-filterbar {
          background: var(--t-card-bg, #fff);
          border: 1px solid var(--t-border, rgba(168,146,80,0.14));
          border-radius: 18px;
          padding: 14px 18px;
          margin-bottom: 28px;
          display: flex; flex-direction: column; gap: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(168,146,80,0.04);
          animation: frp-up 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s both;
        }
        @media (min-width: 1280px) {
          .frp-filterbar { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }
        }

        .frp-pill-group {
          display: flex;
          background: var(--t-page-bg, #F7F4EE);
          border: 1px solid var(--t-border-subtle, rgba(168,146,80,0.08));
          border-radius: 12px;
          padding: 3px;
          gap: 2px;
          overflow-x: auto;
        }

        .frp-pill {
          flex: 1 0 auto;
          padding: 6px 16px;
          font-size: 12px; font-weight: 600;
          border-radius: 9px;
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.17s;
          background: transparent;
          color: var(--t-text-secondary, #666);
          letter-spacing: 0.03em;
        }
        .frp-pill:hover { color: var(--t-text-primary, #1a1a1a); background: var(--t-card-bg, #fff); }
        .frp-pill--active-primary {
          background: ${PRIMARY} !important;
          color: #fff !important;
          border-color: transparent !important;
          box-shadow: 0 2px 8px rgba(59,93,59,0.20);
        }
        .frp-pill--active-gold {
          background: ${GOLD_PALE} !important;
          color: ${GOLD} !important;
          border-color: rgba(168,146,80,0.30) !important;
        }

        /* date inputs */
        .frp-date-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .frp-date-input {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 500;
          padding: 7px 12px;
          border-radius: 10px;
          border: 1px solid var(--t-border, rgba(168,146,80,0.18));
          background: var(--t-page-bg, #F7F4EE);
          color: var(--t-text-primary, #1a1a1a);
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          width: 140px;
        }
        .frp-date-input:focus {
          border-color: ${GOLD};
          box-shadow: 0 0 0 3px rgba(168,146,80,0.15);
        }
        .frp-date-sep {
          font-size: 11px; font-weight: 600;
          color: var(--t-text-muted, #aaa);
          letter-spacing: 0.06em;
        }

        /* ── TAB NAV ── */
        .frp-tabnav {
          display: flex; gap: 0;
          border-bottom: 1px solid var(--t-border, rgba(168,146,80,0.14));
          margin-bottom: 32px;
          overflow-x: auto;
          animation: frp-up 0.55s cubic-bezier(0.22,1,0.36,1) 0.10s both;
        }

        .frp-tab {
          display: flex; align-items: center; gap: 7px;
          padding: 0 4px 16px;
          margin-right: 28px;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
          cursor: pointer;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--t-text-secondary, #888);
          transition: color 0.18s, border-color 0.18s;
          position: relative; bottom: -1px;
        }
        .frp-tab:hover { color: var(--t-text-primary, #1a1a1a); }
        .frp-tab--active {
          color: ${GOLD} !important;
          border-bottom-color: ${GOLD} !important;
        }
        .frp-tab-icon {
          width: 14px; height: 14px;
          opacity: 0.7;
          transition: opacity 0.18s;
        }
        .frp-tab--active .frp-tab-icon { opacity: 1; }

        /* ── CONTENT ── */
        .frp-content {
          animation: frp-up 0.45s cubic-bezier(0.22,1,0.36,1) 0.06s both;
        }

        /* ── ERROR STATE ── */
        .frp-error {
          border-radius: 18px;
          border: 1px solid rgba(220,60,60,0.18);
          background: rgba(220,60,60,0.04);
          min-height: 360px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px;
          text-align: center;
          padding: 40px;
        }
        .frp-error-title { font-size: 18px; font-weight: 700; color: #c0392b; }
        .frp-error-msg   { font-size: 13px; color: var(--t-text-secondary, #888); max-width: 360px; }
        .frp-retry-btn {
          margin-top: 8px;
          padding: 9px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          background: ${PRIMARY};
          color: #fff;
          border: none; border-radius: 999px;
          cursor: pointer;
          transition: background 0.18s, transform 0.14s;
        }
        .frp-retry-btn:hover { background: #2a4a2a; transform: scale(1.03); }

        /* ── DECORATIVE HEADER LINE ── */
        .frp-gold-rule {
          height: 1px;
          background: linear-gradient(90deg, transparent, ${GOLD} 30%, ${GOLD_LIGHT} 50%, ${GOLD} 70%, transparent);
          opacity: 0.30;
          margin-bottom: 32px;
        }

        /* keyframes */
        @keyframes frp-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* hide scrollbar on tab nav */
        .frp-tabnav::-webkit-scrollbar,
        .frp-pill-group::-webkit-scrollbar { display: none; }
        .frp-tabnav, .frp-pill-group { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="frp-root">

        {/* ── HEADER ───────────────────────────────────────────── */}
        <div className="frp-header">
          <div>
            <div style={{ display:'flex', alignItems:'center', marginBottom: 2 }}>
              <span className="frp-logo-dot" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>
                Vedashi Analytics
              </span>
            </div>
            <h1 className="frp-title">Financial Report</h1>
            <p className="frp-subtitle">
              <Calendar size={13} color={GOLD} />
              {effectiveStart ? fmt(effectiveStart) : '—'}
              <span style={{ color: 'rgba(168,146,80,0.45)', margin: '0 2px' }}>→</span>
              {effectiveEnd   ? fmt(effectiveEnd)   : '—'}
            </p>
          </div>

          <div className="frp-header-actions">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="frp-refresh-btn"
              title="Refresh Data"
            >
              <RefreshCcw size={15} style={{ transition: 'transform 0.4s', transform: isLoading ? 'rotate(360deg)' : 'none' }} />
            </button>
            <ExportButton 
              startDate={effectiveStart} 
              endDate={effectiveEnd} 
              data={reportData} 
              refundData={refundData}
              ordersData={ordersData}
            />
          </div>
        </div>

        {/* thin gold rule */}
        <div className="frp-gold-rule" />

        {/* ── FILTER BAR ───────────────────────────────────────── */}
        <div className="frp-filterbar">

          {/* preset pills */}
          <div className="frp-pill-group">
            {PRESETS.map(p => (
              <button
                key={p.value}
                className={`frp-pill ${preset === p.value ? 'frp-pill--active-primary' : ''}`}
                onClick={() => setUrlParam('preset', p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* custom date range */}
          <div className="frp-date-row">
            <input
              type="date"
              className="frp-date-input"
              value={qStart || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('preset', 'custom');
                params.set('startDate', e.target.value);
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
            <span className="frp-date-sep">to</span>
            <input
              type="date"
              className="frp-date-input"
              value={qEnd || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('preset', 'custom');
                params.set('endDate', e.target.value);
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
          </div>

          {/* period pills */}
          <div className="frp-pill-group">
            {PERIOD_OPTS.map(p => (
              <button
                key={p.value}
                className={`frp-pill ${period === p.value ? 'frp-pill--active-gold' : ''}`}
                onClick={() => setUrlParam('period', p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB NAV ──────────────────────────────────────────── */}
        <nav className="frp-tabnav" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={`frp-tab ${tab === id ? 'frp-tab--active' : ''}`}
              onClick={() => setUrlParam('tab', id)}
            >
              <Icon className="frp-tab-icon" />
              {label}
            </button>
          ))}
        </nav>

        {/* ── CONTENT ──────────────────────────────────────────── */}
        {isError && !['orders', 'refunds'].includes(tab) ? (
          <div className="frp-error">
            <AlertCircle size={32} color="#c0392b" />
            <p className="frp-error-title">Failed to load report</p>
            <p className="frp-error-msg">{(error as any)?.message || 'An unexpected network error occurred. Please try again.'}</p>
            <button className="frp-retry-btn" onClick={() => refetch()}>Try Again</button>
          </div>

        ) : (isTabLoading || (!reportData && !['orders', 'refunds'].includes(tab))) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>

        ) : (
          <Suspense fallback={<SkeletonCard />}>
            <div className="frp-content">
              {tab === 'summary'  && <ExecutiveSummaryTab data={reportData} prevData={prevReportData} />}
              {tab === 'pl'       && <ProfitAndLossTab data={reportData} />}
              {tab === 'orders'   && (
                <OrdersFinancialTab
                  data={ordersData}
                  isLoading={ordersLoading}
                  page={ordersPage}
                  search={ordersSearch}
                  onPageChange={setOrdersPage}
                  onSearchChange={setOrdersSearch}
                />
              )}
              {tab === 'refunds' && <RefundsCancellationsTab data={refundData} />}
            </div>
          </Suspense>
        )}
      </div>
    </>
  );
}