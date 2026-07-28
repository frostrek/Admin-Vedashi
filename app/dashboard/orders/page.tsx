'use client';

import { useState, useEffect, useCallback, Fragment, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    getOrders, getOrderById, updateOrderStatus as apiUpdateStatus,
    updatePaymentStatus as apiUpdatePayment, bulkUpdateOrderStatus,
    bulkUpdateOrderPaymentStatus, Order, downloadInvoiceAdmin, formatINR, formatCurrency,
    getPaymentInfo, createRefund, getRefunds, PaymentInfo, RefundRecord,
    cancelShipment, regenerateLabel, approveReturn, rejectReturn,
    createShipment, getAutomationSettings, AutomationSettings
} from '@/lib/api';
import {
    ShoppingCart, Eye, X, Package, User, CreditCard, MapPin,
    RefreshCw, Download, FileText, RotateCcw, Banknote, Shield,
    CheckSquare, Square, ChevronDown, Search, ChevronLeft, ChevronRight,
    SlidersHorizontal, Calendar, Truck
} from 'lucide-react';
import SortableHeader, { SortDir, compare } from '@/components/SortableHeader';
import toast from 'react-hot-toast';
import { PaymentToggle } from '@/components/PaymentToggle';
import ExportModal from '@/components/orders/ExportModal';
import PriceRangeSlider from '@/components/PriceRangeSlider';
import { gsap } from 'gsap';

const statusOptions = ['pending', 'confirmed', 'on_hold', 'shipped', 'delivered', 'requested', 'returned', 'cancelled'] as const;

function formatStatus(s: string) {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getFulfillmentStatus(order: any) {
    const is_confirmed = order.status !== 'pending' && order.status !== 'on_hold' && order.status !== 'cancelled';
    const shipment_exists = !!order.shipment_id || !!order.awb_code || !!order.tracking_url;

    if (order.status === 'cancelled') {
        return 'cancelled';
    } else if (!is_confirmed) {
        return 'pending';
    } else if (is_confirmed && !shipment_exists) {
        return 'ready_to_ship';
    } else if (shipment_exists) {
        return 'shipped';
    }
    return 'pending';
}

function FulfillmentBadge({ order }: { order: any }) {
    const status = getFulfillmentStatus(order);
    switch (status) {
        case 'cancelled':
            return <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-danger bg-danger/10 border border-danger/20 rounded-full px-2 py-0.5">Cancelled</span>;
        case 'pending':
            return <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 rounded-full px-2 py-0.5">Pending</span>;
        case 'ready_to_ship':
            return <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-info bg-info/10 border border-info/20 rounded-full px-2 py-0.5 whitespace-nowrap">Ready to Ship</span>;
        case 'shipped':
            return <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">Shipped</span>;
        default:
            return null;
    }
}
const paymentStatusOptions = ['unpaid', 'paid', 'refunded', 'failed'] as const;

interface OrderDetail {
    id: string;
    order_id?: string;
    customer_name: string;
    customer_email: string;
    total: number;
    subtotal?: number;
    status: Order['status'];
    payment_status?: string;
    payment_method?: string;
    created_at: string;
    currency?: string;
    exchange_rate?: number;
    grand_total?: number;
    order_notes?: string;
    shipping_address?: {
        address_line1?: string;
        address_line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
    };
    items: {
        order_item_id?: string;
        quantity: number;
        unit_price: number;
        line_total?: number;
        price?: number;
        product_name?: string;
        product?: { product_id: string; product_name: string; brand?: string; product_sku?: string };
        variant?: { variant_id: string; variant_name?: string; size_label?: string; volume_ml?: number };
        thumbnail_url?: string;
    }[];

    // Shipment & Tracking
    awb_code?: string;
    tracking_url?: string;
    courier_name?: string;
    shipment_status?: string;
    shiprocket_order_id?: string;
    shipment_id?: string;

    // Returns
    return_status?: string;
    return_reason?: string;
    return_awb?: string;
    return_tracking_url?: string;
    has_shipment?: boolean;
}

// ── Portal-based Filter Popover ──────────────────────────────────────────────
interface FilterPopoverProps {
    anchorRef: React.RefObject<HTMLButtonElement | null>;
    onClose: () => void;
    filtered: Order[];
    absoluteMaxAmount: number;
    amountRange: { min: number; max: number };
    setAmountRange: (r: { min: number; max: number }) => void;
    filterDateFrom: string;
    setFilterDateFrom: (v: string) => void;
    filterDateTo: string;
    setFilterDateTo: (v: string) => void;
    filterStatus: string;
    setFilterStatus: (v: string) => void;
    filterPayment: string;
    setFilterPayment: (v: string) => void;
    filterCountry: string;
    setFilterCountry: (v: string) => void;
    filterDate: string;
    setFilterDate: (v: string) => void;
    activeFilterCount: number;
    clearAllFilters: () => void;
    clearSelection: () => void;
}

function FilterPopover({
    anchorRef, onClose, filtered, absoluteMaxAmount,
    amountRange, setAmountRange,
    filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo,
    filterStatus, setFilterStatus,
    filterPayment, setFilterPayment,
    filterCountry, setFilterCountry,
    filterDate, setFilterDate,
    activeFilterCount, clearAllFilters, clearSelection
}: FilterPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const [mounted, setMounted] = useState(false);

    // Calculate position from anchor button
    useEffect(() => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + window.scrollY + 10,
                right: window.innerWidth - rect.right,
            });
        }
        setMounted(true);
    }, []);

    // GSAP open animation
    useEffect(() => {
        if (mounted && popoverRef.current) {
            gsap.fromTo(popoverRef.current,
                { opacity: 0, scale: 0.94, y: -8 },
                { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'back.out(1.6)', transformOrigin: 'top right' }
            );
        }
    }, [mounted]);

    const handleClose = useCallback(() => {
        if (!popoverRef.current) { onClose(); return; }
        gsap.to(popoverRef.current, {
            opacity: 0, scale: 0.94, y: -6, duration: 0.2, ease: 'power2.in',
            onComplete: onClose,
        });
    }, [onClose]);

    // Outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                anchorRef.current && !anchorRef.current.contains(e.target as Node)
            ) handleClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [handleClose]);

    // Reposition on scroll/resize
    useEffect(() => {
        const update = () => {
            if (anchorRef.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                setPos({ top: rect.bottom + window.scrollY + 10, right: window.innerWidth - rect.right });
            }
        };
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div
            ref={popoverRef}
            style={{
                position: 'absolute',
                top: pos.top,
                right: pos.right,
                width: 420,
                zIndex: 9999,
                transformOrigin: 'top right',
            }}
            className="rounded-2xl border border-border bg-card-bg-elevated shadow-2xl shadow-black/30 overflow-hidden"
        >
            {/* Arrow */}
            <div
                style={{ position: 'absolute', top: -5, right: 52, width: 10, height: 10 }}
                className="rotate-45 border-l border-t border-border bg-card-bg-elevated"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-page-bg/70">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-gold-muted" />
                    <span className="text-sm font-semibold text-text-primary">Advanced Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="text-[10px] font-bold text-gold bg-gold/15 border border-gold/25 rounded-full px-2 py-0.5">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {activeFilterCount > 0 && (
                        <button
                            onClick={() => { clearAllFilters(); }}
                            className="text-xs font-semibold text-danger/70 hover:text-danger transition-colors flex items-center gap-1"
                        >
                            <X className="h-3 w-3" /> Clear all
                        </button>
                    )}
                    <button onClick={handleClose} className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-border/30 transition-all">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
                {/* Amount Range */}
                <div>
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Amount Range</p>
                        {(amountRange.min > 0 || amountRange.max < absoluteMaxAmount) && (
                            <button onClick={() => setAmountRange({ min: 0, max: absoluteMaxAmount })}
                                className="text-[11px] text-gold-muted hover:text-gold transition-colors">Reset</button>
                        )}
                    </div>
                    <div className="rounded-xl border border-border/60 bg-page-bg/50 px-4 py-3">
                        <PriceRangeSlider
                            min={0} max={absoluteMaxAmount}
                            initialMin={amountRange.min} initialMax={amountRange.max}
                            onChange={(min, max) => { setAmountRange({ min, max }); clearSelection(); }}
                        />
                    </div>
                </div>

                {/* Date Range */}
                <div>
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Date Range</p>
                        {(filterDateFrom || filterDateTo) && (
                            <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); clearSelection(); }}
                                className="text-[11px] text-gold-muted hover:text-gold transition-colors">Reset</button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] text-text-muted uppercase font-semibold tracking-wider mb-1.5">From</p>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                                <input type="date" value={filterDateFrom}
                                    onChange={e => { setFilterDateFrom(e.target.value); clearSelection(); }}
                                    className="w-full rounded-xl border border-border bg-page-bg/60 pl-9 pr-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all cursor-pointer" />
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] text-text-muted uppercase font-semibold tracking-wider mb-1.5">To</p>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                                <input type="date" value={filterDateTo}
                                    onChange={e => { setFilterDateTo(e.target.value); clearSelection(); }}
                                    className="w-full rounded-xl border border-border bg-page-bg/60 pl-9 pr-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active filter chips */}
                {activeFilterCount > 0 && (
                    <div>
                        <p className="text-[10px] text-text-muted uppercase font-semibold tracking-wider mb-2">Active</p>
                        <div className="flex flex-wrap gap-1.5">
                            {filterStatus !== 'all' && (
                                <span className="flex items-center gap-1 text-xs font-medium bg-gold/10 text-gold border border-gold/20 rounded-full px-2.5 py-1">
                                    Status: {filterStatus}
                                    <button onClick={() => setFilterStatus('all')}><X className="h-3 w-3" /></button>
                                </span>
                            )}
                            {filterPayment !== 'all' && (
                                <span className="flex items-center gap-1 text-xs font-medium bg-gold/10 text-gold border border-gold/20 rounded-full px-2.5 py-1">
                                    Payment: {filterPayment}
                                    <button onClick={() => setFilterPayment('all')}><X className="h-3 w-3" /></button>
                                </span>
                            )}
                            {filterCountry !== 'all' && (
                                <span className="flex items-center gap-1 text-xs font-medium bg-gold/10 text-gold border border-gold/20 rounded-full px-2.5 py-1">
                                    Country: {filterCountry.charAt(0).toUpperCase() + filterCountry.slice(1)}
                                    <button onClick={() => setFilterCountry('all')}><X className="h-3 w-3" /></button>
                                </span>
                            )}
                            {filterDate !== 'all' && (
                                <span className="flex items-center gap-1 text-xs font-medium bg-gold/10 text-gold border border-gold/20 rounded-full px-2.5 py-1">
                                    {filterDate === 'today' ? 'Today' : filterDate === '7days' ? 'Last 7 days' : 'Last 30 days'}
                                    <button onClick={() => setFilterDate('all')}><X className="h-3 w-3" /></button>
                                </span>
                            )}
                            {(amountRange.min > 0 || amountRange.max < absoluteMaxAmount) && (
                                <span className="flex items-center gap-1 text-xs font-medium bg-gold/10 text-gold border border-gold/20 rounded-full px-2.5 py-1">
                                    {formatCurrency(amountRange.min, 'INR')} – {formatCurrency(amountRange.max, 'INR')}
                                    <button onClick={() => setAmountRange({ min: 0, max: absoluteMaxAmount })}><X className="h-3 w-3" /></button>
                                </span>
                            )}
                            {(filterDateFrom || filterDateTo) && (
                                <span className="flex items-center gap-1 text-xs font-medium bg-gold/10 text-gold border border-gold/20 rounded-full px-2.5 py-1">
                                    {filterDateFrom || '…'} → {filterDateTo || '…'}
                                    <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}><X className="h-3 w-3" /></button>
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/60 bg-page-bg/50 flex items-center justify-between">
                <p className="text-xs text-text-muted">
                    <span className="font-semibold text-text-primary">{filtered.length}</span> orders match
                </p>
                <button onClick={handleClose}
                    className="rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-1.5 text-xs font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm">
                    Done
                </button>
            </div>
        </div>,
        document.body
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [refundOrder, setRefundOrder] = useState<OrderDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPayment, setFilterPayment] = useState<string>('all');
    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all');
    const [amountRange, setAmountRange] = useState({ min: 0, max: 10000 });
    const [absoluteMaxAmount, setAbsoluteMaxAmount] = useState(10000);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [updatingPayments, setUpdatingPayments] = useState<Set<string>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [showFilterPopover, setShowFilterPopover] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatusValue, setBulkStatusValue] = useState('');
    const [bulkPaymentValue, setBulkPaymentValue] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [totalRefunded, setTotalRefunded] = useState(0);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [refundProcessing, setRefundProcessing] = useState(false);
    const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
    const [partialRefundAmount, setPartialRefundAmount] = useState<string>('');

    const headerRef = useRef<HTMLDivElement>(null);
    const filterBarRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const bulkBarRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInnerRef = useRef<HTMLDivElement>(null);
    const refundModalRef = useRef<HTMLDivElement>(null);
    const filterBtnRef = useRef<HTMLButtonElement>(null);
    const prevSomeSelected = useRef(false);

    // ── URL Search Param Initializer ──────────────────────────
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const search = params.get('search');
            if (search) {
                setSearchQuery(search);
            }
        }
    }, []);

    // ── Entry animations ──────────────────────────────────────
    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline();
            tl.fromTo(headerRef.current, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
                .fromTo(filterBarRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, '-=0.3')
                .fromTo(tableRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '-=0.25');
        });
        return () => ctx.revert();
    }, []);

    // ── Bulk bar animation ────────────────────────────────────
    useEffect(() => {
        const someSelected = selectedIds.size > 0;
        if (bulkBarRef.current) {
            if (someSelected && !prevSomeSelected.current) {
                gsap.fromTo(bulkBarRef.current, { opacity: 0, y: -10, scaleY: 0.88 }, { opacity: 1, y: 0, scaleY: 1, duration: 0.35, ease: 'back.out(1.7)', transformOrigin: 'top' });
            } else if (!someSelected && prevSomeSelected.current) {
                gsap.to(bulkBarRef.current, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in' });
            }
        }
        prevSomeSelected.current = someSelected;
    }, [selectedIds.size]);

    // ── Modal animations ──────────────────────────────────────
    useEffect(() => {
        if (selectedOrder && modalRef.current && modalInnerRef.current) {
            gsap.fromTo(modalRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
            gsap.fromTo(modalInnerRef.current, { opacity: 0, y: 28, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out', delay: 0.05 });
        }
    }, [!!selectedOrder]);

    useEffect(() => {
        if (showRefundModal && refundModalRef.current) {
            gsap.fromTo(refundModalRef.current, { opacity: 0, scale: 0.92, y: 18 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' });
        }
    }, [showRefundModal]);

    // ── Row stagger ───────────────────────────────────────────
    useEffect(() => {
        const rows = document.querySelectorAll('.order-row');
        if (rows.length > 0) {
            gsap.fromTo(rows, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.28, stagger: 0.025, ease: 'power2.out' });
        }
    }, [currentPage, filterStatus, filterPayment, filterCountry, filterDate, searchQuery, sortKey, sortDir]);

    // ── Data fetch ────────────────────────────────────────────
    const lastOrdersRef = useRef<Order[]>([]);

    // ── Data fetch & Polling ──────────────────────────────────
    useEffect(() => {
        let isMounted = true;
        let intervalId: NodeJS.Timeout | null = null;

        const compareAndNotify = (newData: Order[], oldData: Order[]) => {
            if (oldData.length === 0) return; // Ignore first load

            newData.forEach(newOrder => {
                const oldOrder = oldData.find(o => o.id === newOrder.id);
                
                if (!oldOrder) {
                    // New order detected
                    toast.success(`New Order Received! #${newOrder.id.substring(0, 8)}`, {
                        icon: '🛍️',
                        duration: 5000,
                        position: 'top-right'
                    });
                } else {
                    // Check for changes in existing order
                    const changes = [];
                    if (oldOrder.status !== newOrder.status) {
                        changes.push(`Status: ${oldOrder.status} → ${newOrder.status}`);
                    }
                    if (oldOrder.payment_status !== newOrder.payment_status) {
                        changes.push(`Payment: ${newOrder.payment_status}`);
                    }
                    if (!oldOrder.has_shipment && newOrder.has_shipment) {
                        changes.push(`Shipment Created`);
                    }

                    if (changes.length > 0) {
                        toast(
                            <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-xs uppercase tracking-wider text-gold">Order Update: #{newOrder.id.substring(0, 8)}</span>
                                <span className="text-[11px] opacity-90">{changes.join(' | ')}</span>
                            </div>,
                            { 
                                duration: 4000, 
                                position: 'top-right',
                                icon: '🔔',
                                style: {
                                    background: '#1A1A1A',
                                    color: '#E8D8B9',
                                    border: '1px solid rgba(213, 167, 112, 0.2)'
                                }
                            }
                        );
                    }
                }
            });
        };

        const fetchOrdersUpdate = async (params: any, silent = false) => {
            const data = await getOrders(params);
            if (!isMounted) return;

            if (silent) {
                compareAndNotify(data, lastOrdersRef.current);
            }
            
            setOrders(data);
            lastOrdersRef.current = data;
        };
        
        const initPolling = async () => {
            const params: any = {};
            if (filterDateFrom) params.dateFrom = filterDateFrom;
            if (filterDateTo) params.dateTo = filterDateTo;

            // Initial fetch
            await fetchOrdersUpdate(params);
            
            // Get settings for dynamic interval
            const settings = await getAutomationSettings();
            if (!isMounted) return;

            if (settings?.enable_realtime_polling) {
                const seconds = settings.admin_refresh_interval_seconds || 30;
                console.log(`[Dashboard] Polling enabled (Interval: ${seconds}s)`);
                
                intervalId = setInterval(() => {
                    console.log('[Dashboard] Auto-refreshing orders...');
                    fetchOrdersUpdate(params, true);
                }, seconds * 1000);
            }
        };

        initPolling();

        return () => { 
            isMounted = false;
            if (intervalId) clearInterval(intervalId); 
        };
    }, [filterDateFrom, filterDateTo]);

    useEffect(() => {
        if (selectedOrder) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedOrder]);

    // ── Filtering ─────────────────────────────────────────────
    const filtered = orders.filter(o => {
        const statusMatch = filterStatus === 'all' || o.status === filterStatus;
        const paymentMatch = filterPayment === 'all' || o.payment_status?.toLowerCase() === filterPayment.toLowerCase();
        
        let countryMatch = true;
        if (filterCountry === 'russia') {
            countryMatch = o.currency === 'RUB';
        } else if (filterCountry === 'korea') {
            countryMatch = o.currency === 'KRW';
        } else if (filterCountry === 'international') {
            countryMatch = o.currency !== 'RUB' && o.currency !== 'KRW';
        }

        let dateMatch = true;
        if (filterDate !== 'all') {
            const orderDate = new Date(o.created_at);
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (filterDate === 'today') dateMatch = orderDate >= todayStart;
            else if (filterDate === '7days') dateMatch = orderDate >= new Date(now.getTime() - 7 * 86400000);
            else if (filterDate === '30days') dateMatch = orderDate >= new Date(now.getTime() - 30 * 86400000);
        }
        let amountMatch = true;
        if (amountRange.min > 0 || amountRange.max < absoluteMaxAmount) {
            const amount = o.total ?? 0;
            amountMatch = amount >= amountRange.min && amount <= amountRange.max;
        }
        let searchMatch = true;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            searchMatch = !!(o.id.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_email?.toLowerCase().includes(q));
        }
        return statusMatch && paymentMatch && countryMatch && dateMatch && amountMatch && searchMatch;
    });

    useEffect(() => { setCurrentPage(1); }, [filterStatus, filterPayment, filterCountry, filterDate, amountRange, searchQuery]);

    useEffect(() => {
        if (orders.length > 0) {
            const max = Math.max(...orders.map(o => o.total ?? 0), 1000);
            const roundedMax = Math.ceil(max / 1000) * 1000;
            setAbsoluteMaxAmount(roundedMax);
            setAmountRange(prev => ({ ...prev, max: roundedMax }));
        }
    }, [orders]);

    const handleSort = (key: string, dir: SortDir) => { setSortKey(dir ? key : null); setSortDir(dir); };

    const sortedFiltered = useMemo(() => {
        if (!sortKey || !sortDir) return filtered;
        return [...filtered].sort((a, b) => compare(a, b, sortKey, sortDir));
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage);
    const paginatedOrders = sortedFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const allFilteredSelected = sortedFiltered.length > 0 && sortedFiltered.every(o => selectedIds.has(o.id));
    const someSelected = selectedIds.size > 0;

    const toggleSelectAll = () => {
        if (allFilteredSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(sortedFiltered.map(o => o.id)));
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };

    const clearSelection = () => { setSelectedIds(new Set()); setBulkStatusValue(''); setBulkPaymentValue(''); };

    const handleBulkStatus = async (newStatus: string) => {
        if (!newStatus || selectedIds.size === 0) return;
        const result = await bulkUpdateOrderStatus(Array.from(selectedIds), newStatus);
        if (result) {
            setOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, status: newStatus.toLowerCase() as Order['status'] } : o));
            toast.success(result.failed > 0 ? `${result.updated} updated, ${result.failed} failed` : `${result.updated} orders → ${newStatus}`);
        } else toast.error('Bulk status update failed');
    };

    const handleBulkPayment = async (newPayment: string) => {
        if (!newPayment || selectedIds.size === 0) return;
        const result = await bulkUpdateOrderPaymentStatus(Array.from(selectedIds), newPayment);
        if (result) {
            setOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, payment_status: newPayment.toUpperCase() } : o));
            toast.success(result.failed > 0 ? `${result.updated} updated, ${result.failed} failed` : `${result.updated} orders → ${newPayment}`);
        } else toast.error('Bulk payment update failed');
    };

    const openOrderDetail = useCallback(async (order: Order) => {
        setSelectedOrder(order as OrderDetail);
        setLoadingDetail(true);
        try {
            const detail = await getOrderById(order.id);
            if (detail) {
                setSelectedOrder({
                    ...(detail as unknown as OrderDetail),
                    customer_name: order.customer_name || (detail as any).customer_name || 'N/A',
                    customer_email: order.customer_email || (detail as any).customer_email || '',
                });
            }
            Promise.all([getPaymentInfo(order.id), getRefunds(order.id)])
                .then(([pi, rf]) => { setPaymentInfo(pi); setRefunds(rf.refunds); setTotalRefunded(rf.total_refunded); })
                .catch(() => { });
        } catch { toast.error('Failed to load order details'); }
        finally { setLoadingDetail(false); }
    }, []);

    const updateStatus = async (orderId: string, newStatus: string) => {
        const loadingToast = toast.loading(`Updating status to ${newStatus}...`);
        try {
            console.log(`[OrderAction] Updating ${orderId} to status: ${newStatus}`);
            const success = await apiUpdateStatus(orderId, newStatus);
            console.log(`[OrderAction] API success:`, success);
            
            if (!success) throw new Error('API returned false');

            const lowercaseStatus = newStatus.toLowerCase() as Order['status'];

            setOrders(prev => prev.map(o => {
                if (o.id !== orderId) return o;
                let nextPaymentStatus = o.payment_status;
                if (lowercaseStatus === 'delivered') nextPaymentStatus = 'PAID';
                else if (o.payment_method === 'cod') nextPaymentStatus = 'UNPAID';
                return { ...o, status: lowercaseStatus, payment_status: nextPaymentStatus };
            }));
            
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => {
                    if (!prev) return prev;
                    let nextPaymentStatus = prev.payment_status;
                    if (lowercaseStatus === 'delivered') nextPaymentStatus = 'PAID';
                    else if (prev.payment_method === 'cod') nextPaymentStatus = 'UNPAID';
                    return { ...prev, status: lowercaseStatus, payment_status: nextPaymentStatus };
                });
            }
            
            toast.success(`Status → ${newStatus}`, { id: loadingToast });
        } catch (error) {
            console.error(`[OrderAction] Failed to update status:`, error);
            toast.error(`Failed to update status to ${newStatus}`, { id: loadingToast });
        }
    };

    const updatePayment = async (orderId: string, newStatus: string) => {
        const targetOrder = orders.find(o => o.id === orderId);
        if ((targetOrder?.payment_method === 'razorpay' || targetOrder?.payment_method === 'cloudpayments') && targetOrder?.payment_status?.toUpperCase() === 'PAID' && newStatus.toUpperCase() === 'UNPAID') {
            toast.error('Online payments cannot be marked unpaid. Initiate a refund instead.');
            return;
        }
        setUpdatingPayments(prev => new Set(prev).add(orderId));
        const prevStatus = targetOrder?.payment_status || 'Unpaid';
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: newStatus } : o));
        if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, payment_status: newStatus } : prev);
        try {
            const success = await apiUpdatePayment(orderId, newStatus.toUpperCase());
            if (success) toast.success(`Payment → ${newStatus}`);
            else throw new Error('API failure');
        } catch {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: prevStatus } : o));
            if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, payment_status: prevStatus } : prev);
            toast.error('Failed to update payment status');
        } finally {
            setUpdatingPayments(prev => { const next = new Set(prev); next.delete(orderId); return next; });
        }
    };

    const statusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'bg-success/12 text-success border-success/20';
            case 'shipped': return 'bg-info/12 text-info border-info/20';
            case 'delivered': return 'bg-gold/12 text-gold border-gold/20';
            case 'pending': return 'bg-warning/12 text-warning border-warning/20';
            case 'on_hold': return 'bg-orange-500/12 text-orange-500 border-orange-500/20';
            case 'cancelled': return 'bg-danger/12 text-danger border-danger/20';
            default: return 'bg-text-muted/12 text-text-muted border-border';
        }
    };

    const closeModal = () => {
        if (modalRef.current && modalInnerRef.current) {
            gsap.to(modalInnerRef.current, { opacity: 0, y: 18, scale: 0.97, duration: 0.22, ease: 'power2.in' });
            gsap.to(modalRef.current, { opacity: 0, duration: 0.28, ease: 'power2.in', onComplete: () => setSelectedOrder(null) });
        } else setSelectedOrder(null);
    };

    const activeFilterCount = [
        filterStatus !== 'all',
        filterPayment !== 'all',
        filterCountry !== 'all',
        filterDate !== 'all',
        amountRange.min > 0 || amountRange.max < absoluteMaxAmount,
        !!filterDateFrom || !!filterDateTo,
    ].filter(Boolean).length;

    const clearAllFilters = () => {
        setFilterStatus('all'); setFilterPayment('all'); setFilterCountry('all'); setFilterDate('all');
        setFilterDateFrom(''); setFilterDateTo('');
        setAmountRange({ min: 0, max: absoluteMaxAmount });
        setSearchQuery(''); clearSelection();
    };

    return (
        <div className="space-y-4 pb-10">

            {/* ── Header ──────────────────────────────────────────── */}
            <div ref={headerRef} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft tracking-tight">Orders</h1>
                    <p className="text-[15px] font-semibold text-brown mt-0.5">
                        <span className="font-semibold text-brown">{orders.length}</span> total ·{' '}
                        <span className="font-semibold text-brown">{filtered.length}</span> shown
                    </p>
                </div>
                <button
                    onClick={() => setExportOpen(true)}
                    className="group flex items-center gap-2 rounded-lg border border-gold/10 bg-primary px-5 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light transition-all duration-300 shadow-sm"
                >
                    <Download className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                    Export
                </button>
            </div>

            {/* ── Filter Bar ──────────────────────────────────────── */}
            <div ref={filterBarRef}>
                <div className="flex items-center rounded-2xl border border-border bg-card-bg shadow-sm overflow-hidden">

                    {/* Search */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-[160px] px-4 py-3 border-r border-border/60">
                        <Search className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
                        <input type="text" value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); clearSelection(); }}
                            placeholder="Search orders…"
                            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted/50 min-w-0" />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text-primary transition-colors">
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 px-4 py-3 border-r border-border/60 hover:bg-gold/[0.03] transition-colors">
                        <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold whitespace-nowrap">Status</span>
                        <div className="relative flex items-center">
                            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); clearSelection(); }}
                                className="appearance-none bg-transparent border-none outline-none text-sm font-medium text-text-primary cursor-pointer pr-4">
                                <option value="all">All</option>
                                {statusOptions.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                            </select>
                            <ChevronDown className="absolute right-0 h-3 w-3 text-text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="flex items-center gap-1.5 px-4 py-3 border-r border-border/60 hover:bg-gold/[0.03] transition-colors">
                        <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold whitespace-nowrap">Payment</span>
                        <div className="relative flex items-center">
                            <select value={filterPayment} onChange={e => { setFilterPayment(e.target.value); clearSelection(); }}
                                className="appearance-none bg-transparent border-none outline-none text-sm font-medium text-text-primary cursor-pointer pr-4">
                                <option value="all">All</option>
                                {paymentStatusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                            <ChevronDown className="absolute right-0 h-3 w-3 text-text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Country */}
                    <div className="flex items-center gap-1.5 px-4 py-3 border-r border-border/60 hover:bg-gold/[0.03] transition-colors">
                        <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold whitespace-nowrap">Country</span>
                        <div className="relative flex items-center">
                            <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); clearSelection(); }}
                                className="appearance-none bg-transparent border-none outline-none text-sm font-medium text-text-primary cursor-pointer pr-4">
                                <option value="all">All</option>
                                <option value="russia">Russia</option>
                                <option value="international">International</option>
                                <option value="korea">Korea</option>
                            </select>
                            <ChevronDown className="absolute right-0 h-3 w-3 text-text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Period */}
                    <div className="flex items-center gap-1.5 px-4 py-3 border-r border-border/60 hover:bg-gold/[0.03] transition-colors">
                        <span className="text-[15px] text-text-muted uppercase tracking-wider font-semibold whitespace-nowrap">Period</span>
                        <div className="relative flex items-center">
                            <select value={filterDate} onChange={e => { setFilterDate(e.target.value); clearSelection(); }}
                                className="appearance-none bg-transparent border-none outline-none text-sm font-medium text-text-primary cursor-pointer pr-4">
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="7days">7 Days</option>
                                <option value="30days">30 Days</option>
                            </select>
                            <ChevronDown className="absolute right-0 h-3 w-3 text-text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Show per page */}
                    <div className="flex items-center gap-1.5 px-4 py-3 border-r border-border/60 hover:bg-gold/[0.03] transition-colors">
                        <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold whitespace-nowrap">Show</span>
                        <div className="relative flex items-center">
                            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="appearance-none bg-transparent border-none outline-none text-sm font-medium text-text-primary cursor-pointer pr-4">
                                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <ChevronDown className="absolute right-0 h-3 w-3 text-text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* More filters button */}
                    <button
                        ref={filterBtnRef}
                        onClick={() => setShowFilterPopover(v => !v)}
                        className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap rounded-r-2xl ${showFilterPopover || activeFilterCount > 0 ? 'text-gold bg-gold/[0.06]' : 'text-text-secondary hover:text-text-primary hover:bg-gold/[0.03]'}`}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        More filters
                        {activeFilterCount > 0 && (
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gold text-[10px] font-bold text-page-bg leading-none">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Portal popover — renders directly in document.body, never clipped */}
                {showFilterPopover && (
                    <FilterPopover
                        anchorRef={filterBtnRef}
                        onClose={() => setShowFilterPopover(false)}
                        filtered={filtered}
                        absoluteMaxAmount={absoluteMaxAmount}
                        amountRange={amountRange}
                        setAmountRange={setAmountRange}
                        filterDateFrom={filterDateFrom}
                        setFilterDateFrom={setFilterDateFrom}
                        filterDateTo={filterDateTo}
                        setFilterDateTo={setFilterDateTo}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterPayment={filterPayment}
                        setFilterPayment={setFilterPayment}
                        filterCountry={filterCountry}
                        setFilterCountry={setFilterCountry}
                        filterDate={filterDate}
                        setFilterDate={setFilterDate}
                        activeFilterCount={activeFilterCount}
                        clearAllFilters={clearAllFilters}
                        clearSelection={clearSelection}
                    />
                )}
            </div>

            {/* ── Bulk Toolbar ──────────────────────────────────────── */}
            {someSelected && (
                <div ref={bulkBarRef} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/25 bg-gradient-to-r from-primary to-primary-light px-5 py-3 shadow-lg shadow-gold/10">
                    <span className="text-sm font-semibold text-[#E8D8B9]">{selectedIds.size} selected</span>
                    <div className="h-4 w-px bg-[#E8D8B9]/20 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#E8D8B9]/60 whitespace-nowrap">Order status:</span>
                        <div className="relative">
                            <select value={bulkStatusValue} onChange={e => setBulkStatusValue(e.target.value)} disabled={bulkProcessing}
                                className="appearance-none rounded-lg border border-gold/30 bg-card-bg px-3 py-1.5 pr-7 text-sm text-text-primary focus:border-gold/50 focus:outline-none disabled:opacity-50 cursor-pointer">
                                <option value="">— Select —</option>
                                {statusOptions.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-gold-muted" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#E8D8B9]/60 whitespace-nowrap">Payment:</span>
                        <div className="relative">
                            <select value={bulkPaymentValue} onChange={e => setBulkPaymentValue(e.target.value)} disabled={bulkProcessing}
                                className="appearance-none rounded-lg border border-gold/30 bg-card-bg px-3 py-1.5 pr-7 text-sm text-text-primary focus:border-gold/50 focus:outline-none disabled:opacity-50 cursor-pointer">
                                <option value="">— Select —</option>
                                {paymentStatusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-gold-muted" />
                        </div>
                    </div>
                    <div className="flex-1" />
                    <button onClick={clearSelection} disabled={bulkProcessing}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E8D8B9]/25 px-3 py-1.5 text-xs font-semibold text-[#E8D8B9]/70 hover:border-[#E8D8B9]/50 hover:text-[#E8D8B9] transition-all disabled:opacity-50">
                        <X className="h-3.5 w-3.5" /> Clear
                    </button>
                    <button
                        onClick={async () => {
                            if (!bulkStatusValue && !bulkPaymentValue) return;
                            setBulkProcessing(true);
                            try {
                                if (bulkStatusValue) await handleBulkStatus(bulkStatusValue);
                                if (bulkPaymentValue) await handleBulkPayment(bulkPaymentValue);
                            } finally { clearSelection(); setBulkProcessing(false); }
                        }}
                        disabled={bulkProcessing || (!bulkStatusValue && !bulkPaymentValue)}
                        className="flex items-center gap-2 rounded-lg border border-gold/10 bg-primary px-4 py-1.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                        {bulkProcessing ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Applying…</> : 'Apply'}
                    </button>
                </div>
            )}

            {/* ── Table ────────────────────────────────────────────── */}
            <div ref={tableRef} className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-page-bg/80">
                                <th className="px-4 py-3.5 w-10">
                                    <button onClick={toggleSelectAll} className="flex items-center justify-center text-gold-muted hover:text-gold transition-colors">
                                        {allFilteredSelected ? <CheckSquare className="h-4 w-4 text-gold" /> : <Square className="h-4 w-4" />}
                                    </button>
                                </th>
                                <SortableHeader label="Order ID" sortKey="id" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Customer" sortKey="customer_name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase">Items</th>
                                <SortableHeader label="Total" sortKey="total" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase">Payment Status</th>
                                <SortableHeader label="Order Status" sortKey="status" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase">Fulfillment</th>
                                <SortableHeader label="Date" sortKey="created_at" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-text-muted/10 p-4">
                                                <ShoppingCart className="h-7 w-7 text-text-muted/40" />
                                            </div>
                                            <p className="text-sm text-text-muted">No orders match your filters.</p>
                                            <button onClick={clearAllFilters} className="text-xs text-gold hover:underline">Clear all filters</button>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr><td colSpan={10} className="px-4 py-16 text-center"><p className="text-sm text-text-muted">No orders on this page.</p></td></tr>
                            ) : (
                                paginatedOrders.map(order => {
                                    const isSelected = selectedIds.has(order.id);
                                    return (
                                        <tr key={order.id} className={`order-row group hover:bg-gold/[0.025] transition-colors duration-150 ${isSelected ? 'bg-gold/[0.04] border-l-2 border-l-gold/40' : ''}`}>
                                            <td className="px-4 py-3.5">
                                                <button onClick={() => toggleSelectOne(order.id)} className="flex items-center justify-center text-gold-muted hover:text-gold transition-colors">
                                                    {isSelected ? <CheckSquare className="h-4 w-4 text-gold" /> : <Square className="h-4 w-4" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-mono text-xs text-text-muted bg-border/20 px-1.5 py-0.5 rounded" title={order.id}>{order.id.substring(0, 8)}…</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className="text-sm font-medium text-text-primary leading-tight">{order.customer_name}</p>
                                                <p className="text-xs text-text-muted mt-0.5">{order.customer_email}</p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-sm text-text-secondary tabular-nums">{order.items?.length ?? 0}<span className="text-text-muted text-xs ml-1">item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</span></span>
                                            </td>
                                            <td className="px-4 py-3.5"><span className="text-sm font-semibold text-gold tabular-nums">{formatCurrency(order.total, order.currency)}</span></td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {(() => {
                                                        const refundedAmt = Number((order as any).calculated_refunded_amount || (order as any).refunded_amount) || 0;
                                                        const totalAmt = Number(order.total) || 0;
                                                        const isExplicitlyRefunded = order.payment_status?.toUpperCase().includes('REFUND');
                                                        const isFullyRefunded = isExplicitlyRefunded || (refundedAmt > 0 && refundedAmt >= totalAmt);
                                                        const isPartiallyRefunded = !isFullyRefunded && refundedAmt > 0 && refundedAmt < totalAmt;

                                                        if (isFullyRefunded) {
                                                            return (
                                                                <span className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-warning/15 text-warning whitespace-nowrap">
                                                                    {isExplicitlyRefunded ? order.payment_status?.replace(/_/g, ' ') : 'REFUNDED'}
                                                                </span>
                                                            );
                                                        }
                                                        if (isPartiallyRefunded) {
                                                            return (
                                                                <span className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-warning/15 text-warning whitespace-nowrap">
                                                                    PARTIALLY REFUNDED
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <PaymentToggle status={order.payment_status ?? 'UNPAID'} onToggle={(ns) => updatePayment(order.id, ns)}
                                                                disabled={updatingPayments.has(order.id) || (order.payment_status?.toUpperCase() === 'PAID' && (order.payment_method === 'razorpay' || order.payment_method === 'cloudpayments' || order.payment_method === 'cod'))} />
                                                        );
                                                    })()}
                                                    <span className={`text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 ${order.payment_method === 'razorpay' ? 'bg-blue-500/15 text-blue-400' : (order.payment_method === 'cloudpayments' ? 'bg-purple-500/15 text-purple-400' : 'bg-green-500/15 text-green-400')}`}>
                                                        {order.payment_method === 'razorpay' ? 'RZP' : (order.payment_method === 'cloudpayments' ? 'CP' : 'COD')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <select value={order.status} onChange={e => updateStatus(order.id, e.target.value as Order['status'])}
                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer transition-all duration-200 hover:opacity-80 ${statusColor(order.status)}`}>
                                                    {(statusOptions.includes(order.status as any) ? statusOptions : [...statusOptions, order.status]).map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3.5 text-sm">
                                                <FulfillmentBadge order={order} />
                                            </td>
                                            <td className="px-4 py-3.5 text-sm text-text-secondary tabular-nums">
                                                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {order.status === 'confirmed' && (
                                                        <button
                                                            disabled={order.has_shipment}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const toastId = toast.loading('Creating shipment...');
                                                                const res = await createShipment(order.id || order.order_id || '');
                                                                if (res.success) {
                                                                    toast.success('Shipment created! Label generation in progress.', { id: toastId });
                                                                    // Update the local state
                                                                    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, has_shipment: true } : o));
                                                                } else {
                                                                    toast.error(res.message || 'Failed to create shipment', { id: toastId });
                                                                }
                                                            }}
                                                            className={`rounded-lg p-2 transition-all duration-200 ${order.has_shipment ? 'text-emerald-400 bg-emerald-400/10 cursor-default' : 'text-text-muted hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                                                            title={order.has_shipment ? "Shipment Already Created" : "Create Shipment"}
                                                        >
                                                            <Truck className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {(order.status === 'cancelled') &&
                                                        (order.payment_status?.toUpperCase() === 'PAID') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRefundOrder(order as unknown as OrderDetail);
                                                                    setShowRefundModal(true);
                                                                }}
                                                                className="rounded-lg p-2 text-[#D5A770] hover:text-[#D5A770] hover:bg-[#D5A770]/10 transition-all duration-200"
                                                                title="Initiate Refund Request"
                                                            >
                                                                <Banknote className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    <button onClick={() => openOrderDetail(order)} className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200" title="View details">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-between border-t border-border/60 bg-page-bg/40 px-4 py-3 sm:px-6">
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-4">
                            <p className="text-sm text-text-secondary">
                                <span className="font-semibold text-text-primary">{((currentPage - 1) * itemsPerPage) + 1}</span>
                                {' – '}
                                <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, filtered.length)}</span>
                                {' of '}
                                <span className="font-semibold text-text-primary">{filtered.length}</span>
                            </p>
                            <nav className="isolate inline-flex -space-x-px rounded-xl overflow-hidden shadow-sm ring-1 ring-border">
                                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2.5 py-2 text-text-muted bg-card-bg hover:bg-gold/[0.05] hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => (
                                        <Fragment key={p}>
                                            {i > 0 && p - arr[i - 1] > 1 && <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-text-muted bg-card-bg border-x border-border">…</span>}
                                            <button onClick={() => handlePageChange(p)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-all ${p === currentPage ? 'z-10 bg-gold/10 text-gold ring-1 ring-inset ring-gold/40' : 'text-text-primary bg-card-bg hover:bg-gold/[0.04] hover:text-gold border-x border-border'}`}>
                                                {p}
                                            </button>
                                        </Fragment>
                                    ))}
                                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2.5 py-2 text-text-muted bg-card-bg hover:bg-gold/[0.05] hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </nav>
                        </div>
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-xl border border-border bg-card-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-gold/[0.05] disabled:opacity-50 transition-colors">Previous</button>
                            <span className="text-sm text-text-secondary self-center">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-xl border border-border bg-card-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-gold/[0.05] disabled:opacity-50 transition-colors">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Order Detail Modal ────────────────────────────────── */}
            {selectedOrder && (
                <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={closeModal}>
                    <div ref={modalInnerRef} className="relative w-full max-w-2xl rounded-2xl border border-border bg-card-bg-elevated shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/80 flex-shrink-0">
                            <div>
                                <h4 className="font-serif text-lg font-bold text-gold-soft">Order Details</h4>
                                <p className="font-mono text-xs text-text-muted mt-0.5">{selectedOrder.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        const toastId = toast.loading('Downloading invoice...');
                                        const res = await downloadInvoiceAdmin(selectedOrder.id);
                                        if (res.success) toast.success('Invoice downloaded!', { id: toastId });
                                        else toast.error(res.message || 'Failed', { id: toastId });
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-3 py-1.5 text-xs font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm">
                                    <FileText className="h-3.5 w-3.5" /> Invoice
                                </button>
                                <button onClick={closeModal} className="rounded-xl p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all"><X className="h-4 w-4" /></button>
                            </div>
                        </div>
                        {loadingDetail && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-2xl">
                                <div className="rounded-xl bg-card-bg p-4 shadow-xl flex items-center gap-3">
                                    <RefreshCw className="h-5 w-5 text-gold animate-spin" />
                                    <span className="text-sm text-text-secondary">Loading details…</span>
                                </div>
                            </div>
                        )}
                        <div className="overflow-y-auto flex-1 p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-border bg-card-bg p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-2"><User className="h-3.5 w-3.5" /> Customer</div>
                                    <p className="text-sm font-semibold text-text-primary">{selectedOrder.customer_name}</p>
                                    <p className="text-xs text-text-muted break-all">{selectedOrder.customer_email}</p>
                                    <p className="text-xs text-text-muted">{new Date(selectedOrder.created_at).toLocaleString('en-US')}</p>
                                </div>
                                <div className="rounded-xl border border-border bg-card-bg p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-2"><CreditCard className="h-3.5 w-3.5" /> Payment &amp; Status</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Order Status</span>
                                        <select value={selectedOrder.status} onChange={e => updateStatus(selectedOrder.id, e.target.value as Order['status'])}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${statusColor(selectedOrder.status)}`}>
                                            {(statusOptions.includes(selectedOrder.status as any) ? statusOptions : [...statusOptions, selectedOrder.status]).map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Payment</span>
                                        {(() => {
                                            const refundedAmt = Number((selectedOrder as any).calculated_refunded_amount || (selectedOrder as any).refunded_amount) || 0;
                                            const totalAmt = Number(selectedOrder.total) || 0;
                                            const isExplicitlyRefunded = selectedOrder.payment_status?.toUpperCase().includes('REFUND');
                                            const isFullyRefunded = isExplicitlyRefunded || (refundedAmt > 0 && refundedAmt >= totalAmt);
                                            const isPartiallyRefunded = !isFullyRefunded && refundedAmt > 0 && refundedAmt < totalAmt;

                                            if (isFullyRefunded) {
                                                return (
                                                    <span className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-warning/15 text-warning whitespace-nowrap">
                                                        {isExplicitlyRefunded ? selectedOrder.payment_status?.replace(/_/g, ' ') : 'REFUNDED'}
                                                    </span>
                                                );
                                            }
                                            if (isPartiallyRefunded) {
                                                return (
                                                    <span className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-warning/15 text-warning whitespace-nowrap">
                                                        PARTIALLY REFUNDED
                                                    </span>
                                                );
                                            }
                                            return (
                                                <PaymentToggle status={selectedOrder.payment_status ?? 'UNPAID'} onToggle={(ns) => updatePayment(selectedOrder.id, ns)}
                                                    disabled={updatingPayments.has(selectedOrder.id) || (selectedOrder.payment_status?.toUpperCase() === 'PAID' && (selectedOrder.payment_method === 'razorpay' || selectedOrder.payment_method === 'cloudpayments' || selectedOrder.payment_method === 'cod'))} />
                                            );
                                        })()}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Method</span>
                                        <span className="text-xs font-medium text-text-primary">
                                            {(selectedOrder.payment_method || paymentInfo?.payment_method) === 'razorpay'
                                                ? <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-blue-400" /> Razorpay</span>
                                                : (selectedOrder.payment_method || paymentInfo?.payment_method) === 'cloudpayments'
                                                    ? <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-purple-400" /> CloudPayments</span>
                                                    : <span className="flex items-center gap-1"><Banknote className="h-3 w-3 text-green-400" /> Cash on Delivery</span>}
                                        </span>
                                    </div>
                                    {paymentInfo?.razorpay_payment_id && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-secondary">Txn ID</span>
                                            <span className="text-[10px] font-mono text-text-muted bg-border/20 px-1.5 py-0.5 rounded">{paymentInfo.razorpay_payment_id}</span>
                                        </div>
                                    )}
                                    {paymentInfo?.razorpay_order_id && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-secondary">RZP Order</span>
                                            <span className="text-[10px] font-mono text-text-muted bg-border/20 px-1.5 py-0.5 rounded">{paymentInfo.razorpay_order_id}</span>
                                        </div>
                                    )}
                                    {selectedOrder.order_notes && (
                                        <div className="rounded-lg bg-page-bg/50 border border-border/50 p-2">
                                            <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider block mb-1">Notes</span>
                                            <span className="text-xs text-text-primary">{selectedOrder.order_notes}</span>
                                        </div>
                                    )}
                                    {(selectedOrder.status === 'cancelled') &&
                                        (selectedOrder.payment_status?.toUpperCase() === 'PAID' || paymentInfo?.payment_status?.toUpperCase() === 'PAID') && (
                                            <button onClick={() => { setRefundOrder(selectedOrder); setShowRefundModal(true); }}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/8 py-2 text-xs font-semibold text-warning hover:bg-warning/15 transition-all mt-2">
                                                <RotateCcw className="h-3.5 w-3.5" /> Initiate Refund Request
                                            </button>
                                        )}
                                    {refunds.length > 0 && (
                                        <div className="border-t border-border/60 pt-3 mt-1">
                                            <p className="text-[10px] font-semibold text-gold-muted uppercase tracking-widest mb-2">Refund History</p>
                                            <div className="space-y-2">
                                                {refunds.map(r => (
                                                    <div key={r.refund_id} className="flex items-center justify-between text-xs bg-page-bg/40 rounded-lg px-2.5 py-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-block rounded-full px-2 py-0.5 font-medium text-[10px] ${r.status === 'PROCESSED' ? 'bg-success/15 text-success' : r.status === 'FAILED' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>{r.status}</span>
                                                            <span className="text-text-muted">{r.reason}</span>
                                                        </div>
                                                        <span className="font-semibold text-gold">{formatCurrency(r.amount, selectedOrder.currency)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-xs font-semibold border-t border-border/50 pt-2">
                                                    <span className="text-text-secondary">Total Refunded</span>
                                                    <span className="text-warning">{formatCurrency(totalRefunded, selectedOrder.currency)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Return Management */}
                                {selectedOrder.return_status && (
                                    <div className="rounded-xl border border-border bg-card-bg p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-warning text-[10px] font-semibold uppercase tracking-widest mb-2"><RotateCcw className="h-3.5 w-3.5" /> Returns Management</div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-secondary">Return Status</span>
                                            <span className={`text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 ${selectedOrder.return_status === 'requested' ? 'bg-warning/15 text-warning' : selectedOrder.return_status === 'approved' ? 'bg-success/15 text-success' : selectedOrder.return_status === 'rejected' ? 'bg-danger/15 text-danger' : 'bg-border/30 text-text-muted'}`}>
                                                {selectedOrder.return_status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        {selectedOrder.return_reason && (
                                            <div className="rounded-lg bg-page-bg/50 border border-border/50 p-2 mt-2">
                                                <span className="text-[10px] text-text-muted uppercase font-semibold tracking-wider block mb-1">Reason</span>
                                                <span className="text-xs text-text-primary">{selectedOrder.return_reason}</span>
                                            </div>
                                        )}
                                        {selectedOrder.return_awb && (
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-text-secondary">Return AWB</span>
                                                <span className="text-[10px] font-mono text-text-muted bg-border/20 px-1.5 py-0.5 rounded">{selectedOrder.return_awb}</span>
                                            </div>
                                        )}
                                        {selectedOrder.return_tracking_url && (
                                            <a href={selectedOrder.return_tracking_url} target="_blank" rel="noopener noreferrer" className="block text-center rounded-xl bg-warning/10 py-2 text-xs font-semibold text-warning hover:bg-warning/20 transition-all mt-3">
                                                Track Return
                                            </a>
                                        )}
                                        {selectedOrder.return_status === 'requested' && (
                                            <div className="flex gap-2 mt-3 text-white">
                                                <button
                                                    onClick={async () => {
                                                        const tid = toast.loading('Approving...');
                                                        const success = await approveReturn(selectedOrder.id);
                                                        if (success) { toast.success('Return Approved', { id: tid }); const u = await getOrderById(selectedOrder.id); if (u) setSelectedOrder(u as any); }
                                                        else toast.error('Failed to approve', { id: tid });
                                                    }}
                                                    className="flex-1 rounded-xl bg-success/80 py-2.5 text-xs font-semibold hover:bg-success transition-all shadow-lg shadow-success/20">
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const tid = toast.loading('Rejecting...');
                                                        const success = await rejectReturn(selectedOrder.id);
                                                        if (success) { toast.success('Return Rejected', { id: tid }); const u = await getOrderById(selectedOrder.id); if (u) setSelectedOrder(u as any); }
                                                        else toast.error('Failed to reject', { id: tid });
                                                    }}
                                                    className="flex-1 rounded-xl bg-danger/80 py-2.5 text-xs font-semibold hover:bg-danger transition-all shadow-lg shadow-danger/20">
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {selectedOrder.shipping_address && (
                                <div className="rounded-xl border border-border bg-card-bg p-4 flex-shrink-0">
                                    <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-2"><MapPin className="h-3.5 w-3.5" /> Shipping Address</div>
                                    <p className="text-sm text-text-primary leading-relaxed">
                                        {[selectedOrder.shipping_address.address_line1, selectedOrder.shipping_address.address_line2, selectedOrder.shipping_address.city, selectedOrder.shipping_address.state, selectedOrder.shipping_address.pincode, selectedOrder.shipping_address.country].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Logistics & Tracking */}
                            <div className="rounded-xl border border-border bg-card-bg p-4 space-y-3 flex-shrink-0">
                                <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-2"><Package className="h-3.5 w-3.5" /> Logistics & Tracking</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-text-secondary">Shipment Status</span>
                                    <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider bg-border/20 px-2 py-0.5 rounded">{selectedOrder.shipment_status || 'UNSHIPPED'}</span>
                                </div>
                                {selectedOrder.courier_name && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Courier</span>
                                        <span className="text-xs font-medium text-text-primary">{selectedOrder.courier_name}</span>
                                    </div>
                                )}
                                {selectedOrder.awb_code && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">AWB Code</span>
                                        <span className="text-[10px] font-mono text-text-muted bg-border/20 px-1.5 py-0.5 rounded">{selectedOrder.awb_code}</span>
                                    </div>
                                )}
                                {selectedOrder.tracking_url && (
                                    <a href={selectedOrder.tracking_url} target="_blank" rel="noopener noreferrer" className="block w-full text-center rounded-xl bg-gold/10 py-2.5 text-[11px] font-bold tracking-wider text-gold hover:bg-gold/20 transition-all mt-2 uppercase">
                                        Track Order
                                    </a>
                                )}
                                {!['shipped', 'delivered', 'cancelled', 'returned'].includes(selectedOrder.status.toLowerCase()) && (
                                    <div className="flex gap-2 mt-3">
                                        {selectedOrder.shipment_id && (
                                            <button
                                                onClick={async () => {
                                                    const tid = toast.loading('Regenerating Label...');
                                                    const success = await regenerateLabel(selectedOrder.id);
                                                    if (success) { toast.success('Label generated', { id: tid }); const u = await getOrderById(selectedOrder.id); if (u) setSelectedOrder(u as any); }
                                                    else toast.error('Failed to regenerate label', { id: tid });
                                                }}
                                                className="flex-1 rounded-xl border border-border bg-page-bg/50 py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary hover:bg-border/30 hover:text-text-primary transition-all shadow-sm">
                                                Regen Label
                                            </button>
                                        )}
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Are you sure you want to cancel the shipment with the courier?')) return;
                                                const tid = toast.loading('Cancelling Shipment...');
                                                const success = await cancelShipment(selectedOrder.id);
                                                if (success) { toast.success('Shipment cancelled', { id: tid }); const u = await getOrderById(selectedOrder.id); if (u) setSelectedOrder(u as any); }
                                                else toast.error('Failed to cancel shipment', { id: tid });
                                            }}
                                            className="flex-1 rounded-xl border border-danger/20 bg-danger/10 py-2.5 text-[11px] font-bold uppercase tracking-wider text-danger hover:bg-danger/20 transition-all shadow-sm">
                                            Cancel Shipment
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-border bg-card-bg p-4 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-3">
                                    <Package className="h-3.5 w-3.5" /> Items
                                    <span className="ml-auto text-text-muted font-normal normal-case text-xs">{selectedOrder.items?.length ?? 0} item{(selectedOrder.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="space-y-2">
                                    {loadingDetail ? (
                                        <div className="flex items-center justify-center py-8 gap-3"><RefreshCw className="h-4 w-4 text-gold animate-spin" /><p className="text-sm text-text-muted">Loading items…</p></div>
                                    ) : (selectedOrder.items ?? []).length === 0 ? (
                                        <p className="text-sm text-text-muted text-center py-4">No items found</p>
                                    ) : (() => {
                                        const orderItems = selectedOrder.items ?? [];
                                        return orderItems.map((item, i) => {
                                            const name = item.product?.product_name ?? item.product_name ?? 'Unknown Product';
                                            const variant = item.variant?.variant_name ?? item.variant?.size_label ?? '';
                                            const brand = item.product?.brand;
                                            const unitPrice = item.unit_price ?? item.price ?? 0;
                                            const lineTotal = unitPrice * item.quantity;
                                            const volume = item.variant?.volume_ml ? `${item.variant.volume_ml}ml` : null;
                                            return (
                                                <div key={item.order_item_id ?? i} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
                                                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/60">
                                                        {item.thumbnail_url ? <img src={item.thumbnail_url} alt={name} className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-gold/50" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                                                        {brand && <p className="text-xs text-text-muted">{brand}</p>}
                                                        <div className="flex gap-1.5 mt-1 flex-wrap">
                                                            {variant && <span className="text-[10px] text-text-muted bg-border/30 px-1.5 py-0.5 rounded-full">{variant}</span>}
                                                            {volume && <span className="text-[10px] text-text-muted bg-border/30 px-1.5 py-0.5 rounded-full">{volume}</span>}
                                                            <span className="text-[10px] text-text-muted bg-border/30 px-1.5 py-0.5 rounded-full">×{item.quantity}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-sm font-semibold text-gold">{formatCurrency(lineTotal, selectedOrder.currency)}</p>
                                                        <p className="text-xs text-text-muted">{formatCurrency(unitPrice, selectedOrder.currency)} each</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    })()}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border bg-card-bg p-4 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-text-secondary">Subtotal</span><span className="text-text-primary tabular-nums">{formatCurrency(selectedOrder.subtotal ?? selectedOrder.total, selectedOrder.currency)}</span></div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Delivery Fee</span>
                                    <span className="text-text-primary tabular-nums">
                                        {formatCurrency(
                                            (selectedOrder as any).shipping_amount ?? 0,
                                            selectedOrder.currency
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between pt-2.5 border-t border-border">
                                    <span className="font-serif text-base font-bold text-gold">Grand Total</span>
                                    <span className="font-serif text-base font-bold text-gold tabular-nums">{formatCurrency((selectedOrder as OrderDetail).grand_total ?? selectedOrder.total, selectedOrder.currency)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />

            {/* ── Refund Modal ──────────────────────────────────────── */}
            {showRefundModal && refundOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowRefundModal(false)}>
                    <div ref={refundModalRef} className="relative w-full max-w-sm rounded-[24px] border border-gold/20 bg-card-bg-elevated p-6 shadow-[0_0_40px_rgba(60,94,60,0.15)] text-center z-10" onClick={e => e.stopPropagation()}>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3C5E3C]/10 mb-4 border border-[#3C5E3C]/20 relative">
                            <div className="absolute inset-0 rounded-full border border-gold/20 scale-110"></div>
                            <Banknote className="h-8 w-8 text-[#3C5E3C]" />
                        </div>
                        <h3 className="font-serif text-xl font-bold text-gold mb-2 tracking-wide">Initiate Refund</h3>
                        <p className="text-sm font-medium text-text-secondary mb-8 leading-relaxed px-4">
                            Are you sure you want to finalize cancelation and create a refund request?
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowRefundModal(false)} className="flex-1 rounded-xl border border-gold/30 py-2.5 text-sm font-semibold text-gold hover:bg-gold/10 hover:text-gold-soft transition-all transition-colors disabled:opacity-50">NO</button>
                            <button
                                onClick={async () => {
                                    setRefundProcessing(true);
                                    const amt = refundOrder.total || 0;
                                    if (amt <= 0) {
                                        toast.error("Valid order total required");
                                        setRefundProcessing(false);
                                        return;
                                    }
                                    const res = await createRefund({
                                        order_id: refundOrder.id,
                                        amount: amt,
                                        reason: `Refund request for cancelled order`
                                    });
                                    if (res.success) {
                                        toast.success('Refund Request Created! Proceed to the Refunds page.');
                                        setShowRefundModal(false);
                                        const rf = await getRefunds(refundOrder.id);
                                        setRefunds(rf.refunds); setTotalRefunded(rf.total_refunded);
                                    } else toast.error(res.message || (res as any).error || 'Failed to initiate refund');
                                    setRefundProcessing(false);
                                }}
                                disabled={refundProcessing}
                                className="flex-1 rounded-xl bg-[#3C5E3C] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#3C5E3C]/20 hover:bg-[#2e4a2e] transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10"
                            >
                                {refundProcessing ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : null}
                                YES
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}