'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch, authHeaders } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Loader2, Megaphone, Leaf, Save, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import ConfirmModal from '@/components/ConfirmModal';

import { API_URL } from '@/lib/api';

interface PromoBanner {
    id: string;
    message: string;
    flow: 'static' | 'blink' | 'marquee-left' | 'marquee-right' | 'fade' | 'typewriter' | 'bounce' | 'glow';
    is_active: boolean;
    background_color: string;
    text_color: string;
    total_count: number;
    country_code: string | null;
    created_at: string;
}

const COUNTRY_OPTIONS = [
    { value: '', label: '🌍 Global (All Regions)' },
    { value: 'IN', label: '🇮🇳 India' },
    { value: 'US', label: '🇺🇸 United States' },
    { value: 'GB', label: '🇬🇧 United Kingdom' },
    { value: 'AE', label: '🇦🇪 UAE' },
    { value: 'CA', label: '🇨🇦 Canada' },
    { value: 'AU', label: '🇦🇺 Australia' },
    { value: 'RU', label: '🇷🇺 Russia' },
    { value: 'KR', label: '🇰🇷 South Korea' },
];

const emptyBanner: Omit<PromoBanner, 'id' | 'created_at'> = {
    message: '',
    flow: 'static',
    is_active: false,
    background_color: '#000000',
    text_color: '#FFFFFF',
    total_count: 0,
    country_code: null,
};

export default function PromoBannersPage() {
    const { isDark } = useTheme();
    const [banners, setBanners] = useState<PromoBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PromoBanner | null>(null);
    const [form, setForm] = useState(emptyBanner);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadBanners = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/promo-banners`);
            const data = await res.json();
            if (data.success) setBanners(data.data || []);
        } catch { toast.error('Failed to load promo banners'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadBanners(); }, [loadBanners]);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (modalOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [modalOpen]);

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
            country_code: b.country_code || null,
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
                country_code: form.country_code,
            };

            const url = editing
                ? `${API_URL}/api/admin/promo-banners/${editing.id}`
                : `${API_URL}/api/admin/promo-banners`;
            const method = editing ? 'PUT' : 'POST';

            const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/promo-banners/${deleteTarget}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { 
                toast.success('Banner purged successfully'); 
                setDeleteTarget(null);
                loadBanners(); 
            }
            else toast.error(data.message || 'Failed to delete banner');
        } catch { toast.error('Error deleting banner'); }
        finally { setDeleting(false); }
    };

    const toggleActive = async (b: PromoBanner) => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/promo-banners/${b.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...b, is_active: !b.is_active }),
            });
            const data = await res.json();
            if (data.success) { toast.success(`Banner ${!b.is_active ? 'activated' : 'deactivated'}`); loadBanners(); }
        } catch { toast.error('Error toggling banner'); }
    };

    const inputCls = `w-full rounded-2xl border border-border ${isDark ? 'bg-black/40' : 'bg-white'} px-5 py-3 text-sm ${isDark ? 'text-gold-soft' : 'text-emerald-950'} placeholder:text-text-muted/40 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-300 shadow-inner`;

    return (
        <>
            <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn mb-24 min-h-screen">
                {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="font-serif text-4xl font-bold text-gold tracking-tighter">
                            Promotion Banners
                        </h1>
                    </div>
                    <p className={`${isDark ? 'text-gold-soft/60' : 'text-black'} text-[15px] font-semibold`}>
                        Orchestrate global promotional banners across the storefront.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="group flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-[13px] font-bold text-[#E8D8B9] hover:opacity-90 transition-all duration-300 shadow-sm"
                >
                    <Plus className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                    Create New Banner
                </button>
            </div>

            {/* Content Data Repository */}
            <div className={`${isDark ? 'bg-black/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white shadow-sm'} border border-neutral-200 rounded-2xl overflow-hidden animate-fadeIn transition-all duration-500`}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 space-y-4 animate-pulse">
                        <div className="w-16 h-16 rounded-full border-t-2 border-l-2 border-gold animate-spin" />
                        <p className="text-[10px] font-bold uppercase text-gold/60 text-center">Calibrating Promotional Vibrations...</p>
                    </div>
                ) : banners.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-40 border-2 border-dashed border-neutral-200 rounded-[32px] m-6 ${isDark ? 'bg-black/10' : 'bg-neutral-50'} text-neutral-400`}>
                        <Megaphone className="w-20 h-20 mb-8 opacity-20 text-gold" />
                        <p className={`text-xl font-bold ${isDark ? 'text-gold-soft' : 'text-[#2A3B2C]'} mb-2`}>Silent Frequencies</p>
                        <p className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? 'opacity-60' : 'text-neutral-400'}`}>No promotional announcements have been manifested yet.</p>
                        <button onClick={openCreate} className="group mt-10 flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-[13px] font-bold text-[#E8D8B9] hover:opacity-90 transition-all duration-300 shadow-sm">
                            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                            Manifest First Aura
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b border-neutral-100 ${isDark ? 'bg-black/40' : 'bg-[#FDFBF7]'} text-[10px] font-bold text-gold uppercase tracking-widest`}>
                                    <th className="px-6 py-3.5">Message</th>
                                    <th className="px-6 py-3.5">Region</th>
                                    <th className="px-6 py-3.5">Effect</th>
                                    <th className="px-6 py-3.5">Colours</th>
                                    <th className="px-6 py-3.5">Date</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`${isDark ? 'divide-y divide-white/5' : 'divide-y divide-neutral-100'}`}>
                                {banners.map((b) => (
                                    <tr key={b.id} className={`group ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-neutral-50/50'} transition-all duration-300`}>
                                        <td className="px-6 py-4 w-[35%]">
                                            <p className={`${isDark ? 'text-gold-soft' : 'text-[#2A3B2C]'} text-[13px] font-medium leading-relaxed max-w-sm italic`}>
                                                "{b.message}"
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${b.country_code ? (isDark ? 'bg-gold/5 text-gold' : 'bg-[#F4F5F4] text-[#2A3B2C]') : (isDark ? 'bg-white/5 text-neutral-400' : 'bg-[#F4F5F4] text-[#2A3B2C]')}`}>
                                                <span className="text-[12px]">{b.country_code ? '📍' : '🌍'}</span> {b.country_code ? (COUNTRY_OPTIONS.find(c => c.value === b.country_code)?.label || b.country_code) : 'Global'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2 items-start">
                                                <span className={`inline-flex px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm ${b.is_active ? (isDark ? 'bg-gold/10 text-gold border-gold/30' : 'bg-primary/5 text-primary border-primary/20') : (isDark ? 'bg-transparent text-neutral-500 border-neutral-700' : 'bg-white text-gold border-gold/20')}`}>
                                                    {b.is_active ? 'Manifested' : 'Latent'}
                                                </span>
                                                <span className={`text-[9px] ${isDark ? 'text-neutral-500' : 'text-neutral-500'} uppercase font-bold tracking-widest mt-1 flex items-center gap-1.5`}>
                                                    <div className={`w-1 h-1 rounded-full ${b.flow === 'blink' ? 'bg-gold animate-pulse' : 'bg-neutral-300'}`} />
                                                    {b.flow.replace('-', ' ')} oscillation
                                                </span>
                                                <span className={`text-[8px] ${isDark ? 'text-neutral-600' : 'text-neutral-400'} font-bold uppercase tracking-widest`}>
                                                    Scope: {b.country_code || 'Global'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-[8px] border border-neutral-200 shadow-sm" style={{ backgroundColor: b.background_color || '#000000' }} />
                                                    <div className="w-7 h-7 rounded-[8px] border border-neutral-200 shadow-sm" style={{ backgroundColor: b.text_color || '#FFFFFF' }} />
                                                </div>
                                                <div className={`text-[9px] font-bold ${isDark ? 'text-neutral-500' : 'text-[#2A3B2C]'} uppercase tracking-widest`}>
                                                    Count: {b.total_count || 0}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex flex-col leading-snug`}>
                                                <span>{new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                <span>{new Date(b.created_at).getFullYear()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2.5">
                                                <button onClick={() => toggleActive(b)} title={b.is_active ? "Retract" : "Activate"} className={`p-2 rounded-full transition-all duration-300 ${b.is_active ? 'bg-white border border-primary/20 text-primary hover:bg-primary/5 shadow-sm' : 'bg-white border border-neutral-200 text-neutral-400 hover:text-black shadow-sm'}`}>
                                                    {b.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => openEdit(b)} className={`p-2 rounded-full ${isDark ? 'text-neutral-500 hover:text-gold hover:bg-white/5' : 'text-[#A89062] hover:bg-neutral-50'} transition-all duration-300`}>
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteTarget(b.id)} className="p-2 rounded-full bg-[#FFF0F0] text-[#FF4D4D] hover:bg-red-100 transition-all duration-300">
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
            </div>

            {/* Configuration Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setModalOpen(false)}
                    />

                    <div className="relative bg-white border border-neutral-200 rounded-[32px] shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white sticky top-0 z-20">
                            <div>
                                <h4 className="font-serif text-xl font-bold text-gold tracking-tight">
                                    {editing ? 'Refine Banner' : 'Manifest New Banner'}
                                </h4>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Campaign Configuration</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                            <div className="p-6 space-y-8">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase px-1 pb-1">
                                        Message <span className="text-danger">*</span>
                                        <span className="group relative cursor-pointer flex items-center">
                                            <Info className="w-3.5 h-3.5 text-neutral-400 hover:text-gold transition-colors" />
                                        </span>
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={form.message}
                                        onChange={e => setForm({ ...form, message: e.target.value })}
                                        placeholder="e.g. ✦ Free Shipping on orders over ₹5,000 ✦"
                                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-black placeholder:text-neutral-400 focus:border-gold/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all resize-none min-h-[100px] leading-relaxed italic"
                                    />
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 px-1 font-medium">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>Use special characters to enhance the spiritual resonance.</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase px-1 pb-1">
                                        Target Region
                                    </label>
                                    <select
                                        value={form.country_code || ''}
                                        onChange={e => setForm({ ...form, country_code: e.target.value || null })}
                                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-black focus:border-gold/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                                    >
                                        {COUNTRY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase px-1 pb-1">
                                                Effect
                                            </label>
                                            <select
                                                value={form.flow}
                                                onChange={e => setForm({ ...form, flow: e.target.value as typeof form.flow })}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-black focus:border-gold/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                                            >
                                                <option value="static">Static (Constant)</option>
                                                <option value="blink">Blink (Pulsating)</option>
                                                <option value="marquee-left">Scrolling (Right to Left)</option>
                                                <option value="marquee-right">Scrolling (Left to Right)</option>
                                                <option value="fade">Fade (Smooth Pulse)</option>
                                                <option value="typewriter">Typewriter (Reveal)</option>
                                                <option value="bounce">Bounce (Playful)</option>
                                                <option value="glow">Glow (Luminous)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase px-1 pb-1">
                                                Count
                                            </label>
                                            <input
                                                type="number"
                                                value={form.total_count}
                                                onChange={e => setForm({ ...form, total_count: Number(e.target.value) })}
                                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-black focus:border-gold/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all"
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase px-1 pb-1">
                                                Background Colour
                                            </label>
                                            <div className="relative group/color">
                                                <input
                                                    type="text"
                                                    value={form.background_color}
                                                    onChange={e => setForm({ ...form, background_color: e.target.value })}
                                                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-black focus:border-gold/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all pr-14"
                                                    placeholder="#000000"
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg border border-neutral-200 shadow-inner overflow-hidden cursor-pointer">
                                                    <input
                                                        type="color"
                                                        value={form.background_color}
                                                        onChange={e => setForm({ ...form, background_color: e.target.value })}
                                                        className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 uppercase px-1 pb-1">
                                                Text Colour
                                            </label>
                                            <div className="relative group/color">
                                                <input
                                                    type="text"
                                                    value={form.text_color}
                                                    onChange={e => setForm({ ...form, text_color: e.target.value })}
                                                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm text-black focus:border-gold/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all pr-14"
                                                    placeholder="#FFFFFF"
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg border border-neutral-200 shadow-inner overflow-hidden cursor-pointer">
                                                    <input
                                                        type="color"
                                                        value={form.text_color}
                                                        onChange={e => setForm({ ...form, text_color: e.target.value })}
                                                        className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3 sticky bottom-0 z-20">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving}
                                    className="px-5 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-800 transition-all rounded-lg border border-neutral-200 bg-white shadow-sm">
                                    Abort
                                </button>
                                <button type="submit" disabled={saving}
                                    className="group flex items-center gap-2 px-6 py-2 bg-primary border border-gold/10 text-[#E8D8B9] text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-50">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing…</> : <><Save className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> {editing ? 'Commit Changes' : 'Manifest Aura'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Purge Promo Banner"
                confirmLabel="Purge Immediately"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={handleDelete}
            >
                <div className="space-y-4">
                    <p className="text-text-primary font-medium">
                        Are you sure you want to permanently remove this promotional banner?
                    </p>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3.5 items-start">
                        <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm font-bold text-red-900 uppercase tracking-tight">Destructive Action</p>
                            <p className="text-sm text-red-800/80 leading-relaxed font-medium">
                                This action will permanently remove the banner and immediately cease its broadcast across the storefront. This is irreversible.
                            </p>
                        </div>
                    </div>
                </div>
            </ConfirmModal>
        </>
    );
}
