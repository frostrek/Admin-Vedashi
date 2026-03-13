'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    getCustomerDetail, getOrders, formatINR, Customer, Order, updateCustomerStatus
} from '@/lib/api';
import { 
    User, Mail, Calendar, MapPin, ShoppingBag, CreditCard, 
    ChevronLeft, ArrowUpRight, Clock, Shield, CheckCircle2, 
    XCircle, AlertTriangle, UserX, Loader2, IndianRupee, Hash,
    Ban, ShieldAlert, Phone, Eye
} from 'lucide-react';

interface OrderDetail extends Order {
    shipping_address?: {
        address_line1?: string;
        address_line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
    };
}

export default function CustomerDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<OrderDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = () => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            getCustomerDetail(id as string),
            getOrders()
        ]).then(([custData, allOrders]) => {
            if (custData) {
                setCustomer(custData);
                // Filter orders for this customer email
                const customerOrders = allOrders.filter(o => 
                    o.customer_email.toLowerCase() === custData.email.toLowerCase()
                ) as OrderDetail[];
                setOrders(customerOrders.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
            } else {
                router.push('/dashboard/customers');
            }
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [id, router]);

    const handleUpdateStatus = async (updates: Partial<Pick<Customer, 'is_suspended' | 'is_banned'>>) => {
        if (!id) return;
        const confirmMsg = updates.is_banned !== undefined 
            ? `Are you sure you want to ${updates.is_banned ? 'BAN' : 'UNBAN'} this account?`
            : `Are you sure you want to ${updates.is_suspended ? 'SUSPEND' : 'UNSUSPEND'} this account?`;
        
        if (!confirm(confirmMsg)) return;

        setActionLoading(true);
        const success = await updateCustomerStatus(id as string, updates);
        if (success) {
            // Refresh patient data
            const freshData = await getCustomerDetail(id as string);
            if (freshData) setCustomer(freshData);
        } else {
            alert('Failed to update account status. Please try again.');
        }
        setActionLoading(false);
    };

    const stats = useMemo(() => {
        const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalOrders = orders.length;
        const aov = totalOrders > 0 ? totalSpent / totalOrders : 0;
        
        // Find latest shipping address
        const latestOrderWithAddress = orders.find(o => o.shipping_address);
        const latestAddress = latestOrderWithAddress?.shipping_address;

        return {
            totalSpent,
            totalOrders,
            aov,
            latestAddress: latestAddress ? 
                [latestAddress.address_line1, latestAddress.address_line2, latestAddress.city, latestAddress.state, latestAddress.pincode].filter(Boolean).join(', ') : 
                'No address on file'
        };
    }, [orders]);

    const statusBadge = (cust: Customer) => {
        if (cust.is_banned) return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-danger/15 text-danger"><XCircle className="h-3.5 w-3.5" />Banned</span>;
        if (cust.is_suspended) return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-warning/15 text-warning"><AlertTriangle className="h-3.5 w-3.5" />Suspended</span>;
        if (cust.is_deleted) return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-text-muted/15 text-text-muted"><UserX className="h-3.5 w-3.5" />Deleted</span>;
        if (!cust.is_active) return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-text-muted/15 text-text-muted"><XCircle className="h-3.5 w-3.5" />Inactive</span>;
        return <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-success/15 text-success"><CheckCircle2 className="h-3.5 w-3.5" />Active</span>;
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
        );
    }

    if (!customer) return null;

    return (
        <div className="max-w-7xl mx-auto pb-12 animate-fadeIn">
            {/* Breadcrumbs & Actions */}
            <div className="mb-8 flex items-center justify-between">
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-text-muted hover:text-gold transition-colors duration-300"
                >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="text-sm font-medium">Back to Customers</span>
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleUpdateStatus({ is_suspended: !customer.is_suspended })}
                        disabled={actionLoading}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-300 disabled:opacity-50 ${
                            customer.is_suspended 
                            ? 'border-success/30 bg-success/10 text-success hover:bg-success/20' 
                            : 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/20'
                        }`}
                    >
                        <ShieldAlert className="h-4 w-4" /> 
                        {customer.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button
                        onClick={() => handleUpdateStatus({ is_banned: !customer.is_banned })}
                        disabled={actionLoading}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-300 disabled:opacity-50 ${
                            customer.is_banned 
                            ? 'border-success/30 bg-success/10 text-success hover:bg-success/20' 
                            : 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/20'
                        }`}
                    >
                        <Ban className="h-4 w-4" /> 
                        {customer.is_banned ? 'Unban Account' : 'Ban Account'}
                    </button>
                    <a 
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${customer.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-gold/20 bg-gradient-to-r from-primary to-primary-light px-5 py-2.5 text-sm font-semibold text-card-bg hover:border-gold/40 transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                        <Mail className="h-4 w-4" /> Send Message
                    </a>
                </div>
            </div>

            {/* Header Profile Section */}
            <div className="mb-8 p-8 rounded-2xl border border-border bg-card-bg shadow-sm relative overflow-hidden">
                {/* Subtle gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/40 via-primary/40 to-gold/40"></div>
                
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-gold/10 border-2 border-gold/20 flex items-center justify-center text-gold text-3xl font-serif shadow-sm">
                        {customer.full_name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="font-serif text-3xl font-bold text-text-primary mb-2">{customer.full_name || 'Anonymous Customer'}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-5 text-text-secondary text-sm">
                            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-gold-muted" /> {customer.email}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-gold-muted" /> Joined {new Date(customer.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-gold-muted" /> 
                                Last Active: {customer.last_login_at || customer.updated_at 
                                    ? new Date(customer.last_login_at || customer.updated_at!).toLocaleString() 
                                    : 'Never'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-3">
                        {statusBadge(customer)}
                        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest select-all">{customer.customer_id}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Personal Info & Address */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Personal Details */}
                    <div className="p-6 rounded-2xl border border-border bg-card-bg shadow-sm hover-lift">
                        <h3 className="font-serif text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gold/10">
                                <User className="h-4 w-4 text-gold" />
                            </div>
                            Personal Identity
                        </h3>
                        <div className="space-y-5">
                            <div className="group">
                                <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1.5">Customer Name</p>
                                <p className="text-sm font-medium text-text-primary">{customer.full_name || 'N/A'}</p>
                            </div>
                            <div className="h-px bg-border-subtle"></div>
                            <div className="group">
                                <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1.5">Email Address</p>
                                <p className="text-sm font-medium text-text-primary">{customer.email}</p>
                            </div>
                            <div className="h-px bg-border-subtle"></div>
                            <div className="group">
                                <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1.5">Phone Number</p>
                                <p className="text-sm font-medium text-text-primary">{customer.phone || 'Not Provided'}</p>
                            </div>
                            <div className="h-px bg-border-subtle"></div>
                            <div className="group">
                                <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1.5">Customer ID</p>
                                <p className="text-xs font-mono text-text-muted select-all">{customer.customer_id}</p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="p-6 rounded-2xl border border-border bg-card-bg shadow-sm hover-lift">
                        <h3 className="font-serif text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gold/10">
                                <MapPin className="h-4 w-4 text-gold" />
                            </div>
                            Shipping Registry
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-3 items-start">
                                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 h-min mt-0.5">
                                    <MapPin className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1.5">Latest Order Address</p>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        {stats.latestAddress}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Statistics & Order History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Vital Financial Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-6 rounded-2xl border border-border bg-card-bg shadow-sm hover-lift group">
                            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success mb-4 group-hover:scale-110 transition-transform">
                                <IndianRupee className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1">Lifetime Spend</p>
                            <p className="text-2xl font-serif font-bold text-text-primary">{formatINR(stats.totalSpent)}</p>
                        </div>
                        <div className="p-6 rounded-2xl border border-border bg-card-bg shadow-sm hover-lift group">
                            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold mb-4 group-hover:scale-110 transition-transform">
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1">Total Orders</p>
                            <p className="text-2xl font-serif font-bold text-text-primary">{stats.totalOrders}</p>
                        </div>
                        <div className="p-6 rounded-2xl border border-border bg-card-bg shadow-sm hover-lift group">
                            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info mb-4 group-hover:scale-110 transition-transform">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-bold text-gold-muted uppercase tracking-widest mb-1">Avg. Order Value</p>
                            <p className="text-2xl font-serif font-bold text-text-primary">{formatINR(stats.aov)}</p>
                        </div>
                    </div>

                    {/* Order History Table */}
                    <div className="rounded-2xl border border-border bg-card-bg shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-gold/10">
                                    <Clock className="h-4 w-4 text-gold" />
                                </div>
                                Fulfillment History
                            </h3>
                            <span className="text-xs font-medium text-text-muted bg-page-bg px-3 py-1.5 rounded-full border border-border-subtle">{orders.length} transactions</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-primary/5 border-b border-border-subtle">
                                        <th className="px-6 py-4 text-xs font-bold text-gold-muted uppercase tracking-wider">Order ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gold-muted uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gold-muted uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gold-muted uppercase tracking-wider text-right">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gold-muted uppercase tracking-wider text-right">View</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center text-text-muted text-sm">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-page-bg border border-border-subtle flex items-center justify-center">
                                                        <ShoppingBag className="h-6 w-6 text-text-muted/40" />
                                                    </div>
                                                    <p>No fulfillment records found for this customer.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map(order => (
                                            <tr key={order.id} className="hover:bg-primary/[0.03] transition-colors duration-200">
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono text-text-primary font-medium">#{order.id.slice(0, 8)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-text-secondary">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                                        order.status === 'delivered' ? 'bg-success/15 text-success' :
                                                        order.status === 'cancelled' ? 'bg-danger/15 text-danger' :
                                                        'bg-warning/15 text-warning'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                                                    {formatINR(order.total)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link 
                                                        href="/dashboard/orders" 
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:text-gold-soft transition-colors duration-200"
                                                    >
                                                        Details <ArrowUpRight className="h-3 w-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
