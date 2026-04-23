'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, MessageSquare, Clock, AlertCircle, CheckCircle,
    Filter, ChevronDown, ArrowUpRight, RefreshCw
} from 'lucide-react';
import { getAdminTickets, getAdminTicketStats, updateAdminTicket } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUSES = ['all', 'open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['all', 'low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['all', 'Orders', 'Payments', 'Shipping & Delivery', 'Product Issues', 'Returns & Refunds', 'Account Support', 'Other'];

const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-200 text-gray-500',
};
const PRIORITY_COLORS: Record<string, string> = {
    low: 'text-gray-500',
    medium: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
};

export default function AdminTicketsPage() {
    const [data, setData] = useState<any>({ tickets: [], total: 0 });
    const [stats, setStats] = useState<any>(null);
    const [filters, setFilters] = useState({ status: 'all', priority: 'all', category: 'all', search: '' });
    const [loading, setLoading] = useState(true);

    const loadTickets = async () => {
        setLoading(true);
        const params: any = {};
        if (filters.status !== 'all') params.status = filters.status;
        if (filters.priority !== 'all') params.priority = filters.priority;
        if (filters.category !== 'all') params.category = filters.category;
        if (filters.search.trim()) params.search = filters.search;
        const [ticketData, statsData] = await Promise.all([
            getAdminTickets(params),
            getAdminTicketStats(),
        ]);
        setData(ticketData);
        setStats(statsData);
        setLoading(false);
    };

    useEffect(() => { loadTickets(); }, [filters.status, filters.priority, filters.category]);

    const handleQuickStatus = async (ticketId: string, status: string) => {
        const result = await updateAdminTicket(ticketId, { status });
        if (result.success) {
            toast.success('Status updated');
            loadTickets();
        } else {
            toast.error(result.message || 'Failed');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-text-primary">Support Tickets</h1>
                    <p className="text-[15px] font-semibold text-brown mt-1">Manage customer support requests</p>
                </div>
                <button onClick={loadTickets} className="flex items-center gap-2 bg-primary text-[#E8D8B9] border border-gold/10 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-all shadow-md">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Total', value: stats.total, color: 'text-text-primary' },
                        { label: 'Open', value: stats.open_count, color: 'text-info' },
                        { label: 'In Progress', value: stats.in_progress_count, color: 'text-warning-dark' },
                        { label: 'Resolved', value: stats.resolved_count, color: 'text-success' },
                        { label: 'Closed', value: stats.closed_count, color: 'text-text-muted' },
                    ].map((s) => (
                        <div key={s.label} className="bg-card-bg border border-border rounded-xl p-4">
                            <p className="text-2xl text-text-muted mb-1">{s.label}</p>
                            <p className={`text-xl font-bold ${s.color}`}>{s.value || 0}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
                        placeholder="Search tickets..."
                        className="w-full pl-9 pr-4 py-2 bg-card-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:border-gold/50"
                    />
                </div>
                {[
                    { key: 'status', options: STATUSES },
                    { key: 'priority', options: PRIORITIES },
                    { key: 'category', options: CATEGORIES },
                ].map(({ key, options }) => (
                    <select
                        key={key}
                        value={(filters as any)[key]}
                        onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                        className="bg-card-bg border border-border rounded-xl px-3 py-2 text-sm text-text-muted capitalize"
                    >
                        {options.map((o) => (
                            <option key={o} value={o}>{o === 'all' ? `All ${key}` : o.replace('_', ' ')}</option>
                        ))}
                    </select>
                ))}
            </div>

            {/* Tickets Table */}
            <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-text-muted">Loading tickets...</div>
                ) : data.tickets.length === 0 ? (
                    <div className="p-12 text-center">
                        <MessageSquare className="h-10 w-10 text-text-muted/30 mx-auto mb-3" />
                        <p className="text-sm text-text-muted">No tickets found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border">
                                <tr className="text-left text-xs text-text-muted uppercase">
                                    <th className="px-4 py-3">Ticket</th>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Messages</th>
                                    <th className="px-4 py-3">Updated</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.tickets.map((ticket: any) => (
                                    <tr key={ticket.ticket_id} className="hover:bg-gold/[0.03] transition-colors">
                                        <td className="px-4 py-3">
                                            <Link href={`/dashboard/support/tickets/${ticket.ticket_id}`} className="text-gold hover:underline font-medium">
                                                {ticket.ticket_number}
                                            </Link>
                                            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{ticket.subject}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-text">{ticket.customer_name}</p>
                                            <p className="text-xs text-text-muted">{ticket.customer_email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-text-muted">{ticket.category}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold uppercase ${PRIORITY_COLORS[ticket.priority] || 'text-text-muted'}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={ticket.status}
                                                onChange={(e) => handleQuickStatus(ticket.ticket_id, e.target.value)}
                                                className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[ticket.status] || ''}`}
                                            >
                                                {STATUSES.filter(s => s !== 'all').map(s => (
                                                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-text-muted text-center">{ticket.message_count || 0}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted">
                                            {new Date(ticket.updated_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/dashboard/support/tickets/${ticket.ticket_id}`}
                                                className="text-xs text-gold hover:underline flex items-center gap-1"
                                            >
                                                View <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="text-xs text-text-muted text-right">{data.total} ticket{data.total !== 1 ? 's' : ''} total</p>
        </div>
    );
}
