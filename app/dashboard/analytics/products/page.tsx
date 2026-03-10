'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
    BarChart3,
    TrendingUp,
    ShoppingCart,
    Star,
    Activity,
    AlertCircle,
    ChevronDown,
    Search,
    Download
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import { productAnalyticsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProductAnalyticsDashboard() {
    const { isAuthenticated } = useAdminAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30'); // '7', '30', '90', '365'

    const [overview, setOverview] = useState<any>(null);
    const [topSelling, setTopSelling] = useState<any[]>([]);
    const [lowPerforming, setLowPerforming] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [conversionData, setConversionData] = useState<any[]>([]);
    const [inventoryData, setInventoryData] = useState<any[]>([]);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, dateRange]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const now = new Date();
            const fromDate = new Date();
            fromDate.setDate(now.getDate() - parseInt(dateRange));

            const queryTime = `?date_from=${fromDate.toISOString().split('T')[0]}&date_to=${now.toISOString().split('T')[0]}`;

            const [overviewRes, topSellingRes, lowPerfRes, revRes, convRes, invRes] = await Promise.all([
                productAnalyticsApi.getOverview(queryTime),
                productAnalyticsApi.getTopSelling(`${queryTime}&limit=5`),
                productAnalyticsApi.getLowPerforming(`${queryTime}&limit=5`),
                productAnalyticsApi.getRevenue(queryTime),
                productAnalyticsApi.getConversion(queryTime),
                productAnalyticsApi.getInventory(`${queryTime}&limit=5`)
            ]);

            if (overviewRes.success) setOverview(overviewRes.data);
            if (topSellingRes.success) setTopSelling(topSellingRes.data);
            if (lowPerfRes.success) setLowPerforming(lowPerfRes.data);
            if (revRes.success) {
                // Format dates for charts
                const formatted = revRes.data.map((d: any) => ({
                    ...d,
                    displayDate: new Date(d.recorded_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }));
                setRevenueData(formatted);
            }
            if (convRes.success) {
                const formatted = convRes.data.map((d: any) => ({
                    ...d,
                    displayDate: new Date(d.recorded_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }));
                setConversionData(formatted);
            }
            if (invRes.success) setInventoryData(invRes.data);

        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-IN').format(value);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-48 bg-border-subtle rounded-lg"></div>
                    <div className="h-10 w-32 bg-border-subtle rounded-xl"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card-bg rounded-2xl border border-border-subtle"></div>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-96 bg-card-bg rounded-2xl border border-border-subtle"></div>
                    <div className="h-96 bg-card-bg rounded-2xl border border-border-subtle"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-gold">Product Analytics</h1>
                    <p className="text-sm text-text-muted mt-1">Comprehensive performance tracking across products.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="appearance-none bg-card-bg border border-border-subtle rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-text focus:outline-none focus:border-gold/50 cursor-pointer"
                        >
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="365">Last Year</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-card-bg rounded-2xl p-5 border border-border-subtle relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gold/[0.08] flex items-center justify-center">
                            <Activity className="h-5 w-5 text-gold" />
                        </div>
                        <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-md">Live</span>
                    </div>
                    <p className="text-sm text-text-muted font-medium uppercase tracking-wider mb-1">Total Views</p>
                    <p className="text-2xl font-bold text-text-primary">{formatNumber(overview?.total_views || 0)}</p>
                </div>

                <div className="bg-card-bg rounded-2xl p-5 border border-border-subtle relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-success" />
                        </div>
                    </div>
                    <p className="text-sm text-text-muted font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-text-primary">{formatCurrency(overview?.total_revenue || 0)}</p>
                </div>

                <div className="bg-card-bg rounded-2xl p-5 border border-border-subtle relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-blue-500" />
                        </div>
                        <span className="text-xs font-medium text-text-muted">{formatNumber(overview?.total_orders || 0)} Orders</span>
                    </div>
                    <p className="text-sm text-text-muted font-medium uppercase tracking-wider mb-1">Avg Conversion</p>
                    <p className="text-2xl font-bold text-text-primary">{parseFloat(overview?.avg_conversion_rate || 0).toFixed(2)}%</p>
                </div>

                <div className="bg-card-bg rounded-2xl p-5 border border-border-subtle relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Star className="h-5 w-5 text-primary" />
                        </div>
                    </div>
                    <p className="text-sm text-text-muted font-medium uppercase tracking-wider mb-1">Avg Health Score</p>
                    <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-text-primary">{parseFloat(overview?.avg_health_score || 0).toFixed(1)}</p>
                        <p className="text-sm text-text-muted mb-1">/ 100</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Revenue & Units Chart */}
                <div className="bg-card-bg rounded-2xl border border-border-subtle p-5">
                    <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-6">Revenue & Sales Volume</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C9A86A" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#C9A86A" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="var(--t-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
                                <YAxis yAxisId="left" stroke="var(--t-text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                                <YAxis yAxisId="right" orientation="right" stroke="var(--t-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--t-card-bg)', borderColor: 'var(--t-border)', borderRadius: '8px', color: 'var(--t-text-primary)' }}
                                    formatter={(value: any, name: any) => [
                                        name === 'revenue' ? formatCurrency(value) : value,
                                        name === 'revenue' ? 'Revenue' : 'Units Sold'
                                    ]}
                                    labelStyle={{ color: 'var(--t-text-muted)', marginBottom: '4px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" fill="url(#colorRevenue)" stroke="#C9A86A" strokeWidth={2} name="revenue" />
                                <Bar yAxisId="right" dataKey="units_sold" fill="#4B5563" radius={[4, 4, 0, 0]} barSize={20} name="Units Sold" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-card-bg rounded-2xl border border-border-subtle p-5">
                    <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-6">Conversion Funnel</h2>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={conversionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCarts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--t-border-subtle)" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="var(--t-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
                                <YAxis stroke="var(--t-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--t-card-bg)', borderColor: 'var(--t-border)', borderRadius: '8px', color: 'var(--t-text-primary)' }}
                                    labelStyle={{ color: 'var(--t-text-muted)', marginBottom: '4px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area type="monotone" dataKey="views" stackId="1" stroke="#3B82F6" fill="url(#colorViews)" name="Product Views" />
                                <Area type="monotone" dataKey="add_to_cart" stackId="2" stroke="#8B5CF6" fill="url(#colorCarts)" name="Add to Cart" />
                                <Area type="monotone" dataKey="purchases" stackId="3" stroke="#10B981" fill="#10B981" name="Purchases" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Top Selling */}
                <div className="bg-card-bg rounded-2xl border border-border-subtle overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center bg-page-bg/50">
                        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Top Selling Products</h2>
                    </div>
                    <div className="p-0 overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-muted uppercase bg-page-bg/50 border-b border-border-subtle">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Product</th>
                                    <th className="px-5 py-3 font-medium text-right">Units Sold</th>
                                    <th className="px-5 py-3 font-medium text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topSelling.length > 0 ? topSelling.map((product) => (
                                    <tr key={product.product_id} className="border-b border-border-subtle/50 hover:bg-page-bg/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-page-bg flex-shrink-0 overflow-hidden border border-border-subtle">
                                                    {product.thumbnail ? (
                                                        <img src={product.thumbnail.startsWith('data:') ? product.thumbnail : `${process.env.NEXT_PUBLIC_API_URL}${product.thumbnail}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-text-muted"><Package className="h-4 w-4" /></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-text-primary truncate max-w-[200px]">{product.product_name}</p>
                                                    <p className="text-xs text-text-muted truncate max-w-[200px]">{product.brand}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-text-primary">{formatNumber(product.units_sold)}</td>
                                        <td className="px-5 py-3 text-right text-gold-soft">{formatCurrency(product.revenue)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-8 text-center text-text-muted">No sales data found for this period</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Lowest Performing (Health Score) */}
                <div className="bg-card-bg rounded-2xl border border-border-subtle overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center bg-page-bg/50">
                        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-danger" /> Needs Attention
                        </h2>
                    </div>
                    <div className="p-0 overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-muted uppercase bg-page-bg/50 border-b border-border-subtle">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Product</th>
                                    <th className="px-5 py-3 font-medium text-center">Health Score</th>
                                    <th className="px-5 py-3 font-medium text-right">Conv. Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowPerforming.length > 0 ? lowPerforming.map((product) => (
                                    <tr key={product.product_id} className="border-b border-border-subtle/50 hover:bg-page-bg/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-medium text-text-primary truncate max-w-[220px]">{product.product_name}</p>
                                                    <p className="text-xs text-text-muted truncate max-w-[220px]">{product.brand}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                                                {parseFloat(product.health_score).toFixed(1)}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right text-text-muted">{parseFloat(product.conversion_score).toFixed(1)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-5 py-8 text-center text-text-muted">No underperforming products found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Ignore warning line
const Package = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
