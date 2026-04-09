'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    fetchRefundsList, fetchRefundById, fetchRefundStats,
    createRefund, processRefund, retryRefund, formatINR,
    devCreateTestRefund, devSimulateFullFlow, devSimulateRefundFailure
} from '@/lib/api';
import {
    DollarSign, Eye, X, Package, RefreshCw, Plus,
    Search, ChevronLeft, ChevronRight, SlidersHorizontal,
    ExternalLink, Loader2, Check, XCircle,
    FileText, ArrowRight, RotateCcw, Clock, AlertTriangle,
    CreditCard, Banknote, Building2, Wallet, Download, Zap, Bug
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Status Definitions ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    PENDING: { label: 'Pending', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400' },
    PROCESSING: { label: 'Processing', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400' },
    PROCESSED: { label: 'Processed', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
    FAILED: { label: 'Failed', color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-400' },
};

const MODE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    ORIGINAL_PAYMENT: { label: 'Razorpay', color: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', icon: CreditCard },
    WALLET: { label: 'Store Credit', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/25', icon: Wallet },
    UPI: { label: 'UPI', color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/25', icon: Wallet },
    BANK_TRANSFER: { label: 'Bank Transfer', color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', icon: Building2 },
    MANUAL: { label: 'Manual', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/25', icon: Banknote },
};

const statusFilters = ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'];
const modeFilters = ['ORIGINAL_PAYMENT', 'WALLET', 'UPI', 'BANK_TRANSFER', 'MANUAL'];

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', dot: 'bg-zinc-400' };
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg} border ${cfg.border} rounded-full px-2.5 py-0.5`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function ModeBadge({ mode }: { mode: string }) {
    const cfg = MODE_CONFIG[mode] || { label: mode, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', icon: CreditCard };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg} border ${cfg.border} rounded-full px-2.5 py-0.5`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

// ─── Shared Styles (matches returns page) ──────────────────────────

const iconBtnClass = "rounded-xl p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200";
const iconBtnSmClass = "rounded-lg p-1.5 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200";
const cardClass = "rounded-2xl border border-border bg-card-bg";
const inputClass = "appearance-none rounded-xl border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors";
const primaryBtnClass = "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm";
const dangerBtnClass = "inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15 transition-all";

// ─── Tabs ──────────────────────────────────────────────────────────

const TABS = [
    { key: 'all', label: 'All', filter: {} },
    { key: 'pending', label: 'Pending', filter: { status: 'PENDING' } },
    { key: 'processing', label: 'Processing', filter: { status: 'PROCESSING' } },
    { key: 'processed', label: 'Processed', filter: { status: 'PROCESSED' } },
    { key: 'failed', label: 'Failed', filter: { status: 'FAILED' } },
];

// ─── Main Page ─────────────────────────────────────────────────────

export default function RefundsPage() {
    const [refunds, setRefunds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 30;

    // Stats
    const [stats, setStats] = useState<any>(null);

    // Filters
    const [activeTab, setActiveTab] = useState('all');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMode, setFilterMode] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Detail drawer
    const [drawerRefund, setDrawerRefund] = useState<any>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [processModalRefund, setProcessModalRefund] = useState<any>(null);

    // Action loading
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const loadRefunds = useCallback(async () => {
        setLoading(true);
        try {
            const tab = TABS.find(t => t.key === activeTab);
            const params: Record<string, string> = {
                limit: String(pageSize),
                offset: String(page * pageSize),
            };
            if (tab?.filter.status) params.status = tab.filter.status;
            if (filterStatus) params.status = filterStatus;
            if (filterMode) params.mode = filterMode;
            if (filterDateFrom) params.date_from = filterDateFrom;
            if (filterDateTo) params.date_to = filterDateTo;
            if (searchQuery) params.search = searchQuery;

            const res = await fetchRefundsList(params);
            if (res.success) {
                setRefunds(res.data?.refunds || []);
                setTotal(res.data?.meta?.total || 0);
            }
        } catch {
            toast.error('Failed to load refunds');
        } finally {
            setLoading(false);
        }
    }, [page, activeTab, filterStatus, filterMode, filterDateFrom, filterDateTo, searchQuery]);

    const loadStats = useCallback(async () => {
        try {
            const res = await fetchRefundStats();
            if (res.success) setStats(res.data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadRefunds(); }, [loadRefunds]);
    useEffect(() => { loadStats(); }, [loadStats]);

    // ─── Actions ─────────────────────────────────────────────────

    const openDetail = async (id: string) => {
        setDrawerLoading(true);
        setDrawerRefund(null);
        try {
            const res = await fetchRefundById(id);
            if (res.success) setDrawerRefund(res.data);
            else toast.error('Failed to load details');
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleProcess = (refund: any) => {
        setProcessModalRefund(refund);
    };

    const handleRetry = async (id: string) => {
        if (!confirm('Retry this failed refund?')) return;
        setActionLoadingId(id);
        try {
            const res = await retryRefund(id);
            if (res.success) {
                toast.success('Refund retry initiated');
                loadRefunds();
                loadStats();
                if (drawerRefund?.refund_id === id) openDetail(id);
            } else {
                toast.error(res.message || 'Retry failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const clearFilters = () => {
        setFilterStatus(''); setFilterMode('');
        setFilterDateFrom(''); setFilterDateTo(''); setSearchQuery(''); setPage(0);
    };

    const handleExportCSV = () => {
        if (refunds.length === 0) { toast.error('No data to export'); return; }
        const headers = ['Refund ID', 'Order ID', 'Return ID', 'Customer', 'Amount', 'Mode', 'Status', 'Receipt', 'Transaction Ref', 'Date'];
        const rows = refunds.map((r: any) => [
            r.refund_id, r.order_id, r.return_id || '', r.customer_name || '',
            r.amount, r.mode, r.status, r.receipt || '', r.transaction_ref || '',
            new Date(r.created_at).toLocaleDateString('en-IN'),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `refunds_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('CSV exported');
    };

    const hasFilters = filterStatus || filterMode || filterDateFrom || filterDateTo || searchQuery;
    const totalPages = Math.ceil(total / pageSize);

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-gold" />
                        Refunds
                    </h1>
                    <p className="text-sm text-text-muted mt-0.5">{total} refund{total !== 1 ? 's' : ''} total</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportCSV} className={`${iconBtnClass} flex items-center gap-1.5 px-3 text-sm`} title="Export CSV">
                        <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                    <button onClick={() => setShowCreateModal(true)} className={`${primaryBtnClass} text-xs`}>
                        <Plus className="h-3.5 w-3.5" /> New Refund
                    </button>
                    <button onClick={() => { loadRefunds(); loadStats(); }} className={iconBtnClass} title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Pending" value={stats.pending} amount={stats.pending_amount} color="amber" />
                    <StatCard label="Processing" value={stats.processing} color="blue" />
                    <StatCard label="Processed" value={stats.processed} amount={stats.total_refunded_amount} color="emerald" />
                    <StatCard label="Failed" value={stats.failed} color="red" />
                </div>
            )}

            {/* DEV TEST PANEL — hidden in production */}
            {process.env.NODE_ENV === 'development' && (
                <RefundsDevPanel onCreated={() => { loadRefunds(); loadStats(); }} />
            )}

            {/* Tabs */}
            <div className={`${cardClass} p-1 flex items-center gap-1 overflow-x-auto`}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setPage(0); setFilterStatus(''); setFilterMode(''); }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeTab === tab.key
                                ? 'bg-gradient-to-r from-primary to-primary-light text-[#E8D8B9] shadow-sm'
                                : 'text-text-muted hover:text-text-primary hover:bg-gold/[0.05]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters Bar */}
            <div className={`${cardClass} p-3 space-y-3`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                        <input type="text" value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                            placeholder="Search Order ID, Refund ID, Customer..."
                            className={`${inputClass} pl-8 w-full`} />
                    </div>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                        className={`${inputClass} min-w-[140px]`}>
                        <option value="">All Statuses</option>
                        {statusFilters.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
                    </select>
                    <select value={filterMode} onChange={e => { setFilterMode(e.target.value); setPage(0); }}
                        className={`${inputClass} min-w-[140px]`}>
                        <option value="">All Modes</option>
                        {modeFilters.map(m => <option key={m} value={m}>{MODE_CONFIG[m]?.label || m}</option>)}
                    </select>
                    <button onClick={() => setShowFilters(!showFilters)}
                        className={`${iconBtnClass} flex items-center gap-1.5 px-3 text-sm ${showFilters ? 'bg-gold/10 text-gold border-gold/30' : ''}`}>
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                    </button>
                    {hasFilters && (
                        <button onClick={clearFilters} className="text-xs text-red-400 hover:underline whitespace-nowrap">Clear all</button>
                    )}
                </div>

                {showFilters && (
                    <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border/60">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">From</label>
                            <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }}
                                className={inputClass} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">To</label>
                            <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(0); }}
                                className={inputClass} />
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-text-muted">
                                <th className="p-3 text-left">Refund ID</th>
                                <th className="p-3 text-left">Order</th>
                                <th className="p-3 text-left">Return</th>
                                <th className="p-3 text-left">Customer</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Mode</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                                        <span className="text-text-muted text-sm">Loading refunds...</span>
                                    </div>
                                </td></tr>
                            ) : refunds.length === 0 ? (
                                <tr><td colSpan={9} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <DollarSign className="h-8 w-8 text-text-muted/50" />
                                        <p className="text-text-muted text-sm font-medium">No refunds found</p>
                                        <p className="text-text-muted/70 text-xs">
                                            {hasFilters ? 'Try adjusting your filters' : 'No refund records yet'}
                                        </p>
                                    </div>
                                </td></tr>
                            ) : refunds.map((r: any) => (
                                <tr key={r.refund_id}
                                    className="border-b border-border/40 hover:bg-gold/[0.02] transition-colors cursor-pointer"
                                    onClick={() => openDetail(r.refund_id)}
                                >
                                    <td className="p-3">
                                        <span className="font-mono text-xs text-text-primary">{r.refund_id?.slice(0, 8)}...</span>
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); window.open(`/dashboard/orders?id=${r.order_id}`, '_blank'); }}
                                            className="font-mono text-xs text-gold hover:text-gold-soft underline-offset-2 hover:underline flex items-center gap-1"
                                        >
                                            {r.order_id?.slice(0, 8)}... <ExternalLink className="h-3 w-3" />
                                        </button>
                                    </td>
                                    <td className="p-3">
                                        {r.return_id ? (
                                            <span className="font-mono text-xs text-text-muted">{r.return_id?.slice(0, 8)}...</span>
                                        ) : <span className="text-text-muted/50 text-xs">—</span>}
                                    </td>
                                    <td className="p-3 text-text-primary text-sm">{r.customer_name || '—'}</td>
                                    <td className="p-3 text-right">
                                        <span className="font-semibold text-text-primary">{formatINR(parseFloat(r.amount || 0))}</span>
                                    </td>
                                    <td className="p-3"><ModeBadge mode={r.mode} /></td>
                                    <td className="p-3"><StatusBadge status={r.status} /></td>
                                    <td className="p-3 text-xs text-text-muted">
                                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => openDetail(r.refund_id)} className={iconBtnSmClass} title="View Details">
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            {r.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleProcess(r)}
                                                    disabled={actionLoadingId === r.refund_id}
                                                    className="rounded-lg p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 disabled:opacity-50"
                                                    title="Process Refund"
                                                >
                                                    {actionLoadingId === r.refund_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                                </button>
                                            )}
                                            {r.status === 'FAILED' && (
                                                <button
                                                    onClick={() => handleRetry(r.refund_id)}
                                                    disabled={actionLoadingId === r.refund_id}
                                                    className="rounded-lg p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all duration-200 disabled:opacity-50"
                                                    title="Retry Refund"
                                                >
                                                    {actionLoadingId === r.refund_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-border/60">
                        <span className="text-xs text-text-muted">Page {page + 1} of {totalPages} ({total} total)</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                                className={`${iconBtnSmClass} disabled:opacity-30`}>
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                                className={`${iconBtnSmClass} disabled:opacity-30`}>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Drawer */}
            {(drawerRefund || drawerLoading) && (
                <DetailDrawer
                    refundData={drawerRefund}
                    loading={drawerLoading}
                    onClose={() => { setDrawerRefund(null); setDrawerLoading(false); }}
                    onProcess={handleProcess}
                    onRetry={handleRetry}
                    actionLoadingId={actionLoadingId}
                />
            )}

            {/* Create Refund Modal */}
            {showCreateModal && (
                <CreateRefundModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => { setShowCreateModal(false); loadRefunds(); loadStats(); }}
                />
            )}

            {/* Process Refund Modal */}
            {processModalRefund && (
                <ProcessRefundModal
                    refund={processModalRefund}
                    onClose={() => setProcessModalRefund(null)}
                    onSuccess={() => {
                        setProcessModalRefund(null);
                        loadRefunds();
                        loadStats();
                        if (drawerRefund?.refund_id === processModalRefund.refund_id) {
                            openDetail(processModalRefund.refund_id);
                        }
                    }}
                />
            )}
        </div>
    );
}

// ─── Stat Card ──────────────────────────────────────────────────

function StatCard({ label, value, amount, color }: { label: string; value: number; amount?: number; color: string }) {
    return (
        <div className={`${cardClass} p-3`}>
            <p className="text-[10px] uppercase text-text-muted font-bold tracking-wider">{label}</p>
            <p className={`text-xl font-bold text-${color}-400 mt-0.5`}>{value}</p>
            {amount !== undefined && amount > 0 && (
                <p className="text-xs text-text-muted mt-0.5">{formatINR(parseFloat(String(amount)))}</p>
            )}
        </div>
    );
}

// ─── Detail Drawer ──────────────────────────────────────────────

function DetailDrawer({ refundData, loading, onClose, onProcess, onRetry, actionLoadingId }: {
    refundData: any; loading: boolean; onClose: () => void;
    onProcess: (refund: any) => void; onRetry: (id: string) => void;
    actionLoadingId: string | null;
}) {
    const r = refundData;
    const timelineSteps = ['PENDING', 'PROCESSING', 'PROCESSED'];
    const currentStepIdx = r ? timelineSteps.indexOf(r.status) : -1;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-card-bg border-l border-border overflow-y-auto" style={{ animation: 'slideInRight 0.3s ease-out' }}>
                {/* Header */}
                <div className="sticky top-0 bg-card-bg/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-gold" /> Refund Details
                    </h2>
                    <button onClick={onClose} className={iconBtnClass}><X className="h-4 w-4" /></button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                ) : r ? (
                    <div className="p-4 space-y-5">
                        {/* Status + Mode */}
                        <div className="flex items-center gap-3">
                            <StatusBadge status={r.status} />
                            <ModeBadge mode={r.mode} />
                        </div>

                        {/* Timeline */}
                        {r.status !== 'FAILED' && (
                            <Section title="Timeline">
                                <div className="flex items-center gap-0 overflow-x-auto pb-1">
                                    {timelineSteps.map((step, i) => {
                                        const isActive = i <= currentStepIdx;
                                        const isCurrent = i === currentStepIdx;
                                        return (
                                            <div key={step} className="flex items-center">
                                                <div className="flex flex-col items-center min-w-[80px]">
                                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${isCurrent ? 'bg-gold border-gold text-[#1a1a1a]' :
                                                            isActive ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' :
                                                                'bg-white/5 border-border text-text-muted/40'
                                                        }`}>
                                                        {isActive ? <Check className="h-3.5 w-3.5" /> : (i + 1)}
                                                    </div>
                                                    <span className={`text-[9px] mt-1 text-center leading-tight ${isCurrent ? 'text-gold font-bold' : isActive ? 'text-emerald-400' : 'text-text-muted/40'}`}>
                                                        {STATUS_CONFIG[step]?.label || step}
                                                    </span>
                                                </div>
                                                {i < timelineSteps.length - 1 && (
                                                    <div className={`h-0.5 w-6 ${isActive && i < currentStepIdx ? 'bg-emerald-500/40' : 'bg-border'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Section>
                        )}

                        {/* Failed Alert */}
                        {r.status === 'FAILED' && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-xl">
                                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-300">Refund Failed</p>
                                    <p className="text-xs text-red-300/70 mt-0.5">
                                        {r.gateway_response?.error || r.gateway_response?.error_description || 'An error occurred during processing.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <Section title="Refund Info">
                            <InfoRow label="Refund ID" value={r.refund_id} mono />
                            <InfoRow label="Amount" value={formatINR(parseFloat(r.amount || 0))} />
                            <InfoRow label="Mode" value={MODE_CONFIG[r.mode]?.label || r.mode} />
                            <InfoRow label="Status" value={STATUS_CONFIG[r.status]?.label || r.status} />
                            {r.receipt && <InfoRow label="Receipt" value={r.receipt} mono />}
                            {r.razorpay_refund_id && <InfoRow label="RZP Refund ID" value={r.razorpay_refund_id} mono />}
                            {r.transaction_ref && <InfoRow label="Transaction Ref" value={r.transaction_ref} mono />}
                            {r.notes && <InfoRow label="Notes" value={r.notes} />}
                            {r.reason && <InfoRow label="Reason" value={r.reason} />}
                            <InfoRow label="Created" value={new Date(r.created_at).toLocaleString('en-IN')} />
                            {r.processed_at && <InfoRow label="Processed" value={new Date(r.processed_at).toLocaleString('en-IN')} />}
                        </Section>

                        <Section title="Order Info">
                            <InfoRow label="Order #" value={r.order_id} mono />
                            <InfoRow label="Order Status" value={(r.order_status || '').toUpperCase()} />
                            <InfoRow label="Payment Status" value={(r.payment_status || '').toUpperCase()} />
                            <InfoRow label="Payment Method" value={(r.payment_method || '').toUpperCase()} />
                            <InfoRow label="Order Total" value={formatINR(parseFloat(r.final_total || r.subtotal || 0))} />
                        </Section>

                        {r.linked_return_id && (
                            <Section title="Return Reference">
                                <InfoRow label="Return ID" value={r.linked_return_id} mono />
                                <InfoRow label="Return Status" value={r.return_status || '—'} />
                                <InfoRow label="Return Type" value={r.return_type || '—'} />
                            </Section>
                        )}

                        <Section title="Customer">
                            <InfoRow label="Name" value={r.customer_name || '—'} />
                            <InfoRow label="Email" value={r.customer_email || '—'} />
                            <InfoRow label="Phone" value={r.customer_phone || '—'} />
                        </Section>

                        {r.razorpay_payment_id && (
                            <Section title="Payment Gateway">
                                <InfoRow label="Payment ID" value={r.razorpay_payment_id} mono />
                                {r.razorpay_order_id && <InfoRow label="Razorpay Order" value={r.razorpay_order_id} mono />}
                            </Section>
                        )}

                        {/* Audit Logs */}
                        {r.logs?.length > 0 && (
                            <Section title="Audit Logs">
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {r.logs.map((log: any, i: number) => (
                                        <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
                                            <div className="h-1.5 w-1.5 rounded-full bg-gold/60 mt-1.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-text-primary">{log.action.replace(/_/g, ' ')}</p>
                                                <p className="text-[10px] text-text-muted">
                                                    {new Date(log.created_at).toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                            {r.status === 'PENDING' && (
                                <button onClick={() => onProcess(r)} disabled={actionLoadingId === r.refund_id}
                                    className={`${primaryBtnClass} text-xs flex-1`}>
                                    <ArrowRight className="h-3.5 w-3.5" /> Process Refund
                                </button>
                            )}
                            {r.status === 'FAILED' && (
                                <button onClick={() => onRetry(r.refund_id)} disabled={actionLoadingId === r.refund_id}
                                    className={`${primaryBtnClass} text-xs flex-1`}>
                                    {actionLoadingId === r.refund_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                    Retry Refund
                                </button>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// ─── Create Refund Modal ────────────────────────────────────────

function CreateRefundModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [orderId, setOrderId] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!orderId.trim()) { toast.error('Please enter an Order ID'); return; }
        if (!amount || parseFloat(amount) <= 0) { toast.error('Please enter a valid amount'); return; }
        setCreating(true);
        try {
            const res = await createRefund({
                order_id: orderId.trim(),
                amount: parseFloat(amount),
                reason: reason.trim() || undefined,
                notes: notes.trim() || undefined,
            });
            if (res.success) {
                toast.success('Refund created');
                onSuccess();
            } else {
                toast.error(res.message || 'Failed to create refund');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={creating ? undefined : onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card-bg shadow-2xl z-10 overflow-hidden"
                style={{ animation: 'fadeInScale 0.2s ease-out' }}>
                <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-gold/10 rounded-xl border border-gold/20 shrink-0">
                            <DollarSign className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">Create Refund</h3>
                            <p className="text-xs text-text-muted mt-0.5">Create a new refund entry for an order</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Order ID *</label>
                            <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)}
                                placeholder="Enter order ID (UUID)" className={`${inputClass} w-full`} disabled={creating} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Amount (₹) *</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                placeholder="0.00" min="0" step="0.01" className={`${inputClass} w-full`} disabled={creating} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Reason</label>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                                placeholder="Reason for refund" className={`${inputClass} w-full`} disabled={creating} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                placeholder="Internal notes..." rows={2} className={`${inputClass} w-full resize-none`} disabled={creating} />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                        <button onClick={onClose} disabled={creating}
                            className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button onClick={handleCreate} disabled={creating || !orderId.trim() || !amount}
                            className={`${primaryBtnClass} text-xs disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {creating ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...</>
                            ) : (
                                <><Plus className="h-3.5 w-3.5" /> Create Refund</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Process Refund Modal ───────────────────────────────────────

function ProcessRefundModal({ refund, onClose, onSuccess }: { refund: any; onClose: () => void; onSuccess: () => void }) {
    const isPrepaid = refund.mode === 'ORIGINAL_PAYMENT';
    const isWallet = refund.mode === 'WALLET';
    const isLegacyManual = !isPrepaid && !isWallet;

    const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
    const [amount, setAmount] = useState(String(refund.amount || ''));
    const [speed, setSpeed] = useState<'normal' | 'optimum'>('normal');
    const [transactionRef, setTransactionRef] = useState('');
    const [notes, setNotes] = useState(refund.notes || '');
    const [processing, setProcessing] = useState(false);

    const maxAmount = parseFloat(refund.amount || 0);

    const handleProcess = async () => {
        const finalAmount = refundType === 'full' ? maxAmount : parseFloat(amount);

        if (!finalAmount || finalAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (finalAmount > maxAmount) {
            toast.error(`Amount exceeds maximum requested refund (₹${maxAmount})`);
            return;
        }

        if (isLegacyManual && !transactionRef.trim()) {
            toast.error('Transaction reference is required for manual refunds');
            return;
        }

        setProcessing(true);
        try {
            const res = await processRefund(refund.refund_id, {
                mode: refund.mode,
                amount: finalAmount,
                transaction_ref: transactionRef.trim() || undefined,
                notes: notes.trim() || undefined,
                speed: isPrepaid ? speed : undefined,
            });
            if (res.success) {
                toast.success(isPrepaid ? 'Razorpay refund initiated' : (isWallet ? 'Credited to wallet' : 'Refund processed'));
                onSuccess();
            } else {
                toast.error(res.message || 'Failed to process refund');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={processing ? undefined : onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card-bg shadow-2xl z-10 overflow-hidden"
                style={{ animation: 'fadeInScale 0.2s ease-out' }}>
                <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
                            <ArrowRight className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">Process Refund</h3>
                            <p className="text-xs text-text-muted mt-0.5">
                                Pending {formatINR(maxAmount)} for Order {refund.order_id?.slice(0, 8)}...
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Refund Type Toggle */}
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Refund Scope</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setRefundType('full'); setAmount(String(maxAmount)); }}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${refundType === 'full'
                                            ? 'bg-gold/15 border-gold/40 text-gold'
                                            : 'bg-white/[0.02] border-border text-text-muted hover:text-text-primary'
                                        }`}
                                >
                                    Full Refund ({formatINR(maxAmount)})
                                </button>
                                <button
                                    onClick={() => setRefundType('partial')}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${refundType === 'partial'
                                            ? 'bg-gold/15 border-gold/40 text-gold'
                                            : 'bg-white/[0.02] border-border text-text-muted hover:text-text-primary'
                                        }`}
                                >
                                    Partial Refund
                                </button>
                            </div>
                        </div>

                        {/* Amount (for partial) */}
                        {refundType === 'partial' && (
                            <div className="space-y-1" style={{ animation: 'fadeInScale 0.2s ease-out' }}>
                                <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">
                                    Amount (₹)
                                </label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                    min="0" max={maxAmount} step="0.01" className={`${inputClass} w-full`} disabled={processing} />
                                <p className="text-[10px] text-text-muted/70">Enter amount (max {formatINR(maxAmount)})</p>
                            </div>
                        )}

                        {/* Instant vs Normal Speed Toggle (For Prepaid) */}
                        {isPrepaid && (
                            <div className="space-y-1 pt-1">
                                <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Refund Speed</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setSpeed('normal')}
                                        disabled={processing}
                                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${speed === 'normal'
                                                ? `bg-indigo-500/10 border-indigo-500/30 text-indigo-300`
                                                : 'border-border text-text-muted hover:border-border/80'
                                            }`}
                                    >
                                        <Clock className="h-3.5 w-3.5" />
                                        Normal Speed
                                    </button>
                                    <button
                                        onClick={() => setSpeed('optimum')}
                                        disabled={processing}
                                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${speed === 'optimum'
                                                ? `bg-amber-500/10 border-amber-500/40 text-amber-300`
                                                : 'border-border text-text-muted hover:border-border/80'
                                            }`}
                                    >
                                        <Zap className="h-3.5 w-3.5" />
                                        Instant Refund
                                    </button>
                                </div>
                                <p className="text-[10px] text-text-muted/60 mt-1 pl-1">
                                    {speed === 'normal'
                                        ? 'Takes 5-7 business days to reflect in customer account.'
                                        : 'Credits immediately. Extra Razorpay charges may apply.'}
                                </p>
                            </div>
                        )}

                        {/* Wallet Information (For COD) */}
                        {isWallet && (
                            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-3">
                                <Wallet className="h-5 w-5 text-amber-400 shrink-0" />
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-bold text-amber-300">Store Credit Wallet (COD)</h4>
                                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                                        The refunded amount will be credited to the customer's loyalty wallet directly as Store Credit points (1 pt = ₹1) upon processing.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Transaction Ref (for legacy manual modes) */}
                        {isLegacyManual && (
                            <div className="space-y-1 pt-1">
                                <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Transaction Reference *</label>
                                <input type="text" value={transactionRef} onChange={e => setTransactionRef(e.target.value)}
                                    placeholder="UTR / Ref number" className={`${inputClass} w-full`} disabled={processing} />
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Admin Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                placeholder="Internal processing notes..." rows={2} className={`${inputClass} w-full resize-none`} disabled={processing} />
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                        <button onClick={onClose} disabled={processing}
                            className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button onClick={handleProcess}
                            disabled={processing || !amount || (isLegacyManual && !transactionRef.trim()) || (refundType === 'partial' && parseFloat(amount) > maxAmount)}
                            className={`${primaryBtnClass} text-xs disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {processing ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
                            ) : (
                                <><Check className="h-3.5 w-3.5" /> Process Refund</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── UI Helpers ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted/70">{title}</h3>
            <div className="bg-white/[0.02] rounded-xl p-3 border border-border/50 space-y-1.5">{children}</div>
        </div>
    );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">{label}</span>
            <span className={`text-text-primary ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
        </div>
    );
}

// ─── Dev Test Panel (DEV ONLY) ──────────────────────────────────

function RefundsDevPanel({ onCreated }: { onCreated: () => void }) {
    const [mode, setMode] = useState('MANUAL');
    const [amount, setAmount] = useState('499');
    const [loading, setLoading] = useState<string | null>(null);
    const [simStatus, setSimStatus] = useState<string | null>(null);

    const handleCreateRefund = async () => {
        setLoading('refund');
        try {
            const res = await devCreateTestRefund({ mode, amount: parseFloat(amount) });
            if (res.success) {
                toast.success(`Test refund created (${mode}, ₹${amount})`);
                onCreated();
            } else toast.error(res.message || 'Failed');
        } catch { toast.error('Network error'); }
        finally { setLoading(null); }
    };

    const handleFullFlow = async () => {
        setLoading('flow');
        try {
            setSimStatus('Simulating: Order ➔ Return ➔ Refund...');
            const res = await devSimulateFullFlow();
            if (res.success) {
                const d = res.data;
                toast.success(`Full flow simulated! Order: ${d.order_id?.slice(0, 8)}...`);
                onCreated();
            } else toast.error(res.message || 'Failed');
        } catch { toast.error('Network error'); }
        finally { setLoading(null); setSimStatus(null); }
    };

    const handleSimulateFailure = async () => {
        const refundId = prompt('Enter Refund ID to mark as FAILED:');
        if (!refundId?.trim()) return;
        setLoading('fail');
        try {
            const res = await devSimulateRefundFailure(refundId.trim());
            if (res.success) {
                toast.success('Refund marked as FAILED (simulated)');
                onCreated();
            } else toast.error(res.message || 'Failed');
        } catch { toast.error('Network error'); }
        finally { setLoading(null); }
    };

    return (
        <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/[0.03] p-3">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">⚙️ Dev Tools</span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-0.5">
                    <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Mode</label>
                    <select value={mode} onChange={e => setMode(e.target.value)}
                        className="appearance-none rounded-lg border border-border bg-card-bg px-2 py-1 text-xs text-text-primary focus:border-gold/50 focus:outline-none">
                        <option value="MANUAL">Manual (COD)</option>
                        <option value="ORIGINAL_PAYMENT">Razorpay</option>
                    </select>
                </div>
                <div className="space-y-0.5">
                    <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Amount</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                        className="appearance-none rounded-lg border border-border bg-card-bg px-2 py-1 text-xs text-text-primary w-20 focus:border-gold/50 focus:outline-none" />
                </div>
                <button onClick={handleCreateRefund} disabled={loading === 'refund'}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition-all disabled:opacity-50">
                    {loading === 'refund' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Test Refund
                </button>
                <button onClick={handleFullFlow} disabled={!!loading}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        loading === 'flow'
                            ? 'bg-blue-600 border-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/20'
                            : 'bg-blue-500/10 border-blue-500/25 text-blue-300 hover:bg-blue-500/15'
                    }`}
                >
                    {loading === 'flow' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    {simStatus || 'Full Flow Simulation'}
                </button>
                <button onClick={handleSimulateFailure} disabled={loading === 'fail'}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/15 transition-all disabled:opacity-50">
                    {loading === 'fail' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bug className="h-3.5 w-3.5" />}
                    Simulate Failure
                </button>
            </div>
        </div>
    );
}
