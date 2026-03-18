'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getOrders, formatINR, Customer } from '@/lib/api';
import Link from 'next/link';
import {
    Users, Eye, Search, X, Mail, Phone, Calendar, Shield,
    CheckCircle2, XCircle, AlertTriangle, UserX, Loader2
} from 'lucide-react';
import SortableHeader, { SortDir, compare } from '@/components/SortableHeader';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);

    useEffect(() => {
        Promise.all([getCustomers(), getOrders()])
            .then(([custData, orderData]) => {
                // Filter out admins
                const nonAdmins = custData.filter(c => c.role !== 'admin');
                
                // Map customer stats
                const withStats = nonAdmins.map(c => {
                    const customerOrders = orderData.filter(o => 
                        o.customer_email.toLowerCase() === c.email.toLowerCase()
                    );
                    return {
                        ...c,
                        total_orders: customerOrders.length,
                        total_spent: customerOrders.reduce((sum, o) => {
                            if (o.status?.toUpperCase() === 'CANCELLED') return sum;
                            return sum + Number(o.final_total || o.total || o.final_price || 0);
                        }, 0)
                    };
                });
                console.log('[CustomersPage] Fetched customers:', withStats);
                setCustomers(withStats);
            })
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = customers;
        
        // Status filter
        if (statusFilter !== 'all') {
            list = list.filter(c => {
                if (statusFilter === 'banned') return c.is_banned;
                if (statusFilter === 'suspended') return c.is_suspended;
                if (statusFilter === 'deleted') return c.is_deleted;
                if (statusFilter === 'inactive') return !c.is_active && !c.is_banned && !c.is_suspended && !c.is_deleted;
                if (statusFilter === 'active') return c.is_active && !c.is_banned && !c.is_suspended && !c.is_deleted;
                return true;
            });
        }

        // Text search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.full_name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q)
            );
        }

        // Sorting
        if (sortKey && sortDir) {
            list = [...list].sort((a, b) => compare(a, b, sortKey, sortDir));
        }

        return list;
    }, [customers, searchQuery, statusFilter, sortKey, sortDir]);

    const handleSort = (key: string, dir: SortDir) => {
        setSortKey(dir ? key : null);
        setSortDir(dir);
    };

    const statusBadge = (customer: Customer) => {
        if (customer.is_banned) return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-danger/15 text-danger"><XCircle className="h-3 w-3" />Banned</span>;
        if (customer.is_suspended) return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-warning/15 text-warning"><AlertTriangle className="h-3 w-3" />Suspended</span>;
        if (customer.is_deleted) return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-text-muted/15 text-text-muted"><UserX className="h-3 w-3" />Deleted</span>;
        if (!customer.is_active) return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-text-muted/15 text-text-muted"><XCircle className="h-3 w-3" />Inactive</span>;
        return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-success/15 text-success"><CheckCircle2 className="h-3 w-3" />Active</span>;
    };

    const roleBadge = (role: string) => {
        if (role === 'admin') return <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-gold/15 text-gold">Admin</span>;
        return <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-info/15 text-info">Customer</span>;
    };

    const verificationDot = (verified: boolean) => (
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${verified ? 'bg-success' : 'bg-text-muted/30'}`} title={verified ? 'Verified' : 'Not Verified'} />
    );

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Customers</h1>
                    <p className="text-sm text-text-secondary">{customers.length} total customers</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none transition-colors duration-300"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="banned">Banned</option>
                        <option value="suspended">Suspended</option>
                        <option value="deleted">Deleted</option>
                    </select>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search name or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="rounded-lg border border-border bg-card-bg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-gold/40 focus:outline-none transition-colors duration-300 w-64"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'Total Patients', value: customers.length, color: 'text-gold' },
                    { label: 'Recently Active', value: customers.filter(c => c.is_active && !c.is_banned && !c.is_suspended).length, color: 'text-success' },
                    { label: 'Verified Access', value: customers.filter(c => c.is_email_verified).length, color: 'text-info' },
                ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-4">
                        <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-page-bg">
                                <SortableHeader label="Patient Entity" sortKey="full_name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Total Orders" sortKey="total_orders" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Total Spent" sortKey="total_spent" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Last Active" sortKey="last_login_at" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Status</th>
                                <SortableHeader label="Joined" sortKey="created_at" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Users className="mx-auto h-10 w-10 text-text-muted/40 mb-2" />
                                        <p className="text-sm text-text-muted">No customers found</p>
                                    </td>
                                </tr>
                            ) : (
                                 filtered.map(customer => (
                                    <tr key={customer.customer_id} className="hover:bg-gold/[0.03] transition-all duration-300">
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-text-primary">{customer.full_name || '—'}</p>
                                            <p className="text-xs text-text-muted">{customer.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-gold">
                                            {(customer as any).total_orders || 0}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-text-primary">
                                            {formatINR((customer as any).total_spent || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {customer.last_login_at 
                                                ? new Date(customer.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : customer.updated_at 
                                                    ? new Date(customer.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : 'Never'
                                            }
                                        </td>
                                        <td className="px-4 py-3">{statusBadge(customer)}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${customer.email}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
                                                    title="Send Message"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </a>
                                                <Link
                                                    href={`/dashboard/customers/${customer.customer_id}`}
                                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))

                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
