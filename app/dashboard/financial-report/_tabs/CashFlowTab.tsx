'use client';

import { useState } from 'react';
import { Info, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import ChartDetailModal from '../_components/ChartDetailModal';
import { FinancialReportData } from '@/lib/api/analytics';

const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

const GOLD = '#A89250';
const GOLD_LIGHT = '#C5A46D';
const PRIMARY_LIGHT = '#8CAF8C';

interface ClickDetail {
  title: string;
  rows: { label: string; value: string | number }[];
}

export default function CashFlowTab({ data }: { data?: FinancialReportData }) {
  const [detail, setDetail] = useState<ClickDetail | null>(null);

  if (!data) return null;

  const handleAreaClick = (chartData: Record<string, unknown>) => {
    if (!chartData || !chartData.activePayload) return;
    const pt = (chartData as { activePayload: Array<{ payload: { period: string; revenue: number; orders: number } }> }).activePayload[0]?.payload;
    if (!pt) return;
    setDetail({
      title: `💰 Cash Inflow — ${formatDate(String(pt.period))}`,
      rows: [
        { label: 'Period', value: formatDate(String(pt.period)) },
        { label: 'Cash Inflow', value: formatINR(pt.revenue) },
        { label: 'Orders', value: pt.orders?.toLocaleString('en-IN') || '—' },
        { label: 'Avg / Order', value: pt.orders > 0 ? formatINR(pt.revenue / pt.orders) : '—' },
      ],
    });
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-border bg-card-bg px-4 py-3 shadow-xl">
        <p className="text-xs font-semibold text-gold mb-1">{formatDate(String(label))}</p>
        <p className="text-sm text-text-primary font-mono">{formatINR(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {detail && <ChartDetailModal title={detail.title} rows={detail.rows} onClose={() => setDetail(null)} />}

      <div className="bg-warning/10 text-text-secondary p-4 rounded-xl flex items-start gap-3 border border-warning/30">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-gold" />
        <p className="text-sm leading-relaxed">
          <strong className="text-text-primary">Notice:</strong> Cash flow tracking requires precise expense logging. The view below shows order-based cash inflows only.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Inflow Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card-bg p-6 shadow-sm flex flex-col min-h-[350px] hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Cash Inflows from Orders</h3>
            <span className="text-[10px] text-text-muted bg-page-bg px-2 py-1 rounded-full">Click a point</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.salesTrend} onClick={handleAreaClick} style={{ cursor: 'pointer' }}>
              <defs>
                <linearGradient id="colorCashGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY_LIGHT} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={PRIMARY_LIGHT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--t-border-subtle)" />
              <XAxis dataKey="period" stroke="var(--t-text-muted)" fontSize={10} tickMargin={10} tickFormatter={formatDate} />
              <YAxis stroke="var(--t-text-muted)" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Inflow"
                stroke={PRIMARY_LIGHT}
                strokeWidth={3}
                fill="url(#colorCashGold)"
                dot={{ r: 5, fill: PRIMARY_LIGHT, stroke: 'var(--t-card-bg)', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: GOLD_LIGHT, stroke: PRIMARY_LIGHT, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Focus & Practices */}
        <div className="space-y-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-gold mb-2">Liquidity Focus Area</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Essential for ensuring enough cash is on hand to cover operating expenses, particularly for seasonal inventory purchases. A high gross revenue does not guarantee positive cash flow if capital is locked in slow-moving stock.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card-bg p-6 shadow-sm flex-1 hover-lift">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">Best Practices</h3>
            <ul className="space-y-4 text-sm mt-4">
              <li className="flex gap-3 text-text-secondary">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <span><strong className="text-text-primary">Automate Data Collection:</strong> Use tools like Xero or QuickBooks Online.</span>
              </li>
              <li className="flex gap-3 text-text-secondary">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <span><strong className="text-text-primary">Reconcile Processors:</strong> Record sales based on actual activity, not just deposits.</span>
              </li>
              <li className="flex gap-3 text-text-secondary">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <span><strong className="text-text-primary">Separate Accounts:</strong> Maintain dedicated operating and reserve accounts.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
