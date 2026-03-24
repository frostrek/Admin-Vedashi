'use client';

import React, { useState, useEffect } from 'react';
import { Bell, ShoppingCart, Package, Users, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getOrders, getLowStockProducts, getAdminFeedback, updateFeedbackStatus, Order, Product } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AlertsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const [visibleCount, setVisibleCount] = useState(10); // Simple pagination states

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                setLoading(true);
                const [ordersData, stockData, feedbackData] = await Promise.all([
                    getOrders(),
                    getLowStockProducts(),
                    getAdminFeedback({ status: 'new' })
                ]);

                setOrders(ordersData.filter(o => o.status === 'pending'));
                setProducts(stockData);
                setEnquiries(feedbackData.feedback || []);
            } catch (error) {
                console.error('Failed to load alerts:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
        
        // Load dismissed IDs from localStorage
        const saved = typeof window !== 'undefined' ? localStorage.getItem('dismissed_alerts') : null;
        if (saved) {
            try {
                setDismissedIds(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse dismissed alerts", e);
            }
        }
    }, []);

    const handleMarkAsRead = async (id: string, type: 'order' | 'product' | 'enquiry') => {
        try {
            if (type === 'enquiry') {
                const res = await updateFeedbackStatus(id, 'read');
                if (res.success) {
                    setEnquiries(prev => prev.filter(e => (e.feedback_id || e.id) !== id));
                    toast.success('Enquiry marked as read');
                } else {
                    toast.error(res.message || 'Failed to update enquiry');
                }
            } else {
                const next = [...dismissedIds, id];
                setDismissedIds(next);
                localStorage.setItem('dismissed_alerts', JSON.stringify(next));
                toast.success('Alert dismissed');
            }
        } catch (error) {
            toast.error('An error occurred');
        }
    };

    const handleMarkAllAsRead = async () => {
        const loadingToast = toast.loading('Marking all as read...');
        try {
            // Mark all enquiries as read via API
            const enquiryPromises = enquiries.map(e => updateFeedbackStatus(e.feedback_id || e.id, 'read'));
            await Promise.all(enquiryPromises);
            setEnquiries([]);

            // Dismiss all orders and products via localStorage
            const orderIds = orders.map(o => o.order_id || o.id);
            const productIds = products.map(p => p.product_id);
            const next = Array.from(new Set([...dismissedIds, ...orderIds, ...productIds]));
            
            setDismissedIds(next);
            localStorage.setItem('dismissed_alerts', JSON.stringify(next));
            
            toast.dismiss(loadingToast);
            toast.success('All alerts marked as read');
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('Failed to mark all as read');
        }
    };

    // Flatten all alerts into a single sorted list
    const allAlerts = [
        ...orders.map(o => ({ 
            id: o.order_id || o.id, 
            type: 'order', 
            data: o, 
            date: new Date(o.created_at || Date.now()) 
        })),
        ...products.map(p => ({ 
            id: (p as any).variant_id || p.product_id, 
            type: 'product', 
            data: p, 
            date: new Date(p.created_at || Date.now()) 
        })),
        ...enquiries.map(e => ({ 
            id: e.feedback_id || e.id, 
            type: 'enquiry', 
            data: e, 
            date: new Date(e.created_at || Date.now()) 
        }))
    ].filter(a => !dismissedIds.includes(a.id))
     .sort((a, b) => b.date.getTime() - a.date.getTime());

    const visibleAlerts = allAlerts.slice(0, visibleCount);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#36453A] to-[#4A5D4D] shadow-lg shadow-black/20 border border-gold/10">
                    <Bell className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1">
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">System Alerts</h1>
                    <p className="mt-1 text-[15px] font-semibold text-brown italic">Stay updated with your latest alerts and activities. You have {allAlerts.length} total active alerts.</p>
                </div>
                {allAlerts.length > 0 && (
                    <button 
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold text-xs font-bold transition-all border border-gold/20"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark All as Read
                    </button>
                )}
            </div>

            <div className="rounded-2xl border border-border bg-card-bg-elevated shadow-lg overflow-hidden divide-y divide-border-subtle">
                {visibleAlerts.length === 0 ? (
                    <div className="p-8 text-center text-text-muted">
                        No active alerts at this time.
                    </div>
                ) : (
                    visibleAlerts.map((alert, idx) => {
                        if (alert.type === 'order') {
                            const order = alert.data as Order;
                            return (
                                <div key={`${alert.type}-${alert.id}`} className="p-5 flex gap-4 hover:bg-gold/[0.02] transition-colors group relative">
                                    <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <ShoppingCart className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-serif text-sm font-semibold text-text-primary">Order Management</h4>
                                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">New Order</span>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-1">
                                            Pending Order <Link href={`/dashboard/orders/${order.order_id || order.id}`} className="text-gold font-medium hover:underline">#{order.order_id?.slice(0, 8).toUpperCase() || order.id?.slice(0, 8).toUpperCase()}</Link> from {order.customer_name} requires fulfillment.
                                        </p>
                                        <p className="text-xs text-text-muted mt-2">{alert.date.toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); handleMarkAsRead(alert.id, 'order'); }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-red-400 transition-all self-center"
                                        title="Dismiss Alert"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        } else if (alert.type === 'product') {
                            const product = alert.data as Product;
                            return (
                                <div key={`${alert.type}-${alert.id}`} className="p-5 flex gap-4 hover:bg-gold/[0.02] transition-colors group relative">
                                    <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-serif text-sm font-semibold text-text-primary">Product Management</h4>
                                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">Low Stock</span>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-1">
                                            <Link href={`/dashboard/products/edit/${product.slug || product.product_id}`} className="text-gold font-medium hover:underline">{product.product_name}</Link>{(product as any).variant_name ? ` (${(product as any).variant_name})` : ''} is running low on stock ({product.stock_quantity ?? 0} remaining). Consider restocking soon.
                                        </p>
                                        <p className="text-xs text-text-muted mt-2">{alert.date.toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); handleMarkAsRead(alert.id, 'product'); }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-red-400 transition-all self-center"
                                        title="Dismiss Alert"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        } else {
                            const enquiry = alert.data as any;
                            return (
                                <div key={`${alert.type}-${alert.id}`} className="p-5 flex gap-4 hover:bg-gold/[0.02] transition-colors cursor-default group relative">
                                    <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-serif text-sm font-semibold text-text-primary">Customer Enquiries</h4>
                                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">New Enquiry</span>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-1">
                                            A new customer question was submitted via contact form: <span className="italic">"{enquiry.subject || enquiry.message?.slice(0, 40) + '...'}"</span>
                                        </p>
                                        <p className="text-xs text-text-muted mt-2">{alert.date.toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); handleMarkAsRead(alert.id, 'enquiry'); }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-green-400 transition-all self-center"
                                        title="Mark as Read"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        }
                    })
                )}
            </div>

            {visibleCount < allAlerts.length && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={() => setVisibleCount(v => v + 10)}
                        className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light border-none shadow-lg shadow-black/20 text-sm font-semibold text-[#E8D8B9] transition-all hover:scale-[1.02]"
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
}
