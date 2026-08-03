'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    fetchShipments, fetchShipmentById,
    cancelShipmentById, fetchShipmentCouriers, bulkGetShipmentLabels, formatCurrency,
    fetchCourierOptions, assignShipmentCourier, generateShipmentLabel,
    scheduleShipmentPickup
} from '@/lib/api';
import {
    Truck, Eye, X, Package, User, MapPin, RefreshCw, Download,
    Search, ChevronLeft, ChevronRight, SlidersHorizontal,
    CheckSquare, Square, ExternalLink, XCircle, Clock, CalendarCheck,
    ChevronDown, Loader2, AlertTriangle, Scale, Zap, Info
} from 'lucide-react';
import React, { ReactNode } from 'react';
import toast from 'react-hot-toast';

// ─── Status Definitions ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    created: { label: 'Created', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400' },
    pickup_scheduled: { label: 'Pickup Scheduled', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400' },
    booked: { label: 'Booked', color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/25', dot: 'bg-sky-400' },
    picked_up: { label: 'Picked Up', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-400' },
    shipped: { label: 'Shipped', color: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', dot: 'bg-indigo-400' },
    in_transit: { label: 'In Transit', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400' },
    out_for_delivery: { label: 'Out for Delivery', color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', dot: 'bg-cyan-400' },
    delivered: { label: 'Delivered', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
    rto_initiated: { label: 'RTO Initiated', color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-400' },
    rto_delivered: { label: 'RTO Delivered', color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/25', dot: 'bg-rose-400' },
    cancelled: { label: 'Cancelled', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', dot: 'bg-zinc-400' },
    undelivered: { label: 'Undelivered', color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-400' },
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
    const [showBulkDropdown, setShowBulkDropdown] = useState(false);

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

    const handleBulkCancel = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Cancel ${selectedIds.size} selected shipment(s)? This action cannot be undone.`)) return;

        setBulkLoading(true);
        const toastId = toast.loading(`Cancelling ${selectedIds.size} shipment(s)...`);

        let successCount = 0;
        let failCount = 0;

        try {
            await Promise.all(
                Array.from(selectedIds).map(async (id) => {
                    const res = await cancelShipmentById(id);
                    if (res.success) successCount++;
                    else failCount++;
                })
            );

            if (failCount === 0) {
                toast.success(`Successfully cancelled ${successCount} shipment(s)`, { id: toastId });
                setSelectedIds(new Set());
                loadShipments();
            } else {
                toast.error(`Cancelled ${successCount}. Failed: ${failCount}`, { id: toastId });
                loadShipments();
            }
        } catch {
            toast.error('Network error during bulk cancel', { id: toastId });
        } finally {
            setBulkLoading(false);
            setShowBulkDropdown(false);
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
                <div className={`${cardClass} p-2.5 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-text-muted">{selectedIds.size} selected</span>
                        <div className="relative">
                            <button
                                onClick={() => setShowBulkDropdown(!showBulkDropdown)}
                                disabled={bulkLoading}
                                className={`${secondaryBtnClass} text-xs !py-1.5`}
                            >
                                Bulk actions <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            {showBulkDropdown && (
                                <div className="absolute left-0 top-full mt-1 w-40 rounded-xl border border-border bg-card-bg shadow-lg z-20 py-1" onMouseLeave={() => setShowBulkDropdown(false)}>
                                    <button
                                        onClick={handleBulkCancel}
                                        className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-gold/5 flex items-center gap-2 font-medium"
                                    >
                                        <XCircle className="h-3.5 w-3.5 text-red-400" /> Cancel shipments
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={handleBulkLabels} disabled={bulkLoading} className={`${primaryBtnClass} text-xs !py-1.5`}>
                            {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            {bulkLoading ? 'Generating...' : 'Print Labels'}
                        </button>
                        <button onClick={() => setSelectedIds(new Set())} className="text-xs text-text-muted hover:text-text-primary ml-2">
                            Deselect all
                        </button>
                    </div>
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
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.is_cod ? 'text-amber-300 bg-amber-500/10 border-amber-500/25' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                                                }`}>{s.is_cod ? 'COD' : 'Prepaid'}</span>
                                        </td>
                                        <td className="p-3 text-right font-mono text-sm text-text-primary">
                                            {formatCurrency(s.amount || s.final_total || 0, s.currency || 'USD')}
                                        </td>
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
    const [isClosing, setIsClosing] = useState(false);

    // Disable background scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const canCancel = shipment && !['delivered', 'cancelled', 'rto_delivered', 'shipped', 'in_transit', 'out_for_delivery'].includes(shipment.status);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Wait for the 0.3s transition
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100 animate-fadeIn'}`}
                onClick={handleClose}
            />

            {/* Drawer Container — Whitish/Clean Background */}
            <div
                className={`relative w-full max-w-[40%] bg-white border-l border-border h-full flex flex-col shadow-2xl transition-transform duration-300 ${isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'}`}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 flex items-center justify-between p-5 border-b border-border/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 transition-shadow">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-lg font-serif font-bold !text-primary tracking-tight leading-none mb-1">Shipment Details</h4>
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

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-3 opacity-60">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                            <p className="text-sm font-medium text-text-muted animate-pulse">Syncing logistics data...</p>
                        </div>
                    ) : shipment ? (
                        <div className="p-6 space-y-7 animate-fadeInUp">
                            {/* Unified Info Header — Whitish Card */}
                            <div className="bg-page-bg/40 p-4 rounded-xl border border-border/40">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-primary/50 font-bold tracking-wider uppercase">Pipeline Status</div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={shipment.status} />
                                            {isDelayed(shipment) && (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-[10px] text-red-500 font-bold uppercase border border-red-100">
                                                    <AlertTriangle className="h-3 w-3" /> Delayed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-[10px] text-primary/50 font-bold tracking-wider uppercase">Manifest Date</div>
                                        <div className="text-xs text-text-primary font-bold">
                                            {new Date(shipment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                                    <span className="text-[10px] text-primary/50 font-bold uppercase tracking-widest">Courier Partner</span>
                                    <span className="text-[11px] text-text-primary font-bold px-2 py-0.5 bg-white border border-border/50 rounded-md shadow-sm">
                                        {shipment.courier_name || 'Calculating Optimal Service...'}
                                    </span>
                                </div>
                            </div>

                            <Section title="Logistics Pipeline">
                                <InfoRow label="Shipment ID" value={shipment.shipment_id} mono />
                                <InfoRow label="AWB Tracking #" value={shipment.awb_code || 'Pending Assignment'} mono={!!shipment.awb_code} />
                                <InfoRow label="Fulfillment Service" value={shipment.is_cod ? 'Cash on Delivery (COD)' : 'Prepaid Dispatch'} />
                                <InfoRow label="Invoice Value" value={formatCurrency(shipment.amount || shipment.final_total || 0, shipment.currency || 'USD')} isPrimary />
                            </Section>

                            <Section title="Reference Order">
                                <InfoRow label="Internal ID" value={shipment.order_number || shipment.order_id} mono />
                                <InfoRow label="Operational State" value={(shipment.order_status || 'Pending')} />
                                <InfoRow label="Financial Status" value={(shipment.payment_status || 'Unpaid')} />
                            </Section>

                            <Section title="Customer Intelligence">
                                <InfoRow label="Recipient Name" value={shipment.customer_name || 'Guest User'} />
                                <InfoRow label="Contact Channel" value={shipment.customer_email || 'No email provided'} />
                                <InfoRow label="Phone Contact" value={shipment.customer_phone || 'Private Record'} />
                            </Section>

                            {shipment.shipping_address && (
                                <Section title="Delivery Destination">
                                    <div className="text-sm text-text-primary leading-[1.6] opacity-85 font-medium">
                                        {shipment.shipping_address.address_line1}
                                        {shipment.shipping_address.address_line2 && <><br />{shipment.shipping_address.address_line2}</>}
                                        <br />{shipment.shipping_address.city}, {shipment.shipping_address.state} {shipment.shipping_address.pincode}
                                        <br /><span className="text-[10px] uppercase text-text-muted tracking-widest">{shipment.shipping_address.country}</span>
                                    </div>
                                </Section>
                            )}

                            {shipment.items?.length > 0 && (
                                <Section title="Inventory Profile">
                                    <div className="space-y-3">
                                        {(() => {
                                            const shipItems = shipment.items || [];
                                            return shipItems.map((item: any, i: number) => {
                                                const unitPrice = item.unit_price || item.price || 0;
                                                const lineTotal = unitPrice * item.quantity;
                                                return (
                                                    <div key={i} className="flex items-center justify-between py-2 group">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <p className="text-[13px] text-text-primary font-semibold truncate group-hover:text-gold transition-colors">{item.product?.product_name || 'Managed SKU'}</p>
                                                            <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5">
                                                                Quantity: {item.quantity} × {formatCurrency(unitPrice, shipment.currency || 'USD')}
                                                            </p>
                                                        </div>
                                                        <div className="text-xs font-mono font-bold text-text-primary bg-border/20 px-2 py-1 rounded">
                                                            {formatCurrency(lineTotal, shipment.currency || 'USD')}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </Section>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer Redesign — Clean & Whitish Footer */}
                {shipment && !loading && (
                    <div className="p-5 border-t border-border/40 bg-white flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                        {shipment.awb_code && (
                            <button
                                onClick={onDownloadLabel}
                                disabled={downloadingLabelId === shipment.shipment_id}
                                className="flex-1 h-12 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-dark shadow-lg shadow-primary/10 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {downloadingLabelId === shipment.shipment_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                {downloadingLabelId === shipment.shipment_id ? 'Syncing...' : 'PRINT SHIPPING LABEL'}
                            </button>
                        )}
                        {canCancel && (
                            <button
                                onClick={onCancel}
                                className="px-5 h-12 rounded-xl border border-red-100 text-red-500 font-bold text-[10px] uppercase hover:bg-red-50 hover:border-red-200 transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                                <XCircle className="h-4 w-4" /> Cancel Order
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── UI Helpers ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <h4 className="text-xs font-serif font-bold !text-primary/90 whitespace-nowrap">{title}</h4>
                <div className="h-px bg-gradient-to-r from-primary/30 via-primary/5 to-transparent flex-1" />
            </div>
            <div className="bg-white rounded-2xl p-4 border border-border/40 space-y-2.5 transition-all duration-300 hover:border-primary/20 hover:shadow-sm">
                {children}
            </div>
        </div>
    );
}

function InfoRow({ label, value, mono, isPrimary }: { label: string; value: ReactNode; mono?: boolean; isPrimary?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm py-0.5 group">
            <span className="text-text-muted font-bold text-[11px] group-hover:text-text-secondary transition-colors">{label}</span>
            <span className={`text-text-primary font-bold text-right ${mono ? 'font-mono text-[11px] bg-page-bg px-1.5 py-0.5 rounded border border-border/20' : 'text-[12px]'} ${isPrimary ? 'text-primary' : ''}`}>
                {value}
            </span>
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
        const d = new Date(shipment.pickup_scheduled_date);
        if (!isNaN(d.getTime())) {
            // Convert to local timezone date correctly before extracting YYYY-MM-DD
            existingDate = d.toLocaleDateString('en-CA');
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={scheduling ? undefined : onClose} />
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] border border-border/60 shadow-2xl z-10 overflow-hidden animate-scaleIn">
                {/* Content */}
                <div className="p-8 space-y-6">
                    {/* Header — Herbal Theme */}
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 shrink-0 shadow-sm">
                            <CalendarCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-serif font-bold text-primary mb-1">
                                {existingDate ? 'Update Pickup Protocol' : 'Schedule Pickup Node'}
                            </h3>
                            <p className="text-xs text-primary/60 font-medium leading-relaxed">
                                Align dispatch logistics with carrier availability for peak efficiency
                            </p>
                        </div>
                    </div>

                    {/* Status Feedback */}
                    {existingDate && (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 shadow-sm">
                            <div className="p-1.5 bg-white rounded-full shadow-xs">
                                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <p className="text-[11px] text-emerald-800 font-bold leading-tight">
                                Reserved for <span className="underline decoration-emerald-300 underline-offset-4">{new Date(existingDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>. Update below to reschedule.
                            </p>
                        </div>
                    )}

                    {/* Date Selection Grid */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.15em] ml-1">Available Windows</label>
                        <div className="grid grid-cols-2 gap-3">
                            {dateOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSelectedDate(opt.value)}
                                    disabled={scheduling}
                                    className={`p-3 rounded-2xl text-xs font-bold transition-all duration-300 border-2 flex flex-col items-center gap-1 ${selectedDate === opt.value
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'bg-white text-primary border-border/40 hover:border-primary/30 hover:bg-page-bg/30'
                                        }`}
                                >
                                    <span className="opacity-60 text-[9px] uppercase tracking-tighter">
                                        {opt.value === dateOptions[0]?.value ? 'Instant' : 'Scheduled'}
                                    </span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Warning/Notes Section */}
                    <div className="space-y-3">
                        {(selectedDate === dateOptions[0]?.value || selectedDate === dateOptions[1]?.value) && (
                            <div className="flex items-start gap-3 bg-rose-50 rounded-2xl p-4 border border-rose-100/60 shadow-sm animate-pulse">
                                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-rose-900 text-[11px] leading-relaxed font-medium">
                                    <span className="font-bold">Final Call:</span> Pickup scheduled for {selectedDate === dateOptions[0]?.value ? 'Today' : 'Tomorrow'} enters an immutable state on carrier manifests. Ensure package readiness.
                                </p>
                            </div>
                        )}

                        <div className="bg-page-bg/60 border border-border/40 rounded-2xl px-4 py-4 flex items-start gap-3">
                            <Info className="h-4 w-4 text-primary/40 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-text-primary/70 leading-relaxed font-medium">
                                <span className="text-primary font-bold">Standard Note:</span> Attach the internal invoice and ensure the generated AWB label is unobstructed for optical scanning.
                            </p>
                        </div>
                    </div>

                    {/* Action Footing */}
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            onClick={handleSchedule}
                            disabled={scheduling || !selectedDate}
                            className="w-full h-12 rounded-2xl text-[13px] font-black bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group"
                        >
                            {scheduling ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> Finalizing Manifest...</>
                            ) : (
                                <>{existingDate ? 'Proceed with Reschedule' : 'Confirm Pickup Window'} <CalendarCheck className="h-4 w-4 group-hover:scale-110 transition-transform" /></>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={scheduling}
                            className="w-full h-10 rounded-xl text-xs font-bold text-primary/40 hover:text-primary transition-colors disabled:opacity-50"
                        >
                            Postpone Decision
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
        if (rating >= 4) return 'text-emerald-600';
        if (rating >= 2.5) return 'text-amber-600';
        return 'text-rose-600';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={assigningId ? undefined : onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-[2rem] border border-border/60 shadow-2xl z-10 overflow-hidden animate-slideUpIn">
                {/* Header — Herbal Theme */}
                <div className="flex items-center justify-between p-6 border-b border-border/40 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10">
                            <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-xl font-serif font-bold !text-primary leading-none mb-1.5">Select Delivery Partner</h4>
                            <p className="text-[11px] font-bold tracking-widest text-primary/40 uppercase">
                                Logistics Slot Optimization
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={!!assigningId}
                        className="p-2.5 rounded-full hover:bg-page-bg transition-colors text-text-muted hover:text-primary disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body — Whitish & Professional */}
                <div className="max-h-[70vh] overflow-y-auto bg-white p-6 pt-2 scrollbar-hide">
                    {loadingCouriers ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="relative">
                                <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
                                <Truck className="h-5 w-5 text-primary/60 absolute inset-0 m-auto" />
                            </div>
                            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest animate-pulse">Calculating optimal rates...</p>
                        </div>
                    ) : fetchError ? (
                        <div className="py-8">
                            <div className="flex flex-col items-center justify-center p-8 bg-rose-50 rounded-3xl border border-rose-100 text-center gap-4">
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-rose-100">
                                    <AlertTriangle className="h-8 w-8 text-rose-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-serif font-bold text-rose-900">Serviceability Alert</p>
                                    <p className="text-[13px] text-rose-700/70 leading-relaxed font-medium">{fetchError}</p>
                                </div>
                                <button onClick={() => window.location.reload()} className="mt-2 px-6 py-2.5 bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all">
                                    Retry Parameters
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 pt-4">
                            {/* Improved Weight Analysis Banner */}
                            {weightInfo && (
                                <div className="grid grid-cols-3 gap-0 bg-page-bg/40 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="p-4 flex flex-col items-center gap-1.5 border-r border-border/40 hover:bg-white/40 transition-colors">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-border/60 shadow-xs">
                                            <Scale className="h-2.5 w-2.5 text-primary/60" />
                                            <span className="text-[9px] text-primary/60 font-bold uppercase tracking-wider">Dead Wt.</span>
                                        </div>
                                        <p className="text-base font-serif font-bold text-primary">{weightInfo.dead_weight.toFixed(2)}<span className="text-[10px] ml-1 opacity-50">KG</span></p>
                                    </div>
                                    <div className="p-4 flex flex-col items-center gap-1.5 border-r border-border/40 hover:bg-white/40 transition-colors">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-border/60 shadow-xs">
                                            <Package className="h-2.5 w-2.5 text-blue-500/60" />
                                            <span className="text-[9px] text-blue-500/60 font-bold uppercase tracking-wider">Vol. Wt.</span>
                                        </div>
                                        <p className="text-base font-serif font-bold text-blue-600">{weightInfo.volumetric_weight.toFixed(2)}<span className="text-[10px] ml-1 opacity-50">KG</span></p>
                                    </div>
                                    <div className="p-4 flex flex-col items-center gap-1.5 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors relative">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 shadow-xs">
                                            <Zap className="h-2.5 w-2.5 text-primary" />
                                            <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Billed Wt.</span>
                                        </div>
                                        <p className="text-base font-serif font-bold text-primary">{weightInfo.applied_weight.toFixed(2)}<span className="text-[10px] ml-1 opacity-50">KG</span></p>
                                    </div>
                                </div>
                            )}

                            {/* Carrier Selection List */}
                            {couriers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="p-5 bg-page-bg rounded-3xl border border-border/60 shadow-inner">
                                        <Truck className="h-10 w-10 text-primary/20" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-serif font-bold text-primary">No Serviceable Partners</p>
                                        <p className="text-[11px] text-text-muted/60 mt-1">Refine weight parameters or check destination clearance</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.15em]">Dispatch Recommendations</span>
                                        <span className="px-2 py-0.5 bg-page-bg border border-border/60 rounded-lg text-[10px] text-primary/60 font-mono font-bold">{couriers.length} Slots Available</span>
                                    </div>

                                    <div className="space-y-3">
                                        {couriers.map((c: any, idx: number) => {
                                            const isActive = currentCourierId === c.courier_company_id;
                                            const isAssigning = assigningId === c.courier_company_id;
                                            const isRecommended = c.rating >= 4.5 || (c.rating >= 4.0 && idx === 0);

                                            return (
                                                <button
                                                    key={c.courier_company_id}
                                                    onClick={() => setConfirmCourier(c)}
                                                    disabled={!!assigningId}
                                                    className={`group w-full text-left rounded-2xl border-2 p-5 transition-all duration-300 relative overflow-hidden ${isActive
                                                        ? 'border-primary bg-primary/[0.04] shadow-lg shadow-primary/5 scale-[1.01]'
                                                        : 'border-border/40 bg-white hover:border-primary/30 hover:bg-page-bg/30 hover:shadow-xl active:scale-[0.99]'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4 relative z-10">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2.5 flex-wrap mb-2">
                                                                <span className={`text-base font-serif font-bold tracking-tight ${isActive ? 'text-primary' : 'text-text-primary'}`}>
                                                                    {c.courier_name}
                                                                </span>
                                                                {isRecommended && (
                                                                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tight flex items-center gap-1.5 shadow-sm">
                                                                        <Zap className="h-3 w-3" /> Recommended
                                                                    </span>
                                                                )}
                                                                {c.is_surface && (
                                                                    <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tight">Rapid Surface</span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-6 mt-4">
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <Clock className="h-4 w-4 text-primary/40" />
                                                                    <span className="font-bold text-text-primary/70">{c.estimated_delivery_days} Day{c.estimated_delivery_days !== 1 ? 's' : ''} <span className="text-[10px] text-text-muted font-normal uppercase ml-1">Arrival</span></span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <Scale className="h-4 w-4 text-primary/40" />
                                                                    <span className="font-bold text-text-primary/70">{c.min_weight}kg <span className="text-[10px] text-text-muted font-normal uppercase ml-1">Capacity</span></span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-3 shrink-0">
                                                            <div className="text-right">
                                                                <p className={`text-2xl font-serif font-black tabular-nums leading-none ${isActive ? 'text-primary' : 'text-text-primary'}`}>
                                                                    <span className="font-sans mr-0.5 text-[0.85em]">$</span>{c.rate}
                                                                </p>
                                                                {c.rto_charges != null && (
                                                                    <p className="text-[10px] text-rose-500/70 font-bold uppercase tracking-tight mt-1">RTO Opt-in: <span className="font-sans mr-0.5">$</span>{c.rto_charges}</p>
                                                                )}
                                                            </div>

                                                            {c.rating != null && (
                                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black ${getRatingColor(c.rating)} bg-page-bg border border-border/40 shadow-sm`}>
                                                                    ★ {c.rating.toFixed(1)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isActive && (
                                                        <div className="absolute top-0 right-0 p-2 opacity-20">
                                                            <CheckSquare className="h-4 w-4 text-primary" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modern Footer — Primary Call to Action */}
                {!loadingCouriers && couriers.length > 0 && (
                    <div className="px-8 py-5 bg-page-bg/40 border-t border-border/40 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Info className="h-4 w-4 text-primary/40" />
                            <p className="text-[11px] text-primary/60 font-bold uppercase tracking-[0.1em]">
                                Select a carrier to generate secure AWB & synchronize fulfillment
                            </p>
                        </div>
                    </div>
                )}

                {/* Overlaid Confirmation Dialog — Redesigned for Herbal Theme */}
                {confirmCourier && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-primary/20 backdrop-blur-md rounded-2xl animate-fadeIn">
                        <div className="bg-white w-full max-w-sm rounded-[2.5rem] border border-primary/20 p-8 shadow-2xl relative overflow-hidden animate-scaleIn">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="flex flex-col items-center text-center gap-5 relative z-10">
                                <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10 mb-2">
                                    <Truck className="h-10 w-10 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-serif text-2xl font-bold text-primary mb-2">Final Assignment</h4>
                                    <p className="text-sm text-text-secondary leading-relaxed px-2 font-medium">
                                        Assigning <span className="text-primary font-bold">{confirmCourier.courier_name}</span> to this shipment protocol?
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 w-full gap-0 bg-page-bg/60 rounded-2xl border border-border/40 overflow-hidden shadow-sm">
                                    <div className="p-4 flex flex-col border-r border-border/40">
                                        <span className="text-[10px] text-primary/50 font-bold uppercase tracking-wider mb-1">Service Fee</span>
                                        <span className="text-xl font-serif font-black text-primary"><span className="font-sans mr-0.5 text-[0.85em]">$</span>{confirmCourier.rate}</span>
                                    </div>
                                    <div className="p-4 flex flex-col bg-primary/[0.02]">
                                        <span className="text-[10px] text-primary/50 font-bold uppercase tracking-wider mb-1">Delivery ETA</span>
                                        <span className="text-xl font-serif font-black text-primary">{confirmCourier.estimated_delivery_days} Days</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 w-full gap-4 mt-4">
                                    <button
                                        onClick={() => setConfirmCourier(null)}
                                        disabled={!!assigningId}
                                        className="h-12 rounded-2xl text-[13px] font-bold text-primary border border-primary/20 hover:bg-primary/5 transition-all disabled:opacity-50"
                                    >
                                        Re-evaluate
                                    </button>
                                    <button
                                        onClick={() => {
                                            const courier = confirmCourier;
                                            setConfirmCourier(null);
                                            handleAssign(courier);
                                        }}
                                        disabled={!!assigningId}
                                        className="h-12 rounded-2xl text-[13px] font-black bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                                    >
                                        {assigningId ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>Confirm Assignment <CheckSquare className="h-4 w-4" /></>
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
