'use client';

import { useState, useEffect } from 'react';
import { getSearchAnalytics, SearchDashboardStats } from '@/lib/api';
import {
    Search, AlertCircle, Calendar, ArrowRight, Loader2,
    TrendingUp, Activity, Eye, Zap, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SearchAnalyticsPage() {
    const [stats, setStats] = useState<SearchDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        const data = await getSearchAnalytics(days);
        setStats(data);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-primary/20 flex items-center justify-center">
                        <Loader2 className="w-7 h-7 animate-spin text-gold" />
                    </div>
                </div>
                <p className="text-sm text-text-muted animate-pulse">Loading analytics...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-danger/10 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-danger" />
                </div>
                <p className="text-text-muted">Failed to load analytics data.</p>
                <button onClick={() => loadData()} className="mt-4 text-sm text-gold hover:text-gold-soft transition-colors">
                    Try again
                </button>
            </div>
        );
    }

    const zeroResultCount = stats.zero_results.reduce((a, b) => a + b.count, 0);
    const zeroPercent = stats.total_searches > 0
        ? ((zeroResultCount / stats.total_searches) * 100).toFixed(1)
        : '0';
    const avgDaily = stats.daily_volume.length > 0
        ? Math.round(stats.total_searches / stats.daily_volume.length)
        : 0;

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Search Analytics</h1>
                    <p className="text-sm text-text-muted mt-1">Monitor how customers search your store.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-gold hover:bg-gold/[0.06] border border-border transition-all duration-300"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <div className="flex items-center rounded-xl border border-border bg-card-bg p-1 gap-0.5">
                        {[7, 30, 90].map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${days === d
                                    ? 'bg-gradient-to-r from-primary to-primary-light text-[#E8D8B9] shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                                    }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Searches */}
                <div className="group rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 hover:border-gold/20 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                            <Search className="w-5 h-5 text-blue-400" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-text-muted/40 group-hover:text-gold/60 transition-colors" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Total Searches</p>
                    <p className="text-3xl font-bold text-text-primary tabular-nums">{stats.total_searches.toLocaleString()}</p>
                </div>

                {/* Daily Average */}
                <div className="group rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 hover:border-gold/20 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-emerald-400" />
                        </div>
                        <Zap className="w-4 h-4 text-text-muted/40 group-hover:text-gold/60 transition-colors" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Daily Average</p>
                    <p className="text-3xl font-bold text-text-primary tabular-nums">{avgDaily.toLocaleString()}</p>
                </div>

                {/* Zero Results */}
                <div className="group rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 hover:border-gold/20 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                        </div>
                        <Eye className="w-4 h-4 text-text-muted/40 group-hover:text-gold/60 transition-colors" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Zero Results</p>
                    <p className="text-3xl font-bold text-text-primary tabular-nums">{zeroPercent}<span className="text-lg text-text-muted ml-0.5">%</span></p>
                </div>

                {/* Date Range */}
                <div className="group rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 hover:border-gold/20 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Period</p>
                    <p className="text-xl font-bold text-text-primary">Last {stats.period_days} Days</p>
                </div>
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Searches */}
                <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                    <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gold" />
                        <h3 className="font-serif text-sm font-semibold text-text-primary">Top Searched Terms</h3>
                        {stats.top_searches.length > 0 && (
                            <span className="ml-auto text-[10px] text-text-muted bg-page-bg rounded-full px-2 py-0.5">
                                {stats.top_searches.length} terms
                            </span>
                        )}
                    </div>
                    <div>
                        {stats.top_searches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                                <Search className="w-8 h-8 mb-3 opacity-30" />
                                <p className="text-sm">No search data yet</p>
                                <p className="text-xs mt-1 opacity-60">Data appears as customers search the storefront</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-subtle">
                                {stats.top_searches.map((item, i) => {
                                    const maxCount = Math.max(...stats.top_searches.map(s => s.count), 1);
                                    const width = Math.max((item.count / maxCount) * 100, 8);
                                    return (
                                        <div key={i} className="px-5 py-3 hover:bg-gold/[0.03] transition-colors group">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-md bg-gold/10 text-gold text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                                    {item.query}
                                                </span>
                                                <div className="flex items-center gap-3 text-xs text-text-muted">
                                                    <span className="tabular-nums font-mono">{item.count}×</span>
                                                    <span className="text-text-muted/50">avg {item.avgResults} results</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-border-subtle overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-700"
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Zero Result Searches */}
                <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                    <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <h3 className="font-serif text-sm font-semibold text-text-primary">Zero-Result Searches</h3>
                        {stats.zero_results.length > 0 && (
                            <span className="ml-auto text-[10px] text-rose-400 bg-rose-500/10 rounded-full px-2 py-0.5">
                                {stats.zero_results.length} terms
                            </span>
                        )}
                    </div>
                    <div>
                        {stats.zero_results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                                    <Zap className="w-5 h-5 text-emerald-400" />
                                </div>
                                <p className="text-sm font-medium text-emerald-400">All clear!</p>
                                <p className="text-xs mt-1 opacity-60">No zero-result searches in this period</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-subtle">
                                {stats.zero_results.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gold/[0.03] transition-colors">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                            <span className="text-sm font-medium text-text-primary">{item.query}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-text-muted tabular-nums font-mono">{item.count}×</span>
                                            <a
                                                href="/dashboard/search/synonyms"
                                                className="flex items-center gap-1 text-[11px] font-semibold text-gold hover:text-gold-soft transition-colors"
                                            >
                                                Add Synonym <ArrowRight className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Search Volume Chart ── */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gold" />
                        <h3 className="font-serif text-sm font-semibold text-text-primary">Search Volume</h3>
                        <span className="text-[10px] text-text-muted">(Last {stats.period_days} days)</span>
                    </div>
                    {stats.daily_volume.length > 0 && (
                        <span className="text-xs text-text-muted">
                            Peak: {Math.max(...stats.daily_volume.map(d => d.count))} searches/day
                        </span>
                    )}
                </div>
                <div className="h-72 w-full mt-4">
                    {stats.daily_volume.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-text-muted border border-dashed border-border-subtle rounded-xl">
                            <Activity className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm">No volume data yet</p>
                            <p className="text-xs mt-1 opacity-60">Search volume will appear here as customers search the storefront</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.daily_volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#C6A75E" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#8B7340" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="barGoldHover" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#E8CC7A" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#C6A75E" stopOpacity={0.85} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#ffffff50', fontSize: 10 }}
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                                    }}
                                    dy={10}
                                    interval={stats.daily_volume.length > 14 ? Math.floor(stats.daily_volume.length / 7) : 0}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#ffffff50', fontSize: 10 }}
                                    width={40}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#ffffff08', radius: 6 }}
                                    contentStyle={{
                                        backgroundColor: '#1A1A1A',
                                        border: '1px solid #333',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                        padding: '10px 14px',
                                    }}
                                    itemStyle={{ color: '#C6A75E', fontWeight: 'bold', fontSize: '13px' }}
                                    labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '11px' }}
                                    labelFormatter={(label) => {
                                        const d = new Date(label);
                                        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                    }}
                                    formatter={(value: number | undefined) => [`${value || 0} searches`, 'Volume']}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="url(#barGold)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={stats.daily_volume.length > 30 ? 12 : 24}
                                    activeBar={{ fill: 'url(#barGoldHover)', stroke: '#C6A75E', strokeWidth: 1 }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
