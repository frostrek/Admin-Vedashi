'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch, authHeaders } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Loader2, Megaphone, Leaf, Save, AlertCircle, Info } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this promo banner?')) return;
        try {
            const res = await authFetch(`${API_URL}/api/admin/promo-banners/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { toast.success('Banner deleted'); loadBanners(); }
            else toast.error(data.message || 'Failed to delete');
        } catch { toast.error('Error deleting banner'); }
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
        <div className="p-10 space-y-10 animate-fadeIn">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gold/10 rounded-2xl border border-gold/20">
                            <Megaphone className="w-8 h-8 text-gold" />
                        </div>
                        <h1 className="font-serif text-4xl font-bold text-gold tracking-tighter">
                            Promotion Banners
                        </h1>
                    </div>
                    <p className={`${isDark ? 'text-gold-soft/60' : 'text-emerald-950/80'} text-[15px] font-semibold pl-16`}>
                        Orchestrate global promotional banners across the storefront.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-3 px-8 py-3 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase rounded-2xl hover:shadow-[0_0_20px_rgba(197,164,109,0.2)] transition-all duration-300 group"
                >
                    <div className="p-1 bg-gold/20 rounded-lg group-hover:scale-110 transition-transform">
                        <Plus className="w-4 h-4" />
                    </div>
                    Create New Banner
                </button>
            </div>

            {/* Content Data Repository */}
            <div className={`${isDark ? 'bg-black/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white/95 shadow-[0_0_40px_rgba(130,139,92,0.15)]'} border border-border rounded-[2.5rem] overflow-hidden backdrop-blur-xl animate-fadeIn transition-all duration-500`}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 space-y-4 animate-pulse">
                        <div className="w-16 h-16 rounded-full border-t-2 border-l-2 border-gold animate-spin" />
                        <p className="text-[10px] font-bold uppercase text-gold/60 text-center">Calibrating Promotional Vibrations...</p>
                    </div>
                ) : banners.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-40 border-2 border-dashed border-border/40 rounded-[2.5rem] m-6 ${isDark ? 'bg-black/10' : 'bg-primary/5'} text-text-muted`}>
                        <Megaphone className="w-20 h-20 mb-8 opacity-20 text-gold" />
                        <p className={`text-xl font-bold ${isDark ? 'text-gold-soft' : 'text-emerald-950'} mb-2`}>Silent Frequencies</p>
                        <p className={`text-[10px] uppercase ${isDark ? 'opacity-60' : 'text-emerald-900/40'}`}>No promotional announcements have been manifested yet.</p>
                        <button onClick={openCreate} className={`mt-10 px-8 py-3 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.2)] transition-all duration-300`}>
                            Manifest First Aura
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b border-border ${isDark ? 'bg-black/40' : 'bg-primary/10'} text-sm font-semibold text-gold-muted uppercase`}>
                                    <th className="px-8 py-6">Message</th>
                                    <th className="px-8 py-6">Effect</th>
                                    <th className="px-8 py-6">Colours</th>
                                    <th className="px-8 py-6">Date</th>
                                    <th className="px-8 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-primary/10'}`}>
                                {banners.map((b) => (
                                    <tr key={b.id} className={`group ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-primary/5'} transition-all duration-300`}>
                                        <td className="px-8 py-10">
                                            <p className={`${isDark ? 'text-gold-soft' : 'text-emerald-950'} text-lg leading-relaxed max-w-md line-clamp-2 italic drop-shadow-md group-hover:text-gold transition-colors`}>
                                                "{b.message}"
                                            </p>
                                        </td>
                                        <td className="px-8 py-10">
                                            <div className="flex flex-col gap-2.5 items-start">
                                                <span className={`inline-flex px-4 py-1 rounded-full text-[10px] font-bold uppercase shadow-lg border ${b.is_active ? (isDark ? 'bg-gold/10 text-gold border-gold/30' : 'bg-primary/10 text-primary border-primary/30') : (isDark ? 'bg-black/40 text-text-muted/60 border-border/40' : 'bg-white text-text-muted border-border')}`}>
                                                    {b.is_active ? 'Manifested' : 'Latent'}
                                                </span>
                                                <span className={`text-[10px] ${isDark ? 'text-text-muted' : 'text-emerald-950/70'} uppercase font-bold flex items-center gap-2`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${b.flow === 'blink' ? (isDark ? 'bg-gold animate-pulse shadow-[0_0_5px_rgba(197,164,109,0.8)]' : 'bg-primary animate-pulse shadow-[0_0_5px_rgba(59,93,59,0.3)]') : 'bg-border'}`} />
                                                    {b.flow.replace('-', ' ')} oscillation
                                                </span>
                                                <span className={`text-[10px] ${isDark ? 'text-gold-soft/50' : 'text-emerald-950/50'} font-bold uppercase`}>
                                                    Scope: {b.country_code || 'Global'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-10">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="group/color relative">
                                                        <div className="w-8 h-8 rounded-xl border border-border shadow-2xl transition-transform group-hover/color:scale-110" style={{ backgroundColor: b.background_color || '#000000' }} />
                                                        <span className="absolute -bottom-6 left-0 text-[10px] font-bold text-text-muted opacity-0 group-hover/color:opacity-100 transition-opacity">TEXT</span>
                                                    </div>
                                                    <div className="group/color relative">
                                                        <div className="w-8 h-8 rounded-xl border border-border shadow-2xl transition-transform group-hover/color:scale-110" style={{ backgroundColor: b.text_color || '#FFFFFF' }} />
                                                        <span className="absolute -bottom-6 left-0 text-[8px] font-bold text-text-muted opacity-0 group-hover/color:opacity-100 transition-opacity">TEXT</span>
                                                    </div>
                                                </div>
                                                <div className={`text-[10px] font-bold ${isDark ? 'text-text-muted' : 'text-emerald-950/70'} uppercase`}>
                                                    Count: <span className={isDark ? 'text-gold-soft' : 'text-primary'}>{b.total_count || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-10">
                                            <p className={`text-[10px] font-bold ${isDark ? 'text-text-muted/40' : 'text-emerald-900/60'} uppercase`}>
                                                {new Date(b.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        </td>
                                        <td className="px-8 py-10">
                                            <div className="flex items-center justify-end gap-3">
                                                <button onClick={() => toggleActive(b)} title={b.is_active ? "Retract Vibration" : "Induce Vibration"} className={`p-3 rounded-2xl border transition-all duration-300 ${b.is_active ? (isDark ? 'bg-gold/10 border-gold/20 text-gold hover:bg-gold/20' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20') : (isDark ? 'bg-black/40 border-border text-text-muted hover:text-gold-soft' : 'bg-white border-border text-text-muted hover:bg-primary/5')}`}>
                                                    {b.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                                </button>
                                                <button onClick={() => openEdit(b)} className={`p-3 rounded-2xl ${isDark ? 'bg-black/40 border-border text-text-muted hover:text-gold hover:border-gold/30' : 'bg-white border-border text-text-muted hover:text-primary hover:border-primary/30'} transition-all duration-300`}>
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDelete(b.id)} className="p-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-all duration-300">
                                                    <Trash2 className="w-5 h-5" />
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

            {/* Configuration Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
                    <div className={`${isDark ? 'bg-gradient-to-br from-card-bg to-card-bg-elevated' : 'bg-white'} border border-border rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn`}>
                        <div className={`flex items-center justify-between p-8 border-b border-border ${isDark ? 'bg-black/40' : 'bg-primary/5'} backdrop-blur-sm sticky top-0 z-10`}>
                            <div>
                                <h4 className={`text-2xl font-bold ${isDark ? 'text-gold' : 'text-emerald-950'} tracking-tight`}>
                                    {editing ? 'Edit Banner' : 'Create Banner'}
                                </h4>
                                <p className={`text-[10px] ${isDark ? 'text-gold/40' : 'text-emerald-900/40'} font-bold uppercase mt-1`}>Campaign Configuration</p>
                            </div>
                            <button onClick={() => setModalOpen(false)} className={`p-3 rounded-full hover:bg-white/5 ${isDark ? 'text-gold-soft hover:text-gold' : 'text-emerald-900/40 hover:text-primary'} transition-all`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-8">
                            <div className="space-y-3">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase px-1 pb-1">
                                    Message <span className="text-danger">*</span>
                                    <span className="group relative cursor-pointer flex items-center">
                                        <Info className="w-3.5 h-3.5 text-text-muted/60 hover:text-gold transition-colors" />
                                        <span className="absolute bottom-full mb-2 left-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-max max-w-[200px] bg-black text-white text-[10px] normal-case px-3 py-2 rounded-lg shadow-xl z-[99999]">
                                            The main text displayed on your banner.
                                        </span>
                                    </span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={form.message}
                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                    placeholder="e.g. ✦ Free Shipping on orders over ₹5,000 ✦"
                                    className={`${inputCls} resize-none min-h-[120px] leading-relaxed italic`}
                                />
                                <div className="flex items-center gap-2 text-[10px] text-text-muted/40 px-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Use special characters to enhance the spiritual resonance of the message.</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase px-1 pb-1">
                                            Effect
                                            <span className="group relative cursor-pointer flex items-center">
                                                <Info className="w-3.5 h-3.5 text-text-muted/60 hover:text-gold transition-colors" />
                                                <span className="absolute bottom-full mb-2 left-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-max max-w-[150px] bg-black text-white text-[9px] normal-case tracking-normal px-3 py-2 rounded-lg shadow-xl z-[99999]">
                                                    Animation effect applied to the text.
                                                </span>
                                            </span>
                                        </label>
                                        <select
                                            value={form.flow}
                                            onChange={e => setForm({ ...form, flow: e.target.value as typeof form.flow })}
                                            className={inputCls}
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
                                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase px-1 pb-1">
                                            Count
                                            <span className="group relative cursor-pointer flex items-center">
                                                <Info className="w-3.5 h-3.5 text-text-muted/60 hover:text-gold transition-colors" />
                                                <span className="absolute bottom-full mb-2 left-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-max max-w-[170px] bg-black text-white text-[9px] normal-case tracking-normal px-3 py-2 rounded-lg shadow-xl z-[99999]">
                                                    Number of times the text repeats.
                                                </span>
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            value={form.total_count}
                                            onChange={e => setForm({ ...form, total_count: Number(e.target.value) })}
                                            className={inputCls}
                                            min={0}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase px-1 pb-1">
                                            Background Colour
                                            <span className="group relative cursor-pointer flex items-center">
                                                <Info className="w-3.5 h-3.5 text-text-muted/60 hover:text-gold transition-colors" />
                                                <span className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-max max-w-[180px] bg-black text-white text-[9px] normal-case tracking-normal px-3 py-2 rounded-lg shadow-xl z-[99999]">
                                                    Background color of the banner container.
                                                </span>
                                            </span>
                                        </label>
                                        <div className="relative group/color">
                                            <input
                                                type="text"
                                                value={form.background_color}
                                                onChange={e => setForm({ ...form, background_color: e.target.value })}
                                                className={`${inputCls} pr-14`}
                                                placeholder="#000000"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl border border-border shadow-inner overflow-hidden cursor-pointer">
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
                                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase px-1 pb-1">
                                            Text Color
                                            <span className="group relative cursor-pointer flex items-center">
                                                <Info className="w-3.5 h-3.5 text-text-muted/60 hover:text-gold transition-colors" />
                                                <span className="absolute bottom-full mb-2 right-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-max max-w-[180px] bg-black text-white text-[9px] normal-case tracking-normal px-3 py-2 rounded-lg shadow-xl z-[99999]">
                                                    Color of the text displayed.
                                                </span>
                                            </span>
                                        </label>
                                        <div className="relative group/color">
                                            <input
                                                type="text"
                                                value={form.text_color}
                                                onChange={e => setForm({ ...form, text_color: e.target.value })}
                                                className={`${inputCls} pr-14`}
                                                placeholder="#FFFFFF"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl border border-border shadow-inner overflow-hidden cursor-pointer">
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

                            <div className="space-y-3">
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase px-1 pb-1">
                                    Country Scope
                                    <span className="group relative cursor-pointer flex items-center">
                                        <Info className="w-3.5 h-3.5 text-text-muted/60 hover:text-gold transition-colors" />
                                        <span className="absolute bottom-full mb-2 left-0 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-max max-w-[200px] bg-black text-white text-[9px] normal-case tracking-normal px-3 py-2 rounded-lg shadow-xl z-[99999]">
                                            Target this banner to a specific country or leave as Global.
                                        </span>
                                    </span>
                                </label>
                                <select
                                    value={form.country_code || ''}
                                    onChange={e => setForm({ ...form, country_code: e.target.value || null })}
                                    className={inputCls}
                                >
                                    <option value="">Global (All Countries)</option>
                                    <option value="IN">India (IN)</option>
                                    <option value="RU">Russia (RU)</option>
                                    <option value="US">United States (US)</option>
                                    <option value="GB">United Kingdom (GB)</option>
                                    <option value="VN">Vietnam (VN)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-8 border-t border-border mt-10">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving}
                                    className={`px-6 py-2.5 text-[10px] font-bold uppercase text-text-muted ${isDark ? 'hover:text-gold' : 'hover:text-primary'} hover:bg-white/5 transition-all rounded-xl`}>
                                    Abort
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-8 py-3 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all duration-300 disabled:opacity-50">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing Vibration…</> : <><Save className="w-4 h-4" /> {editing ? 'Commit Changes' : 'Manifest Aura'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
