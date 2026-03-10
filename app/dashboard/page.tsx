'use client';

import { useState, useEffect, useCallback } from 'react';
import { getProducts, Product } from '@/lib/api';
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

// ─── INR Formatter ──────────────────────────────────────────────────
function formatINR(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
}

export default function DashboardPage() {
    const [products, setProducts] = useState<Product[]>([]);
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
            getProducts(),   // still needed for Recent Products list
        ]).then(([summaryRes, salesRes, paymentRes, prods]) => {
            setSummary(summaryRes);
            setSalesData(salesRes);
            setPaymentData(paymentRes);
            setProducts(prods);
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
    const breakdownColors = ['bg-gold', 'bg-primary-light', 'bg-plum', 'bg-info'];
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
            {/* Header Banner */}
            <div className="animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <DashboardHeader icon={Sparkles} />
            </div>

            {/* Stats */}
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

            {/* Recent Products */}
            <div className="grid gap-6 lg:grid-cols-1">
                <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated animate-fadeInUp" style={{ animationDelay: '560ms' }}>
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <h2 className="font-serif text-base font-semibold text-gold-soft">Recent Products</h2>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/products" className="text-xs font-medium text-gold-muted hover:text-gold transition-colors duration-300">
                                View All →
                            </Link>
                            <Link
                                href="/dashboard/products/add"
                                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300"
                            >
                                <Plus className="h-3 w-3" /> Add
                            </Link>
                        </div>
                    </div>
                    <div className="divide-y divide-border-subtle">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="h-10 w-10 rounded-xl animate-shimmer flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-32 rounded animate-shimmer" />
                                        <div className="h-3 w-20 rounded animate-shimmer" />
                                    </div>
                                </div>
                            ))
                        ) : products.length === 0 ? (
                            <div className="px-5 py-12 text-center">
                                <p className="text-sm text-text-muted mb-3">No products yet</p>
                                <Link
                                    href="/dashboard/products/add"
                                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300"
                                >
                                    <Plus className="h-4 w-4" /> Add First Product
                                </Link>
                            </div>
                        ) : (
                            products.slice(0, 5).map(product => (
                                <Link
                                    key={product.product_id}
                                    href={`/dashboard/products/edit/${product.slug || product.product_id}`}
                                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gold/[0.03] transition-all duration-300 group"
                                >
                                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-primary/20 border border-primary/15 flex items-center justify-center">
                                        {product.images && product.images.length > 0 ? (
                                            <img
                                                src={product.images[0]}
                                                alt={product.product_name}
                                                className="h-10 w-10 rounded-xl object-cover"
                                            />
                                        ) : (
                                            <span className="text-lg">🍷</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary truncate group-hover:text-gold transition-colors duration-300">
                                            {product.product_name}
                                        </p>
                                        <p className="text-xs text-text-muted">{product.sku}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gold">
                                            {formatINR(product.price ?? 0)}
                                        </p>
                                        <ArrowUpRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
