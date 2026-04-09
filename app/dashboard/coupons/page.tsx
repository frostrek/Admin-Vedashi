'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    Plus, Pencil, Trash2, Ticket, ToggleLeft, ToggleRight,
    X, Loader2, Percent, IndianRupee, Calendar, Hash,
} from 'lucide-react';
import SortableHeader, { SortDir, compare } from '@/components/SortableHeader';

import { API_URL } from '@/lib/api';

interface Coupon {
    coupon_id: string;
    code: string;
    discount_type: 'percentage' | 'fixed' | 'free_shipping' | 'bogo' | 'first_order';
    discount_value: number | null;
    bogo_buy_qty?: number;
    bogo_get_qty?: number;
    min_order_amount: number;
    max_discount_cap: number | null;
    usage_limit: number | null;
    per_user_limit: number;
    used_count: number;
    starts_at: string;
    expires_at: string | null;
    is_active: boolean;
    is_auto_apply: boolean;
    created_at: string;
}

const emptyCoupon: { code: string; discount_type: 'percentage' | 'fixed' | 'free_shipping' | 'bogo' | 'first_order'; discount_value: string; bogo_buy_qty: string; bogo_get_qty: string; min_order_amount: string; max_discount_cap: string; usage_limit: string; per_user_limit: string; starts_at: string; expires_at: string; is_active: boolean; is_auto_apply: boolean } = {
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    bogo_buy_qty: '1',
    bogo_get_qty: '1',
    min_order_amount: '0',
    max_discount_cap: '',
    usage_limit: '',
    per_user_limit: '1',
    starts_at: '',
    expires_at: '',
    is_active: true,
    is_auto_apply: false,
};

function getStatus(c: Coupon): { label: string; color: string } {
    if (!c.is_active) return { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400' };
    const now = new Date();
    if (c.starts_at && new Date(c.starts_at) > now) return { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400' };
    if (c.expires_at && new Date(c.expires_at) < now) return { label: 'Expired', color: 'bg-red-500/20 text-red-300' };
    if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { label: 'Exhausted', color: 'bg-orange-500/20 text-orange-300' };
    return { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' };
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Coupon | null>(null);
    const [form, setForm] = useState(emptyCoupon);
    const [saving, setSaving] = useState(false);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    
    // Lock background scroll when modal is open
    useEffect(() => {
        if (modalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [modalOpen]);

    const loadCoupons = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/coupons`);
            const data = await res.json();
            if (data.success) setCoupons(data.data || []);
        } catch { toast.error('Failed to load coupons'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadCoupons(); }, [loadCoupons]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyCoupon);
        setModalOpen(true);
    };

    const openEdit = (c: Coupon) => {
        setEditing(c);
        setForm({
            code: c.code,
            discount_type: c.discount_type,
            discount_value: c.discount_value != null ? String(c.discount_value) : '',
            bogo_buy_qty: String(c.bogo_buy_qty || 1),
            bogo_get_qty: String(c.bogo_get_qty || 1),
            min_order_amount: String(c.min_order_amount),
            max_discount_cap: c.max_discount_cap != null ? String(c.max_discount_cap) : '',
            usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
            per_user_limit: String(c.per_user_limit),
            starts_at: c.starts_at ? c.starts_at.slice(0, 10) : '',
            expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
            is_active: c.is_active,
            is_auto_apply: c.is_auto_apply,
        });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim()) { toast.error('Code is required'); return; }

        const requiresValue = ['percentage', 'fixed', 'first_order'].includes(form.discount_type);
        if (requiresValue && (!form.discount_value || parseFloat(form.discount_value) <= 0)) {
            toast.error('Discount value must be > 0');
            return;
        }

        if (form.discount_type === 'bogo') {
            if (!form.bogo_buy_qty || parseInt(form.bogo_buy_qty) <= 0) { toast.error('Buy quantity must be > 0'); return; }
            if (!form.bogo_get_qty || parseInt(form.bogo_get_qty) <= 0) { toast.error('Get quantity must be > 0'); return; }
        }

        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                code: form.code.trim().toUpperCase(),
                discount_type: form.discount_type,
                discount_value: requiresValue ? parseFloat(form.discount_value) : null,
                bogo_buy_qty: form.discount_type === 'bogo' ? parseInt(form.bogo_buy_qty) : null,
                bogo_get_qty: form.discount_type === 'bogo' ? parseInt(form.bogo_get_qty) : null,
                min_order_amount: parseFloat(form.min_order_amount) || 0,
                max_discount_cap: form.max_discount_cap ? parseFloat(form.max_discount_cap) : null,
                usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
                per_user_limit: parseInt(form.per_user_limit) || 1,
                starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
                is_active: form.is_active,
                is_auto_apply: form.is_auto_apply,
            };

            const url = editing
                ? `${API_URL}/api/coupons/${editing.coupon_id}`
                : `${API_URL}/api/coupons`;
            const method = editing ? 'PATCH' : 'POST';

            const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();

            if (data.success) {
                toast.success(editing ? 'Coupon updated!' : 'Coupon created!');
                setModalOpen(false);
                loadCoupons();
            } else {
                toast.error(data.message || 'Failed to save coupon');
            }
        } catch { toast.error('Error saving coupon'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this coupon?')) return;
        try {
            const res = await authFetch(`${API_URL}/api/coupons/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { toast.success('Coupon deleted'); loadCoupons(); }
            else toast.error(data.message || 'Failed to delete');
        } catch { toast.error('Error deleting coupon'); }
    };

    const toggleActive = async (c: Coupon) => {
        try {
            const res = await authFetch(`${API_URL}/api/coupons/${c.coupon_id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !c.is_active }),
            });
            const data = await res.json();
            if (data.success) { toast.success(`Coupon ${!c.is_active ? 'activated' : 'deactivated'}`); loadCoupons(); }
        } catch { toast.error('Error toggling coupon'); }
    };

    // Preview discount for sample amount
    const previewDiscount = () => {
        const val = parseFloat(form.discount_value) || 0;
        const sampleAmount = 1000;
        if (form.discount_type === 'percentage' || form.discount_type === 'first_order') {
            let d = sampleAmount * (val / 100);
            const cap = form.max_discount_cap ? parseFloat(form.max_discount_cap) : null;
            if (cap !== null) d = Math.min(d, cap);
            return { discount: d, final: sampleAmount - d, sample: sampleAmount, type: form.discount_type };
        } else if (form.discount_type === 'fixed') {
            return { discount: Math.min(val, sampleAmount), final: Math.max(0, sampleAmount - val), sample: sampleAmount, type: 'fixed' };
        } else if (form.discount_type === 'free_shipping') {
            return { discount: 0, final: sampleAmount, sample: sampleAmount, type: 'free_shipping' };
        } else if (form.discount_type === 'bogo') {
            return { discount: 0, final: sampleAmount, sample: sampleAmount, type: 'bogo' };
        }
        return { discount: 0, final: sampleAmount, sample: sampleAmount, type: 'unknown' };
    };

    const handleSort = (key: string, dir: SortDir) => {
        setSortKey(dir ? key : null);
        setSortDir(dir);
    };

    const sortedCoupons = useMemo(() => {
        if (!sortKey || !sortDir) return coupons;
        return [...coupons].sort((a, b) => compare(a, b, sortKey, sortDir));
    }, [coupons, sortKey, sortDir]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold">Coupons</h1>
                    <p className="text-[15px] font-semibold text-brown ">Create and manage discount coupons</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Coupon
                </button>
            </div>

            {/* Table */}
            <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-text-muted">
                        <Ticket className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">No coupons created yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-base">
                            <thead>
                                <tr className="border-b border-border text-text-muted">
                                    <SortableHeader label="Code" sortKey="code" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Discount</th>
                                    <SortableHeader label="Min Order" sortKey="min_order_amount" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <SortableHeader label="Usage" sortKey="used_count" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Dates</th>
                                    <SortableHeader label="Status" sortKey="is_active" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <th className="text-right px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCoupons.map(c => {
                                    const status = getStatus(c);
                                    return (
                                        <tr key={c.coupon_id} className="border-b border-border/50 hover:bg-gold/[0.03] transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-mono font-bold text-gold">{c.code}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.discount_type === 'percentage' || c.discount_type === 'first_order'
                                                    ? `${c.discount_value}%${c.max_discount_cap ? ` (max ₹${c.max_discount_cap})` : ''}`
                                                    : c.discount_type === 'fixed'
                                                        ? `₹${c.discount_value}`
                                                        : c.discount_type === 'free_shipping'
                                                            ? 'Free Shipping'
                                                            : c.discount_type === 'bogo'
                                                                ? `Buy ${c.bogo_buy_qty} Get ${c.bogo_get_qty}`
                                                                : String(c.discount_value)
                                                }
                                                {c.discount_type === 'first_order' && <div className="text-xs text-emerald-400 mt-1">First Order</div>}
                                            </td>
                                            <td className="px-4 py-3 text-text-muted">
                                                {parseFloat(String(c.min_order_amount)) > 0 ? `₹${c.min_order_amount}` : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-text-primary">{c.used_count}</span>
                                                <span className="text-text-muted"> / {c.usage_limit ?? '∞'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">
                                                <div>{c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'}</div>
                                                <div>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'No expiry'}</div>
                                            </td>
                                            <td className="px-4 py-3 space-x-2">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                {c.is_auto_apply && (
                                                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                                                        Auto-Apply
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => toggleActive(c)} title="Toggle Active" className="p-1.5 rounded-lg hover:bg-gold/10 text-text-muted hover:text-gold transition-colors">
                                                        {c.is_active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gold/10 text-text-muted hover:text-gold transition-colors">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(c.coupon_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card-bg border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card-bg z-10">
                            <h4 className="font-serif text-lg font-bold text-gold">
                                {editing ? 'Edit Coupon' : 'Create Coupon'}
                            </h4>
                            <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {/* Code */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Coupon Code <span className="text-red-500">*</span></label>
                                    <input
                                    type="text" required
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. WELCOME20"
                                    className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 uppercase"
                                />
                            </div>

                            {/* Discount Type & Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Type <span className="text-red-500">*</span></label>
                                    <select
                                        value={form.discount_type}
                                        onChange={e => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' | 'free_shipping' | 'bogo' | 'first_order' })}
                                        className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed (₹)</option>
                                        <option value="free_shipping">Free Shipping</option>
                                        <option value="bogo">BOGO (Buy X Get Y)</option>
                                        <option value="first_order">First Order (%)</option>
                                    </select>
                                </div>

                                {['percentage', 'fixed', 'first_order'].includes(form.discount_type) && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Value <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            {(form.discount_type === 'percentage' || form.discount_type === 'first_order')
                                                ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                                : <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                            }
                                            <input
                                                type="number" required min="0.01" step="0.01"
                                                value={form.discount_value}
                                                onChange={e => setForm({ ...form, discount_value: e.target.value })}
                                                className="w-full rounded-lg border border-border bg-page-bg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* BOGO Quantities */}
                            {form.discount_type === 'bogo' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Buy Quantity <span className="text-red-500">*</span></label>
                                        <input
                                            type="number" required min="1" step="1"
                                            value={form.bogo_buy_qty}
                                            onChange={e => setForm({ ...form, bogo_buy_qty: e.target.value })}
                                            className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Get Free Quantity <span className="text-red-500">*</span></label>
                                        <input
                                            type="number" required min="1" step="1"
                                            value={form.bogo_get_qty}
                                            onChange={e => setForm({ ...form, bogo_get_qty: e.target.value })}
                                            className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Min Order & Max Cap */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Min Order Amount</label>
                                    <input type="number" min="0" step="0.01"
                                        value={form.min_order_amount}
                                        onChange={e => setForm({ ...form, min_order_amount: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Max Discount Cap</label>
                                    <input type="number" min="0" step="0.01"
                                        value={form.max_discount_cap}
                                        onChange={e => setForm({ ...form, max_discount_cap: e.target.value })}
                                        placeholder="No cap"
                                        className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                    />
                                </div>
                            </div>

                            {/* Usage Limits */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        <Hash className="inline w-3.5 h-3.5 mr-1" />Global Usage Limit
                                    </label>
                                    <input type="number" min="1"
                                        value={form.usage_limit}
                                        onChange={e => setForm({ ...form, usage_limit: e.target.value })}
                                        placeholder="Unlimited"
                                        className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Per User Limit</label>
                                    <input type="number" min="1"
                                        value={form.per_user_limit}
                                        onChange={e => setForm({ ...form, per_user_limit: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-md font-semibold text-text-secondary mb-1">
                                        <Calendar className="inline w-3.5 h-3.5 mr-1" />Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.starts_at}
                                        onChange={e => setForm({ ...form, starts_at: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        <Calendar className="inline w-3.5 h-3.5 mr-1" />Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.expires_at}
                                        min={form.starts_at || undefined}
                                        onChange={e => setForm({ ...form, expires_at: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Active & Auto-Apply Toggles */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between rounded-lg border border-border bg-page-bg px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">Status</p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            {form.is_active ? 'Active' : 'Disabled'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={form.is_active}
                                        onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold/40 focus:ring-offset-2 focus:ring-offset-page-bg ${form.is_active ? 'bg-emerald-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.is_active ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-border bg-page-bg px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">Auto Apply</p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            {form.is_auto_apply ? 'Yes' : 'No'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={form.is_auto_apply}
                                        onClick={() => setForm({ ...form, is_auto_apply: !form.is_auto_apply })}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold/40 focus:ring-offset-2 focus:ring-offset-page-bg ${form.is_auto_apply ? 'bg-purple-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.is_auto_apply ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Live Preview */}
                            {(form.discount_value || form.discount_type === 'free_shipping' || form.discount_type === 'bogo') && (
                                <div className="bg-gold/[0.06] border border-gold/20 rounded-lg p-3">
                                    <p className="text-xs font-medium text-gold mb-1">Preview (on ₹{previewDiscount().sample} order)</p>
                                    {previewDiscount().type === 'bogo' ? (
                                        <p className="text-sm text-text-primary">
                                            Discount: <span className="font-bold text-emerald-400">Depends on cart items at checkout</span>
                                        </p>
                                    ) : previewDiscount().type === 'free_shipping' ? (
                                        <p className="text-sm text-text-primary">
                                            Discount: <span className="font-bold text-emerald-400">Delivery Fee Waived</span>
                                        </p>
                                    ) : (
                                        <p className="text-sm text-text-primary">
                                            Discount: <span className="font-bold text-emerald-400">₹{previewDiscount().discount.toFixed(2)}</span>
                                            {' → '}Final: <span className="font-bold text-gold">₹{previewDiscount().final.toFixed(2)}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editing ? 'Update Coupon' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
