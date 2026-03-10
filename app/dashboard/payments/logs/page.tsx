'use client';

import { useState, useEffect } from 'react';
import { getPaymentLogs, formatINR } from '@/lib/api';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Receipt,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw
} from 'lucide-react';

export default function PaymentLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

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

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
            case 'REFUNDED': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'PENDING': default: return 'bg-amber-100 text-amber-800 border-amber-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'PAID': return <CheckCircle2 className="w-3 h-3 mr-1" />;
            case 'FAILED': return <XCircle className="w-3 h-3 mr-1" />;
            case 'PENDING': default: return <Clock className="w-3 h-3 mr-1" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Payment Logs</h1>
                    <p className="text-sm text-gray-500 mt-1">Monitor and reconcile platform transactions</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-white border shadow-sm rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-sm font-medium text-gray-500 mb-1">Page Total Volume</div>
                    <div className="text-2xl font-bold text-gray-900">{formatINR(stats.totalVolume)}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10"></div>
                    <div className="text-sm font-medium text-emerald-600 mb-1">Successful (Page)</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.successCount}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-10"></div>
                    <div className="text-sm font-medium text-amber-600 mb-1">Pending (Page)</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.pendingCount}</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -z-10"></div>
                    <div className="text-sm font-medium text-red-600 mb-1">Failed (Page)</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.failedCount}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters Row */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by Payment ID, Order ID, or Txn Ref..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C6A75E] focus:border-transparent outline-none transition-all"
                        />
                    </form>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-40">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white cursor-pointer focus:ring-2 focus:ring-[#C6A75E] outline-none"
                            >
                                <option value="">All Statuses</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="FAILED">Failed</option>
                                <option value="REFUNDED">Refunded</option>
                            </select>
                        </div>
                        <div className="relative flex-1 md:w-40">
                            <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <select
                                value={gatewayFilter}
                                onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white cursor-pointer focus:ring-2 focus:ring-[#C6A75E] outline-none"
                            >
                                <option value="">All Gateways</option>
                                <option value="razorpay">Razorpay</option>
                                <option value="cod">COD</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Transaction / Date</th>
                                <th className="px-6 py-4">Order Details</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Gateway</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
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
                                        No payment logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.payment_id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{log.razorpay_payment_id || log.transaction_reference || 'N/A'}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(log.created_at).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block text-gray-600 mb-1">
                                                {log.order_id?.split('-')[0]}...
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Customer: {log.customer_name || 'Guest'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {formatINR(parseFloat(log.amount))}
                                            <span className="text-xs text-gray-500 font-normal ml-1">({log.currency})</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium uppercase tracking-wider">
                                                {log.payment_gateway || log.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(log.payment_status)}`}>
                                                {getStatusIcon(log.payment_status)}
                                                {log.payment_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && total > 0 && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Showing <span className="font-medium text-gray-900">{(page - 1) * limit + 1}</span> to{' '}
                            <span className="font-medium text-gray-900">{Math.min(page * limit, total)}</span> of{' '}
                            <span className="font-medium text-gray-900">{total}</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page * limit >= total}
                                className="p-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
