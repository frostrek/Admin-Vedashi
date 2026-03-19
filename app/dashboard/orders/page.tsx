'use client';

import { useState, useEffect, useCallback, Fragment, useMemo, useRef } from 'react';
import { getOrders, getOrderById, updateOrderStatus as apiUpdateStatus, updatePaymentStatus as apiUpdatePayment, bulkUpdateOrderStatus, bulkUpdateOrderPaymentStatus, Order, downloadInvoiceAdmin, formatINR, getPaymentInfo, initiateRefund, getRefunds, PaymentInfo, RefundRecord } from '@/lib/api';
import { ShoppingCart, Eye, X, Package, User, CreditCard, MapPin, RefreshCw, Download, FileText, RotateCcw, Banknote, Shield, CheckSquare, Square, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import SortableHeader, { SortDir, compare } from '@/components/SortableHeader';
import toast from 'react-hot-toast';
import { PaymentToggle } from '@/components/PaymentToggle';
import ExportModal from '@/components/orders/ExportModal';
import PriceRangeSlider from '@/components/PriceRangeSlider';
import { gsap } from 'gsap';

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
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
    total_tax?: number;
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
        tax_amount?: number;
        line_total?: number;
        price?: number;
        product_name?: string;
        product?: { product_id: string; product_name: string; brand?: string; product_sku?: string };
        variant?: { variant_id: string; variant_name?: string; size_label?: string; volume_ml?: number };
        thumbnail_url?: string;
    }[];
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPayment, setFilterPayment] = useState<string>('all');
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

    // GSAP refs
    const headerRef = useRef<HTMLDivElement>(null);
    const filtersRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const bulkBarRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInnerRef = useRef<HTMLDivElement>(null);
    const refundModalRef = useRef<HTMLDivElement>(null);

    // Entry animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(headerRef.current,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
            );
            gsap.fromTo(filtersRef.current,
                { opacity: 0, y: -12 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.1 }
            );
            gsap.fromTo(tableRef.current,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: 0.2 }
            );
        });
        return () => ctx.revert();
    }, []);

    // Bulk bar animation
    const prevSomeSelected = useRef(false);
    useEffect(() => {
        const someSelected = selectedIds.size > 0;
        if (bulkBarRef.current) {
            if (someSelected && !prevSomeSelected.current) {
                gsap.fromTo(bulkBarRef.current,
                    { opacity: 0, y: -10, scaleY: 0.9 },
                    { opacity: 1, y: 0, scaleY: 1, duration: 0.35, ease: 'back.out(1.4)', transformOrigin: 'top' }
                );
            } else if (!someSelected && prevSomeSelected.current) {
                gsap.to(bulkBarRef.current, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in' });
            }
        }
        prevSomeSelected.current = someSelected;
    }, [selectedIds.size]);

    // Modal animations
    useEffect(() => {
        if (selectedOrder && modalRef.current && modalInnerRef.current) {
            gsap.fromTo(modalRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: 'power2.out' }
            );
            gsap.fromTo(modalInnerRef.current,
                { opacity: 0, y: 32, scale: 0.96 },
                { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out', delay: 0.05 }
            );
        }
    }, [!!selectedOrder]);

    // Refund modal animation
    useEffect(() => {
        if (showRefundModal && refundModalRef.current) {
            gsap.fromTo(refundModalRef.current,
                { opacity: 0, scale: 0.93, y: 20 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' }
            );
        }
    }, [showRefundModal]);

    // Animate table rows on page/filter change
    useEffect(() => {
        const rows = document.querySelectorAll('.order-row');
        if (rows.length > 0) {
            gsap.fromTo(rows,
                { opacity: 0, x: -8 },
                { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out' }
            );
        }
    }, [currentPage, filterStatus, filterPayment, filterDate, searchQuery, sortKey, sortDir]);

    useEffect(() => {
        const fetchOrders = async () => {
            const params: any = {};
            if (filterDateFrom) params.dateFrom = filterDateFrom;
            if (filterDateTo) params.dateTo = filterDateTo;
            const fetchedOrders = await getOrders(params);
            setOrders(fetchedOrders);
        };
        fetchOrders();
    }, [filterDateFrom, filterDateTo]);

    useEffect(() => {
        if (selectedOrder) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [selectedOrder]);

    const filtered = orders.filter(o => {
        const statusMatch = filterStatus === 'all' || o.status === filterStatus;
        const paymentMatch = filterPayment === 'all' || o.payment_status?.toLowerCase() === filterPayment.toLowerCase();
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
        return statusMatch && paymentMatch && dateMatch && amountMatch && searchMatch;
    });

    useEffect(() => { setCurrentPage(1); }, [filterStatus, filterPayment, filterDate, amountRange, searchQuery]);

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
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const clearSelection = () => { setSelectedIds(new Set()); setBulkStatusValue(''); setBulkPaymentValue(''); };

    const handleBulkStatus = async (newStatus: string) => {
        if (!newStatus || selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        const result = await bulkUpdateOrderStatus(ids, newStatus);
        if (result) {
            setOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, status: newStatus.toLowerCase() as Order['status'] } : o));
            toast.success(result.failed > 0 ? `${result.updated} updated, ${result.failed} failed` : `${result.updated} orders marked as ${newStatus.toLowerCase()}`);
            if (result.failed > 0) console.warn('[Bulk] Failed orders:', result.errors);
        } else toast.error('Bulk status update failed');
    };

    const handleBulkPayment = async (newPayment: string) => {
        if (!newPayment || selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        const result = await bulkUpdateOrderPaymentStatus(ids, newPayment);
        if (result) {
            setOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, payment_status: newPayment.toUpperCase() } : o));
            toast.success(result.failed > 0 ? `${result.updated} updated, ${result.failed} failed` : `${result.updated} orders marked as ${newPayment.toLowerCase()}`);
            if (result.failed > 0) console.warn('[Bulk] Failed orders:', result.errors);
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

    const updateStatus = (orderId: string, newStatus: Order['status']) => {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            let nextPaymentStatus = o.payment_status;
            if (newStatus === 'delivered') nextPaymentStatus = 'PAID';
            else if (o.payment_method === 'cod') nextPaymentStatus = 'UNPAID';
            return { ...o, status: newStatus, payment_status: nextPaymentStatus };
        }));
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => {
                if (!prev) return prev;
                let nextPaymentStatus = prev.payment_status;
                if (newStatus === 'delivered') nextPaymentStatus = 'PAID';
                else if (prev.payment_method === 'cod') nextPaymentStatus = 'UNPAID';
                return { ...prev, status: newStatus, payment_status: nextPaymentStatus };
            });
        }
        apiUpdateStatus(orderId, newStatus);
        toast.success(`Order status updated to ${newStatus}`);
    };

    const updatePayment = async (orderId: string, newStatus: string) => {
        const targetOrder = orders.find(o => o.id === orderId);
        if (targetOrder?.payment_method === 'razorpay' && targetOrder?.payment_status?.toUpperCase() === 'PAID' && newStatus.toUpperCase() === 'UNPAID') {
            toast.error('Razorpay payments cannot be marked as unpaid once successful. Please initiate a refund instead.');
            return;
        }
        setUpdatingPayments(prev => new Set(prev).add(orderId));
        const prevStatus = targetOrder?.payment_status || 'Unpaid';
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: newStatus } : o));
        if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, payment_status: newStatus } : prev);
        try {
            const success = await apiUpdatePayment(orderId, newStatus.toUpperCase());
            if (success) toast.success(`Payment status updated to ${newStatus}`);
            else throw new Error('API reported failure');
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
            case 'confirmed': return 'bg-success/15 text-success border-success/20';
            case 'shipped': return 'bg-info/15 text-info border-info/20';
            case 'delivered': return 'bg-gold/15 text-gold border-gold/20';
            case 'pending': return 'bg-warning/15 text-warning border-warning/20';
            case 'cancelled': return 'bg-danger/15 text-danger border-danger/20';
            default: return 'bg-text-muted/15 text-text-muted border-border';
        }
    };

    const closeModal = () => {
        if (modalRef.current && modalInnerRef.current) {
            gsap.to(modalInnerRef.current, { opacity: 0, y: 20, scale: 0.97, duration: 0.25, ease: 'power2.in' });
            gsap.to(modalRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => setSelectedOrder(null) });
        } else {
            setSelectedOrder(null);
        }
    };

    return (
        <div className="space-y-5 pb-8">

            {/* ── Header ──────────────────────────────────────────── */}
            <div ref={headerRef} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft tracking-tight">Orders</h1>
                    <p className="text-sm text-text-secondary mt-0.5">
                        <span className="font-semibold text-text-primary">{orders.length}</span> total orders
                    </p>
                </div>
                <button
                    onClick={() => setExportOpen(true)}
                    className="group flex items-center gap-2 rounded-xl border border-gold/25 bg-gradient-to-r from-primary to-primary-light px-5 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:border-gold/50 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-gold/10"
                >
                    <Download className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                    Export
                </button>
            </div>

            {/* ── Filters ─────────────────────────────────────────── */}
            <div ref={filtersRef} className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-4 space-y-3 shadow-sm">
                {/* Row 1: Search + Quick selects */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); clearSelection(); }}
                            placeholder="Search by ID, name, or email…"
                            className="w-full rounded-xl border border-border bg-page-bg/60 pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-200"
                        />
                    </div>

                    {/* Status */}
                    <div className="relative min-w-[140px]">
                        <select
                            value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); clearSelection(); }}
                            className="w-full appearance-none rounded-xl border border-border bg-page-bg/60 px-3 py-2.5 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-200 cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>

                    {/* Payment */}
                    <div className="relative min-w-[140px]">
                        <select
                            value={filterPayment}
                            onChange={e => { setFilterPayment(e.target.value); clearSelection(); }}
                            className="w-full appearance-none rounded-xl border border-border bg-page-bg/60 px-3 py-2.5 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-200 cursor-pointer"
                        >
                            <option value="all">All Payments</option>
                            {paymentStatusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>

                    {/* Date quick */}
                    <div className="relative min-w-[140px]">
                        <select
                            value={filterDate}
                            onChange={e => { setFilterDate(e.target.value); clearSelection(); }}
                            className="w-full appearance-none rounded-xl border border-border bg-page-bg/60 px-3 py-2.5 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-200 cursor-pointer"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                </div>

                {/* Row 2: Amount range + date range */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Amount Range */}
                    <div className="rounded-xl border border-border bg-page-bg/60 px-3 py-1.5 min-w-[220px] flex-1 max-w-xs">
                        <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Amount Range</span>
                        <PriceRangeSlider
                            min={0}
                            max={absoluteMaxAmount}
                            initialMin={amountRange.min}
                            initialMax={amountRange.max}
                            onChange={(min, max) => { setAmountRange({ min, max }); clearSelection(); }}
                        />
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-sm">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-[-8px] bg-card-bg px-1 text-[10px] text-text-muted z-10 tracking-wider uppercase font-bold">From</span>
                            <input
                                type="date"
                                value={filterDateFrom}
                                onChange={e => { setFilterDateFrom(e.target.value); clearSelection(); }}
                                className="w-full rounded-xl border border-border bg-page-bg/60 px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-200 cursor-pointer"
                            />
                        </div>
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-[-8px] bg-card-bg px-1 text-[10px] text-text-muted z-10 tracking-wider uppercase font-bold">To</span>
                            <input
                                type="date"
                                value={filterDateTo}
                                onChange={e => { setFilterDateTo(e.target.value); clearSelection(); }}
                                className="w-full rounded-xl border border-border bg-page-bg/60 px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-200 cursor-pointer"
                            />
                        </div>
                        {(filterDateFrom || filterDateTo) && (
                            <button
                                onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); clearSelection(); }}
                                className="flex-shrink-0 rounded-xl p-2.5 border border-border text-text-muted hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all duration-200"
                                title="Reset dates"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Bulk Toolbar ─────────────────────────────────────── */}
            {someSelected && (
                <div
                    ref={bulkBarRef}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/25 bg-gradient-to-r from-primary to-primary-light px-5 py-3.5 shadow-lg shadow-gold/10"
                >
                    <span className="text-sm font-semibold text-[#E8D8B9] mr-1">
                        {selectedIds.size} order{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>

                    <div className="h-4 w-px bg-[#E8D8B9]/20 hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#E8D8B9]/60 whitespace-nowrap">Set status:</span>
                        <div className="relative">
                            <select
                                value={bulkStatusValue}
                                onChange={e => setBulkStatusValue(e.target.value)}
                                disabled={bulkProcessing}
                                className="appearance-none rounded-lg border border-gold/30 bg-card-bg px-3 py-1.5 pr-7 text-sm text-text-primary focus:border-gold/50 focus:outline-none disabled:opacity-50 cursor-pointer"
                            >
                                <option value="">— Order Status —</option>
                                {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-gold-muted" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#E8D8B9]/60 whitespace-nowrap">Set payment:</span>
                        <div className="relative">
                            <select
                                value={bulkPaymentValue}
                                onChange={e => setBulkPaymentValue(e.target.value)}
                                disabled={bulkProcessing}
                                className="appearance-none rounded-lg border border-gold/30 bg-card-bg px-3 py-1.5 pr-7 text-sm text-text-primary focus:border-gold/50 focus:outline-none disabled:opacity-50 cursor-pointer"
                            >
                                <option value="">— Payment Status —</option>
                                {paymentStatusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-gold-muted" />
                        </div>
                    </div>

                    <div className="flex-1" />

                    <button
                        onClick={clearSelection}
                        disabled={bulkProcessing}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E8D8B9]/25 px-3 py-1.5 text-xs font-semibold text-[#E8D8B9]/70 hover:border-[#E8D8B9]/50 hover:text-[#E8D8B9] transition-all disabled:opacity-50"
                    >
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
                        className="flex items-center gap-2 rounded-lg border border-[#E8D8B9]/40 bg-[#E8D8B9]/15 px-4 py-1.5 text-sm font-semibold text-[#E8D8B9] hover:bg-[#E8D8B9]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {bulkProcessing
                            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Applying…</>
                            : 'Confirm Action'
                        }
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
                                    <button
                                        onClick={toggleSelectAll}
                                        className="flex items-center justify-center text-gold-muted hover:text-gold transition-colors"
                                        title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                                    >
                                        {allFilteredSelected
                                            ? <CheckSquare className="h-4 w-4 text-gold" />
                                            : <Square className="h-4 w-4" />}
                                    </button>
                                </th>
                                <th className="px-4 py-3.5 text-[11px] font-semibold text-gold-muted uppercase tracking-wider">Order ID</th>
                                <SortableHeader label="Customer" sortKey="customer_name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3.5 text-[11px] font-semibold text-gold-muted uppercase tracking-wider">Items</th>
                                <SortableHeader label="Total" sortKey="total" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3.5 text-[11px] font-semibold text-gold-muted uppercase tracking-wider">Payment</th>
                                <SortableHeader label="Status" sortKey="status" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Date" sortKey="created_at" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3.5 text-[11px] font-semibold text-gold-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-text-muted/10 p-4">
                                                <ShoppingCart className="h-8 w-8 text-text-muted/40" />
                                            </div>
                                            <p className="text-sm text-text-muted">No orders found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="rounded-full bg-text-muted/10 p-4">
                                                <ShoppingCart className="h-8 w-8 text-text-muted/40" />
                                            </div>
                                            <p className="text-sm text-text-muted">No orders on this page.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map(order => {
                                    const isSelected = selectedIds.has(order.id);
                                    return (
                                        <tr
                                            key={order.id}
                                            className={`order-row group hover:bg-gold/[0.03] transition-colors duration-200 ${isSelected ? 'bg-gold/[0.05] border-l-2 border-l-gold/50' : ''}`}
                                        >
                                            <td className="px-4 py-3.5">
                                                <button
                                                    onClick={() => toggleSelectOne(order.id)}
                                                    className="flex items-center justify-center text-gold-muted hover:text-gold transition-colors"
                                                >
                                                    {isSelected ? <CheckSquare className="h-4 w-4 text-gold" /> : <Square className="h-4 w-4" />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-mono text-xs text-text-muted bg-border/20 px-1.5 py-0.5 rounded" title={order.id}>
                                                    {order.id.substring(0, 8)}…
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className="text-sm font-medium text-text-primary leading-tight">{order.customer_name}</p>
                                                <p className="text-xs text-text-muted mt-0.5">{order.customer_email}</p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-sm text-text-secondary tabular-nums">
                                                    {order.items?.length ?? 0}
                                                    <span className="text-text-muted text-xs ml-1">item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-sm font-semibold text-gold tabular-nums">{formatINR(order.total)}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <PaymentToggle
                                                        status={order.payment_status ?? 'UNPAID'}
                                                        onToggle={(newStatus) => updatePayment(order.id, newStatus)}
                                                        disabled={updatingPayments.has(order.id) || (order.payment_status?.toUpperCase() === 'PAID' && (order.payment_method === 'razorpay' || order.payment_method === 'cod'))}
                                                    />
                                                    <span className={`text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 ${order.payment_method === 'razorpay' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'}`}>
                                                        {order.payment_method === 'razorpay' ? 'RZP' : 'COD'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <select
                                                    value={order.status}
                                                    onChange={e => updateStatus(order.id, e.target.value as Order['status'])}
                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer transition-all duration-200 hover:opacity-80 ${statusColor(order.status)}`}
                                                >
                                                    {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3.5 text-sm text-text-secondary tabular-nums">
                                                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    onClick={() => openOrderDetail(order)}
                                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200 group-hover:bg-gold/5"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
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
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-text-secondary">
                                    <span className="font-semibold text-text-primary">{((currentPage - 1) * itemsPerPage) + 1}</span>
                                    {' – '}
                                    <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, filtered.length)}</span>
                                    {' of '}
                                    <span className="font-semibold text-text-primary">{filtered.length}</span>
                                </p>
                                <select
                                    className="text-xs bg-card-bg border border-border rounded-lg px-2.5 py-1.5 text-text-primary cursor-pointer focus:outline-none focus:border-gold/50 transition-colors"
                                    value={itemsPerPage}
                                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                >
                                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} per page</option>)}
                                </select>
                            </div>
                            <nav className="isolate inline-flex -space-x-px rounded-xl overflow-hidden shadow-sm ring-1 ring-border" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2.5 py-2 text-text-muted bg-card-bg hover:bg-gold/[0.05] hover:text-gold focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => (
                                        <Fragment key={p}>
                                            {i > 0 && p - arr[i - 1] > 1 && (
                                                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-text-muted bg-card-bg border-x border-border">…</span>
                                            )}
                                            <button
                                                onClick={() => handlePageChange(p)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-all ${p === currentPage
                                                    ? 'z-10 bg-gold/10 text-gold ring-1 ring-inset ring-gold/40'
                                                    : 'text-text-primary bg-card-bg hover:bg-gold/[0.04] hover:text-gold border-x border-border'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        </Fragment>
                                    ))}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2.5 py-2 text-text-muted bg-card-bg hover:bg-gold/[0.05] hover:text-gold focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </nav>
                        </div>
                        {/* Mobile */}
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
                <div
                    ref={modalRef}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                    onClick={closeModal}
                >
                    <div
                        ref={modalInnerRef}
                        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card-bg-elevated shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg/80 flex-shrink-0">
                            <div>
                                <h2 className="font-serif text-lg font-bold text-gold-soft">Order Details</h2>
                                <p className="font-mono text-xs text-text-muted mt-0.5">{selectedOrder.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        const toastId = toast.loading('Downloading invoice...');
                                        const res = await downloadInvoiceAdmin(selectedOrder.id);
                                        if (res.success) toast.success('Invoice downloaded!', { id: toastId });
                                        else toast.error(res.message || 'Failed to download invoice', { id: toastId });
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-3 py-1.5 text-xs font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm"
                                >
                                    <FileText className="h-3.5 w-3.5" /> Invoice
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="rounded-xl p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Loading overlay */}
                        {loadingDetail && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-2xl">
                                <div className="rounded-xl bg-card-bg p-4 shadow-xl flex items-center gap-3">
                                    <RefreshCw className="h-5 w-5 text-gold animate-spin" />
                                    <span className="text-sm text-text-secondary">Loading details…</span>
                                </div>
                            </div>
                        )}

                        {/* Scrollable content */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-4">
                            {/* Customer + Payment */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Customer */}
                                <div className="rounded-xl border border-border bg-card-bg p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-2">
                                        <User className="h-3.5 w-3.5" /> Customer
                                    </div>
                                    <p className="text-sm font-semibold text-text-primary">{selectedOrder.customer_name}</p>
                                    <p className="text-xs text-text-muted break-all">{selectedOrder.customer_email}</p>
                                    <p className="text-xs text-text-muted">{new Date(selectedOrder.created_at).toLocaleString('en-US')}</p>
                                </div>

                                {/* Payment & Status */}
                                <div className="rounded-xl border border-border bg-card-bg p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-2">
                                        <CreditCard className="h-3.5 w-3.5" /> Payment &amp; Status
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Order Status</span>
                                        <select
                                            value={selectedOrder.status}
                                            onChange={e => updateStatus(selectedOrder.id, e.target.value as Order['status'])}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${statusColor(selectedOrder.status)}`}
                                        >
                                            {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Payment</span>
                                        <PaymentToggle
                                            status={selectedOrder.payment_status ?? 'UNPAID'}
                                            onToggle={(newStatus) => updatePayment(selectedOrder.id, newStatus)}
                                            disabled={updatingPayments.has(selectedOrder.id) || (selectedOrder.payment_status?.toUpperCase() === 'PAID' && (selectedOrder.payment_method === 'razorpay' || selectedOrder.payment_method === 'cod'))}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Method</span>
                                        <span className="text-xs font-medium text-text-primary">
                                            {(selectedOrder.payment_method || paymentInfo?.payment_method) === 'razorpay'
                                                ? <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-blue-400" /> Razorpay</span>
                                                : <span className="flex items-center gap-1"><Banknote className="h-3 w-3 text-green-400" /> Cash on Delivery</span>
                                            }
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

                                    {(selectedOrder.payment_status === 'PAID' || paymentInfo?.payment_status === 'PAID') &&
                                        (selectedOrder.payment_method === 'razorpay' || paymentInfo?.payment_gateway === 'razorpay') && (
                                            <button
                                                onClick={() => { setRefundAmount(''); setRefundReason(''); setShowRefundModal(true); }}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/8 py-2 text-xs font-semibold text-warning hover:bg-warning/15 transition-all duration-200"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" /> Initiate Refund
                                            </button>
                                        )}

                                    {/* Refund History */}
                                    {refunds.length > 0 && (
                                        <div className="border-t border-border/60 pt-3 mt-1">
                                            <p className="text-[10px] font-semibold text-gold-muted uppercase tracking-widest mb-2">Refund History</p>
                                            <div className="space-y-2">
                                                {refunds.map(r => (
                                                    <div key={r.refund_id} className="flex items-center justify-between text-xs bg-page-bg/40 rounded-lg px-2.5 py-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-block rounded-full px-2 py-0.5 font-medium text-[10px] ${r.status === 'PROCESSED' ? 'bg-success/15 text-success' : r.status === 'FAILED' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>
                                                                {r.status}
                                                            </span>
                                                            <span className="text-text-muted">{r.reason}</span>
                                                        </div>
                                                        <span className="font-semibold text-gold">{formatINR(r.amount)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-xs font-semibold border-t border-border/50 pt-2">
                                                    <span className="text-text-secondary">Total Refunded</span>
                                                    <span className="text-warning">{formatINR(totalRefunded)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Shipping Address */}
                            {selectedOrder.shipping_address && (
                                <div className="rounded-xl border border-border bg-card-bg p-4">
                                    <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-2">
                                        <MapPin className="h-3.5 w-3.5" /> Shipping Address
                                    </div>
                                    <p className="text-sm text-text-primary leading-relaxed">
                                        {[
                                            selectedOrder.shipping_address.address_line1,
                                            selectedOrder.shipping_address.address_line2,
                                            selectedOrder.shipping_address.city,
                                            selectedOrder.shipping_address.state,
                                            selectedOrder.shipping_address.pincode,
                                            selectedOrder.shipping_address.country,
                                        ].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Items */}
                            <div className="rounded-xl border border-border bg-card-bg p-4">
                                <div className="flex items-center gap-2 text-gold-muted text-[10px] font-semibold uppercase tracking-widest mb-3">
                                    <Package className="h-3.5 w-3.5" /> Items
                                    <span className="ml-auto text-text-muted font-normal normal-case text-xs">{selectedOrder.items?.length ?? 0} item{(selectedOrder.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="space-y-2">
                                    {loadingDetail ? (
                                        <div className="flex items-center justify-center py-8 gap-3">
                                            <RefreshCw className="h-4 w-4 text-gold animate-spin" />
                                            <p className="text-sm text-text-muted">Loading items…</p>
                                        </div>
                                    ) : (selectedOrder.items ?? []).length === 0 ? (
                                        <p className="text-sm text-text-muted text-center py-4">No items found</p>
                                    ) : (
                                        (selectedOrder.items ?? []).map((item, i) => {
                                            const name = item.product?.product_name ?? item.product_name ?? 'Unknown Product';
                                            const variant = item.variant?.variant_name ?? item.variant?.size_label ?? '';
                                            const brand = item.product?.brand;
                                            const unitPrice = item.unit_price ?? item.price ?? 0;
                                            const lineTotal = item.line_total ?? (unitPrice * item.quantity);
                                            const volume = item.variant?.volume_ml ? `${item.variant.volume_ml}ml` : null;
                                            return (
                                                <div key={item.order_item_id ?? i} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
                                                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/60">
                                                        {item.thumbnail_url
                                                            ? <img src={item.thumbnail_url} alt={name} className="w-full h-full object-cover" />
                                                            : <Package className="h-4 w-4 text-gold/50" />
                                                        }
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
                                                        <p className="text-sm font-semibold text-gold">{formatINR(lineTotal)}</p>
                                                        <p className="text-xs text-text-muted">{formatINR(unitPrice)} each</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="rounded-xl border border-border bg-card-bg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Subtotal</span>
                                    <span className="text-text-primary tabular-nums">{formatINR(selectedOrder.subtotal ?? selectedOrder.total)}</span>
                                </div>
                                {(selectedOrder as OrderDetail).total_tax != null && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Tax</span>
                                        <span className="text-text-primary tabular-nums">{formatINR((selectedOrder as OrderDetail).total_tax ?? 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-2.5 border-t border-border">
                                    <span className="font-serif text-base font-bold text-gold">Grand Total</span>
                                    <span className="font-serif text-base font-bold text-gold tabular-nums">
                                        {formatINR((selectedOrder as OrderDetail).grand_total ?? selectedOrder.total)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />

            {/* ── Refund Modal ─────────────────────────────────────── */}
            {showRefundModal && selectedOrder && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
                    onClick={() => setShowRefundModal(false)}
                >
                    <div
                        ref={refundModalRef}
                        className="w-full max-w-md rounded-2xl border border-border bg-card-bg-elevated p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-serif text-lg font-bold text-gold-soft">Initiate Refund</h3>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Order {selectedOrder.id.slice(0, 8)}… · <span className="text-gold font-semibold">{formatINR(selectedOrder.total)}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowRefundModal(false)} className="rounded-xl p-1.5 text-text-muted hover:text-gold hover:bg-gold/10 transition-all">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Amount <span className="text-text-muted font-normal">(leave blank for full refund)</span></label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={e => setRefundAmount(e.target.value)}
                                    placeholder="Full refund"
                                    className="w-full rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Reason <span className="text-text-muted font-normal">(optional)</span></label>
                                <input
                                    type="text"
                                    value={refundReason}
                                    onChange={e => setRefundReason(e.target.value)}
                                    placeholder="Reason for refund"
                                    className="w-full rounded-xl border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-border/20 hover:text-text-primary transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setRefundProcessing(true);
                                    const amt = refundAmount ? parseFloat(refundAmount) : undefined;
                                    const res = await initiateRefund(selectedOrder.id, amt, refundReason || undefined);
                                    if (res.success) {
                                        toast.success('Refund initiated successfully');
                                        setShowRefundModal(false);
                                        const rf = await getRefunds(selectedOrder.id);
                                        setRefunds(rf.refunds);
                                        setTotalRefunded(rf.total_refunded);
                                        const pi = await getPaymentInfo(selectedOrder.id);
                                        setPaymentInfo(pi);
                                    } else {
                                        toast.error(res.error || 'Failed to initiate refund');
                                    }
                                    setRefundProcessing(false);
                                }}
                                disabled={refundProcessing}
                                className="flex-1 rounded-xl bg-warning/90 py-2.5 text-sm font-semibold text-white hover:bg-warning transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {refundProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                Process Refund
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 