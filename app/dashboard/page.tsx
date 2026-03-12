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
                    buttonLabel="Export Ledger"
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
                <div className="rounded-2xl border border-emerald-900/10 bg-white animate-fadeInUp shadow-xl" style={{ animationDelay: '560ms' }}>
                    <div className="flex items-center justify-between border-b border-emerald-900/5 px-6 py-5">
                        <div>
                            <h2 className="font-serif text-base font-bold text-emerald-950 tracking-widest uppercase">Recent Fulfillment</h2>
                            <p className="text-[10px] text-emerald-900/40 uppercase tracking-widest mt-1">Real-time protocol logistics and dispatch</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard/orders" className="text-[11px] font-bold uppercase tracking-wider text-emerald-900/60 hover:text-emerald-900 transition-colors duration-300">
                                View Archive →
                            </Link>
                        </div>
                    </div>
                    
                    {/* Header Row for Semantic Labels */}
                    <div className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr] px-6 py-3 border-b border-emerald-900/5 bg-emerald-900/[0.02]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/40">Protocol ID</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/40">Patient</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/40">Formula</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900/40">Status</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-950/40 text-right">Value</span>
                    </div>

                    <div className="divide-y divide-emerald-900/5">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-6 py-4">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-900/5 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-32 rounded bg-emerald-900/5 animate-pulse" />
                                        <div className="h-3 w-20 rounded bg-emerald-900/5 animate-pulse" />
                                    </div>
                                </div>
                            ))
                        ) : products.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <p className="text-sm text-white/30 italic mb-4">No active protocols detected</p>
                                <Link
                                    href="/dashboard/products/add"
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#828B5C] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-emerald-700 transition-all duration-300"
                                >
                                    <Plus className="h-4 w-4" /> Initialize Protocol
                                </Link>
                            </div>
                        ) : (
                            products.slice(0, 5).map((product, i) => (
                                <Link
                                    key={product.product_id}
                                    href={`/dashboard/products/edit/${product.slug || product.product_id}`}
                                    className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr] items-center px-6 py-4 hover:bg-emerald-900/[0.02] transition-all duration-300 group"
                                >
                                    <span className="text-xs font-mono text-emerald-900/30">#PR-{product.product_id.toString().slice(-4)}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-emerald-950 truncate group-hover:text-emerald-700 transition-colors duration-300">
                                                —
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-emerald-900/60 italic truncate">
                                            {product.product_name}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-emerald-900/5 border border-emerald-900/10 text-emerald-900/40">
                                            Active
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-emerald-950 tracking-tight">
                                            {formatINR(product.price ?? 0)}
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
