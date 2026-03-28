'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    fetchShipments, fetchShipmentById,
    cancelShipmentById, fetchShipmentCouriers, bulkGetShipmentLabels, formatINR,
    fetchCourierOptions, assignShipmentCourier, generateShipmentLabel,
    scheduleShipmentPickup
} from '@/lib/api';
import {
    Truck, Eye, X, Package, User, MapPin, RefreshCw, Download,
    Search, ChevronLeft, ChevronRight, SlidersHorizontal,
    CheckSquare, Square, ExternalLink, XCircle, Clock, CalendarCheck,
    ChevronDown, Loader2, AlertTriangle, Scale, Zap, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Status Definitions ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    created:          { label: 'Created',          color: 'text-amber-300',    bg: 'bg-amber-500/10',     border: 'border-amber-500/25', dot: 'bg-amber-400' },
    pickup_scheduled: { label: 'Pickup Scheduled', color: 'text-blue-300',     bg: 'bg-blue-500/10',      border: 'border-blue-500/25',  dot: 'bg-blue-400' },
    booked:           { label: 'Booked',           color: 'text-sky-300',      bg: 'bg-sky-500/10',       border: 'border-sky-500/25',   dot: 'bg-sky-400' },
    picked_up:        { label: 'Picked Up',        color: 'text-orange-300',   bg: 'bg-orange-500/10',    border: 'border-orange-500/25', dot: 'bg-orange-400' },
    shipped:          { label: 'Shipped',          color: 'text-indigo-300',   bg: 'bg-indigo-500/10',    border: 'border-indigo-500/25', dot: 'bg-indigo-400' },
    in_transit:       { label: 'In Transit',       color: 'text-blue-300',     bg: 'bg-blue-500/10',      border: 'border-blue-500/25',  dot: 'bg-blue-400' },
    out_for_delivery: { label: 'Out for Delivery', color: 'text-cyan-300',     bg: 'bg-cyan-500/10',      border: 'border-cyan-500/25',  dot: 'bg-cyan-400' },
    delivered:        { label: 'Delivered',         color: 'text-emerald-300',  bg: 'bg-emerald-500/10',   border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
    rto_initiated:    { label: 'RTO Initiated',    color: 'text-red-300',      bg: 'bg-red-500/10',       border: 'border-red-500/25',   dot: 'bg-red-400' },
    rto_delivered:    { label: 'RTO Delivered',     color: 'text-rose-300',     bg: 'bg-rose-500/10',      border: 'border-rose-500/25',  dot: 'bg-rose-400' },
    cancelled:        { label: 'Cancelled',         color: 'text-zinc-400',     bg: 'bg-zinc-500/10',      border: 'border-zinc-500/25',  dot: 'bg-zinc-400' },
    undelivered:      { label: 'Undelivered',       color: 'text-red-300',      bg: 'bg-red-500/10',       border: 'border-red-500/25',   dot: 'bg-red-400' },
};

const statusFilters = ['created', 'booked', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'rto_initiated', 'rto_delivered', 'cancelled'];

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', dot: 'bg-zinc-400' };
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color} ${cfg.bg} border ${cfg.border} rounded-full px-2.5 py-0.5`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function isDelayed(shipment: any): boolean {
    if (shipment.status === 'delivered' || shipment.status === 'cancelled') return false;
    const created = new Date(shipment.created_at);
    const now = new Date();
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 3 && ['in_transit', 'shipped', 'out_for_delivery'].includes(shipment.status);
}

// ─── Shared button styles ──────────────────────────────────────────

const iconBtnClass = "rounded-xl p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200";
const iconBtnSmClass = "rounded-lg p-1.5 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200";
const cardClass = "rounded-2xl border border-border bg-card-bg";
const inputClass = "appearance-none rounded-xl border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors";
const primaryBtnClass = "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm";
const secondaryBtnClass = "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-gold/[0.05] transition-all";
const dangerBtnClass = "inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15 transition-all";

// ─── Main Page ─────────────────────────────────────────────────────

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const pageSize = 30;

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCourier, setFilterCourier] = useState('');
    const [filterPayment, setFilterPayment] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [couriers, setCouriers] = useState<string[]>([]);

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Detail drawer
    const [drawerShipment, setDrawerShipment] = useState<any>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Courier Select modal
    const [courierShipment, setCourierShipment] = useState<any>(null);

    // Schedule Pickup modal
    const [pickupShipment, setPickupShipment] = useState<any>(null);

    // Label Downloading state
    const [downloadingLabelId, setDownloadingLabelId] = useState<string | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);

    const loadShipments = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                limit: String(pageSize),
                offset: String(page * pageSize),
            };
            if (filterStatus) params.status = filterStatus;
            if (filterCourier) params.courier = filterCourier;
            if (filterPayment) params.payment_type = filterPayment;
            if (filterDateFrom) params.date_from = filterDateFrom;
            if (filterDateTo) params.date_to = filterDateTo;
            if (searchQuery) params.search = searchQuery;

            const res = await fetchShipments(params);
            if (res.success) {
                setShipments(res.data.shipments || []);
                setTotal(res.data.meta?.total || 0);
            }
        } catch {
            toast.error('Failed to load shipments');
        } finally {
            setLoading(false);
        }
    }, [page, filterStatus, filterCourier, filterPayment, filterDateFrom, filterDateTo, searchQuery]);

    useEffect(() => {
        loadShipments();
    }, [loadShipments]);

    useEffect(() => {
        fetchShipmentCouriers().then(res => {
            if (res.success && Array.isArray(res.data)) setCouriers(res.data);
        });
    }, []);

    // ─── Actions ─────────────────────────────────────────────────

    const openDetail = async (id: string) => {
        setDrawerLoading(true);
        setDrawerShipment(null);
        try {
            const res = await fetchShipmentById(id);
            if (res.success) setDrawerShipment(res.data);
            else toast.error('Failed to load details');
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this shipment? This action cannot be undone.')) return;
        const res = await cancelShipmentById(id);
        if (res.success) {
            toast.success('Shipment cancelled');
            loadShipments();
            if (drawerShipment?.shipment_id === id) setDrawerShipment(null);
        } else {
            toast.error(res.message || 'Failed to cancel');
        }
    };

    const handleBulkLabels = async () => {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        const toastId = toast.loading('Generating labels...');
        try {
            const res = await bulkGetShipmentLabels(Array.from(selectedIds));
            if (res.success && res.data?.labels) {
                const withUrls = res.data.labels.filter((l: any) => l.label_url);
                if (withUrls.length === 0) {
                    toast.error('No labels could be generated', { id: toastId });
                    return;
                }
                
                const uniqueUrls = Array.from(new Set(withUrls.map((l: any) => l.label_url)));
                uniqueUrls.forEach(url => window.open(url as string, '_blank'));
                toast.success(`Opened ${uniqueUrls.length} document(s)`, { id: toastId });
                setSelectedIds(new Set());
            } else {
                toast.error('Failed to generate bulk labels', { id: toastId });
            }
        } catch {
            toast.error('Network error during bulk generation', { id: toastId });
        } finally {
            setBulkLoading(false);
        }
    };

    const downloadLabel = async (id: string) => {
        setDownloadingLabelId(id);
        try {
            const res = await generateShipmentLabel(id);
            if (res.success && res.data?.label_url) {
                window.open(res.data.label_url, '_blank');
            } else {
                toast.error(res.message || 'Failed to generate label');
            }
        } catch {
            toast.error('Network error generating label');
        } finally {
            setDownloadingLabelId(null);
        }
    };

    // ─── Selection ──────────────────────────────────────────────

    const allSelected = shipments.length > 0 && shipments.every(s => selectedIds.has(s.shipment_id));
    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(shipments.map(s => s.shipment_id)));
    };
    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const clearFilters = () => {
        setFilterStatus(''); setFilterCourier(''); setFilterPayment('');
        setFilterDateFrom(''); setFilterDateTo(''); setSearchQuery(''); setPage(0);
    };

    const hasFilters = filterStatus || filterCourier || filterPayment || filterDateFrom || filterDateTo || searchQuery;
    const totalPages = Math.ceil(total / pageSize);

    // ─── Render ─────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Truck className="h-6 w-6 text-gold" />
                        Shipments
                    </h1>
                    <p className="text-sm text-text-muted mt-0.5">{total} shipment{total !== 1 ? 's' : ''} total</p>
                </div>
                <button onClick={loadShipments} className={iconBtnClass} title="Refresh">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filters Bar */}
            <div className={`${cardClass} p-3 space-y-3`}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                        <input type="text" value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                            placeholder="Search AWB, Order #, Customer..."
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
                        <FilterSelect label="Courier" value={filterCourier}
                            onChange={v => { setFilterCourier(v); setPage(0); }}
                            options={couriers.map(c => ({ value: c, label: c }))} allLabel="All Couriers" />
                        <FilterSelect label="Payment Type" value={filterPayment}
                            onChange={v => { setFilterPayment(v); setPage(0); }}
                            options={[{ value: 'cod', label: 'COD' }, { value: 'prepaid', label: 'Prepaid' }]} allLabel="All Types" />
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

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className={`${cardClass} p-2.5 flex items-center gap-3`}>
                    <span className="text-sm text-text-muted">{selectedIds.size} selected</span>
                    <button onClick={handleBulkLabels} disabled={bulkLoading} className={`${primaryBtnClass} text-xs`}>
                        {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        {bulkLoading ? 'Generating...' : 'Print Labels'}
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-xs text-text-muted hover:text-text-primary">
                        Deselect all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-text-muted">
                                <th className="p-3 w-8">
                                    <button onClick={toggleAll} className="text-text-muted hover:text-gold">
                                        {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                    </button>
                                </th>
                                <th className="p-3 text-left">Shipment</th>
                                <th className="p-3 text-left">Order</th>
                                <th className="p-3 text-left">Customer</th>
                                <th className="p-3 text-left">Courier</th>
                                <th className="p-3 text-left">AWB</th>
                                <th className="p-3 text-left">Status</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={11} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                                        <span className="text-text-muted text-sm">Loading shipments...</span>
                                    </div>
                                </td></tr>
                            ) : shipments.length === 0 ? (
                                <tr><td colSpan={11} className="p-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Truck className="h-8 w-8 text-text-muted/50" />
                                        <p className="text-text-muted text-sm font-medium">No shipments found</p>
                                        <p className="text-text-muted/70 text-xs">
                                            {hasFilters ? 'Try adjusting your filters' : 'Create shipments from confirmed orders'}
                                        </p>
                                    </div>
                                </td></tr>
                            ) : shipments.map((s: any) => {
                                const delayed = isDelayed(s);
                                return (
                                    <tr key={s.shipment_id}
                                        className={`border-b border-border/40 hover:bg-gold/[0.02] transition-colors ${delayed ? 'bg-red-500/[0.03]' : ''}`}>
                                        <td className="p-3">
                                            <button onClick={() => toggleOne(s.shipment_id)} className="text-text-muted hover:text-gold">
                                                {selectedIds.has(s.shipment_id) ? <CheckSquare className="h-4 w-4 text-gold" /> : <Square className="h-4 w-4" />}
                                            </button>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-mono text-xs text-text-primary">{s.shipment_id?.slice(0, 8)}...</span>
                                            {delayed && (
                                                <span className="ml-1.5 text-[9px] bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded-full font-bold uppercase">Delayed</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span className="font-mono text-xs text-text-muted">{s.order_number || s.order_id?.slice(0, 8) + '...'}</span>
                                        </td>
                                        <td className="p-3 text-text-primary text-sm">{s.customer_name || '—'}</td>
                                        <td className="p-3 text-text-muted text-xs">{s.courier_name || '—'}</td>
                                        <td className="p-3">
                                            {s.awb_code ? (
                                                <a href={s.tracking_url || `https://shiprocket.co/tracking/${s.awb_code}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="font-mono text-xs text-gold hover:text-gold-soft underline-offset-2 hover:underline flex items-center gap-1">
                                                    {s.awb_code} <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : <span className="text-text-muted/50 text-xs">Pending</span>}
                                        </td>
                                        <td className="p-3"><StatusBadge status={s.status} /></td>
                                        <td className="p-3">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                s.is_cod ? 'text-amber-300 bg-amber-500/10 border-amber-500/25' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                                            }`}>{s.is_cod ? 'COD' : 'Prepaid'}</span>
                                        </td>
                                        <td className="p-3 text-right font-mono text-sm text-text-primary">{formatINR(s.amount || s.final_total || 0)}</td>
                                        <td className="p-3 text-xs text-text-muted">
                                            {new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="p-3">
                                            <div className="grid grid-cols-5 gap-1 w-[160px] ml-auto">
                                                <div className="flex justify-center">
                                                    <button onClick={() => openDetail(s.shipment_id)} className={iconBtnSmClass} title="View Details">
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex justify-center">
                                                    <button onClick={() => setCourierShipment(s)} className={`${iconBtnSmClass} group/assign relative`} title="Assign Delivery Partner">
                                                        <User className="h-[15px] w-[15px] text-blue-400 group-hover/assign:text-blue-300 transition-colors" />
                                                        <Package className="h-[9px] w-[9px] absolute bottom-[5px] right-[4px] text-gold bg-card-bg rounded-sm shadow-sm group-hover/assign:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                                <div className="flex justify-center">
                                                    {s.awb_code && (
                                                        <button onClick={() => setPickupShipment(s)} className={`${iconBtnSmClass} text-violet-400 hover:text-violet-300 hover:bg-violet-500/10`} title="Schedule Pickup">
                                                            <CalendarCheck className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex justify-center">
                                                    {s.awb_code && (
                                                        <button onClick={() => downloadLabel(s.shipment_id)} disabled={downloadingLabelId === s.shipment_id} className={iconBtnSmClass} title="Download Label">
                                                            {downloadingLabelId === s.shipment_id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> : <Download className="h-3.5 w-3.5" />}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex justify-center">
                                                    {!['delivered', 'cancelled', 'rto_delivered', 'shipped', 'in_transit', 'out_for_delivery'].includes(s.status) && (
                                                        <button onClick={() => handleCancel(s.shipment_id)}
                                                            className="rounded-lg p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200" title="Cancel">
                                                            <XCircle className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
            {(drawerShipment || drawerLoading) && (
                <DetailDrawer shipment={drawerShipment} loading={drawerLoading}
                    onClose={() => { setDrawerShipment(null); setDrawerLoading(false); }}
                    onDownloadLabel={() => drawerShipment && downloadLabel(drawerShipment.shipment_id)}
                    downloadingLabelId={downloadingLabelId}
                    onCancel={() => drawerShipment && handleCancel(drawerShipment.shipment_id)} />
            )}

            {/* Courier Select Modal */}
            {courierShipment && (
                <CourierSelectModal 
                    shipment={courierShipment} 
                    onClose={() => setCourierShipment(null)} 
                    onSuccess={() => { setCourierShipment(null); loadShipments(); }} 
                />
            )}

            {/* Schedule Pickup Modal */}
            {pickupShipment && (
                <SchedulePickupModal
                    shipment={pickupShipment}
                    onClose={() => setPickupShipment(null)}
                    onSuccess={() => { setPickupShipment(null); loadShipments(); }}
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

function DetailDrawer({ shipment, loading, onClose, onCancel, onDownloadLabel, downloadingLabelId }: {
    shipment: any; loading: boolean; onClose: () => void; onCancel: () => void;
    onDownloadLabel: () => void; downloadingLabelId: string | null;
}) {
    const canCancel = shipment && !['delivered', 'cancelled', 'rto_delivered', 'shipped', 'in_transit', 'out_for_delivery'].includes(shipment.status);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-card-bg border-l border-border overflow-y-auto" style={{ animation: 'slideInRight 0.3s ease-out' }}>
                {/* Header */}
                <div className="sticky top-0 bg-card-bg/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <Package className="h-5 w-5 text-gold" /> Shipment Details
                    </h2>
                    <button onClick={onClose} className={iconBtnClass}><X className="h-4 w-4" /></button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                ) : shipment ? (
                    <div className="p-4 space-y-5">
                        {/* Status */}
                        <div className="flex items-center gap-3">
                            <StatusBadge status={shipment.status} />
                            {isDelayed(shipment) && (
                                <span className="flex items-center gap-1 text-xs text-red-300">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Delayed
                                </span>
                            )}
                        </div>

                        <Section title="Shipment Info">
                            <InfoRow label="Shipment ID" value={shipment.shipment_id} mono />
                            <InfoRow label="AWB Code" value={shipment.awb_code || '—'} mono />
                            <InfoRow label="Courier" value={shipment.courier_name || 'Not assigned'} />
                            <InfoRow label="Type" value={shipment.is_cod ? 'COD' : 'Prepaid'} />
                            <InfoRow label="Amount" value={formatINR(shipment.amount || 0)} />
                            <InfoRow label="Created" value={new Date(shipment.created_at).toLocaleString('en-IN')} />
                            {shipment.delivered_at && <InfoRow label="Delivered" value={new Date(shipment.delivered_at).toLocaleString('en-IN')} />}
                        </Section>

                        <Section title="Order Info">
                            <InfoRow label="Order #" value={shipment.order_number || shipment.order_id} mono />
                            <InfoRow label="Order Status" value={(shipment.order_status || '').toUpperCase()} />
                            <InfoRow label="Payment" value={(shipment.payment_status || '').toUpperCase()} />
                        </Section>

                        <Section title="Customer">
                            <InfoRow label="Name" value={shipment.customer_name || '—'} />
                            <InfoRow label="Email" value={shipment.customer_email || '—'} />
                            <InfoRow label="Phone" value={shipment.customer_phone || '—'} />
                        </Section>

                        {shipment.shipping_address && (
                            <Section title="Shipping Address">
                                <p className="text-sm text-text-primary leading-relaxed">
                                    {shipment.shipping_address.address_line1}
                                    {shipment.shipping_address.address_line2 && <><br />{shipment.shipping_address.address_line2}</>}
                                    <br />{shipment.shipping_address.city}, {shipment.shipping_address.state} {shipment.shipping_address.pincode}
                                    <br />{shipment.shipping_address.country}
                                </p>
                            </Section>
                        )}

                        {shipment.items?.length > 0 && (
                            <Section title="Order Items">
                                <div className="space-y-2">
                                    {shipment.items.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-text-primary truncate">{item.product?.product_name || 'Product'}</p>
                                                <p className="text-[11px] text-text-muted">Qty: {item.quantity} × {formatINR(item.unit_price)}</p>
                                            </div>
                                            <span className="text-sm font-mono text-text-primary ml-2">{formatINR(item.unit_price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                            {shipment.awb_code && (
                                <button onClick={onDownloadLabel} disabled={downloadingLabelId === shipment.shipment_id} className={`${primaryBtnClass} text-xs flex-1`}>
                                    {downloadingLabelId === shipment.shipment_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                    {downloadingLabelId === shipment.shipment_id ? 'Generating...' : 'Download Label'}
                                </button>
                            )}
                            {canCancel && (
                                <button onClick={onCancel} className={`${dangerBtnClass} text-xs`}>
                                    <XCircle className="h-3.5 w-3.5" /> Cancel
                                </button>
                            )}
                        </div>
                    </div>
                ) : null}
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

// ─── Schedule Pickup Modal ──────────────────────────────────────

function SchedulePickupModal({ shipment, onClose, onSuccess }: {
    shipment: any; onClose: () => void; onSuccess: () => void;
}) {
    // Pre-select existing pickup date if already scheduled
    let existingDate = '';
    if (shipment.pickup_scheduled_date) {
        if (typeof shipment.pickup_scheduled_date === 'string') {
            // "2026-03-30T00:00:00.000Z" -> "2026-03-30"
            existingDate = shipment.pickup_scheduled_date.split('T')[0];
        } else if (shipment.pickup_scheduled_date instanceof Date) {
            // ISO string guarantees YYYY-MM-DD but is UTC. If DB saved in UTC midnight,
            // we should extract just the YYYY-MM-DD safely.
            existingDate = shipment.pickup_scheduled_date.toISOString().split('T')[0];
        }
    }
    const [selectedDate, setSelectedDate] = useState<string>(existingDate);
    const [scheduling, setScheduling] = useState(false);

    // Generate date options: Today + next 5 days
    const dateOptions = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        // Safely extract YYYY-MM-DD in local timezone (en-CA outputs YYYY-MM-DD)
        const value = d.toLocaleDateString('en-CA');

        let label: string;
        if (i === 0) label = 'Today';
        else if (i === 1) label = 'Tomorrow';
        else {
            label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) + '\u2019' + d.toLocaleDateString('en-IN', { year: '2-digit' });
        }
        return { value, label };
    });

    const handleSchedule = async () => {
        if (!selectedDate) {
            toast.error('Please select a pickup date');
            return;
        }
        setScheduling(true);
        try {
            const res = await scheduleShipmentPickup(shipment.shipment_id, selectedDate);
            if (res.success) {
                toast.success(`Pickup scheduled for ${dateOptions.find(d => d.value === selectedDate)?.label || selectedDate}`);
                onSuccess();
            } else {
                toast.error(res.message || 'Failed to schedule pickup');
            }
        } catch {
            toast.error('Network error while scheduling pickup');
        } finally {
            setScheduling(false);
        }
    };

    const isToday = selectedDate === dateOptions[0]?.value;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={scheduling ? undefined : onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-[#FAF8F3] shadow-2xl z-10 overflow-hidden"
                 style={{ animation: 'fadeInScale 0.2s ease-out' }}>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20 shrink-0">
                            <CalendarCheck className="h-5 w-5 text-violet-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-[#2C1B16]">
                                {existingDate ? 'Reschedule Pickup' : 'Schedule Pickup'}
                            </h3>
                            <p className="text-xs text-[#6B5E53] mt-0.5">Please select a suitable date for your order to be picked up</p>
                        </div>
                    </div>

                    {/* Already Scheduled Banner */}
                    {existingDate && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                            <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <p className="text-[11px] text-emerald-700 font-medium">
                                Pickup already scheduled for <span className="font-bold">{new Date(existingDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>. Select a new date to reschedule.
                            </p>
                        </div>
                    )}

                    {/* Date Chips */}
                    <div className="flex flex-wrap gap-2">
                        {dateOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setSelectedDate(opt.value)}
                                disabled={scheduling}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
                                    selectedDate === opt.value
                                        ? 'bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/25 scale-105'
                                        : 'bg-white text-[#2C1B16] border-[#E5DED6] hover:border-violet-400 hover:bg-violet-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Today/Tomorrow Warning */}
                    {(selectedDate === dateOptions[0]?.value || selectedDate === dateOptions[1]?.value) && (
                        <div className="flex items-start gap-2 bg-violet-50 rounded-xl p-3 border border-violet-100">
                            <p className="text-[#6B5E53] text-[11px] leading-relaxed">
                                <span className="text-violet-600 font-medium">⚠️ In case you schedule the pick up for {selectedDate === dateOptions[0]?.value ? 'Today' : 'Tomorrow'}, you will not be able to reschedule this pick up.</span>
                            </p>
                        </div>
                    )}

                    {/* Note */}
                    <div className="bg-white/80 border border-[#E5DED6] rounded-xl px-4 py-3">
                        <p className="text-[11px] text-[#6B5E53] leading-relaxed">
                            <span className="font-bold text-[#2C1B16]">Note:</span> Please ensure that your invoice is in the package, and your label is visible on the package to be delivered.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-4 pt-1">
                        <button
                            onClick={onClose}
                            disabled={scheduling}
                            className="text-xs font-medium text-[#6B5E53] hover:text-[#2C1B16] transition-colors disabled:opacity-50"
                        >
                            I'll do it later
                        </button>
                        <button
                            onClick={handleSchedule}
                            disabled={scheduling || !selectedDate}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2"
                        >
                            {scheduling ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scheduling...</>
                            ) : (
                                <>{existingDate ? 'Reschedule Pick Up' : 'Schedule Pick Up'}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Courier Select Modal ───────────────────────────────────────

function CourierSelectModal({ shipment, onClose, onSuccess }: {
    shipment: any; onClose: () => void; onSuccess: () => void;
}) {
    const [couriers, setCouriers] = useState<any[]>([]);
    const [currentCourierId, setCurrentCourierId] = useState<number | null>(null);
    const [weightInfo, setWeightInfo] = useState<{ dead_weight: number; volumetric_weight: number; applied_weight: number } | null>(null);
    const [loadingCouriers, setLoadingCouriers] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [assigningId, setAssigningId] = useState<number | null>(null);
    const [confirmCourier, setConfirmCourier] = useState<any>(null);

    useEffect(() => {
        setLoadingCouriers(true);
        setFetchError(null);
        fetchCourierOptions(shipment.shipment_id)
            .then((res) => {
                if (res.success && res.data) {
                    if (res.data.error) {
                        setFetchError(res.data.error);
                        return;
                    }
                    setCouriers(res.data.couriers || []);
                    setCurrentCourierId(res.data.current_courier_id || null);
                    setWeightInfo(res.data.weight_info || null);
                } else {
                    setFetchError(res.message || 'Failed to load couriers');
                }
            })
            .catch(() => setFetchError('Network error. Please try again.'))
            .finally(() => setLoadingCouriers(false));
    }, [shipment.shipment_id]);

    const handleAssign = async (courier: any) => {
        setAssigningId(courier.courier_company_id);
        try {
            const res = await assignShipmentCourier(
                shipment.shipment_id,
                courier.courier_company_id,
                courier.courier_name
            );
            if (res.success) {
                toast.success(`${courier.courier_name} assigned successfully`);
                onSuccess();
            } else {
                toast.error(res.message || 'Failed to assign courier');
            }
        } catch {
            toast.error('Failed to assign courier');
        } finally {
            setAssigningId(null);
        }
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 4) return 'text-emerald-400';
        if (rating >= 2.5) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={assigningId ? undefined : onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card-bg shadow-2xl z-10" style={{ animation: 'fadeInScale 0.2s ease-out' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <Truck className="h-4 w-4 text-gold" /> Select Delivery Partner
                        </h3>
                        <p className="text-[9px] uppercase font-bold tracking-[0.15em] text-text-muted/60 mt-1 flex items-center gap-1.5 opacity-80">
                            Shiprocket ID <span className="font-mono text-text-secondary select-all">{shipment?.shipment_id}</span>
                            {shipment?.courier_name && <> &bull; Current: <span className="text-text-primary/90">{shipment.courier_name}</span></>}
                        </p>
                    </div>
                    <button onClick={onClose} disabled={!!assigningId} className={`${iconBtnClass} disabled:opacity-50`}><X className="h-4 w-4" /></button>
                </div>

                {/* Body */}
                <div className="max-h-[72vh] overflow-y-auto custom-scrollbar">
                    {loadingCouriers ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="relative">
                                <Loader2 className="h-10 w-10 animate-spin text-gold/40" />
                                <Truck className="h-5 w-5 text-gold absolute inset-0 m-auto" />
                            </div>
                            <p className="text-sm font-medium text-text-muted animate-pulse">Fetching real-time rates...</p>
                        </div>
                    ) : fetchError ? (
                        <div className="p-8">
                            <div className="flex flex-col items-center justify-center py-8 px-6 bg-red-500/5 rounded-2xl border border-red-500/10 text-center gap-3">
                                <div className="p-3 bg-red-500/10 rounded-full">
                                    <AlertTriangle className="h-6 w-6 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-text-primary font-bold">Serviceability Error</p>
                                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{fetchError}</p>
                                </div>
                                <button onClick={() => window.location.reload()} className="mt-2 px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-bold rounded-lg transition-colors">
                                    Retry Check
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {/* Weight Analysis Banner */}
                            {weightInfo && (
                                <div className="grid grid-cols-3 gap-2 bg-white/[0.03] border border-border/40 rounded-2xl p-3 mb-2 shadow-inner">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[9px] text-text-muted/60 font-black uppercase tracking-widest flex items-center gap-1.5">
                                            Dead Wt. 
                                            <div className="group/tip relative flex items-center">
                                                <Info className="h-2.5 w-2.5 opacity-30 group-hover/tip:opacity-100 transition-opacity cursor-help" />
                                                <span className="absolute top-full left-0 mt-1.5 px-2.5 py-1.5 bg-[#F9F7F2] border border-gold/40 text-[#2C1B16] text-[10px] font-bold rounded-lg opacity-0 group-hover/tip:opacity-100 transition-all -translate-y-1 group-hover/tip:translate-y-0 pointer-events-none whitespace-nowrap shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[100]">
                                                    Actual physical weight of package
                                                </span>
                                            </div>
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Scale className="h-3 w-3 text-white/20" />
                                            <span className="text-xs font-mono font-bold text-text-primary">{weightInfo.dead_weight.toFixed(2)}<span className="text-[9px] ml-0.5 opacity-40">KG</span></span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 border-x border-border/40">
                                        <span className="text-[9px] text-text-muted/60 font-black uppercase tracking-widest flex items-center gap-1.5">
                                            Vol. Wt. 
                                            <div className="group/tip relative flex items-center">
                                                <Info className="h-2.5 w-2.5 opacity-30 group-hover/tip:opacity-100 transition-opacity cursor-help" />
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1.5 bg-[#F9F7F2] border border-gold/40 text-[#2C1B16] text-[10px] font-bold rounded-lg opacity-0 group-hover/tip:opacity-100 transition-all -translate-y-1 group-hover/tip:translate-y-0 pointer-events-none whitespace-nowrap shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[100]">
                                                    (Length × Breadth × Height) / 5000
                                                </span>
                                            </div>
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Package className="h-3 w-3 text-blue-400/40" />
                                            <span className="text-xs font-mono font-bold text-text-primary">{weightInfo.volumetric_weight.toFixed(2)}<span className="text-[9px] ml-0.5 opacity-40">KG</span></span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[9px] text-emerald-400/70 font-black uppercase tracking-widest flex items-center gap-1.5">
                                            Billed Wt. 
                                            <div className="group/tip relative flex items-center">
                                                <Info className="h-2.5 w-2.5 opacity-40 group-hover/tip:opacity-100 transition-opacity cursor-help" />
                                                <span className="absolute top-full right-0 mt-1.5 px-2.5 py-1.5 bg-[#F9F7F2] border border-gold/40 text-[#2C1B16] text-[10px] font-bold rounded-lg opacity-0 group-hover/tip:opacity-100 transition-all -translate-y-1 group-hover/tip:translate-y-0 pointer-events-none whitespace-nowrap shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[100]">
                                                    Final billed weight (Max of Dead vs Vol)
                                                </span>
                                            </div>
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Zap className="h-3 w-3 text-emerald-400" />
                                            <span className="text-xs font-mono font-bold text-emerald-400">{weightInfo.applied_weight.toFixed(2)}<span className="text-[9px] ml-0.5 opacity-40">KG</span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {couriers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="p-4 bg-white/[0.02] rounded-full border border-border/40">
                                        <Truck className="h-10 w-10 text-text-muted/20" />
                                    </div>
                                    <p className="text-sm text-text-muted font-medium uppercase tracking-widest text-center px-8">No Partners Serviceable<br/><span className="text-[10px] font-normal lowercase opacity-60">Check the delivery pincode and weight</span></p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[9px] font-black text-text-muted/50 uppercase tracking-[0.2em]">Available Carriers</span>
                                        <span className="text-[10px] text-text-muted/40 font-medium">{couriers.length} results</span>
                                    </div>

                                    {couriers.map((c: any, idx: number) => {
                                        const isActive = currentCourierId === c.courier_company_id;
                                        const isAssigning = assigningId === c.courier_company_id;
                                        // Simple recommendation logic: High rating and not overpriced
                                        const isRecommended = c.rating >= 4.5 || (c.rating >= 4.0 && idx === 0);

                                        return (
                                            <button
                                                key={c.courier_company_id}
                                                onClick={() => setConfirmCourier(c)}
                                                disabled={!!assigningId}
                                                className={`group w-full text-left rounded-2xl border p-4 transition-all duration-300 relative overflow-hidden ${
                                                    isActive
                                                        ? 'border-gold bg-gold/[0.08] shadow-[0_8px_30px_rgb(232,216,185,0.12)] scale-[1.02]'
                                                        : 'border-border/60 bg-white/[0.02] hover:border-gold/40 hover:bg-gold/[0.03] hover:shadow-lg active:scale-[0.98]'
                                                }`}
                                            >
                                                {/* Recommended Glow */}
                                                {isRecommended && !isActive && (
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-3xl -mr-8 -mt-8 pointer-events-none" />
                                                )}

                                                <div className="flex items-start justify-between gap-4 relative z-10">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className={`text-sm font-bold tracking-tight ${ isActive ? 'text-gold' : 'text-text-primary'}`}>
                                                                {c.courier_name}
                                                            </span>
                                                            {isRecommended && (
                                                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight flex items-center gap-1">
                                                                    <Zap className="h-2 w-2" /> Recommended
                                                                </span>
                                                            )}
                                                            {c.is_surface && (
                                                                <span className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight">Surface</span>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-y-2 mt-3">
                                                            <div className="flex items-center gap-2 text-[11px] text-text-muted">
                                                                <Clock className="h-3 w-3 opacity-50" />
                                                                <span className="font-medium text-text-primary/80">{c.estimated_delivery_days} Day{c.estimated_delivery_days !== 1 ? 's' : ''} <span className="text-[10px] opacity-60">ETA</span></span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] text-text-muted justify-end">
                                                                <span className="font-medium text-text-primary/80">Min {c.min_weight}kg</span>
                                                                <div className="group/tip relative flex items-center">
                                                                    <Info className="h-2.5 w-2.5 opacity-30 group-hover/tip:opacity-100 transition-opacity cursor-help" />
                                                                    <span className="absolute top-full right-0 mt-1.5 px-2.5 py-1.5 bg-[#F9F7F2] border border-gold/40 text-[#2C1B16] text-[10px] font-bold rounded-lg opacity-0 group-hover/tip:opacity-100 transition-all -translate-y-1 group-hover/tip:translate-y-0 pointer-events-none whitespace-nowrap shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[100]">
                                                                        Minimum weight slot for this partner
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                        <div className="text-right">
                                                            <p className={`text-lg font-serif font-black tabular-nums ${isActive ? 'text-gold' : 'text-text-primary'}`}>
                                                                ₹{c.rate}
                                                            </p>
                                                            {c.rto_charges != null && (
                                                                <p className="text-[9px] text-text-muted/60 uppercase font-bold tracking-tighter">RTO: ₹{c.rto_charges}</p>
                                                            )}
                                                        </div>
                                                        
                                                        {c.rating != null && (
                                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${getRatingColor(c.rating)} bg-white/[0.04] border border-white/[0.06]`}>
                                                                ★ {c.rating.toFixed(1)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Spinner or Active Indicator */}
                                                {(isAssigning || isActive) && (
                                                    <div className="absolute bottom-0 right-0 p-2">
                                                        {isAssigning ? (
                                                            <Loader2 className="h-3 w-3 animate-spin text-gold" />
                                                        ) : (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(232,216,185,0.8)]" />
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                {!loadingCouriers && couriers.length > 0 && (
                    <div className="px-6 py-3 bg-white/[0.02] border-t border-border/40 text-center">
                        <p className="text-[10px] text-text-muted flex items-center justify-center gap-1.5 uppercase font-bold tracking-[0.1em]">
                           Select a partner to generate AWB & book shipment
                        </p>
                    </div>
                )}

                {/* Overlaid Confirmation Dialog */}
                {confirmCourier && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md rounded-2xl animate-in fade-in duration-300">
                        <div className="bg-card-bg-elevated w-full max-w-sm rounded-3xl border border-gold/20 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] scale-in-center overflow-hidden relative">
                            {/* Accent Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                            
                            <div className="flex flex-col items-center text-center gap-4 relative z-10">
                                <div className="p-4 bg-gold/10 rounded-2xl border border-gold/20 mb-2">
                                    <Truck className="h-8 w-8 text-gold" />
                                </div>
                                <h4 className="font-serif text-xl font-bold text-gold-soft">Confirm Partner</h4>
                                <div className="space-y-3">
                                    <p className="text-sm text-text-secondary leading-relaxed px-2">
                                        Assigning <strong className="text-text-primary text-base underline decoration-gold/40 underline-offset-4">{confirmCourier.courier_name}</strong> to this shipment?
                                    </p>
                                    <div className="flex items-center justify-center gap-4 py-2 bg-white/[0.03] rounded-xl border border-border/40 font-mono text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-text-muted uppercase">Charged Rate</span>
                                            <span className="text-sm font-bold text-gold">₹{confirmCourier.rate}</span>
                                        </div>
                                        <div className="w-px h-6 bg-border/40" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-text-muted uppercase">Est. Delivery</span>
                                            <span className="text-sm font-bold text-text-primary">{confirmCourier.estimated_delivery_days} Days</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 w-full gap-3 mt-4">
                                    <button 
                                        onClick={() => setConfirmCourier(null)}
                                        disabled={!!assigningId}
                                        className="px-6 py-3 rounded-2xl text-xs font-bold text-text-muted border border-border hover:bg-white/[0.05] hover:text-text-primary transition-all disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const courier = confirmCourier;
                                            setConfirmCourier(null);
                                            handleAssign(courier);
                                        }}
                                        disabled={!!assigningId}
                                        className="px-6 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-gold to-[#d4af37] text-black shadow-lg shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                                    >
                                        {assigningId ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>Confirm <Zap className="h-3.5 w-3.5 fill-black group-hover:animate-bounce" /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
