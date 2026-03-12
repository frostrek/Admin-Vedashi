'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    Plus, Minus, Trash2, X, Loader2, Images, Save, ToggleLeft, ToggleRight,
    Edit2, Upload, GripVertical, Check, Eye, EyeOff, Settings, Clock, MousePointer2, ArrowRight, UploadCloud, AlertCircle, Repeat, MonitorPlay
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface TextElement {
    id: string;
    text: string;
    color: string;
    fontSize: string;
}

interface ButtonElement {
    id: string;
    label: string;
    url: string;
    bgColor: string;
    textColor: string;
    size: string;
}

interface HeroSlide {
    id: string;
    image_url: string;
    headings: TextElement[];
    subheadings: TextElement[];
    buttons: ButtonElement[];
    overlay_opacity: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

const emptySlide: Omit<HeroSlide, 'id' | 'created_at' | 'sort_order'> = {
    image_url: '',
    headings: [],
    subheadings: [],
    buttons: [],
    overlay_opacity: 0.5,
    is_active: true,
};

interface HeroSettings {
    slider_speed: number;
    arrow_visibility: 'visible' | 'hover' | 'hidden';
    loop: boolean;
    slideshow_type: 'fade' | 'slide_right_to_left' | 'slide_left_to_right';
}

const inputCls = "w-full rounded-xl border border-border bg-black/20 px-4 py-2.5 text-sm text-gold-soft placeholder:text-text-muted/40 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/10 transition-all duration-300 font-medium";

export default function MediaLibraryPage() {
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [settings, setSettings] = useState<HeroSettings>({ slider_speed: 5000, arrow_visibility: 'hover', loop: true, slideshow_type: 'fade' });
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<HeroSlide | null>(null);
    const [form, setForm] = useState(emptySlide);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const headers = useCallback(() => {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) h['Authorization'] = `Bearer ${token}`;
        // Attach CSRF token from cookie (required by backend CSRF middleware)
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
            if (match) h['X-CSRF-Token'] = decodeURIComponent(match[1]);
        }
        return h;
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [slidesRes, settingsRes] = await Promise.all([
                fetch(`${API_URL}/api/media/hero`, { headers: headers() }),
                fetch(`${API_URL}/api/media/hero/settings`, { headers: headers() })
            ]);

            const slidesData = await slidesRes.json();
            const settingsData = await settingsRes.json();

            if (slidesData.success) {
                // Ensure the JSON fields are properly parsed arrays if they come back as strings or nulls
                const parsedSlides = (slidesData.data || []).map((s: any) => ({
                    ...s,
                    headings: typeof s.headings === 'string' ? JSON.parse(s.headings) : (s.headings || []),
                    subheadings: typeof s.subheadings === 'string' ? JSON.parse(s.subheadings) : (s.subheadings || []),
                    buttons: typeof s.buttons === 'string' ? JSON.parse(s.buttons) : (s.buttons || [])
                }));
                setSlides(parsedSlides);
            }
            if (settingsData.success && settingsData.data) setSettings(settingsData.data);
        } catch { toast.error('Failed to load media library'); }
        finally { setLoading(false); }
    }, [headers]);

    useEffect(() => { load(); }, [load]);

    const saveSettings = async (newSettings: HeroSettings) => {
        setSavingSettings(true);
        try {
            const res = await authFetch(`${API_URL}/api/media/hero/settings`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(newSettings)
            });
            const data = await res.json();
            if (data.success) {
                setSettings(newSettings);
                toast.success('Settings saved');
            } else {
                toast.error(data.message || 'Failed to save settings');
            }
        } catch { toast.error('Error saving settings'); }
        finally { setSavingSettings(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            ...emptySlide,
            headings: [{ id: Date.now().toString(), text: 'New Heading', color: '#ffffff', fontSize: '72' }],
            buttons: [{ id: Date.now().toString(), label: 'Shop Now', url: '/products', bgColor: '#722F37', textColor: '#ffffff', size: 'md' }]
        });
        setModalOpen(true);
    };

    const openEdit = (s: HeroSlide) => {
        setEditing(s);
        setForm({
            image_url: s.image_url,
            headings: s.headings || [],
            subheadings: s.subheadings || [],
            buttons: s.buttons || [],
            overlay_opacity: s.overlay_opacity,
            is_active: s.is_active,
        });
        setModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image must be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setForm(prev => ({ ...prev, image_url: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.image_url.trim()) { toast.error('Image is required'); return; }
        setSaving(true);
        try {
            const url = editing
                ? `${API_URL}/api/media/hero/${editing.id}`
                : `${API_URL}/api/media/hero`;
            const method = editing ? 'PUT' : 'POST';

            // Append sort_order for new slides
            const payload = { ...form, sort_order: editing ? editing.sort_order : slides.length };

            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) {
                toast.success(editing ? 'Slide updated!' : 'Slide created!');
                setModalOpen(false);
                load();
            } else {
                toast.error(data.message || 'Failed to save');
            }
        } catch { toast.error('Error saving slide'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('Delete this hero slide?')) return;
        try {
            const res = await authFetch(`${API_URL}/api/media/hero/${id}`, { method: 'DELETE', headers: headers() });
            const data = await res.json();
            if (data.success) { toast.success('Slide deleted'); load(); }
            else toast.error(data.message || 'Failed to delete');
        } catch { toast.error('Error deleting slide'); }
    };

    const handleToggle = async (s: HeroSlide, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            const res = await authFetch(`${API_URL}/api/media/hero/${s.id}/toggle`, { method: 'PATCH', headers: headers() });
            const data = await res.json();
            if (data.success) {
                toast.success(data.data.is_active ? 'Slide activated' : 'Slide deactivated');
                load();
            }
        } catch { toast.error('Error toggling slide'); }
    };

    // --- Dynamic Field Handlers ---
    const addHeading = () => setForm(f => ({ ...f, headings: [...f.headings, { id: Date.now().toString(), text: '', color: '#ffffff', fontSize: '48' }] }));
    const removeHeading = (id: string) => setForm(f => ({ ...f, headings: f.headings.filter(h => h.id !== id) }));
    const updateHeading = (id: string, field: string, value: string) => setForm(f => ({ ...f, headings: f.headings.map(h => h.id === id ? { ...h, [field]: value } : h) }));

    const addSubheading = () => setForm(f => ({ ...f, subheadings: [...f.subheadings, { id: Date.now().toString(), text: '', color: '#f0ebe3', fontSize: '18' }] }));
    const removeSubheading = (id: string) => setForm(f => ({ ...f, subheadings: f.subheadings.filter(s => s.id !== id) }));
    const updateSubheading = (id: string, field: string, value: string) => setForm(f => ({ ...f, subheadings: f.subheadings.map(s => s.id === id ? { ...s, [field]: value } : s) }));

    const addButton = () => setForm(f => ({ ...f, buttons: [...f.buttons, { id: Date.now().toString(), label: 'Button', url: '/', bgColor: '#722F37', textColor: '#ffffff', size: 'md' }] }));
    const removeButton = (id: string) => setForm(f => ({ ...f, buttons: f.buttons.filter(b => b.id !== id) }));
    const updateButton = (id: string, field: string, value: string) => setForm(f => ({ ...f, buttons: f.buttons.map(b => b.id === id ? { ...b, [field]: value } : b) }));

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-border shadow-lg">
                            <Images className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-gold tracking-tight">Visual Repository</h1>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                        Manage hero carousel slides for the storefront landing gallery.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary border border-gold/20 text-gold text-[11px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all duration-300 shadow-lg shadow-black/40"
                >
                    <Plus className="w-4 h-4" /> Manifest Slide
                </button>
            </div>

            {/* Settings Bar */}
            <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-2 text-gold font-serif font-bold text-sm tracking-widest uppercase">
                    <Settings className="w-4 h-4 text-gold" /> System Dynamics
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    {/* Speed Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-gold-soft" /> Temporal Flow
                        </label>
                        <select
                            value={settings.slider_speed}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, slider_speed: parseInt(e.target.value) })}
                            className="bg-black/20 border border-border text-gold-soft text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-1.5 focus:border-gold/30 focus:ring-1 focus:ring-gold/10 disabled:opacity-50 transition-all"
                        >
                            <option value={3000}>Fast (3s)</option>
                            <option value={5000}>Normal (5s)</option>
                            <option value={7000}>Slow (7s)</option>
                            <option value={10000}>Stagnant (10s)</option>
                        </select>
                    </div>

                    {/* Arrow Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                            <MousePointer2 className="w-3.5 h-3.5 text-gold-soft" /> Navigation
                        </label>
                        <select
                            value={settings.arrow_visibility}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, arrow_visibility: e.target.value as any })}
                            className="bg-black/20 border border-border text-gold-soft text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-1.5 focus:border-gold/30 focus:ring-1 focus:ring-gold/10 disabled:opacity-50 transition-all"
                        >
                            <option value="hover">On Presence</option>
                            <option value="visible">Omnipresent</option>
                            <option value="hidden">Ethereal</option>
                        </select>
                    </div>

                    {/* Loop Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                            <Repeat className="w-3.5 h-3.5 text-gold-soft" /> Cycle
                        </label>
                        <select
                            value={settings.loop ? 'true' : 'false'}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, loop: e.target.value === 'true' })}
                            className="bg-black/20 border border-border text-gold-soft text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-1.5 focus:border-gold/30 focus:ring-1 focus:ring-gold/10 disabled:opacity-50 transition-all"
                        >
                            <option value="true">Infinite</option>
                            <option value="false">Finite</option>
                        </select>
                    </div>

                    {/* Transition Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                            <MonitorPlay className="w-3.5 h-3.5 text-gold-soft" /> Effect
                        </label>
                        <select
                            value={settings.slideshow_type}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, slideshow_type: e.target.value as any })}
                            className="bg-black/20 border border-border text-gold-soft text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-1.5 focus:border-gold/30 focus:ring-1 focus:ring-gold/10 disabled:opacity-50 transition-all"
                        >
                            <option value="fade">Dissolve</option>
                            <option value="slide_right_to_left">Transversal Link</option>
                            <option value="slide_left_to_right">Transversal Reverse</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Live preview bar */}
            <div className="bg-primary/5 border border-border/40 rounded-2xl p-4 text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted flex items-center gap-3 animate-fadeInUp shadow-inner" style={{ animationDelay: '200ms' }}>
                <Eye className="w-4 h-4 text-gold flex-shrink-0" />
                <span>
                    <span className="text-gold font-serif">{slides.filter(s => s.is_active).length}</span> Manifested slides currently active in the visual stratum.
                </span>
            </div>

            {/* Slides Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-32 space-y-4 animate-pulse">
                    <div className="w-16 h-16 rounded-full border-t-2 border-l-2 border-gold animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold/60">Synchronizing Visual Assets...</p>
                </div>
            ) : slides.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-32 border-2 border-dashed border-border/40 rounded-3xl bg-black/10 text-text-muted animate-fadeIn">
                    <Images className="w-20 h-20 mb-6 opacity-20 text-gold" />
                    <p className="text-lg font-serif font-bold text-gold-soft mb-2">No Visual Essences Found</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-8">Begin by manifesting your first storefront visual asset.</p>
                    <button onClick={openCreate} className="px-8 py-3 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.2)] transition-all duration-300">
                        Upload Essence
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`group relative rounded-2xl overflow-hidden border border-border bg-black/40 aspect-[16/10] shadow-2xl transition-all duration-500 hover:border-gold/30 hover:-translate-y-1 ${!slide.is_active ? 'opacity-40 grayscale-[50%]' : ''}`}
                        >
                            {/* The Image */}
                            <img
                                src={slide.image_url}
                                alt={slide.headings[0]?.text || 'Hero slide'}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBmaWxsPSIjMDcwYTA4Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+'; }}
                            />

                            {/* Overlay simulating storefront */}
                            <div
                                className="absolute inset-0 bg-black pointer-events-none"
                                style={{ opacity: slide.overlay_opacity * 0.7 }}
                            />

                            {/* Static overlay text (visible normally) */}
                            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                                <p className="text-gold font-serif font-bold text-xl truncate drop-shadow-2xl mb-1">
                                    {slide.headings[0]?.text || <span className="italic opacity-30">Unnamed Essence</span>}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em] shadow-lg ${slide.is_active ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-black/40 text-text-muted border border-border/30'}`}>
                                        {slide.is_active ? 'Manifested' : 'Latent'}
                                    </span>
                                </div>
                            </div>

                            {/* Hover Actions Overlay */}
                            <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                                <button
                                    onClick={() => openEdit(slide)}
                                    className="flex items-center gap-2 px-8 py-3 bg-gold text-primary text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:scale-105 transition-all shadow-2xl border border-white/20"
                                >
                                    <Edit2 className="w-4 h-4" /> Reconfigure
                                </button>

                                <div className="flex items-center gap-4 scale-90 group-hover:scale-100 transition-transform duration-500">
                                    <button
                                        onClick={(e) => handleToggle(slide, e)}
                                        className={`p-3 rounded-full text-gold backdrop-blur-md border border-gold/20 transition-all duration-300 ${slide.is_active ? 'bg-black/40 hover:bg-black/60' : 'bg-gold/40 hover:bg-gold/60'}`}
                                        title={slide.is_active ? 'Deactivate Essence' : 'Manifest Essence'}
                                    >
                                        {slide.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(slide.id, e)}
                                        className="p-3 rounded-full bg-danger/20 text-danger border border-danger/40 backdrop-blur-md hover:bg-danger/40 transition-all duration-300"
                                        title="Purge Essence"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit / Create Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
                    <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
                        <div className="flex items-center justify-between p-6 border-b border-border bg-black/40 backdrop-blur-sm sticky top-0 z-10">
                            <h2 className="text-xl font-serif font-bold text-gold tracking-tight lowercase">
                                <span className="text-[10px] uppercase block tracking-[0.3em] font-bold text-gold/40 mb-1">Visual Configuration</span>
                                {editing ? 'Refine Essence' : 'Manifest New Essence'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-3 rounded-full hover:bg-white/5 text-gold-soft hover:text-gold transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">

                            {/* File Upload Area */}
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                                    Prime Visual Asset <span className="text-danger">*</span>
                                </label>

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />

                                {form.image_url ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-border aspect-[16/7] bg-black/40 group shadow-2xl">
                                        <img
                                            src={form.image_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBmaWxsPSIjMDcwYTA4Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+'; }}
                                        />

                                        {/* Storefront appearance simulation */}
                                        <div className="absolute inset-0 bg-black flex items-end p-4 pointer-events-none"
                                            style={{ opacity: form.overlay_opacity }}>
                                        </div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white pointer-events-none px-6">
                                            {/* Headings */}
                                            <div className="space-y-1 mb-4">
                                                {form.headings.map(h => {
                                                    const isNum = !isNaN(Number(h.fontSize)) && h.fontSize !== '';
                                                    return (
                                                        <h1 key={h.id} style={{ color: h.color, fontSize: isNum ? `${parseInt(h.fontSize) / 2}px` : undefined }} className={`font-serif font-bold leading-tight drop-shadow-2xl ${!isNum ? `text-${h.fontSize}` : ''}`}>
                                                            {h.text || 'Heading Preview'}
                                                        </h1>
                                                    )
                                                })}
                                            </div>

                                            {/* Subheadings */}
                                            <div className="space-y-1 mb-6">
                                                {form.subheadings.map(s => {
                                                    const isNum = !isNaN(Number(s.fontSize)) && s.fontSize !== '';
                                                    return (
                                                        <p key={s.id} style={{ color: s.color, fontSize: isNum ? `${parseInt(s.fontSize) / 2}px` : undefined }} className={`max-w-xl leading-relaxed drop-shadow-md opacity-90 ${!isNum ? `text-${s.fontSize}` : ''}`}>
                                                            {s.text || 'Subheading Preview'}
                                                        </p>
                                                    )
                                                })}
                                            </div>

                                            {/* Buttons */}
                                            <div className="flex flex-wrap gap-3">
                                                {form.buttons.map(b => (
                                                    <span
                                                        key={b.id}
                                                        style={{ backgroundColor: b.bgColor, color: b.textColor }}
                                                        className="inline-flex items-center gap-2 rounded-lg px-6 py-2 text-[8px] font-bold uppercase tracking-widest shadow-2xl"
                                                    >
                                                        {b.label || 'Action'}
                                                        <ArrowRight className="h-2.5 w-2.5" />
                                                    </span>
                                                ))}
                                            </div></div>

                                        {/* Change Image Overlay */}
                                        <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-sm">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-6 py-2.5 bg-gold text-primary rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl hover:scale-110 transition-transform flex items-center gap-2"
                                            >
                                                <UploadCloud className="w-4 h-4" /> Recalibrate Asset
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-border/40 rounded-2xl p-10 hover:bg-white/5 hover:border-gold/30 transition-all duration-500 cursor-pointer flex flex-col items-center justify-center text-center group"
                                    >
                                        <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud className="w-8 h-8 text-gold" />
                                        </div>
                                        <p className="text-sm font-serif font-bold text-gold-soft mb-1">Manifest Visual Essence</p>
                                        <p className="text-[10px] uppercase tracking-widest text-text-muted opacity-60">JPEG, PNG, WebP up to 10MB</p>
                                        <div className="mt-6 flex items-center gap-2 text-[9px] uppercase tracking-widest text-gold opacity-40">
                                            <div className="h-px w-8 bg-gold/20" />
                                            Optimal 1920x1080
                                            <div className="h-px w-8 bg-gold/20" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Dynamic Headings ── */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase">Headings</h3>
                                    <button
                                        type="button"
                                        onClick={addHeading}
                                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold hover:text-gold-soft transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Append Heading
                                    </button>
                                </div>
                                {form.headings.map((h, i) => (
                                    <div key={h.id} className="flex items-center gap-3 bg-black/20 p-4 rounded-2xl border border-border group animate-fadeIn">
                                        <span className="text-[10px] font-bold text-gold/30 w-5">{i + 1}.</span>
                                        <input
                                            type="text"
                                            value={h.text}
                                            onChange={e => updateHeading(h.id, 'text', e.target.value)}
                                            placeholder="E.g., The Art of Vedic Wellness"
                                            className={`${inputCls} flex-1`}
                                        />
                                        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-border rounded-xl shadow-inner">
                                            <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                                Color
                                                <input
                                                    type="color"
                                                    value={h.color}
                                                    onChange={e => updateHeading(h.id, 'color', e.target.value)}
                                                    className="w-6 h-6 p-0.5 border border-border rounded-lg bg-black/20 cursor-pointer"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2 border border-border rounded-xl bg-black/40 px-3 py-1 shadow-inner">
                                            <input
                                                type="number"
                                                min="10"
                                                max="150"
                                                value={!isNaN(Number(h.fontSize)) ? h.fontSize : h.fontSize.replace(/\D/g, '') || '72'}
                                                onChange={e => updateHeading(h.id, 'fontSize', e.target.value)}
                                                className="w-12 text-[10px] font-bold text-gold-soft bg-transparent focus:outline-none"
                                            />
                                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">px</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeHeading(h.id)}
                                            className="p-2.5 text-text-muted/40 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                                            title="Purge Heading"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {form.headings.length === 0 && (
                                    <p className="text-[10px] text-text-muted/40 italic text-center py-4 border border-dashed border-border/40 rounded-2xl">No active headings manifested.</p>
                                )}
                            </div>

                            {/* ── Dynamic Subheadings ── */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase">Subheadings</h3>
                                    <button
                                        type="button"
                                        onClick={addSubheading}
                                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold hover:text-gold-soft transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Append Subheading
                                    </button>
                                </div>
                                {form.subheadings.map((s, i) => (
                                    <div key={s.id} className="flex items-center gap-3 bg-black/20 p-4 rounded-2xl border border-border group animate-fadeIn">
                                        <span className="text-[10px] font-bold text-gold/30 w-5">{i + 1}.</span>
                                        <input
                                            type="text"
                                            value={s.text}
                                            onChange={e => updateSubheading(s.id, 'text', e.target.value)}
                                            placeholder="Subheading essence..."
                                            className={`${inputCls} flex-1`}
                                        />
                                        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-border rounded-xl shadow-inner">
                                            <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                                Color
                                                <input
                                                    type="color"
                                                    value={s.color}
                                                    onChange={e => updateSubheading(s.id, 'color', e.target.value)}
                                                    className="w-6 h-6 p-0.5 border border-border rounded-lg bg-black/20 cursor-pointer"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2 border border-border rounded-xl bg-black/40 px-3 py-1 shadow-inner">
                                            <input
                                                type="number"
                                                min="10"
                                                max="150"
                                                value={!isNaN(Number(s.fontSize)) ? s.fontSize : s.fontSize.replace(/\D/g, '') || '18'}
                                                onChange={e => updateSubheading(s.id, 'fontSize', e.target.value)}
                                                className="w-12 text-[10px] font-bold text-gold-soft bg-transparent focus:outline-none"
                                            />
                                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">px</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSubheading(s.id)}
                                            className="p-2.5 text-text-muted/40 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                                            title="Purge Subheading"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* ── Dynamic Buttons ── */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase">Interaction Nodes</h3>
                                    <button
                                        type="button"
                                        onClick={addButton}
                                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold hover:text-gold-soft transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Link Aspect
                                    </button>
                                </div>
                                {form.buttons.map((b, i) => (
                                    <div key={b.id} className="flex flex-col gap-4 bg-black/20 p-5 rounded-2xl border border-border relative group animate-fadeIn transition-all hover:bg-black/30">
                                        <button
                                            type="button"
                                            onClick={() => removeButton(b.id)}
                                            className="absolute top-4 right-4 p-2 text-text-muted/40 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                                            title="Sever Link"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <div className="grid grid-cols-2 gap-4 pr-10">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-1">Label</label>
                                                <input
                                                    type="text"
                                                    value={b.label}
                                                    onChange={e => updateButton(b.id, 'label', e.target.value)}
                                                    placeholder="E.g. Shop Now"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-1">URL</label>
                                                <input
                                                    type="text"
                                                    value={b.url}
                                                    onChange={e => updateButton(b.id, 'url', e.target.value)}
                                                    placeholder="/products"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 px-1">
                                            <div className="flex items-center gap-3 px-3 py-1 bg-black/40 border border-border rounded-xl shadow-inner">
                                                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                                    Background
                                                    <input
                                                        type="color"
                                                        value={b.bgColor}
                                                        onChange={e => updateButton(b.id, 'bgColor', e.target.value)}
                                                        className="w-6 h-6 p-0.5 border border-border rounded-lg bg-black/20 cursor-pointer"
                                                    />
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-3 px-3 py-1 bg-black/40 border border-border rounded-xl shadow-inner">
                                                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest cursor-pointer flex items-center gap-2">
                                                    Text Color
                                                    <input
                                                        type="color"
                                                        value={b.textColor}
                                                        onChange={e => updateButton(b.id, 'textColor', e.target.value)}
                                                        className="w-6 h-6 p-0.5 border border-border rounded-lg bg-black/20 cursor-pointer"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-black/40 rounded-2xl p-6 border border-border shadow-inner space-y-4">
                                <label className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                                    <span>Atmospheric Density</span>
                                    <span className="text-gold bg-gold/10 px-3 py-1 rounded-lg border border-gold/20 font-serif">{Math.round(form.overlay_opacity * 100)}%</span>
                                </label>
                                <input
                                    type="range" min={0} max={1} step={0.05}
                                    value={form.overlay_opacity}
                                    onChange={e => setForm({ ...form, overlay_opacity: parseFloat(e.target.value) })}
                                    className="w-full accent-gold h-1.5 bg-black/40 rounded-full cursor-pointer"
                                />
                                <div className="flex justify-between text-[9px] uppercase font-bold text-text-muted/40 tracking-widest px-1">
                                    <span>Transparent</span>
                                    <span>Absolute Void</span>
                                </div>
                                <p className="text-[10px] text-text-muted/60 leading-relaxed flex items-start gap-2 pt-2">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-gold/40" />
                                    <span>Modulate density to ensure typographic clarity against the prime visual asset.</span>
                                </p>
                            </div>

                            <label className="flex items-center justify-between cursor-pointer select-none p-5 rounded-2xl border border-border bg-black/20 hover:bg-black/40 hover:border-gold/20 transition-all duration-300">
                                <div>
                                    <p className="text-sm font-serif font-bold text-gold-soft tracking-wide">Manifest Immediately</p>
                                    <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-widest font-medium">Toggle visibility of this essence within the storefront</p>
                                </div>
                                <div className={`relative w-14 h-7 rounded-full transition-all duration-500 flex-shrink-0 ${form.is_active ? 'bg-gold shadow-[0_0_15px_rgba(197,164,109,0.3)]' : 'bg-border'}`}>
                                    <div className={`absolute top-1.5 left-1.5 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-500 ease-out ${form.is_active ? 'translate-x-7' : ''}`} />
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={form.is_active}
                                        onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                    />
                                </div>
                            </label>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving}
                                    className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-gold hover:bg-white/5 transition-all rounded-xl">
                                    Abort
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-8 py-3 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all duration-300 disabled:opacity-50">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing Essence…</> : <><Save className="w-4 h-4" /> {editing ? 'Commit Changes' : 'Manifest Slide'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
