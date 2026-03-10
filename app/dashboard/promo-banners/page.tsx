'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { authFetch, authHeaders } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Loader2, Megaphone } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface PromoBanner {
    id: string;
    message: string;
    flow: 'static' | 'blink';
    is_active: boolean;
    background_color: string;
    text_color: string;
    total_count: number;
    created_at: string;
}

const emptyBanner: Omit<PromoBanner, 'id' | 'created_at'> = {
    message: '',
    flow: 'static',
    is_active: false,
    background_color: '#000000',
    text_color: '#FFFFFF',
    total_count: 0,
};

export default function PromoBannersPage() {
    const [banners, setBanners] = useState<PromoBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PromoBanner | null>(null);
    const [form, setForm] = useState(emptyBanner);
    const [saving, setSaving] = useState(false);

    const loadBanners = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/promo-banners`, { headers: authHeaders() });
            const data = await res.json();
            if (data.success) setBanners(data.data || []);
        } catch { toast.error('Failed to load promo banners'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadBanners(); }, [loadBanners]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyBanner);
        setModalOpen(true);
    };

    const openEdit = (b: PromoBanner) => {
        setEditing(b);
        setForm({
            message: b.message,
            flow: b.flow,
            is_active: b.is_active,
            background_color: b.background_color || '#000000',
            text_color: b.text_color || '#FFFFFF',
            total_count: b.total_count || 0,
        });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.message.trim()) { toast.error('Message is required'); return; }

        setSaving(true);
        try {
            const body = {
                message: form.message.trim(),
                flow: form.flow,
                is_active: form.is_active,
                background_color: form.background_color,
                text_color: form.text_color,
                total_count: Number(form.total_count),
            };

            const url = editing
                ? `${API_URL}/api/admin/promo-banners/${editing.id}`
                : `${API_URL}/api/admin/promo-banners`;
            const method = editing ? 'PUT' : 'POST';

            const res = await authFetch(url, { method, headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
            const data = await res.json();

            if (data.success) {
                toast.success(editing ? 'Banner updated!' : 'Banner created!');
                setModalOpen(false);
                loadBanners();
            } else {
                toast.error(data.message || 'Failed to save banner');
            }
        } catch { toast.error('Error saving banner'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this promo banner?')) return;
        try {
            const res = await authFetch(`${API_URL}/api/admin/promo-banners/${id}`, { method: 'DELETE', headers: authHeaders() });
            const data = await res.json();
            if (data.success) { toast.success('Banner deleted'); loadBanners(); }
            else toast.error(data.message || 'Failed to delete');
        } catch { toast.error('Error deleting banner'); }
    };

    const toggleActive = async (b: PromoBanner) => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/promo-banners/${b.id}`, {
                method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ ...b, is_active: !b.is_active }),
            });
            const data = await res.json();
            if (data.success) { toast.success(`Banner ${!b.is_active ? 'activated' : 'deactivated'}`); loadBanners(); }
        } catch { toast.error('Error toggling banner'); }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-serif text-neutral-900 mb-2">Promo Banners</h1>
                    <p className="text-neutral-500 text-sm">Manage global storefront promotional banners.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#C5A46D] hover:bg-[#B3935C] text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Banner
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white border border-neutral-200 rounded-lg shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-6 h-6 animate-spin text-[#C5A46D]" />
                    </div>
                ) : banners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
                        <Megaphone className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">No promo banners created yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase tracking-wide text-xs">
                                    <th className="text-left px-5 py-3 font-semibold w-1/3">Message</th>
                                    <th className="text-left px-5 py-3 font-semibold w-1/5">Status & Flow</th>
                                    <th className="text-left px-5 py-3 font-semibold">Settings</th>
                                    <th className="text-left px-5 py-3 font-semibold">Created</th>
                                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {banners.map((b) => (
                                    <tr key={b.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="text-neutral-800 font-medium line-clamp-2">{b.message}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                                                    {b.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className="text-xs text-neutral-500 capitalize flex items-center gap-1">
                                                    {b.flow.replace('-', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1.5 text-xs text-neutral-600">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 min-w-[50%]">
                                                        <div className="w-3 h-3 rounded border border-neutral-200" style={{ backgroundColor: b.background_color || '#000000' }} title="Background Color" />
                                                        <span>{b.background_color || '#000000'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 min-w-[50%]">
                                                        <div className="w-3 h-3 rounded border border-neutral-200" style={{ backgroundColor: b.text_color || '#FFFFFF' }} title="Text Color" />
                                                        <span>{b.text_color || '#FFFFFF'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    Count: <span className="font-medium">{b.total_count || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-neutral-500 text-xs">
                                            {new Date(b.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => toggleActive(b)} title={b.is_active ? "Deactivate" : "Set Active"} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-emerald-600 transition-colors">
                                                    {b.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-neutral-400" />}
                                                </button>
                                                <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-[#C5A46D] transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white border border-neutral-200 rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
                            <h2 className="text-lg font-semibold text-neutral-800">
                                {editing ? 'Edit Promo Banner' : 'Create Promo Banner'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Message <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows={3}
                                    value={form.message}
                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                    placeholder="e.g. ✦ Free Shipping on orders over ₹5,000 ✦"
                                    className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D] resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">Flow</label>
                                        <select
                                            value={form.flow}
                                            onChange={e => setForm({ ...form, flow: e.target.value as typeof form.flow })}
                                            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D]"
                                        >
                                            <option value="static">Static (No Animation)</option>
                                            <option value="blink">Blinking Text</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">Total Count</label>
                                        <input
                                            type="number"
                                            value={form.total_count}
                                            onChange={e => setForm({ ...form, total_count: Number(e.target.value) })}
                                            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D]"
                                            min={0}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">Background Color</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.background_color}
                                                onChange={e => setForm({ ...form, background_color: e.target.value })}
                                                className="w-full rounded-lg border border-neutral-300 pl-4 pr-12 py-2.5 text-sm text-neutral-900 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D]"
                                                placeholder="#000000"
                                            />
                                            <div className="absolute inset-y-0 right-1.5 flex items-center">
                                                <input
                                                    type="color"
                                                    value={form.background_color}
                                                    onChange={e => setForm({ ...form, background_color: e.target.value })}
                                                    className="h-7 w-7 cursor-pointer appearance-none rounded border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-neutral-200"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-1">Text Color</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={form.text_color}
                                                onChange={e => setForm({ ...form, text_color: e.target.value })}
                                                className="w-full rounded-lg border border-neutral-300 pl-4 pr-12 py-2.5 text-sm text-neutral-900 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D]"
                                                placeholder="#FFFFFF"
                                            />
                                            <div className="absolute inset-y-0 right-1.5 flex items-center">
                                                <input
                                                    type="color"
                                                    value={form.text_color}
                                                    onChange={e => setForm({ ...form, text_color: e.target.value })}
                                                    className="h-7 w-7 cursor-pointer appearance-none rounded border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-neutral-200"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 mt-6">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#C5A46D] hover:bg-[#B3935C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editing ? 'Update Banner' : 'Create Banner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
