'use client';

import { useState, useEffect } from 'react';
import { getPaymentLogs, formatINR } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Receipt,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Layout,
    ArrowUpRight,
    TrendingUp,
    Hourglass,
    AlertCircle,
    Eye,
    X
} from 'lucide-react';

const DetailRow = ({ label, value, isDark }: { label: string, value: any, isDark: boolean }) => (
    <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} flex flex-col gap-1`}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
        <span className={`text-sm font-medium ${isDark ? 'text-white/90' : 'text-black/80'} break-all`}>{value || 'N/A'}</span>
    </div>
);

export default function PaymentLogsPage() {
    const { isDark } = useTheme();
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [gatewayFilter, setGatewayFilter] = useState('');
    const limit = 20;

    // Derived Stats
    const [stats, setStats] = useState({
        totalVolume: 0,
        successCount: 0,
        failedCount: 0,
        pendingCount: 0
    });

    const fetchLogs = async () => {
        setLoading(true);
        const data = await getPaymentLogs({
            limit,
            offset: (page - 1) * limit,
            search,
            status: statusFilter,
            gateway: gatewayFilter
        });

        setLogs(data.logs || []);
        setTotal(data.total || 0);

        // Calculate simple stats based on the current page (or we could fetch global stats if backend supported it)
        if (data.logs) {
            const volume = data.logs.filter((l: any) => l.payment_status === 'PAID').reduce((sum: number, l: any) => sum + parseFloat(l.amount || 0), 0);
            const success = data.logs.filter((l: any) => l.payment_status === 'PAID').length;
            const failed = data.logs.filter((l: any) => l.payment_status === 'FAILED').length;
            const pending = data.logs.filter((l: any) => l.payment_status === 'PENDING').length;

            setStats({
                totalVolume: volume,
                successCount: success,
                failedCount: failed,
                pendingCount: pending
            });
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, [page, statusFilter, gatewayFilter]);

    // Prevent body scrolling when modal is open
    useEffect(() => {
        if (selectedLog) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedLog]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'FAILED': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'REFUNDED': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            case 'PENDING': default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />;
            case 'FAILED': return <XCircle className="w-3.5 h-3.5 mr-1.5" />;
            case 'PENDING': default: return <Clock className="w-3.5 h-3.5 mr-1.5" />;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen animate-fadeIn">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-border shadow-lg">
                            <Receipt className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="font-serif text-3xl font-bold text-gold tracking-tighter">Payments</h1>
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>
                        Administrative payment auditing & reconciliation.
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary border border-gold/20 text-gold text-[11px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all duration-300 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </button>
            </div>

            {/* ── Stats Overview ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 rounded-[2rem] border border-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-gold/5 rounded-full blur-2xl group-hover:bg-gold/10 transition-all duration-500" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-gold/10 rounded-xl border border-gold/20">
                            <TrendingUp className="w-4 h-4 text-gold" />
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Volume</span>
                    </div>
                    <div className="text-2xl font-bold text-gold-soft">{formatINR(stats.totalVolume)}</div>
                </div>

                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 rounded-[2rem] border border-emerald-500/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Successful</span>
                    </div>
                    <div className="text-2xl font-bold text-gold-soft">{stats.successCount}</div>
                </div>

                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 rounded-[2rem] border border-amber-500/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <Hourglass className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pending</span>
                    </div>
                    <div className="text-2xl font-bold text-gold-soft">{stats.pendingCount}</div>
                </div>

                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 rounded-[2rem] border border-red-500/10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all duration-500" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                        </div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Failed</span>
                    </div>
                    <div className="text-2xl font-bold text-gold-soft">{stats.failedCount}</div>
                </div>
            </div>

            <div className={`${isDark ? 'bg-black/60 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white/95 shadow-[0_0_40px_rgba(130,139,92,0.15)]'} border border-border rounded-[2.5rem] overflow-hidden backdrop-blur-xl transition-all duration-500`}>
                {/* ── Filters Row ── */}
                <div className={`p-8 border-b border-white/10 ${isDark ? 'bg-black/40' : 'bg-emerald-50/50'} flex flex-col md:flex-row gap-8 justify-between items-center`}>
                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-[500px] group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/60 group-focus-within:text-gold transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="Search payment ID, order ID, or customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full pl-14 pr-6 py-4 border border-white/10 ${isDark ? 'bg-black/80' : 'bg-white/90'} rounded-2xl text-sm ${isDark ? 'text-gold-soft' : 'text-emerald-950'} placeholder:text-text-muted/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all shadow-inner`}
                        />
                    </form>

                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="relative flex-1 md:w-52 group">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gold/60 group-focus-within:text-gold transition-colors z-10" />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className={`w-full pl-12 pr-10 py-4 border border-white/10 ${isDark ? 'bg-black/80' : 'bg-white/90'} rounded-2xl text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gold-soft' : 'text-emerald-950'} appearance-none cursor-pointer focus:ring-1 focus:ring-gold/20 focus:border-gold/50 outline-none transition-all shadow-inner hover:bg-black/9 active:bg-black/90`}
                            >
                                <option value="" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>All Statuses</option>
                                <option value="PAID" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>Paid</option>
                                <option value="PENDING" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>Pending</option>
                                <option value="FAILED" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>Failed</option>
                                <option value="REFUNDED" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>Refunded</option>
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/40 pointer-events-none" />
                        </div>
                        <div className="relative flex-1 md:w-52 group">
                            <Receipt className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gold/60 group-focus-within:text-gold transition-colors z-10" />
                            <select
                                value={gatewayFilter}
                                onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
                                className={`w-full pl-12 pr-10 py-4 border border-white/10 ${isDark ? 'bg-black/80' : 'bg-white/90'} rounded-2xl text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gold-soft' : 'text-emerald-950'} appearance-none cursor-pointer focus:ring-1 focus:ring-gold/20 focus:border-gold/50 outline-none transition-all shadow-inner hover:bg-black/9 active:bg-black/90`}
                            >
                                <option value="" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>All Gateways</option>
                                <option value="razorpay" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>Razorpay</option>
                                <option value="cod" className={isDark ? "bg-[#0a0a0a] text-gold-soft" : ""}>COD</option>
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/40 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className={`border-b border-white/10 ${isDark ? 'bg-black/40 text-gold' : 'bg-emerald-900/10 text-emerald-950'} text-[11px] font-bold uppercase tracking-wider`}>
                                <th className="px-10 py-6 border-b border-white/5">Transaction</th>
                                <th className="px-10 py-6 border-b border-white/5">Details</th>
                                <th className="px-8 py-6 border-b border-white/5 italic text-lg capitalize">Amount</th>
                                <th className="px-8 py-6 border-b border-white/5">Gateway</th>
                                <th className="px-10 py-6 border-b border-white/5 text-right">Status</th>
                                <th className="px-8 py-6 border-b border-white/5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <RefreshCw className="w-8 h-8 animate-spin text-gray-300 mb-2" />
                                            Loading logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No payment logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.payment_id} className="group hover:bg-white/[0.02] transition-all duration-300">
                                        <td className="px-10 py-8">
                                            <div className={`font-bold text-lg tracking-wider group-hover:text-gold transition-colors ${isDark ? 'text-gold-soft' : 'text-emerald-950'}`}>
                                                {log.razorpay_payment_id || log.transaction_reference || 'N/A'}
                                            </div>
                                            <div className={`text-[10px] ${isDark ? 'text-gold-soft/50' : 'text-emerald-900/50'} mt-2 uppercase tracking-wide font-bold`}>
                                                {new Date(log.created_at).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-2 items-start">
                                                <div className="text-[10px] font-mono bg-gold/10 px-3 py-1 rounded-lg text-gold-soft border border-gold/20 shadow-sm">
                                                    #{log.order_id?.split('-')[0]}
                                                </div>
                                                <div className={`text-[11px] ${isDark ? 'text-gold-soft' : 'text-emerald-950'} font-bold uppercase tracking-wide flex items-center gap-2.5`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-gold' : 'bg-emerald-600'}`} />
                                                    {log.customer_name || 'Generic'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="text-xl font-bold text-gold italic drop-shadow-sm">
                                                {formatINR(parseFloat(log.amount))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <span className="inline-flex items-center px-4 py-1.5 bg-gold/5 border border-gold/20 text-gold-soft text-[10px] font-bold uppercase tracking-wider rounded-xl shadow-lg backdrop-blur-sm group-hover:bg-gold/10 transition-colors">
                                                {log.payment_gateway || log.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <span className={`inline-flex items-center px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-lg backdrop-blur-md transition-all ${getStatusStyle(log.payment_status)}`}>
                                                {getStatusIcon(log.payment_status)}
                                                {log.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-8 text-center">
                                            <button 
                                                onClick={() => setSelectedLog(log)}
                                                className={`p-2 rounded-full transition-all ${isDark ? 'hover:bg-white/10 text-gold-soft' : 'hover:bg-black/5 text-emerald-900'} hover:scale-110 active:scale-95`}
                                                title="View Details"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {!loading && total > 0 && (
                    <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">
                            Showing <span className="text-gold-soft">{(page - 1) * limit + 1}</span> — <span className="text-gold-soft">{Math.min(page * limit, total)}</span> of <span className="text-gold">{total}</span> records
                        </span>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-2.5 border border-white/5 bg-black/20 rounded-xl text-gold-soft hover:bg-white/5 disabled:opacity-20 transition-all shadow-lg"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page * limit >= total}
                                className="p-2.5 border border-white/5 bg-black/20 rounded-xl text-gold-soft hover:bg-white/5 disabled:opacity-20 transition-all shadow-lg"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Payment Details Modal ── */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className={`relative w-full max-w-2xl rounded-[2rem] border overflow-hidden shadow-2xl ${isDark ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-emerald-900/10'} animate-fadeInUp flex flex-col max-h-[90vh]`}>
                        {/* Header */}
                        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10 bg-black/40' : 'border-emerald-900/10 bg-emerald-50/50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gold/10 rounded-xl border border-gold/20 shadow-sm">
                                    <Receipt className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                    <h2 className={`text-xl font-bold ${isDark ? 'text-gold' : 'text-emerald-950'}`}>Payment Details</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">ID: {selectedLog.payment_id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className={`p-2 rounded-full transition-all ${isDark ? 'hover:bg-white/10 text-text-muted hover:text-white' : 'hover:bg-black/5 text-emerald-900/60 hover:text-black'} active:scale-95`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-emerald-50 border-emerald-900/5'}`}>
                                    <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Amount</div>
                                    <div className="text-xl font-bold text-gold italic">{formatINR(parseFloat(selectedLog.amount))}</div>
                                </div>
                                <div className={`p-4 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-emerald-50 border-emerald-900/5'}`}>
                                    <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Status</div>
                                    <span className={`inline-flex items-center px-3 py-1 mt-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(selectedLog.payment_status)}`}>
                                        {getStatusIcon(selectedLog.payment_status)}
                                        {selectedLog.payment_status}
                                    </span>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="space-y-4">
                                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gold-soft' : 'text-emerald-900'} border-b ${isDark ? 'border-white/5' : 'border-emerald-900/10'} pb-2`}>Transaction Info</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailRow label="Order ID" value={selectedLog.order_id} isDark={isDark} />
                                    <DetailRow label="Gateway" value={selectedLog.payment_gateway || selectedLog.payment_method} isDark={isDark} />
                                    <DetailRow label="Transaction Ref" value={selectedLog.transaction_reference} isDark={isDark} />
                                    <DetailRow label="Razorpay ID" value={selectedLog.razorpay_payment_id} isDark={isDark} />
                                    <DetailRow label="Signature" value={selectedLog.razorpay_signature ? 'Present (Verified)' : null} isDark={isDark} />
                                    <DetailRow label="Date" value={new Date(selectedLog.created_at).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    })} isDark={isDark} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-gold-soft' : 'text-emerald-900'} border-b ${isDark ? 'border-white/5' : 'border-emerald-900/10'} pb-2`}>Customer Info</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DetailRow label="Customer ID" value={selectedLog.customer_id} isDark={isDark} />
                                    <DetailRow label="Name" value={selectedLog.customer_name} isDark={isDark} />
                                </div>
                            </div>
                            
                            {selectedLog.failure_reason && (
                                <div className="space-y-4">
                                    <h3 className={`text-[11px] font-bold uppercase tracking-wider text-red-500 border-b border-red-500/10 pb-2`}>Failure Reason</h3>
                                    <div className="p-4 bg-red-500/10 text-red-400 text-sm rounded-xl border border-red-500/20 font-medium">
                                        {selectedLog.failure_reason}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
