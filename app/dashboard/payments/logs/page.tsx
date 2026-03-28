'use client';

import { useState, useEffect } from 'react';
import { getPaymentLogs, getOrderPaymentTimeline, formatINR } from '@/lib/api';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Receipt,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    TrendingUp,
    Hourglass,
    AlertCircle,
    Eye,
    X,
    CreditCard,
    Filter,
    SlidersHorizontal,
    Loader2,
    Calendar,
    History,
} from 'lucide-react';

// ─── Shared Styles (matches the Vedashi admin theme) ──────────────────
const cardClass = 'rounded-2xl border border-border bg-card-bg';
const inputClass = 'appearance-none rounded-xl border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors';
const iconBtnClass = 'rounded-xl p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200';
const primaryBtnClass = 'inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm';

// ─── Status helpers ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    PAID: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
    PROCESSED: { label: 'Processed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
    FAILED: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-400' },
    REFUNDED: { label: 'Refunded', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', dot: 'bg-zinc-400' },
    PENDING: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400' },
    PROCESSING: { label: 'Processing', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400' },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status?.toUpperCase()] ?? STATUS_CONFIG.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg} border ${cfg.border} rounded-full px-2.5 py-0.5`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ─── Detail Row helper used in the modal ─────────────────────────────
function DetailRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex flex-col gap-0.5 py-2 border-b border-border/40 last:border-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
            <span className="text-sm font-medium text-text-primary break-all">{value || <span className="text-text-muted/50">N/A</span>}</span>
        </div>
    );
}

function formatGateway(val: string) {
    if (!val) return 'N/A';
    if (val.toUpperCase() === 'ORIGINAL_PAYMENT') return 'Razorpay';
    return val;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold/80 mb-2">{title}</p>
            {children}
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, subValue, subColor }: { label: string; value: string | number; icon: any; color: string; subValue?: string | number; subColor?: string }) {
    return (
        <div className={`${cardClass} p-3 flex items-center gap-3`}>
            <div className={`p-2 rounded-xl ${color} shrink-0`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted">{label}</p>
                <p className="text-lg font-bold text-text-primary leading-tight truncate">{value}</p>
                {subValue && (
                    <p className={`text-[10px] font-bold mt-0.5 ${subColor || 'text-rose-400'}`}>
                        {subValue}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function PaymentLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [gatewayFilter, setGatewayFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const limit = 20;

    // Derived Stats
    const [stats, setStats] = useState({ totalVolume: 0, refundVolume: 0, successCount: 0, failedCount: 0, pendingCount: 0 });

    const fetchLogs = async () => {
        setLoading(true);
        const data = await getPaymentLogs({ limit, offset: (page - 1) * limit, search, status: statusFilter, gateway: gatewayFilter, type: typeFilter, startDate, endDate });
        const rows = data.logs || [];
        setLogs(rows);
        setTotal(data.total || 0);

        const volume = rows.filter((l: any) => l.payment_type === 'Incoming' && l.payment_status === 'PAID').reduce((s: number, l: any) => s + parseFloat(l.amount || 0), 0);
        const refunds = rows.filter((l: any) => l.payment_type === 'Refund' && (l.payment_status === 'PROCESSED' || l.payment_status === 'REFUNDED')).reduce((s: number, l: any) => s + parseFloat(l.amount || 0), 0);
        const success = rows.filter((l: any) => (l.payment_type === 'Incoming' && l.payment_status === 'PAID') || (l.payment_type === 'Refund' && l.payment_status === 'PROCESSED')).length;
        const failed = rows.filter((l: any) => l.payment_status === 'FAILED').length;
        const pending = rows.filter((l: any) => l.payment_status === 'PENDING' || l.payment_status === 'PROCESSING').length;
        setStats({ totalVolume: volume, refundVolume: refunds, successCount: success, failedCount: failed, pendingCount: pending });

        setLoading(false);
    };

    const fetchTimeline = async (orderId: string) => {
        if (!orderId) return;
        setLoadingTimeline(true);
        try {
            const logs = await getOrderPaymentTimeline(orderId);
            setTimelineLogs(logs);
        } catch (error) {
            console.error('Failed to fetch timeline:', error);
            setTimelineLogs([]);
        } finally {
            setLoadingTimeline(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [page, statusFilter, gatewayFilter, typeFilter, startDate, endDate]);

    // Lock body scroll when modal open
    useEffect(() => {
        document.body.style.overflow = selectedLog ? 'hidden' : 'unset';
        if (selectedLog?.order_id) {
            fetchTimeline(selectedLog.order_id);
        } else {
            setTimelineLogs([]);
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedLog]);

    const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLogs(); };
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-4">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Receipt className="h-6 w-6 text-gold" />
                        Payment Logs
                    </h1>
                    <p className="text-sm text-text-muted mt-0.5">Administrative payment auditing & reconciliation.</p>
                </div>
                <button onClick={fetchLogs} className={primaryBtnClass}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </button>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard 
                    label="Total Volume" 
                    value={formatINR(stats.totalVolume)} 
                    subValue={stats.refundVolume > 0 ? `-${formatINR(stats.refundVolume)} Refunded` : undefined}
                    subColor="text-rose-400"
                    icon={TrendingUp} 
                    color="bg-gold/10 text-gold border border-gold/20" 
                />
                <StatCard label="Successful" value={stats.successCount} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" />
                <StatCard label="Pending" value={stats.pendingCount} icon={Hourglass} color="bg-amber-500/10 text-amber-400 border border-amber-500/20" />
                <StatCard label="Failed" value={stats.failedCount} icon={AlertCircle} color="bg-red-500/10 text-red-400 border border-red-500/20" />
            </div>

            {/* ── Filters ── */}
            <div className={`${cardClass} p-3`}>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search payment ID, order ID, or customer..."
                            className={`${inputClass} pl-8 w-full`}
                        />
                    </form>

                    <div className="relative">
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className={`${inputClass} pl-8 pr-8 min-w-[140px] appearance-none cursor-pointer`}
                        >
                            <option value="">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="PROCESSED">Processed</option>
                            <option value="FAILED">Failed</option>
                            <option value="REFUNDED">Refunded</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            className={`${inputClass} pl-8 pr-8 min-w-[140px] appearance-none cursor-pointer`}
                        >
                            <option value="">All Types</option>
                            <option value="Incoming">Incoming</option>
                            <option value="Refund">Refund</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                    </div>

                    <div className="relative">
                        <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                        <select
                            value={gatewayFilter}
                            onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
                            className={`${inputClass} pl-8 pr-8 min-w-[140px] appearance-none cursor-pointer`}
                        >
                            <option value="">All Gateways</option>
                            <option value="razorpay">Razorpay</option>
                            <option value="cod">COD</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className={`${inputClass} min-w-[130px]`}
                            title="Start Date"
                        />
                        <span className="text-text-muted text-xs">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className={`${inputClass} min-w-[130px]`}
                            title="End Date"
                        />
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-text-muted">
                                <th className="p-3 text-left">Transaction</th>
                                <th className="p-3 text-left">Details</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Gateway</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-gold" />
                                            <span className="text-text-muted text-sm">Loading logs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Receipt className="h-8 w-8 text-text-muted/50" />
                                            <p className="text-text-muted text-sm font-medium">No payment logs found</p>
                                            <p className="text-text-muted/60 text-xs">Try adjusting your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr
                                        key={log.payment_id}
                                        className="border-b border-border/40 hover:bg-gold/[0.02] transition-colors cursor-pointer"
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        {/* Transaction ID + Date */}
                                        <td className="p-3">
                                            <p className="font-mono text-xs text-text-primary font-semibold truncate max-w-[180px]">
                                                {log.razorpay_payment_id || log.transaction_reference || 'N/A'}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-0.5">
                                                {new Date(log.created_at).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: '2-digit',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </td>

                                        {/* Order + Customer */}
                                        <td className="p-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono text-xs text-gold bg-gold/10 border border-gold/20 rounded-lg px-2 py-0.5 w-fit">
                                                    #{log.order_id?.split('-')[0]}
                                                </span>
                                                <span className="text-xs text-text-primary font-medium">{log.customer_name || 'N/A'}</span>
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="p-3 text-right">
                                            <span className="font-semibold text-text-primary">{formatINR(parseFloat(log.amount || 0))}</span>
                                        </td>

                                        {/* Type */}
                                        <td className="p-3">
                                            <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${log.payment_type === 'Refund' ? 'text-rose-400 bg-rose-500/10 border-rose-500/25' : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/25'}`}>
                                                {log.payment_type}
                                            </span>
                                        </td>

                                        {/* Gateway */}
                                        <td className="p-3">
                                            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-0.5">
                                                {formatGateway(log.payment_gateway || log.payment_method)}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="p-3">
                                            <StatusBadge status={log.payment_status} />
                                        </td>

                                        {/* Actions */}
                                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className={iconBtnClass}
                                                title="View Details"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-border/60">
                        <span className="text-xs text-text-muted">
                            Page <span className="text-text-primary font-medium">{page}</span> of {totalPages}
                            {' '}({total} total)
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className={`${iconBtnClass} disabled:opacity-30`}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages}
                                className={`${iconBtnClass} disabled:opacity-30`}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Payment Details Side Drawer ── */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
                    <div
                        className="relative w-full max-w-lg bg-card-bg border-l border-border overflow-y-auto"
                        style={{ animation: 'slideInRight 0.3s ease-out' }}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-card-bg/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gold/10 rounded-lg border border-gold/20">
                                    <Receipt className="h-4 w-4 text-gold" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-text-primary">Payment Details</h2>
                                    <p className="text-[10px] text-text-muted font-mono">{selectedLog.payment_id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className={iconBtnClass}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-5">
                            {/* Summary Strip */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`${cardClass} p-3`}>
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1">Amount</p>
                                    <p className="text-xl font-bold text-gold">{formatINR(parseFloat(selectedLog.amount || 0))}</p>
                                </div>
                                <div className={`${cardClass} p-3`}>
                                    <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1">Status</p>
                                    <div className="mt-1"><StatusBadge status={selectedLog.payment_status} /></div>
                                </div>
                            </div>

                            {/* Transaction Info */}
                            <Section title="Transaction Info">
                                <div className={`${cardClass} px-3 divide-y divide-border/40`}>
                                    <DetailRow label="Payment Type" value={selectedLog.payment_type} />
                                    <DetailRow label="Payment ID" value={selectedLog.payment_id} />
                                    <DetailRow label="Razorpay ID" value={selectedLog.razorpay_payment_id} />
                                    <DetailRow label="Transaction Ref" value={selectedLog.transaction_reference} />
                                    <DetailRow label="Gateway" value={formatGateway(selectedLog.payment_gateway || selectedLog.payment_method)} />
                                    <DetailRow label="Signature" value={selectedLog.razorpay_signature ? 'Present (Verified)' : null} />
                                    <DetailRow label="Date" value={new Date(selectedLog.created_at).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    })} />
                                </div>
                            </Section>

                            {/* Order Info */}
                            <Section title="Order Info">
                                <div className={`${cardClass} px-3 divide-y divide-border/40`}>
                                    <DetailRow label="Order ID" value={selectedLog.order_id} />
                                </div>
                            </Section>

                            {/* Customer Info */}
                            <Section title="Customer Info">
                                <div className={`${cardClass} px-3 divide-y divide-border/40`}>
                                    <DetailRow label="Customer ID" value={selectedLog.customer_id} />
                                    <DetailRow label="Name" value={selectedLog.customer_name} />
                                </div>
                            </Section>

                            {/* Failure Reason (conditional) */}
                            {selectedLog.failure_reason && (
                                <Section title="Failure Reason">
                                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-xl">
                                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-red-300 font-medium">{selectedLog.failure_reason}</p>
                                    </div>
                                </Section>
                            )}

                            {/* Order Timeline */}
                            <Section title="Payment Timeline">
                                <div className={`${cardClass} p-4 space-y-4 relative`}>
                                    {loadingTimeline ? (
                                        <div className="flex justify-center p-6">
                                            <Loader2 className="h-5 w-5 animate-spin text-gold" />
                                        </div>
                                    ) : timelineLogs.length > 0 ? (
                                        <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                                            {timelineLogs.map((tLog, idx) => (
                                                <div key={tLog.log_id} className="relative pl-8 group">
                                                    {/* Dot */}
                                                    <div className={`absolute left-0 top-1.5 h-[23px] w-[23px] rounded-full border-4 border-card-bg z-10 flex items-center justify-center transition-all ${tLog.log_id === selectedLog.log_id ? 'bg-gold ring-4 ring-gold/20' : 'bg-text-muted/20 group-hover:bg-text-muted/40'}`}>
                                                        {tLog.payment_type === 'Refund' ? (
                                                            <RefreshCw className={`h-2.5 w-2.5 ${tLog.log_id === selectedLog.log_id ? 'text-black' : 'text-text-muted'}`} />
                                                        ) : (
                                                            <CreditCard className={`h-2.5 w-2.5 ${tLog.log_id === selectedLog.log_id ? 'text-black' : 'text-text-muted'}`} />
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-[11px] font-bold uppercase tracking-wider ${tLog.payment_type === 'Refund' ? 'text-rose-400' : 'text-indigo-300'}`}>
                                                                {tLog.payment_type}
                                                            </span>
                                                            <span className="text-[10px] text-text-muted font-medium">
                                                                {new Date(tLog.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-sm font-semibold text-text-primary">
                                                                {formatINR(parseFloat(tLog.amount))}
                                                            </span>
                                                            <StatusBadge status={tLog.payment_status} />
                                                        </div>
                                                        <div className="text-[10px] text-text-muted/80 font-mono mt-0.5">
                                                            {tLog.razorpay_payment_id || tLog.transaction_reference || 'ID N/A'}
                                                        </div>
                                                        <div className="text-[10px] text-text-muted mt-0.5 font-medium">
                                                            {new Date(tLog.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-xs text-text-muted">No other logs found for this order.</p>
                                        </div>
                                    )}
                                </div>
                            </Section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
