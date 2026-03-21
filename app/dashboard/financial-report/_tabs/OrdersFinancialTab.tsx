'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import ChartDetailModal from '../_components/ChartDetailModal';
import type { OrdersFinancialData, OrderFinancialRow } from '@/lib/api/analytics';

const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const formatDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
};

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-success/15 text-success',
  COMPLETED: 'bg-success/15 text-success',
  DELIVERED: 'bg-success/15 text-success',
  PENDING: 'bg-warning/15 text-warning',
  UNPAID: 'bg-warning/15 text-warning',
  PROCESSING: 'bg-info/15 text-info',
  FAILED: 'bg-danger/15 text-danger',
  CANCELLED: 'bg-danger/15 text-danger',
  REFUNDED: 'bg-gold/15 text-gold',
  RETURNED: 'bg-gold/15 text-gold',
};

interface ClickDetail {
  title: string;
  rows: { label: string; value: string | number }[];
}

interface Props {
  data?: OrdersFinancialData;
  isLoading: boolean;
  page: number;
  search: string;
  onPageChange: (p: number) => void;
  onSearchChange: (s: string) => void;
}

export default function OrdersFinancialTab({ data, isLoading, page, search, onPageChange, onSearchChange }: Props) {
  const [detail, setDetail] = useState<ClickDetail | null>(null);

  const handleRowClick = (o: OrderFinancialRow) => {
    setDetail({
      title: `🧾 Order ${String(o.orderId).substring(0, 8)}…`,
      rows: [
        { label: 'Order ID', value: o.orderId },
        { label: 'Customer', value: o.customer },
        { label: 'Date', value: formatDate(o.date) },
        { label: 'Subtotal', value: formatINR(o.subtotal) },
        { label: 'Discounts', value: o.discounts > 0 ? `-${formatINR(o.discounts)}` : '₹0' },
        { label: 'Shipping', value: formatINR(o.shipping) },
        { label: 'Tax', value: formatINR(o.tax) },
        { label: 'Final Total', value: formatINR(o.finalTotal) },
        { label: 'Payment Method', value: o.paymentMethod },
        { label: 'Payment Status', value: o.paymentStatus },
        { label: 'Order Status', value: o.orderStatus },
        ...(o.couponCode ? [{ label: 'Coupon', value: o.couponCode }] : []),
      ],
    });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-4 animate-fadeIn">
      {detail && <ChartDetailModal title={detail.title} rows={detail.rows} onClose={() => setDetail(null)} />}

      {/* Search + Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by Order ID or customer…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card-bg text-sm text-text-primary outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-all"
          />
        </div>
        <span className="text-xs text-text-muted">{data?.total ?? 0} orders found</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card-bg shadow-sm overflow-hidden hover-lift">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-page-bg">
                <th className="px-4 py-3 font-semibold text-text-muted">Order</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Customer</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted">Subtotal</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted">Discount</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted">Ship</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted">Tax</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted">Total</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Payment</th>
                <th className="px-4 py-3 font-semibold text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 animate-shimmer rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : !data?.orders?.length ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-text-muted">No orders found for this period</td></tr>
              ) : (
                data.orders.map(o => (
                  <tr key={o.orderId} className="hover:bg-page-bg cursor-pointer transition-colors" onClick={() => handleRowClick(o)}>
                    <td className="px-4 py-3 font-mono text-text-muted">{String(o.orderId).substring(0, 8)}…</td>
                    <td className="px-4 py-3 font-medium text-text-primary truncate max-w-[120px]">{o.customer || 'Guest'}</td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDate(o.date)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">{formatINR(o.subtotal)}</td>
                    <td className="px-4 py-3 text-right font-mono" style={{ color: o.discounts > 0 ? 'var(--t-danger)' : 'var(--t-text-muted)' }}>
                      {o.discounts > 0 ? `-${formatINR(o.discounts)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatINR(o.shipping)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">{formatINR(o.tax)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gold">{formatINR(o.finalTotal)}</td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{o.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[o.paymentStatus?.toUpperCase()] || STATUS_COLORS[o.orderStatus] || 'bg-border text-text-muted'}`}>
                        {o.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-border hover:bg-page-bg disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-border hover:bg-page-bg disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
