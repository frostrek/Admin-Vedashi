'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCustomers, Customer } from '@/lib/api';
import {
    Users, Eye, Search, X, Mail, Phone, Calendar, Shield,
    CheckCircle2, XCircle, AlertTriangle, UserX, Loader2
} from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        getCustomers()
            .then(setCustomers)
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = customers;
        if (roleFilter !== 'all') {
            list = list.filter(c => c.role === roleFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.full_name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.phone?.includes(q)
            );
        }
        return list;
    }, [customers, roleFilter, searchQuery]);

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
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search name, email, phone..."
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
                    {/* Filter */}
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none transition-colors duration-300"
                    >
                        <option value="all">All Roles</option>
                        <option value="customer">Customer</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Total', value: customers.length, color: 'text-gold' },
                    { label: 'Active', value: customers.filter(c => c.is_active && !c.is_banned && !c.is_suspended).length, color: 'text-success' },
                    { label: 'Verified Email', value: customers.filter(c => c.is_email_verified).length, color: 'text-info' },
                    { label: 'Admins', value: customers.filter(c => c.role === 'admin').length, color: 'text-gold' },
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
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider text-center">Verified</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Joined</th>
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
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {customer.phone || <span className="text-text-muted/50 italic">Not provided</span>}
                                        </td>
                                        <td className="px-4 py-3">{roleBadge(customer.role)}</td>
                                        <td className="px-4 py-3">{statusBadge(customer)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <span title="Email" className="flex items-center gap-1 text-[10px] text-text-muted">
                                                    <Mail className="h-3 w-3" />{verificationDot(customer.is_email_verified)}
                                                </span>
                                                <span title="Phone" className="flex items-center gap-1 text-[10px] text-text-muted">
                                                    <Phone className="h-3 w-3" />{verificationDot(customer.is_mobile_verified)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">
                                            {new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedCustomer(customer)}
                                                className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
                                                title="View details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}>
                    <div className="w-full max-w-lg mx-4 rounded-2xl border border-border bg-card-bg-elevated p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-serif text-lg font-bold text-gold-soft">Customer Details</h2>
                            <button onClick={() => setSelectedCustomer(null)} className="text-text-muted hover:text-gold transition-colors duration-300">✕</button>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-page-bg border border-border-subtle">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-gold font-bold text-sm flex-shrink-0">
                                    {selectedCustomer.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">{selectedCustomer.full_name || 'No name'}</p>
                                    <p className="text-xs text-text-muted">{selectedCustomer.email}</p>
                                    <div className="flex gap-2 mt-1.5">
                                        {roleBadge(selectedCustomer.role)}
                                        {statusBadge(selectedCustomer)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <DetailField icon={<Mail className="h-4 w-4" />} label="Email Address" value={selectedCustomer.email} />
                                <DetailField icon={<Phone className="h-4 w-4" />} label="Phone Number" value={selectedCustomer.phone || 'Not provided'} />
                                <DetailField icon={<Calendar className="h-4 w-4" />} label="Date of Birth" value={selectedCustomer.date_of_birth ? new Date(selectedCustomer.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not provided'} />
                                <DetailField icon={<Shield className="h-4 w-4" />} label="Role" value={selectedCustomer.role === 'admin' ? 'Administrator' : 'Customer'} />
                                <DetailField icon={<Calendar className="h-4 w-4" />} label="Joined" value={new Date(selectedCustomer.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                                <DetailField icon={<Calendar className="h-4 w-4" />} label="Last Login" value={selectedCustomer.last_login_at ? new Date(selectedCustomer.last_login_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'} />
                            </div>

                            {/* Verification Status */}
                            <div className="border-t border-border pt-4">
                                <h3 className="text-xs font-semibold text-gold-muted uppercase tracking-wider mb-3">Verification Status</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <VerificationCard label="Email" verified={selectedCustomer.is_email_verified} />
                                    <VerificationCard label="Mobile" verified={selectedCustomer.is_mobile_verified} />
                                    <VerificationCard label="Age" verified={selectedCustomer.is_age_verified} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="p-3 rounded-xl bg-page-bg border border-border-subtle">
            <div className="flex items-center gap-1.5 text-gold-muted mb-1">
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm text-text-primary font-medium truncate">{value}</p>
        </div>
    );
}

function VerificationCard({ label, verified }: { label: string; verified: boolean }) {
    return (
        <div className={`rounded-xl p-3 text-center border ${verified ? 'border-success/20 bg-success/5' : 'border-border-subtle bg-page-bg'}`}>
            <div className="flex justify-center mb-1">
                {verified
                    ? <CheckCircle2 className="h-5 w-5 text-success" />
                    : <XCircle className="h-5 w-5 text-text-muted/40" />}
            </div>
            <p className={`text-[11px] font-semibold ${verified ? 'text-success' : 'text-text-muted'}`}>{label}</p>
            <p className={`text-[10px] ${verified ? 'text-success/70' : 'text-text-muted/50'}`}>{verified ? 'Verified' : 'Pending'}</p>
        </div>
    );
}
