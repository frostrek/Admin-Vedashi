'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    fetchReturns, fetchReturnById,
    approveReturnById, generateReturnAWB, cancelReturnShipment, cancelReturnOrder, rejectReturnById, completeReturnById,
    trackReturnShipment, createReturnRequest, formatINR,
    devCreateTestReturn, devSimulateReturnApproval, devSimulateReturnAWB, devSimulateCancelReturnShipment, devSimulateCancelReturnOrder,
    devSimulateReturnPickedUp, devSimulateReturnInTransit, devSimulateReturnReceived,
    devSimulateRtoStep
} from '@/lib/api';
import {
    RotateCcw, Eye, X, Package, User, RefreshCw, Plus,
    Search, ChevronLeft, ChevronRight, SlidersHorizontal,
    ExternalLink, Clock, Loader2, AlertTriangle, Check, XCircle,
    MapPin, FileText, Truck, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Status Definitions ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    REQUESTED: { label: 'Requested', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400' },
    APPROVED: { label: 'Approved', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400' },
    REJECTED: { label: 'Rejected', color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-400' },
    PICKUP_SCHEDULED: { label: 'Pickup Scheduled', color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/25', dot: 'bg-violet-400' },
    PICKED_UP: { label: 'Picked Up', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-400' },
    IN_TRANSIT: { label: 'In Transit', color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/25', dot: 'bg-purple-400' },
    RECEIVED: { label: 'Received', color: 'text-teal-300', bg: 'bg-teal-500/10', border: 'border-teal-500/25', dot: 'bg-teal-400' },
    COMPLETED: { label: 'Completed', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
    CANCELLED: { label: 'Cancelled', color: 'text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', dot: 'bg-zinc-400' },
    RTO_INITIATED: { label: 'RTO Initiated', color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/25', dot: 'bg-rose-400' },
    RTO_IN_TRANSIT: { label: 'RTO In Transit', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-400' },
    RTO_DELIVERED: { label: 'RTO Delivered', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    CUSTOMER_RETURN: { label: 'Customer', color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/25' },
    RTO: { label: 'RTO', color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/25' },
};

const statusFilters = ['REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED', 'RTO_INITIATED', 'RTO_IN_TRANSIT', 'RTO_DELIVERED'];

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', dot: 'bg-zinc-400' };
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg} border ${cfg.border} rounded-full px-2.5 py-0.5`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const cfg = TYPE_CONFIG[type] || { label: type, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25' };
    return (
        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg} border ${cfg.border} rounded-full px-2.5 py-0.5`}>
            {cfg.label}
        </span>
    );
}

// ─── Shared button styles ──────────────────────────────────────────

const iconBtnClass = "rounded-xl p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200";
const iconBtnSmClass = "rounded-lg p-1.5 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200";
const cardClass = "rounded-2xl border border-border bg-card-bg";
const inputClass = "appearance-none rounded-xl border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors";
const primaryBtnClass = "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm";
const dangerBtnClass = "inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15 transition-all";

// ─── Tab Definitions ───────────────────────────────────────────────

const TABS = [
    { key: 'all', label: 'All', filter: {} },
    { key: 'pending', label: 'Pending Approval', filter: { status: 'REQUESTED' } },
    { key: 'in_transit', label: 'In Transit', filter: { status: 'IN_TRANSIT' } },
    { key: 'completed', label: 'Completed', filter: { status: 'COMPLETED' } },
    { key: 'rto', label: 'RTO', filter: { type: 'RTO' } },
];

// ─── Main Page ─────────────────────────────────────────────────────

export default function ReturnsPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 30;

    // Filters
    const [activeTab, setActiveTab] = useState('all');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Detail drawer
    const [drawerReturn, setDrawerReturn] = useState<any>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Create return modal
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Action loading states
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const loadReturns = useCallback(async () => {
        setLoading(true);
        try {
            const tab = TABS.find(t => t.key === activeTab);
            const params: Record<string, string> = {
                limit: String(pageSize),
                offset: String(page * pageSize),
            };
            // Apply tab filters
            if (tab?.filter.status) params.status = tab.filter.status;
            if (tab?.filter.type) params.type = tab.filter.type;
            // Apply manual filters (override tab filters if set)
            if (filterStatus) params.status = filterStatus;
            if (filterType) params.type = filterType;
            if (filterDateFrom) params.date_from = filterDateFrom;
            if (filterDateTo) params.date_to = filterDateTo;
            if (searchQuery) params.search = searchQuery;

            const res = await fetchReturns(params);
            if (res.success) {
                setReturns(res.data?.returns || []);
                setTotal(res.data?.meta?.total || 0);
            }
        } catch {
            toast.error('Failed to load returns');
        } finally {
            setLoading(false);
        }
    }, [page, activeTab, filterStatus, filterType, filterDateFrom, filterDateTo, searchQuery]);

    useEffect(() => {
        loadReturns();
    }, [loadReturns]);

    // ─── Actions ─────────────────────────────────────────────────

    const openDetail = async (id: string) => {
        setDrawerLoading(true);
        setDrawerReturn(null);
        try {
            const res = await fetchReturnById(id);
            if (res.success) setDrawerReturn(res.data);
            else toast.error('Failed to load details');
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Approve this return? This will trigger a reverse shipment in Shiprocket.')) return;
        setActionLoadingId(id);
        try {
            const res = await approveReturnById(id);
            if (res.success) {
                toast.success('Return approved — reverse shipment initiated');
                loadReturns();
                if (drawerReturn?.return_id === id) openDetail(id);
            } else {
                toast.error(res.message || 'Failed to approve');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleGenerateAWB = async (id: string) => {
        if (!confirm('Assign an AWB and schedule pickup for this return?')) return;
        setActionLoadingId(id);
        try {
            const res = await generateReturnAWB(id);
            if (res.success) {
                toast.success('Return AWB generated and pickup scheduled');
                loadReturns();
                if (drawerReturn?.return_id === id) openDetail(id);
            } else {
                toast.error(res.message || 'Failed to generate AWB');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCancelShipment = async (id: string) => {
        if (!confirm('Are you sure you want to cancel the Shipment AWB in Shiprocket? (Status will reset to REQUESTED)')) return;
        setActionLoadingId(id);
        try {
            const res = await cancelReturnShipment(id);
            if (res.success) {
                toast.success('Return shipment cancelled and status reset');
                loadReturns();
                if (drawerReturn?.return_id === id) openDetail(id);
            } else {
                toast.error(res.message || 'Failed to cancel shipment');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCancelOrder = async (id: string) => {
        if (!confirm('Are you sure you want to cancel the Return Order? (Status will be marked as Cancelled)')) return;
        setActionLoadingId(id);
        try {
            const res = await cancelReturnOrder(id);
            if (res.success) {
                toast.success('Return order cancelled');
                loadReturns();
                if (drawerReturn?.return_id === id) openDetail(id);
            } else {
                toast.error(res.message || 'Failed to cancel order');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Reject this return request?')) return;
        setActionLoadingId(id);
        try {
            const res = await rejectReturnById(id);
            if (res.success) {
                toast.success('Return rejected');
                loadReturns();
                if (drawerReturn?.return_id === id) setDrawerReturn(null);
            } else {
                toast.error(res.message || 'Failed to reject');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Mark this return as completed?')) return;
        setActionLoadingId(id);
        try {
            const res = await completeReturnById(id);
            if (res.success) {
                toast.success('Return marked as completed');
                loadReturns();
                if (drawerReturn?.return_id === id) openDetail(id);
            } else {
                toast.error(res.message || 'Failed to complete');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setActionLoadingId(null);
        }
    };

    const clearFilters = () => {
        setFilterStatus(''); setFilterType('');
        setFilterDateFrom(''); setFilterDateTo(''); setSearchQuery(''); setPage(0);
    };

    const hasFilters = filterStatus || filterType || filterDateFrom || filterDateTo || searchQuery;
    const totalPages = Math.ceil(total / pageSize);

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <RotateCcw className="h-6 w-6 text-gold" />
                        Returns
                    </h1>
                    <p className="text-sm text-text-muted mt-0.5">{total} return{total !== 1 ? 's' : ''} total</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCreateModal(true)} className={`${primaryBtnClass} text-xs`}>
                        <Plus className="h-3.5 w-3.5" /> New Return
                    </button>
                    <button onClick={loadReturns} className={iconBtnClass} title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* DEV TEST PANEL — toggle via NEXT_PUBLIC_SHOW_DEV_TOOLS in .env.local */}
            {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === 'true' && <DevTestPanel onCreated={loadReturns} />}

            {/* Tabs */}
            <div className={`${cardClass} p-1 flex items-center gap-1 overflow-x-auto`}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setPage(0); setFilterStatus(''); setFilterType(''); }}
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
                            placeholder="Search Order ID, AWB, Customer..."
                            className={`${inputClass} pl-8 w-full`} />
                    </div>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                        className={`${inputClass} min-w-[140px]`}>
                        <option value="">All Statuses</option>
                        {statusFilters.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
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
                        <FilterSelect label="Type" value={filterType}
                            onChange={v => { setFilterType(v); setPage(0); }}
                            options={[
                                { value: 'CUSTOMER_RETURN', label: 'Customer Return' },
                                { value: 'RTO', label: 'RTO' },
                            ]} allLabel="All Types" />
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
                                <th className="p-3 text-left">Return ID</th>
                                <th className="p-3 text-left">Order</th>
                                <th className="p-3 text-left">Customer</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Reason</th>
                                <th className="p-3 text-left">Reverse AWB</th>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                                        <span className="text-text-muted text-sm">Loading returns...</span>
                                    </div>
                                </td></tr>
                            ) : returns.length === 0 ? (
                                <tr><td colSpan={9} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <RotateCcw className="h-8 w-8 text-text-muted/50" />
                                        <p className="text-text-muted text-sm font-medium">No returns found</p>
                                        <p className="text-text-muted/70 text-xs">
                                            {hasFilters ? 'Try adjusting your filters' : 'No return requests yet'}
                                        </p>
                                    </div>
                                </td></tr>
                            ) : returns.map((r: any) => (
                                <tr key={r.return_id}
                                    className="border-b border-border/40 hover:bg-gold/[0.02] transition-colors">
                                    <td className="p-3">
                                        <span className="font-mono text-xs text-text-primary">{r.return_id?.slice(0, 8)}...</span>
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => window.open(`/dashboard/orders?id=${r.order_id}`, '_blank')}
                                            className="font-mono text-xs text-gold hover:text-gold-soft underline-offset-2 hover:underline flex items-center gap-1"
                                        >
                                            {r.order_id?.slice(0, 8)}... <ExternalLink className="h-3 w-3" />
                                        </button>
                                    </td>
                                    <td className="p-3 text-text-primary text-sm">{r.customer_name || '—'}</td>
                                    <td className="p-3"><TypeBadge type={r.type} /></td>
                                    <td className="p-3"><StatusBadge status={r.status} /></td>
                                    <td className="p-3 text-text-muted text-xs max-w-[150px] truncate" title={r.reason || ''}>
                                        {r.reason || '—'}
                                    </td>
                                    <td className="p-3">
                                        {r.reverse_awb ? (
                                            <a href={r.reverse_tracking_url || `https://shiprocket.co/tracking/${r.reverse_awb}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="font-mono text-xs text-gold hover:text-gold-soft underline-offset-2 hover:underline flex items-center gap-1">
                                                {r.reverse_awb} <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : <span className="text-text-muted/50 text-xs">—</span>}
                                    </td>
                                    <td className="p-3 text-xs text-text-muted">
                                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => openDetail(r.return_id)} className={iconBtnSmClass} title="View Details">
                                                <Eye className="h-3.5 w-3.5" />
                                            </button>
                                            {/* RTO entries: only View + Track — no admin actions */}
                                            {r.type !== 'RTO' && r.status === 'REQUESTED' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprove(r.return_id)}
                                                        disabled={actionLoadingId === r.return_id}
                                                        className="rounded-lg p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 disabled:opacity-50"
                                                        title="Approve (Create Shipment)"
                                                    >
                                                        {actionLoadingId === r.return_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(r.return_id)}
                                                        disabled={actionLoadingId === r.return_id}
                                                        className="rounded-lg p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    </button>
                                                </>
                                            )}
                                            {r.type !== 'RTO' && r.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleGenerateAWB(r.return_id)}
                                                    disabled={actionLoadingId === r.return_id}
                                                    className="rounded-lg p-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all duration-200 disabled:opacity-50"
                                                    title="Generate AWB & Schedule Pickup"
                                                >
                                                    {actionLoadingId === r.return_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                                                </button>
                                            )}
                                            {r.type !== 'RTO' && r.status === 'RECEIVED' && (
                                                <>
                                                    <button
                                                        onClick={() => handleComplete(r.return_id)}
                                                        disabled={actionLoadingId === r.return_id}
                                                        className="rounded-lg p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 disabled:opacity-50"
                                                        title="Mark Completed"
                                                    >
                                                        {actionLoadingId === r.return_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                    </button>
                                                </>
                                            )}
                                            {r.reverse_awb && ['IN_TRANSIT', 'PICKED_UP', 'PICKUP_SCHEDULED', 'RTO_INITIATED', 'RTO_IN_TRANSIT'].includes(r.status) && (
                                                <a
                                                    href={r.reverse_tracking_url || `https://shiprocket.co/tracking/${r.reverse_awb}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="rounded-lg p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200"
                                                    title="Track"
                                                >
                                                    <Truck className="h-3.5 w-3.5" />
                                                </a>
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
            {(drawerReturn || drawerLoading) && (
                <DetailDrawer
                    returnData={drawerReturn}
                    loading={drawerLoading}
                    onClose={() => { setDrawerReturn(null); setDrawerLoading(false); }}
                    onApprove={(id) => handleApprove(id)}
                    onGenerateAWB={(id) => handleGenerateAWB(id)}
                    onCancelShipment={(id) => handleCancelShipment(id)}
                    onCancelOrder={(id) => handleCancelOrder(id)}
                    onReject={(id) => handleReject(id)}
                    onComplete={(id) => handleComplete(id)}
                    actionLoadingId={actionLoadingId}
                />
            )}

            {/* Create Return Modal */}
            {showCreateModal && (
                <CreateReturnModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => { setShowCreateModal(false); loadReturns(); }}
                />
            )}
        </div>
    );
}

// ─── Filter Select ──────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options, allLabel }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; allLabel: string;
}) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className={`${inputClass} min-w-[130px]`}>
                <option value="">{allLabel}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

// ─── Detail Drawer ──────────────────────────────────────────────

function DetailDrawer({ returnData, loading, onClose, onApprove, onGenerateAWB, onCancelShipment, onCancelOrder, onReject, onComplete, actionLoadingId }: {
    returnData: any; loading: boolean; onClose: () => void;
    onApprove: (id: string) => void; onGenerateAWB: (id: string) => void;
    onCancelShipment: (id: string) => void; onCancelOrder: (id: string) => void;
    onReject: (id: string) => void; onComplete: (id: string) => void;
    actionLoadingId: string | null;
}) {
    const r = returnData;
    const [isClosing, setIsClosing] = useState(false);

    // Disable background scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    // Timeline steps — different for RTO vs Customer Return
    const customerTimelineSteps = ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED'];
    const rtoTimelineSteps = ['RTO_INITIATED', 'RTO_IN_TRANSIT', 'COMPLETED'];
    const isRto = r?.type === 'RTO';
    const timelineSteps = isRto ? rtoTimelineSteps : customerTimelineSteps;
    const currentStepIdx = r ? timelineSteps.indexOf(r.status) : -1;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-fadeIn'}`}
                onClick={handleClose}
            />

            {/* Drawer Container — Whitish/Clean Background */}
            <div
                className={`relative w-full max-w-[40%] bg-white border-l border-border h-full flex flex-col shadow-2xl transition-transform duration-300 font-sans ${isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'}`}
            >
                {/* Header — Herbal Admin Redesign */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 flex items-center justify-between p-5 border-b border-border/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                            <RotateCcw className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-lg font-serif font-bold !text-primary tracking-tight leading-none mb-1">Return Details</h4>
                            <div className="text-[11px] text-primary/60 font-bold tracking-widest uppercase">Admin Logistics Portal</div>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-border/40 transition-colors text-text-muted hover:text-text-primary"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-12 min-h-[400px]">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                                <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Fetching Record...</span>
                            </div>
                        </div>
                    ) : r ? (
                        <div className="p-6 space-y-7 pb-24">
                            {/* Status + Type Overhead */}
                            <div className="flex items-center gap-3 bg-page-bg/50 p-4 rounded-2xl border border-border/40 mb-2">
                                <StatusBadge status={r.status} />
                                <TypeBadge type={r.type} />
                                <div className="ml-auto flex flex-col items-end">
                                    <span className="text-[10px] text-text-muted/60 font-bold uppercase tracking-tighter">Last Sync</span>
                                    <span className="text-xs font-mono font-bold text-primary/80">{new Date(r.updated_at || r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            {/* Modernized Timeline */}
                            {r.status !== 'REJECTED' && r.status !== 'CANCELLED' && (
                                <Section title="Lifecycle Status">
                                    <div className="flex items-center gap-0 overflow-x-auto pb-4 scrollbar-hide py-2">
                                        {timelineSteps.map((step, i) => {
                                            const isActive = i <= currentStepIdx;
                                            const isCurrent = i === currentStepIdx;
                                            return (
                                                <div key={step} className="flex items-center">
                                                    <div className="flex flex-col items-center min-w-[75px] group">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300 ${isCurrent ? 'bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20' :
                                                            isActive ? 'bg-primary/20 border-primary/40 text-primary' :
                                                                'bg-page-bg border-border text-text-muted/30'
                                                            }`}>
                                                            {isActive ? <Check className="h-4 w-4" /> : (i + 1)}
                                                        </div>
                                                        <span className={`text-[9px] mt-2 text-center leading-tight font-bold tracking-tight px-1 transition-colors ${isCurrent ? '!text-primary opacity-100' : isActive ? 'text-primary/70' : 'text-text-muted/30'}`}>
                                                            {(STATUS_CONFIG[step]?.label || step).split(' ').map((w: string) => w[0] + w.slice(1).toLowerCase()).join(' ')}
                                                        </span>
                                                    </div>
                                                    {i < timelineSteps.length - 1 && (
                                                        <div className={`h-[2px] w-6 -mt-5 transition-all duration-500 rounded-full ${isActive && i < currentStepIdx ? 'bg-primary/40' : 'bg-border/40'}`} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Section>
                            )}

                            <div className="grid grid-cols-1 gap-6">
                                <Section title="Return Metadata">
                                    <InfoRow label="Return ID" value={r.return_id} mono isPrimary />
                                    <InfoRow label="Protocol" value={r.type === 'RTO' ? 'RTO (Refused)' : 'Customer Initiated'} />
                                    <InfoRow label="Current Status" value={STATUS_CONFIG[r.status]?.label || r.status} />
                                    <InfoRow label="Submission Date" value={new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />
                                    {r.reason && (
                                        <div className="mt-3 pt-3 border-t border-border/40 flex flex-col gap-1.5">
                                            <span className="text-[10px] text-primary/50 font-bold uppercase tracking-widest">Return Motive</span>
                                            <p className="text-xs text-text-primary leading-relaxed italic bg-page-bg/40 p-2.5 rounded-lg border border-border/20">"{r.reason}"</p>
                                        </div>
                                    )}
                                </Section>

                                <Section title="Logistics Data">
                                    <InfoRow label="Waybill Number" value={r.reverse_awb || 'Not Generated'} mono />
                                    {r.reverse_tracking_url && (
                                        <div className="flex items-center justify-between text-sm py-1.5">
                                            <span className="text-[11px] text-primary/50 font-bold">Active Tracking</span>
                                            <a href={r.reverse_tracking_url} target="_blank" rel="noopener noreferrer"
                                                className="text-primary hover:underline flex items-center gap-1.5 text-xs font-bold leading-none">
                                                Track Gateway <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                    <InfoRow label="Courier Platform ID" value={r.shiprocket_return_order_id || 'Pending Sync'} mono />
                                </Section>

                                <Section title="Linked Order Details">
                                    <InfoRow label="Base Order" value={`#${r.order_id}`} mono isPrimary />
                                    <InfoRow label="Fulfilment Status" value={(r.order_status || 'Unknown').split('_').map((w: string) => w[0] + w.slice(1).toLowerCase()).join(' ')} />
                                    <InfoRow label="Payment Gateway" value={(r.payment_status || 'N/A').charAt(0).toUpperCase() + (r.payment_status || '').slice(1).toLowerCase()} />
                                    <InfoRow label="Value (Recoverable)" value={<><span className="font-sans mr-0.5 text-[0.85em]">$</span>{(r.final_total || r.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>} />
                                </Section>

                                <Section title="Client Representative">
                                    <InfoRow label="Full Name" value={r.customer_name || 'Anonymous User'} />
                                    <InfoRow label="Email Address" value={r.customer_email || 'No Email Record'} />
                                    <InfoRow label="Contact Number" value={r.customer_phone || 'No Phone Record'} />
                                </Section>

                                {r.shipping_address && (
                                    <Section title="Reverse Pickup Node">
                                        <div className="text-[12px] text-text-primary leading-relaxed bg-page-bg/30 p-2.5 rounded-xl border border-border/20 font-sans">
                                            <div className="font-bold text-primary/80 mb-1">{r.shipping_address.name || r.customer_name}</div>
                                            {r.shipping_address.address_line1}
                                            {r.shipping_address.address_line2 && <><br />{r.shipping_address.address_line2}</>}
                                            <br />{r.shipping_address.city}, {r.shipping_address.state} {r.shipping_address.pincode}
                                            <br />{r.shipping_address.country}
                                        </div>
                                    </Section>
                                )}

                                {r.items?.length > 0 && (
                                    <Section title="Item Inventory Inspection">
                                        <div className="space-y-3">
                                            {r.items.map((item: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-page-bg/40 border border-border/20 group hover:border-primary/30 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-text-primary truncate transition-colors group-hover:text-primary">{item.product_name || 'Inventory Item'}</p>
                                                        <p className="text-[10px] text-text-muted/70 font-mono mt-0.5">
                                                            {item.variant_name && <span className="text-primary/60">{item.variant_name} · </span>}
                                                            Qty: {item.quantity} units
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                )}

                                {(r.forward_awb || r.forward_courier) && (
                                    <Section title="Original Forward Shipment">
                                        <InfoRow label="Forward Waybill" value={r.forward_awb || '—'} mono />
                                        <InfoRow label="Carrier Name" value={r.forward_courier || '—'} />
                                        <InfoRow label="Original Arrival Status" value={r.shipment_status || '—'} />
                                    </Section>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Fixed Action Footer — Whitish Aesthetics */}
                {r && !loading && (
                    <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-5 border-t border-border/80 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
                        <div className="flex flex-col gap-3">
                            {r.reverse_awb && ['IN_TRANSIT', 'PICKED_UP', 'PICKUP_SCHEDULED', 'RECEIVED', 'COMPLETED', 'RTO_INITIATED', 'RTO_IN_TRANSIT'].includes(r.status) && (
                                <a
                                    href={r.reverse_tracking_url || `https://shiprocket.co/tracking/${r.reverse_awb}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className={`${primaryBtnClass} w-full justify-center !h-12 text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all`}
                                >
                                    <Truck className="h-4 w-4" /> Track Reverse Shipment
                                </a>
                            )}

                            {/* Action Buttons — Specific to Return State */}
                            {r.type !== 'RTO' && r.status === 'REQUESTED' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => onApprove(r.return_id)} disabled={actionLoadingId === r.return_id}
                                        className={`${primaryBtnClass} !h-12 justify-center shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all text-xs font-bold`}>
                                        {actionLoadingId === r.return_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Approve Intake
                                    </button>
                                    <button onClick={() => onReject(r.return_id)} disabled={actionLoadingId === r.return_id}
                                        className={`${dangerBtnClass} !h-12 justify-center hover:scale-[1.02] active:scale-95 transition-all text-xs font-bold`}>
                                        <XCircle className="h-4 w-4" /> Decline Request
                                    </button>
                                </div>
                            )}

                            {r.type !== 'RTO' && r.status === 'PICKUP_SCHEDULED' && (
                                <div className="grid grid-cols-1 gap-3">
                                    <button onClick={() => onCancelShipment(r.return_id)} disabled={actionLoadingId === r.return_id}
                                        className={`${dangerBtnClass} !h-11 justify-center font-bold text-xs`}>
                                        {actionLoadingId === r.return_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                        Void Reverse Shipment
                                    </button>
                                    <button onClick={() => onCancelOrder(r.return_id)} disabled={actionLoadingId === r.return_id}
                                        className="h-11 rounded-xl bg-rose-500/5 text-rose-500 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-500/10 transition-colors">
                                        <XCircle className="h-4 w-4" /> Terminate Return Order
                                    </button>
                                </div>
                            )}

                            {r.type !== 'RTO' && r.status === 'APPROVED' && (
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => onGenerateAWB(r.return_id)} disabled={actionLoadingId === r.return_id}
                                        className={`${primaryBtnClass} !h-12 !from-botanical-green !to-emerald-500 shadow-xl shadow-emerald-500/20 text-white border-0 justify-center font-bold tracking-tight`}>
                                        {actionLoadingId === r.return_id ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Package className="h-4 w-4 text-white" />}
                                        Assign Waybill & Schedule Pickup
                                    </button>
                                    <button onClick={() => onCancelOrder(r.return_id)} disabled={actionLoadingId === r.return_id}
                                        className={`${dangerBtnClass} !h-11 justify-center opacity-80 hover:opacity-100 font-bold text-xs transition-all`}>
                                        <XCircle className="h-4 w-4" /> Terminate Order
                                    </button>
                                </div>
                            )}

                            {r.type !== 'RTO' && r.status === 'RECEIVED' && (
                                <button onClick={() => onComplete(r.return_id)} disabled={actionLoadingId === r.return_id}
                                    className={`${primaryBtnClass} !h-12 w-full justify-center shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all font-bold`}>
                                    {actionLoadingId === r.return_id ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Check className="h-4 w-4 text-white" />}
                                    Finalize Completion
                                </button>
                            )}

                            {/* RTO specialized disclaimer */}
                            {r.type === 'RTO' && (
                                <div className="rounded-2xl bg-primary/5 border-2 border-dashed border-primary/20 p-4 text-xs">
                                    <div className="flex items-start gap-3">
                                        <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                                            <RotateCcw className="h-3 w-3 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-primary leading-none">Automated RTO Sequence</p>
                                            <p className="text-primary/60 leading-relaxed font-sans font-medium">This record represents a courier-initiated return (RTO). Management is synchronized via shipping APIs. Manual administrative overrides are disabled for data integrity.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Create Return Modal ────────────────────────────────────────

function CreateReturnModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [orderId, setOrderId] = useState('');
    const [reason, setReason] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!orderId.trim()) {
            toast.error('Please enter an Order ID');
            return;
        }
        setCreating(true);
        try {
            const res = await createReturnRequest({
                order_id: orderId.trim(),
                reason: reason.trim() || undefined,
            });
            if (res.success) {
                toast.success('Return request created');
                onSuccess();
            } else {
                toast.error(res.message || 'Failed to create return');
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
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-gold/10 rounded-xl border border-gold/20 shrink-0">
                            <RotateCcw className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary">Create Return Request</h3>
                            <p className="text-xs text-text-muted mt-0.5">Manually create a customer return request</p>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Order ID *</label>
                            <input
                                type="text"
                                value={orderId}
                                onChange={e => setOrderId(e.target.value)}
                                placeholder="Enter order ID (UUID)"
                                className={`${inputClass} w-full`}
                                disabled={creating}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] uppercase text-text-muted font-bold tracking-wider">Reason</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Reason for return..."
                                rows={3}
                                className={`${inputClass} w-full resize-none`}
                                disabled={creating}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-1">
                        <button onClick={onClose} disabled={creating}
                            className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button onClick={handleCreate} disabled={creating || !orderId.trim()}
                            className={`${primaryBtnClass} text-xs disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {creating ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...</>
                            ) : (
                                <><Plus className="h-3.5 w-3.5" /> Create Return</>
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
        <div className="space-y-3 font-sans">
            <div className="flex items-center gap-3 font-serif">
                <h4 className="text-xs font-bold !text-primary/90 whitespace-nowrap">{title}</h4>
                <div className="h-px bg-gradient-to-r from-primary/30 via-primary/5 to-transparent flex-1" />
            </div>
            <div className="bg-white rounded-2xl p-4 border border-border/40 space-y-2.5 transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
                {children}
            </div>
        </div>
    );
}

function InfoRow({ label, value, mono, isPrimary }: { label: string; value: React.ReactNode; mono?: boolean; isPrimary?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm py-0.5 group">
            <span className="text-[11px] text-primary/50 font-bold group-hover:text-text-secondary transition-colors">{label}</span>
            <span className={`text-text-primary font-bold text-right ${mono ? 'font-mono text-[11px] bg-page-bg px-1.5 py-0.5 rounded border border-border/20' : 'text-[12px]'} ${isPrimary ? 'text-primary' : ''}`}>
                {value}
            </span>
        </div>
    );
}

// ─── Dev Test Panel (DEV ONLY) ──────────────────────────────────

// ─── Dev Test Panel (DEV ONLY) ──────────────────────────────────

function DevTestPanel({ onCreated }: { onCreated: () => void }) {
    const [type, setType] = useState('CUSTOMER_RETURN');
    const [status, setStatus] = useState('REQUESTED');
    const [loading, setLoading] = useState(false);
    const [simReturnId, setSimReturnId] = useState('');
    const [simStatus, setSimStatus] = useState<string | null>(null);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const res = await devCreateTestReturn({ type, status });
            if (res.success) {
                toast.success(`Test ${type} created (${status})`);
                if (res.data?.return_id) setSimReturnId(res.data.return_id);
                onCreated();
            } else {
                toast.error(res.message || 'Failed');
            }
        } catch { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimApprove = async () => {
        if (!simReturnId) return toast.error('Enter Return ID');
        setLoading(true);
        try {
            const res = await devSimulateReturnApproval(simReturnId);
            if (res.success) {
                toast.success('Return approval simulated (Shipment created)');
                onCreated();
            } else {
                toast.error(res.message || 'Failed');
            }
        } catch { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimAWB = async () => {
        if (!simReturnId) return toast.error('Enter Return ID');
        setLoading(true);
        try {
            const res = await devSimulateReturnAWB(simReturnId);
            if (res.success) {
                toast.success('AWB simulation complete');
                onCreated();
            } else {
                toast.error(res.message || 'Failed');
            }
        } catch (error) { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimCancel = async () => {
        if (!simReturnId) return toast.error('Enter Return ID');
        setLoading(true);
        try {
            const res = await devSimulateCancelReturnShipment(simReturnId);
            if (res.success) {
                toast.success('Return cancellation simulated');
                onCreated();
            } else {
                toast.error(res.message || 'Failed');
            }
        } catch { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimCancelOrder = async () => {
        if (!simReturnId) return toast.error('Enter Return ID');
        setLoading(true);
        try {
            const res = await devSimulateCancelReturnOrder(simReturnId);
            if (res.success) {
                toast.success('Return order cancellation simulated');
                onCreated();
            } else {
                toast.error(res.message || 'Failed');
            }
        } catch { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimRtoFlow = async () => {
        setLoading(true);
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            // Step 1: Initiated
            toast('Starting Step 1: RTO Initiated...');
            setSimStatus('RTO Initiated...');
            const res1 = await devSimulateRtoStep({
                step: 1,
                payment_method: type === 'RTO' ? 'cod' : 'razorpay'
            });

            if (!res1.success) return toast.error(res1.message || 'Step 1 failed');

            const { order_id, shipment_id, return_id } = res1.data;
            if (return_id) setSimReturnId(return_id);
            onCreated(); // Refresh UI
            toast.success('Step 1 complete: RTO Initiated');

            // Wait 15s
            toast('Waiting 15s before "In Transit"...');
            setSimStatus('15s Wait ➔ In Transit...');
            await sleep(15000);

            // Step 2: In Transit
            toast('Starting Step 2: RTO In Transit...');
            setSimStatus('RTO In Transit...');
            const res2 = await devSimulateRtoStep({ step: 2, order_id, shipment_id });
            if (!res2.success) return toast.error(res2.message || 'Step 2 failed');
            onCreated(); // Refresh UI
            toast.success('Step 2 complete: RTO In Transit');

            // Wait 15s
            toast('Waiting 15s before "Delivered"...');
            setSimStatus('15s Wait ➔ Delivered...');
            await sleep(15000);

            // Step 3: Delivered
            toast('Starting Step 3: RTO Delivered/Completed...');
            setSimStatus('RTO Completed...');
            const res3 = await devSimulateRtoStep({ step: 3, order_id, shipment_id });
            if (!res3.success) return toast.error(res3.message || 'Step 3 failed');
            onCreated(); // Refresh UI
            toast.success('Simulation complete: RTO Delivered & Refund processed!');

        } catch (err) {
            console.error(err);
            toast.error('Network error during simulation');
        } finally {
            setLoading(false);
            setSimStatus(null);
        }
    };

    const handleSimPickup = async () => {
        if (!simReturnId) return toast.error('Enter Return ID');
        setLoading(true);
        try {
            const res = await devSimulateReturnPickedUp(simReturnId);
            if (res.success) {
                toast.success('Pickup simulation complete');
                onCreated();
            } else { toast.error(res.message || 'Failed'); }
        } catch { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimInTransit = async () => {
        if (!simReturnId) return toast.error('Enter Return ID');
        setLoading(true);
        try {
            const res = await devSimulateReturnInTransit(simReturnId);
            if (res.success) {
                toast.success('In Transit simulation complete');
                onCreated();
            } else { toast.error(res.message || 'Failed'); }
        } catch { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimReceived = async () => {
        if (!simReturnId) return toast.error('Enter Return ID');
        setLoading(true);
        try {
            const res = await devSimulateReturnReceived(simReturnId);
            if (res.success) {
                toast.success('Received simulation complete');
                onCreated();
            } else { toast.error(res.message || 'Failed'); }
        } catch { toast.error('Network error'); }
        finally { setLoading(false); }
    };

    const handleSimCustomerReturnFlow = async () => {
        setLoading(true);
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            // Step 1: Create & Approve (Immediate)
            toast('Step 1: Creating & Approving Test Return...');
            setSimStatus('Creating & Approving...');
            const res1 = await devCreateTestReturn({ type: 'CUSTOMER_RETURN', status: 'APPROVED' });
            if (!res1.success) return toast.error(res1.message || 'Step 1 failed');
            const retId = res1.data.return_id;
            if (retId) setSimReturnId(retId);
            onCreated();
            toast.success('Step 1 complete: Return Approved');

            // Step 2: Generate AWB (Immediate)
            toast('Step 2: Generating Reverse AWB...');
            setSimStatus('Generating AWB...');
            const res2 = await devSimulateReturnAWB(retId);
            if (!res2.success) return toast.error(res2.message || 'Step 2 failed');
            onCreated();
            toast.success('Step 2 complete: Pickup Scheduled');

            // --- 15s PULSES START HERE ---

            // Step 3: Picked Up
            toast('Waiting 15s before "Picked Up"...');
            setSimStatus('15s Wait ➔ Picked Up...');
            await sleep(15000);
            toast('Step 3: Simulating Pickup...');
            setSimStatus('Simulating Pickup...');
            const res3 = await devSimulateReturnPickedUp(retId);
            if (!res3.success) return toast.error(res3.message || 'Step 3 failed');
            onCreated();
            toast.success('Step 3 complete: Picked Up');

            // Step 4: In Transit
            toast('Waiting 15s before "In Transit"...');
            setSimStatus('15s Wait ➔ In Transit...');
            await sleep(15000);
            toast('Step 4: Simulating In Transit...');
            setSimStatus('Simulating In Transit...');
            const res4 = await devSimulateReturnInTransit(retId);
            if (!res4.success) return toast.error(res4.message || 'Step 4 failed');
            onCreated();
            toast.success('Step 4 complete: In Transit');

            // Step 5: Received
            toast('Waiting 15s before "Received"...');
            await sleep(15000);
            toast('Step 5: Simulating Received...');
            const res5 = await devSimulateReturnReceived(retId);
            if (!res5.success) return toast.error(res5.message || 'Step 5 failed');
            onCreated();
            toast.success('Full Simulation Complete: Return Received!');

        } catch (err) {
            console.error(err);
            toast.error('Network error during simulation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">⚙️ Dev Tools</span>
            </div>

            <div className="flex flex-col gap-3">
                {/* Create Returns */}
                <div className="flex flex-wrap items-end gap-2 p-2 bg-card-bg/50 rounded-lg border border-border/50">
                    <div className="space-y-0.5">
                        <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Type</label>
                        <select value={type} onChange={e => setType(e.target.value)}
                            className="appearance-none rounded-lg border border-border bg-card-bg px-2 py-1 text-xs text-text-primary focus:border-gold/50 focus:outline-none">
                            <option value="CUSTOMER_RETURN">Customer Return</option>
                            <option value="RTO">RTO</option>
                        </select>
                    </div>
                    <div className="space-y-0.5">
                        <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="appearance-none rounded-lg border border-border bg-card-bg px-2 py-1 text-xs text-text-primary focus:border-gold/50 focus:outline-none">
                            <option value="REQUESTED">Requested</option>
                            <option value="APPROVED">Approved</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="RECEIVED">Received</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                    <button onClick={handleCreate} disabled={loading}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Create Test Return
                    </button>
                    <div className="flex-1 w-full" />
                </div>

                {/* Simulate Process */}
                <div className="flex flex-wrap items-end gap-2 p-2 bg-card-bg/50 rounded-lg border border-border/50">
                    <div className="space-y-0.5 max-w-[200px] w-full">
                        <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Target Return ID</label>
                        <input type="text" value={simReturnId} onChange={e => setSimReturnId(e.target.value)} placeholder="RET-..."
                            className="w-full rounded-lg border border-border bg-card-bg px-2 py-1 text-xs text-text-primary focus:border-gold/50 focus:outline-none" />
                    </div>
                    <button onClick={handleSimApprove} disabled={loading || !simReturnId}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 border border-blue-500/25 px-3 py-1 text-xs font-medium text-blue-300 hover:bg-blue-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        Simulate Approve
                    </button>
                    <button onClick={handleSimAWB} disabled={loading || !simReturnId}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 border border-violet-500/25 px-3 py-1 text-xs font-medium text-violet-300 hover:bg-violet-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                        Simulate Generate AWB
                    </button>
                    <button onClick={handleSimPickup} disabled={loading || !simReturnId}
                        className="inline-flex items-center gap-1 rounded-lg bg-orange-500/10 border border-orange-500/25 px-3 py-1 text-xs font-medium text-orange-300 hover:bg-orange-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                        Simulate Pickup
                    </button>
                    <button onClick={handleSimInTransit} disabled={loading || !simReturnId}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Simulate In Transit
                    </button>
                    <button onClick={handleSimReceived} disabled={loading || !simReturnId}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Simulate Received
                    </button>
                    <button onClick={handleSimCancel} disabled={loading || !simReturnId}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/25 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                        Simulate Cancel Shipment
                    </button>
                    <button onClick={handleSimCancelOrder} disabled={loading || !simReturnId}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/25 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/15 transition-all disabled:opacity-50">
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                        Simulate Cancel Order
                    </button>
                </div>

                {/* RTO Simulator */}
                <div className="flex flex-wrap items-center gap-2 p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/20">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">RTO Simulator</span>
                        <div className="h-3 w-[1px] bg-indigo-500/20" />
                    </div>
                    <button onClick={handleSimRtoFlow} disabled={loading}
                        className={`inline-flex items-center gap-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-500/50 transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-80 ${loading && simStatus ? 'animate-pulse' : ''}`}>
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                        {simStatus && loading ? `🚀 ${simStatus}` : '🚀 Simulate Full RTO Flow (Prepaid)'}
                    </button>
                    <div className="h-3 w-[1px] bg-indigo-500/20" />
                    <button onClick={handleSimCustomerReturnFlow} disabled={loading}
                        className={`inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-80 ${loading && simStatus ? 'animate-pulse' : ''}`}>
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        {simStatus && loading ? `🚀 ${simStatus}` : '🚀 Simulate Full Customer Return Flow'}
                    </button>
                    <p className="text-[10px] text-emerald-400/60 italic ml-auto">Pulsed 15s simulation: Picked Up → In Transit → Received</p>
                </div>
            </div>
        </div>
    );
}


