'use client';

import { useState, useEffect, useMemo } from 'react';
import { getVendorRegistrations, updateVendorRegistrationStatus } from '@/lib/api';
import {
    Building2, Eye, Search, X, Mail, Phone, Calendar, 
    CheckCircle2, XCircle, AlertTriangle, UserX, Loader2, Download
} from 'lucide-react';
import SortableHeader, { SortDir, compare } from '@/components/SortableHeader';
import toast from 'react-hot-toast';

export default function VendorRegistrationsPage() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);

    const [selectedVendor, setSelectedVendor] = useState<any | null>(null);

    const fetchVendors = () => {
        setLoading(true);
        getVendorRegistrations()
            .then(data => {
                setVendors(data);
            })
            .catch(err => {
                toast.error('Failed to load vendor registrations');
                console.error(err);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const filtered = useMemo(() => {
        let list = vendors;
        
        // Status filter
        if (statusFilter !== 'all') {
            list = list.filter(v => v.status === statusFilter);
        }

        // Text search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(v =>
                v.company_name?.toLowerCase().includes(q) ||
                v.full_name?.toLowerCase().includes(q) ||
                v.email?.toLowerCase().includes(q)
            );
        }

        // Sorting
        if (sortKey && sortDir) {
            list = [...list].sort((a, b) => compare(a, b, sortKey, sortDir));
        }

        return list;
    }, [vendors, searchQuery, statusFilter, sortKey, sortDir]);

    const handleSort = (key: string, dir: SortDir) => {
        setSortKey(dir ? key : null);
        setSortDir(dir);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await updateVendorRegistrationStatus(id, newStatus);
            toast.success('Status updated');
            if (selectedVendor && selectedVendor.id === id) {
                setSelectedVendor({ ...selectedVendor, status: newStatus });
            }
            setVendors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const statusBadge = (status: string) => {
        if (status === 'pending') return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-warning/15 text-warning">Pending</span>;
        if (status === 'reviewed') return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-info/15 text-info">Reviewed</span>;
        if (status === 'approved') return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-success/15 text-success">Approved</span>;
        if (status === 'rejected') return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-danger/15 text-danger">Rejected</span>;
        if (status === 'replied') return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-gold/15 text-gold">Replied</span>;
        return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-text-muted/15 text-text-muted">{status}</span>;
    };

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
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Vendor Registrations</h1>
                    <p className="text-[15px] font-semibold text-brown">{vendors.length} total registrations</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-border bg-card-bg px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none transition-colors duration-300"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="replied">Replied</option>
                    </select>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search company or email..."
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

            {/* Table */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-page-bg">
                                <SortableHeader label="Company" sortKey="company_name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Contact Person" sortKey="full_name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Business Type" sortKey="business_type" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Category" sortKey="product_category" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase">Status</th>
                                <SortableHeader label="Date" sortKey="created_at" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Building2 className="mx-auto h-10 w-10 text-text-muted/40 mb-2" />
                                        <p className="text-md text-text-muted">No registrations found</p>
                                    </td>
                                </tr>
                            ) : (
                                 filtered.map(vendor => (
                                    <tr key={vendor.id} className="hover:bg-gold/[0.03] transition-all duration-300">
                                        <td className="px-4 py-3">
                                            <p className="text-base font-bold text-text-primary">{vendor.company_name}</p>
                                            <p className="text-sm text-text-muted">{vendor.city}, {vendor.state}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-base font-bold text-text-primary">{vendor.full_name}</p>
                                            <p className="text-sm text-text-muted">{vendor.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-base text-text-secondary">
                                            {vendor.business_type}
                                        </td>
                                        <td className="px-4 py-3 text-base text-text-secondary">
                                            {vendor.product_category}
                                        </td>
                                        <td className="px-4 py-3">{statusBadge(vendor.status)}</td>
                                        <td className="px-4 py-3 text-base text-text-secondary">
                                            {new Date(vendor.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`mailto:${vendor.email}?subject=Reply to Vendor Registration: ${vendor.company_name}`}
                                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
                                                    title="Send Email"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </a>
                                                <button
                                                    onClick={() => setSelectedVendor(vendor)}
                                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card-bg w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-card-bg to-card-bg-elevated">
                            <div>
                                <h2 className="text-xl font-bold text-gold-soft">{selectedVendor.company_name}</h2>
                                <p className="text-sm text-text-muted">Submitted on {new Date(selectedVendor.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-muted uppercase tracking-wider">Status:</span>
                                    <select
                                        value={selectedVendor.status}
                                        onChange={(e) => handleStatusChange(selectedVendor.id, e.target.value)}
                                        className="rounded-lg border border-border bg-card-bg px-2 py-1 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="reviewed">Reviewed</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="replied">Replied</option>
                                    </select>
                                </div>
                                <button onClick={() => setSelectedVendor(null)} className="p-1 rounded-lg text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-colors">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* Basic & Contact Info */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-gold tracking-wider mb-3 border-b border-border pb-1">Contact Information</h3>
                                        <dl className="grid grid-cols-3 gap-y-2 text-sm">
                                            <dt className="text-text-muted">Name</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.full_name}</dd>
                                            <dt className="text-text-muted">Email</dt><dd className="col-span-2 text-text-primary font-medium flex items-center gap-2">
                                                {selectedVendor.email}
                                                <a href={`mailto:${selectedVendor.email}?subject=Reply to Vendor Registration: ${selectedVendor.company_name}`} className="text-gold hover:underline text-xs flex items-center gap-1"><Mail className="h-3 w-3"/> Reply</a>
                                            </dd>
                                            <dt className="text-text-muted">Phone</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.phone}</dd>
                                            <dt className="text-text-muted">City, State</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.city}, {selectedVendor.state}</dd>
                                        </dl>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-gold tracking-wider mb-3 border-b border-border pb-1">Business Details</h3>
                                        <dl className="grid grid-cols-3 gap-y-2 text-sm">
                                            <dt className="text-text-muted">Type</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.business_type}</dd>
                                            <dt className="text-text-muted">Reg No.</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.registration_number}</dd>
                                            <dt className="text-text-muted">Address</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.business_address}</dd>
                                            <dt className="text-text-muted">Years Active</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.years_in_operation}</dd>
                                            <dt className="text-text-muted">Website</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.website_url ? <a href={selectedVendor.website_url} target="_blank" className="text-gold hover:underline">{selectedVendor.website_url}</a> : '—'}</dd>
                                            <dt className="text-text-muted">Socials</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.social_handle || '—'}</dd>
                                        </dl>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-sm font-bold text-gold tracking-wider mb-3 border-b border-border pb-1">Files & Documents</h3>
                                        <div className="flex flex-col gap-3">
                                            {selectedVendor.product_catalog_url ? (
                                                <a href={selectedVendor.product_catalog_url} target="_blank" className="flex items-center justify-between p-3 rounded-lg border border-border bg-card-bg-elevated hover:border-gold/50 transition-colors">
                                                    <span className="text-sm font-medium text-text-primary">Product Catalog</span>
                                                    <Download className="h-4 w-4 text-gold" />
                                                </a>
                                            ) : (
                                                <div className="p-3 rounded-lg border border-border bg-card-bg/50 text-text-muted text-sm italic">No catalog uploaded</div>
                                            )}
                                            
                                            {selectedVendor.certifications_file_url ? (
                                                <a href={selectedVendor.certifications_file_url} target="_blank" className="flex items-center justify-between p-3 rounded-lg border border-border bg-card-bg-elevated hover:border-gold/50 transition-colors">
                                                    <span className="text-sm font-medium text-text-primary">Certifications File</span>
                                                    <Download className="h-4 w-4 text-gold" />
                                                </a>
                                            ) : (
                                                <div className="p-3 rounded-lg border border-border bg-card-bg/50 text-text-muted text-sm italic">No certifications uploaded</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Product & Export Info */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-gold tracking-wider mb-3 border-b border-border pb-1">Product Information</h3>
                                        <dl className="grid grid-cols-3 gap-y-2 text-sm">
                                            <dt className="text-text-muted">Category</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.product_category}</dd>
                                            <dt className="text-text-muted">SKU Count</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.number_of_skus}</dd>
                                            <dt className="text-text-muted">MOQ</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.moq}</dd>
                                        </dl>
                                        <div className="mt-2">
                                            <p className="text-xs text-text-muted mb-1">Description</p>
                                            <div className="p-3 rounded-lg bg-card-bg-elevated border border-border text-sm text-text-primary leading-relaxed">
                                                {selectedVendor.product_description}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-gold tracking-wider mb-3 border-b border-border pb-1">Certifications & Export</h3>
                                        <dl className="grid grid-cols-3 gap-y-2 text-sm mb-3">
                                            <dt className="text-text-muted">Export Exp</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.export_experience}</dd>
                                            <dt className="text-text-muted">Exporting To</dt><dd className="col-span-2 text-text-primary font-medium">{selectedVendor.countries_exported_to || '—'}</dd>
                                        </dl>
                                        <div>
                                            <p className="text-xs text-text-muted mb-1">Certifications Held</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(selectedVendor.certifications_held) && selectedVendor.certifications_held.length > 0 ? (
                                                    selectedVendor.certifications_held.map((cert: string) => (
                                                        <span key={cert} className="px-2 py-1 rounded-md bg-gold/10 text-gold text-xs font-semibold">{cert}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-text-muted">None</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(selectedVendor.how_did_you_hear || selectedVendor.additional_comments) && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gold tracking-wider mb-3 border-b border-border pb-1">Additional Information</h3>
                                            {selectedVendor.how_did_you_hear && (
                                                <div className="mb-2">
                                                    <p className="text-xs text-text-muted mb-1">How did you hear about us?</p>
                                                    <p className="text-sm text-text-primary">{selectedVendor.how_did_you_hear}</p>
                                                </div>
                                            )}
                                            {selectedVendor.additional_comments && (
                                                <div>
                                                    <p className="text-xs text-text-muted mb-1">Comments</p>
                                                    <div className="p-3 rounded-lg bg-card-bg-elevated border border-border text-sm text-text-primary leading-relaxed">
                                                        {selectedVendor.additional_comments}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
