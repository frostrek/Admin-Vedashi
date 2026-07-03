'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProducts, getOrders, Product, Order } from '@/lib/api';
import { getAnalyticsSummary, getSalesOverview, getPaymentBreakdown } from '@/lib/api/analytics';
import type { AnalyticsSummary, SalesDataPoint, PaymentBreakdown } from '@/lib/api/analytics';
import Link from 'next/link';
import {
    Package, ShoppingCart, Tag, TrendingUp, Plus, ArrowUpRight, Sparkles,
} from 'lucide-react';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import SalesChart from '@/components/dashboard/SalesChart';
import RevenueBreakdown from '@/components/dashboard/RevenueBreakdown';

// ─── USD Formatter ──────────────────────────────────────────────────
function formatUSD(amount: number): string {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const formatINR = formatUSD; // backward compat alias

export default function DashboardPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
    const [paymentData, setPaymentData] = useState<PaymentBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);

    // ─── Initial Load ───────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            getAnalyticsSummary(),
            getSalesOverview('monthly'),
            getPaymentBreakdown(),
            getProducts(),   // for internal logic if needed
            getOrders(),      // for recent fulfillments
        ]).then(([summaryRes, salesRes, paymentRes, prods, ords]) => {
            setSummary(summaryRes);
            setSalesData(salesRes);
            setPaymentData(paymentRes);
            setProducts(prods);
            setRecentOrders(ords.slice(0, 5));
            setLoading(false);
        });
    }, []);

    // ─── Period Toggle Handler ──────────────────────────────────────
    const handlePeriodChange = useCallback(async (period: string) => {
        const range = period.toLowerCase() as 'daily' | 'weekly' | 'monthly';
        setChartLoading(true);
        const data = await getSalesOverview(range);
        setSalesData(data);
        setChartLoading(false);
    }, []);

    // ─── Stats Cards ────────────────────────────────────────────────
    const stats = [
        {
            title: 'Total Sales',
            value: loading || !summary ? '—' : formatINR(summary.total_sales),
            change: summary?.sales_growth,
            icon: TrendingUp,
            color: 'bg-primary',
            href: '/dashboard/orders',
        },
        {
            title: 'Total Orders',
            value: loading || !summary ? '—' : summary.total_orders,
            change: summary?.orders_growth,
            icon: ShoppingCart,
            color: 'bg-primary',
            href: '/dashboard/orders',
        },
        {
            title: 'Total Products',
            value: loading || !summary ? '—' : summary.total_products,
            icon: Package,
            color: 'bg-primary',
            href: '/dashboard/products',
        },
        {
            title: 'Categories',
            value: loading || !summary ? '—' : summary.total_categories,
            icon: Tag,
            color: 'bg-primary',
            href: '/dashboard/categories',
        },
    ];

    // ─── Chart Data (map to { label, value }) ───────────────────────
    const chartData = salesData.map(d => ({ label: d.label, value: d.total_sales }));

    // ─── Revenue Breakdown (map to component format) ────────────────
    const breakdownColors = ['bg-[#828B5C]', 'bg-[#3B5D3B]', 'bg-[#A89880]', 'bg-info'];
    const revenueItems = paymentData
        ? paymentData.items.map((item, i) => ({
            label: item.label,
            value: item.amount,
            color: breakdownColors[i % breakdownColors.length],
        }))
        : [];

    // ─── Order status badge ─────────────────────────────────────────
    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-success/15 text-success';
            case 'shipped': return 'bg-info/15 text-info';
            case 'delivered': return 'bg-gold/15 text-gold';
            case 'pending': return 'bg-warning/15 text-warning';
            default: return 'bg-danger/15 text-danger';
        }
    };

    return (
        <div className="space-y-6">
            {/* Command Center Header */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <DashboardHeader 
                    title="Command Center"
                    subtitle="Synthesizing ancient wisdom for 5+ active patient protocols."
                    icon={Sparkles}
                />
            </div>

            {/* Stats - Apothecary & Formulae */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <div
                        key={stat.title}
                        className="animate-fadeInUp"
                        style={{ animationDelay: `${(i + 1) * 80}ms` }}
                    >
                        <StatCard
                            title={stat.title}
                            value={stat.value}
                            change={stat.change}
                            icon={stat.icon}
                            color={stat.color}
                            href={stat.href}
                            loading={loading}
                        />
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,380px)]">
                <div className="animate-fadeInUp" style={{ animationDelay: '400ms' }}>
                    <SalesChart
                        data={chartData}
                        loading={loading || chartLoading}
                        onPeriodChange={handlePeriodChange}
                    />
                </div>
                <div className="animate-fadeInUp" style={{ animationDelay: '480ms' }}>
                    <RevenueBreakdown
                        total={paymentData?.total ?? 0}
                        items={revenueItems}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Recent Fulfillment - Semantic Rebranding */}
            <div className="grid gap-6 lg:grid-cols-1">
                <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated animate-fadeInUp shadow-xl transition-all duration-500" style={{ animationDelay: '560ms' }}>
                    <div className="flex items-center justify-between border-b border-border px-6 py-5">
                        <div>
                            <h4 className="font-serif text-base font-bold text-gold">Recent Fulfillment</h4>
                            <p className="text-[12px] text-text-muted font-bold uppercase mt-1">Real-time protocol logistics and dispatch</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/orders" className="text-[11px] font-bold uppercase text-gold-soft hover:text-gold transition-colors duration-300">
                                View Archive →
                            </Link>
                        </div>
                    </div>
                    
                    {/* Header Row for Semantic Labels */}
                    <div className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr] px-6 py-3 border-b border-border bg-primary/5">
                        <span className="text-[10px] font-bold uppercase text-text-muted">Protocol ID</span>
                        <span className="text-[10px] font-bold uppercase text-text-muted">Patient</span>
                        <span className="text-[10px] font-bold uppercase text-text-muted">Formula</span>
                        <span className="text-[10px] font-bold uppercase text-text-muted">Status</span>
                        <span className="text-[10px] font-bold uppercase text-text-muted text-right">Value</span>
                    </div>

                    <div className="divide-y divide-border-subtle">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-6 py-4">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-32 rounded bg-primary/10 animate-pulse" />
                                        <div className="h-3 w-20 rounded bg-primary/10 animate-pulse" />
                                    </div>
                                </div>
                            ))
                        ) : recentOrders.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <p className="text-sm text-text-muted italic mb-4">No active protocols detected</p>
                                <Link
                                    href="/dashboard/orders"
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase text-gold hover:bg-primary-light transition-all duration-300"
                                >
                                    <ShoppingCart className="h-4 w-4" /> View Archives
                                </Link>
                            </div>
                        ) : (
                            recentOrders.map((order, i) => (
                                <Link
                                    key={order.id}
                                    href="/dashboard/orders"
                                    className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr] items-center px-6 py-4 hover:bg-primary/10 transition-all duration-300 group"
                                >
                                    <span className="text-xs font-mono text-text-muted">#ORD-{order.id.toString().slice(-4)}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-text-primary truncate group-hover:text-gold transition-colors duration-300">
                                                {order.customer_name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-text-secondary italic truncate">
                                            {order.items?.length > 0 ? (order.items[0].product_name || 'Protocol Essence') : 'Generic Formula'}
                                            {order.items?.length > 1 ? ` (+${order.items.length - 1} more)` : ''}
                                        </p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${getStatusClasses(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gold">
                                            {formatINR(order.total ?? 0)}
                                        </p>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
