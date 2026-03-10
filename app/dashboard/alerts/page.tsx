'use client';

import React, { useState, useEffect } from 'react';
import { Bell, ShoppingCart, Package, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getOrders, getLowStockProducts, getAdminFeedback, Order, Product } from '@/lib/api';

export default function AlertsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [visibleCount, setVisibleCount] = useState(10); // Simple pagination state

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
    }, []);

    // Flatten all alerts into a single sorted list based on created_at or just order them by category
    const allAlerts = [
        ...orders.map(o => ({ type: 'order', data: o, date: new Date(o.created_at || Date.now()) })),
        ...products.map(p => ({ type: 'product', data: p, date: new Date(p.created_at || Date.now()) })),
        ...enquiries.map(e => ({ type: 'enquiry', data: e, date: new Date(e.created_at || Date.now()) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/20 border border-gold/10">
                    <Bell className="h-6 w-6 text-gold" />
                </div>
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft tracking-wide">System Alerts</h1>
                    <p className="mt-1 text-sm text-text-secondary">Stay updated with your latest alerts and activities. You have {allAlerts.length} total active alerts.</p>
                </div>
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
                                <Link href={`/dashboard/orders/${order.order_id || order.id}`} key={`order-${idx}`}>
                                    <div className="p-5 flex gap-4 hover:bg-gold/[0.02] transition-colors cursor-pointer group">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                            <ShoppingCart className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-text-primary">Order Management</h3>
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">New Order</span>
                                            </div>
                                            <p className="text-sm text-text-secondary mt-1">
                                                Pending Order <span className="text-gold font-medium">#{order.order_id?.slice(0, 8).toUpperCase() || order.id?.slice(0, 8).toUpperCase()}</span> from {order.customer_name} requires fulfillment.
                                            </p>
                                            <p className="text-xs text-text-muted mt-2">{alert.date.toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        } else if (alert.type === 'product') {
                            const product = alert.data as Product;
                            return (
                                <Link href={`/dashboard/products/edit/${product.slug || product.product_id}`} key={`product-${idx}`}>
                                    <div className="p-5 flex gap-4 hover:bg-gold/[0.02] transition-colors cursor-pointer group">
                                        <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-text-primary">Product Management</h3>
                                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">Low Stock</span>
                                            </div>
                                            <p className="text-sm text-text-secondary mt-1">
                                                <span className="text-gold font-medium">{product.product_name}</span> is running low on stock ({product.stock_quantity ?? 0} remaining). Consider restocking soon.
                                            </p>
                                            <p className="text-xs text-text-muted mt-2">{alert.date.toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        } else {
                            const enquiry = alert.data as any;
                            return (
                                <div key={`enquiry-${idx}`} className="p-5 flex gap-4 hover:bg-gold/[0.02] transition-colors cursor-default group">
                                    <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-text-primary">Customer Enquiries</h3>
                                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-medium">New Enquiry</span>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-1">
                                            A new customer question was submitted via contact form: <span className="italic">"{enquiry.subject || enquiry.message?.slice(0, 40) + '...'}"</span>
                                        </p>
                                        <p className="text-xs text-text-muted mt-2">{alert.date.toLocaleDateString()}</p>
                                    </div>
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
