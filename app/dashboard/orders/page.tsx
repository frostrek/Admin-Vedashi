'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrders, getOrderById, updateOrderStatus as apiUpdateStatus, updatePaymentStatus as apiUpdatePayment, bulkUpdateOrderStatus, bulkUpdateOrderPaymentStatus, Order, downloadInvoiceAdmin, formatINR, getPaymentInfo, initiateRefund, getRefunds, PaymentInfo, RefundRecord } from '@/lib/api';
import { ShoppingCart, Eye, X, Package, User, CreditCard, MapPin, RefreshCw, Download, FileText, RotateCcw, Banknote, Shield, CheckSquare, Square, ChevronDown, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { PaymentToggle } from '@/components/PaymentToggle';
import ExportModal from '@/components/orders/ExportModal';

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
const paymentStatusOptions = ['unpaid', 'paid', 'refunded', 'failed'] as const;

// Extended order detail — what getOrderById actually returns (standalone, NOT extending Order)
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
        price?: number;          // fallback from list view
        product_name?: string;   // from list view dummy OR from detail view
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
    const [updatingPayments, setUpdatingPayments] = useState<Set<string>>(new Set());
    const [exportOpen, setExportOpen] = useState(false);

    // ─── Bulk selection state ──────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatusValue, setBulkStatusValue] = useState('');
    const [bulkPaymentValue, setBulkPaymentValue] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Payment & Refund state
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [totalRefunded, setTotalRefunded] = useState(0);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [refundProcessing, setRefundProcessing] = useState(false);

    useEffect(() => {
        getOrders().then(setOrders);
    }, []);

    useEffect(() => {
        if (selectedOrder) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedOrder]);

    const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

    // ─── Bulk selection helpers ────────────────────────────────────
    const allFilteredSelected = filtered.length > 0 && filtered.every(o => selectedIds.has(o.id));
    const someSelected = selectedIds.size > 0;

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(o => o.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setBulkStatusValue('');
        setBulkPaymentValue('');
    };

    // ─── Bulk action handlers ──────────────────────────────────────
    // These are pure async helpers — the confirm button manages bulkProcessing state.
    const handleBulkStatus = async (newStatus: string) => {
        if (!newStatus || selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        const result = await bulkUpdateOrderStatus(ids, newStatus);
        if (result) {
            setOrders(prev => prev.map(o =>
                selectedIds.has(o.id) ? { ...o, status: newStatus.toLowerCase() as Order['status'] } : o
            ));
            const msg = result.failed > 0
                ? `${result.updated} updated, ${result.failed} failed`
                : `${result.updated} orders marked as ${newStatus.toLowerCase()}`;
            toast.success(msg);
            if (result.failed > 0) console.warn('[Bulk] Failed orders:', result.errors);
        } else {
            toast.error('Bulk status update failed');
        }
    };

    const handleBulkPayment = async (newPayment: string) => {
        if (!newPayment || selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        const result = await bulkUpdateOrderPaymentStatus(ids, newPayment);
        if (result) {
            setOrders(prev => prev.map(o =>
                selectedIds.has(o.id) ? { ...o, payment_status: newPayment.toUpperCase() } : o
            ));
            const msg = result.failed > 0
                ? `${result.updated} updated, ${result.failed} failed`
                : `${result.updated} orders marked as ${newPayment.toLowerCase()}`;
            toast.success(msg);
            if (result.failed > 0) console.warn('[Bulk] Failed orders:', result.errors);
        } else {
            toast.error('Bulk payment update failed');
        }
    };

    // ─── Single-order handlers (unchanged) ────────────────────────
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

            Promise.all([
                getPaymentInfo(order.id),
                getRefunds(order.id),
            ]).then(([pi, rf]) => {
                setPaymentInfo(pi);
                setRefunds(rf.refunds);
                setTotalRefunded(rf.total_refunded);
            }).catch(() => { });
        } catch {
            toast.error('Failed to load order details');
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    const updateStatus = (orderId: string, newStatus: Order['status']) => {
        setOrders(prev =>
            prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        );
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : prev);
        }
        apiUpdateStatus(orderId, newStatus);
        toast.success(`Order status updated to ${newStatus}`);
    };

    const updatePayment = async (orderId: string, newStatus: string) => {
        setUpdatingPayments(prev => new Set(prev).add(orderId));

        const targetOrder = orders.find(o => o.id === orderId);
        const prevStatus = targetOrder?.payment_status || 'Unpaid';

        setOrders(prev =>
            prev.map(o => o.id === orderId ? { ...o, payment_status: newStatus } : o)
        );
        if (selectedOrder?.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, payment_status: newStatus } : prev);
        }

        try {
            const success = await apiUpdatePayment(orderId, newStatus.toUpperCase());
            if (success) {
                toast.success(`Payment status updated to ${newStatus}`);
            } else {
                throw new Error('API reported failure');
            }
        } catch {
            setOrders(prev =>
                prev.map(o => o.id === orderId ? { ...o, payment_status: prevStatus } : o)
            );
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(prev => prev ? { ...prev, payment_status: prevStatus } : prev);
            }
            toast.error('Failed to update payment status');
        } finally {
            setUpdatingPayments(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
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

    const paymentColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-success/15 text-success';
            case 'unpaid': return 'bg-warning/15 text-warning';
            case 'refunded': return 'bg-info/15 text-info';
            case 'failed': return 'bg-danger/15 text-danger';
            default: return 'bg-text-muted/15 text-text-muted';
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Orders</h1>
                    <p className="text-sm text-text-secondary">{orders.length} total orders</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <select
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); clearSelection(); }}
                        className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none transition-colors duration-300"
                    >
                        <option value="all">All Statuses</option>
                        {statusOptions.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setExportOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-semibold text-[#E8D8B9] hover:border-gold/40 transition-all duration-300"
                    >
                        <Download className="h-4 w-4" /> Export
                    </button>
                </div>
            </div>

            {/* ─── Bulk Action Toolbar ─── */}
            {someSelected && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/20 bg-gradient-to-r from-primary to-primary-light px-5 py-3 shadow-lg">
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-sm font-semibold text-[#E8D8B9]">
                            {selectedIds.size} order{selectedIds.size !== 1 ? 's' : ''} selected
                        </span>
                    </div>

                    {/* Bulk Status */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#E8D8B9]/70">Set status:</span>
                        <div className="relative">
                            <select
                                value={bulkStatusValue}
                                onChange={e => setBulkStatusValue(e.target.value)}
                                disabled={bulkProcessing}
                                className="appearance-none rounded-lg border border-gold/30 bg-card-bg px-3 py-1.5 pr-7 text-sm text-text-primary focus:border-gold/50 focus:outline-none disabled:opacity-50 cursor-pointer"
                            >
                                <option value="">-- Order Status --</option>
                                {statusOptions.map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-gold-muted" />
                        </div>
                    </div>

                    {/* Bulk Payment */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[#E8D8B9]/70">Set payment:</span>
                        <div className="relative">
                            <select
                                value={bulkPaymentValue}
                                onChange={e => setBulkPaymentValue(e.target.value)}
                                disabled={bulkProcessing}
                                className="appearance-none rounded-lg border border-gold/30 bg-card-bg px-3 py-1.5 pr-7 text-sm text-text-primary focus:border-gold/50 focus:outline-none disabled:opacity-50 cursor-pointer"
                            >
                                <option value="">-- Payment Status --</option>
                                {paymentStatusOptions.map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-gold-muted" />
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Clear — ghost style, left of Confirm */}
                    <button
                        onClick={clearSelection}
                        disabled={bulkProcessing}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E8D8B9]/30 px-3 py-1.5 text-xs font-semibold text-[#E8D8B9]/75 hover:border-[#E8D8B9]/60 hover:text-[#E8D8B9] transition-colors disabled:opacity-50"
                    >
                        <X className="h-3.5 w-3.5" /> Clear
                    </button>

                    {/* Confirm Action — far right */}
                    <button
                        onClick={async () => {
                            if (!bulkStatusValue && !bulkPaymentValue) return;
                            setBulkProcessing(true);
                            try {
                                if (bulkStatusValue) await handleBulkStatus(bulkStatusValue);
                                if (bulkPaymentValue) await handleBulkPayment(bulkPaymentValue);
                            } finally {
                                clearSelection();
                                setBulkProcessing(false);
                            }
                        }}
                        disabled={bulkProcessing || (!bulkStatusValue && !bulkPaymentValue)}
                        className="flex items-center gap-2 rounded-lg border border-[#E8D8B9]/40 bg-[#E8D8B9]/15 px-4 py-1.5 text-sm font-semibold text-[#E8D8B9] hover:bg-[#E8D8B9]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {bulkProcessing
                            ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Applying…</>
                            : 'Confirm Action'}
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-page-bg">
                                {/* Select-all checkbox */}
                                <th className="px-4 py-3 w-10">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="flex items-center justify-center text-gold-muted hover:text-gold transition-colors"
                                        title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                                    >
                                        {allFilteredSelected
                                            ? <CheckSquare className="h-4 w-4 text-gold" />
                                            : <Square className="h-4 w-4" />
                                        }
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Order ID</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Items</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Payment</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center">
                                        <ShoppingCart className="mx-auto h-10 w-10 text-text-muted/40 mb-2" />
                                        <p className="text-sm text-text-muted">No orders found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(order => {
                                    const isSelected = selectedIds.has(order.id);
                                    return (
                                        <tr
                                            key={order.id}
                                            className={`hover:bg-gold/[0.03] transition-all duration-300 ${isSelected ? 'bg-gold/[0.05] border-l-2 border-l-gold/40' : ''}`}
                                        >
                                            {/* Row checkbox */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => toggleSelectOne(order.id)}
                                                    className="flex items-center justify-center text-gold-muted hover:text-gold transition-colors"
                                                >
                                                    {isSelected
                                                        ? <CheckSquare className="h-4 w-4 text-gold" />
                                                        : <Square className="h-4 w-4" />
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-text-muted max-w-[120px] truncate" title={order.id}>
                                                {order.id.substring(0, 8)}…
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-text-primary">{order.customer_name}</p>
                                                <p className="text-xs text-text-muted">{order.customer_email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-secondary">
                                                {(order.items?.length ?? 0)} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gold">
                                                {formatINR(order.total)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <PaymentToggle
                                                        status={order.payment_status ?? 'UNPAID'}
                                                        onToggle={(newStatus) => updatePayment(order.id, newStatus)}
                                                        disabled={updatingPayments.has(order.id)}
                                                    />
                                                    <span className={`text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 ${order.payment_method === 'razorpay'
                                                        ? 'bg-blue-500/15 text-blue-400'
                                                        : 'bg-green-500/15 text-green-400'
                                                        }`}>
                                                        {order.payment_method === 'razorpay' ? 'Razorpay' : 'COD'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={order.status}
                                                    onChange={e => updateStatus(order.id, e.target.value as Order['status'])}
                                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${statusColor(order.status)}`}
                                                >
                                                    {statusOptions.map(s => (
                                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-text-secondary">
                                                {new Date(order.created_at).toLocaleDateString('en-US')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => openOrderDetail(order)}
                                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
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
            </div>

            {/* ─── Order Detail Modal ─────────────────────────────── */}
            {selectedOrder && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setSelectedOrder(null)}
                >
                    <div
                        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card-bg-elevated shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-page-bg flex-shrink-0">
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
                                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-primary-light px-3 py-1.5 text-xs font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm"
                                    title="Download Invoice"
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    Invoice
                                </button>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Loading overlay */}
                        {loadingDetail && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-2xl">
                                <RefreshCw className="h-6 w-6 text-gold animate-spin" />
                            </div>
                        )}

                        {/* Scrollable content */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-5">

                            {/* Customer + Status row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-border bg-card-bg p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-gold-muted text-xs font-semibold uppercase tracking-wider mb-3">
                                        <User className="h-3.5 w-3.5" /> Customer
                                    </div>
                                    <p className="text-sm font-semibold text-text-primary">{selectedOrder.customer_name}</p>
                                    <p className="text-xs text-text-muted break-all">{selectedOrder.customer_email}</p>
                                    <p className="text-xs text-text-muted">{new Date(selectedOrder.created_at).toLocaleString('en-US')}</p>
                                </div>

                                <div className="rounded-xl border border-border bg-card-bg p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-gold-muted text-xs font-semibold uppercase tracking-wider mb-3">
                                        <CreditCard className="h-3.5 w-3.5" /> Payment &amp; Status
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Status</span>
                                        <select
                                            value={selectedOrder.status}
                                            onChange={e => updateStatus(selectedOrder.id, e.target.value as Order['status'])}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${statusColor(selectedOrder.status)}`}
                                        >
                                            {statusOptions.map(s => (
                                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Payment</span>
                                        <PaymentToggle
                                            status={selectedOrder.payment_status ?? 'UNPAID'}
                                            onToggle={(newStatus) => updatePayment(selectedOrder.id, newStatus)}
                                            disabled={updatingPayments.has(selectedOrder.id)}
                                        />
                                    </div>
                                    {selectedOrder.order_notes && (
                                        <div>
                                            <span className="text-xs text-text-muted">Notes: </span>
                                            <span className="text-xs text-text-primary">{selectedOrder.order_notes}</span>
                                        </div>
                                    )}

                                    {/* Payment Method & Gateway Info */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-text-secondary">Method</span>
                                        <span className="text-xs font-medium text-text-primary">
                                            {(selectedOrder.payment_method || paymentInfo?.payment_method) === 'razorpay' ? (
                                                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-blue-400" /> Razorpay</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><Banknote className="h-3 w-3 text-green-400" /> Cash on Delivery</span>
                                            )}
                                        </span>
                                    </div>
                                    {paymentInfo?.razorpay_payment_id && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-secondary">Txn ID</span>
                                            <span className="text-[10px] font-mono text-text-muted">{paymentInfo.razorpay_payment_id}</span>
                                        </div>
                                    )}
                                    {paymentInfo?.razorpay_order_id && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-secondary">RZP Order</span>
                                            <span className="text-[10px] font-mono text-text-muted">{paymentInfo.razorpay_order_id}</span>
                                        </div>
                                    )}

                                    {/* Refund Button — show for Razorpay-paid orders */}
                                    {(selectedOrder.payment_status === 'PAID' || paymentInfo?.payment_status === 'PAID') &&
                                        (selectedOrder.payment_method === 'razorpay' || paymentInfo?.payment_gateway === 'razorpay') && (
                                            <button
                                                onClick={() => { setRefundAmount(''); setRefundReason(''); setShowRefundModal(true); }}
                                                className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-warning/30 bg-warning/10 py-2 text-xs font-semibold text-warning hover:bg-warning/20 transition-colors"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" /> Initiate Refund
                                            </button>
                                        )}
                                </div>

                                {/* Refund History */}
                                {refunds.length > 0 && (
                                    <div className="mt-3 border-t border-border pt-3">
                                        <p className="text-[10px] font-semibold text-gold-muted uppercase tracking-wider mb-2">Refund History</p>
                                        <div className="space-y-2">
                                            {refunds.map(r => (
                                                <div key={r.refund_id} className="flex items-center justify-between text-xs">
                                                    <div>
                                                        <span className={`inline-block rounded-full px-2 py-0.5 font-medium ${r.status === 'PROCESSED' ? 'bg-success/15 text-success' : r.status === 'FAILED' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'
                                                            }`}>
                                                            {r.status}
                                                        </span>
                                                        <span className="ml-2 text-text-muted">{r.reason}</span>
                                                    </div>
                                                    <span className="font-semibold text-gold">{formatINR(r.amount)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-xs font-semibold border-t border-border-subtle pt-1">
                                                <span className="text-text-secondary">Total Refunded</span>
                                                <span className="text-warning">{formatINR(totalRefunded)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Shipping Address */}
                            {selectedOrder.shipping_address && (
                                <div className="rounded-xl border border-border bg-card-bg p-4">
                                    <div className="flex items-center gap-2 text-gold-muted text-xs font-semibold uppercase tracking-wider mb-3">
                                        <MapPin className="h-3.5 w-3.5" /> Shipping Address
                                    </div>
                                    <p className="text-sm text-text-primary">
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
                                <div className="flex items-center gap-2 text-gold-muted text-xs font-semibold uppercase tracking-wider mb-3">
                                    <Package className="h-3.5 w-3.5" /> Items ({selectedOrder.items?.length ?? 0})
                                </div>
                                <div className="space-y-3">
                                    {loadingDetail ? (
                                        <p className="text-sm text-text-muted text-center py-4">Loading items…</p>
                                    ) : (selectedOrder.items ?? []).length === 0 ? (
                                        <p className="text-sm text-text-muted">No items found</p>
                                    ) : (
                                        (selectedOrder.items ?? []).map((item, i) => {
                                            const name = item.product?.product_name ?? item.product_name ?? 'Unknown Product';
                                            const variant = item.variant?.variant_name ?? item.variant?.size_label ?? '';
                                            const brand = item.product?.brand;
                                            const unitPrice = item.unit_price ?? item.price ?? 0;
                                            const lineTotal = item.line_total ?? (unitPrice * item.quantity);
                                            const volume = item.variant?.volume_ml ? `${item.variant.volume_ml}ml` : null;

                                            return (
                                                <div key={item.order_item_id ?? i} className="flex items-start gap-3 py-2 border-b border-border-subtle last:border-0">
                                                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                                                        {item.thumbnail_url ? (
                                                            <img src={item.thumbnail_url} alt={name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="h-4 w-4 text-gold/60" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                                                        {brand && <p className="text-xs text-text-muted">{brand}</p>}
                                                        <div className="flex gap-2 mt-0.5 flex-wrap">
                                                            {variant && <span className="text-xs text-text-muted bg-border/30 px-1.5 py-0.5 rounded">{variant}</span>}
                                                            {volume && <span className="text-xs text-text-muted bg-border/30 px-1.5 py-0.5 rounded">{volume}</span>}
                                                            <span className="text-xs text-text-muted">Qty: {item.quantity}</span>
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
                                    <span className="text-text-primary">{formatINR(selectedOrder.subtotal ?? selectedOrder.total)}</span>
                                </div>
                                {(selectedOrder as OrderDetail).total_tax != null && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-secondary">Tax</span>
                                        <span className="text-text-primary">{formatINR(((selectedOrder as OrderDetail).total_tax) ?? 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t border-border">
                                    <span className="font-serif text-base font-bold text-gold">Grand Total</span>
                                    <span className="font-serif text-base font-bold text-gold">
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

            {/* Refund Modal */}
            {showRefundModal && selectedOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowRefundModal(false)}>
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card-bg-elevated p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-serif text-lg font-bold text-gold-soft mb-1">Initiate Refund</h3>
                        <p className="text-xs text-text-muted mb-4">Order: {selectedOrder.id.slice(0, 8)}… · {formatINR(selectedOrder.total)}</p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Amount (leave blank for full refund)</label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={e => setRefundAmount(e.target.value)}
                                    placeholder="Full refund"
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Reason (optional)</label>
                                <input
                                    type="text"
                                    value={refundReason}
                                    onChange={e => setRefundReason(e.target.value)}
                                    placeholder="Reason for refund"
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-text-secondary hover:bg-border/20 transition-colors"
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
                                        // Refresh refunds
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
                                className="flex-1 rounded-lg bg-warning/90 py-2.5 text-sm font-semibold text-white hover:bg-warning transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
