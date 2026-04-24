'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    Plus, Minus, Trash2, X, Loader2, Images, Save, ToggleLeft, ToggleRight,
    Edit2, Upload, GripVertical, Check, Eye, EyeOff, Settings, Clock, MousePointer2, ArrowRight, UploadCloud, AlertCircle, Repeat, MonitorPlay
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import ConfirmModal from '@/components/ConfirmModal';

import { API_URL } from '@/lib/api';

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

const inputCls = "w-full rounded-lg border border-border/40 bg-black/5 px-3 py-2 text-sm text-black placeholder:text-text-muted/40 focus:border-black/40 focus:outline-none focus:ring-1 focus:ring-black/5 transition-all duration-300 font-medium";

export default function MediaLibraryPage() {
    const { isDark } = useTheme();
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [settings, setSettings] = useState<HeroSettings>({ slider_speed: 3000, arrow_visibility: 'hover', loop: true, slideshow_type: 'fade' });
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<HeroSlide | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState(emptySlide);
    const [saving, setSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);



    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [slidesRes, settingsRes] = await Promise.all([
                authFetch(`${API_URL}/api/media/hero`),
                authFetch(`${API_URL}/api/media/hero/settings`)
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
    }, []);

    useEffect(() => { load(); }, [load]);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (modalOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [modalOpen]);

    const saveSettings = async (newSettings: HeroSettings) => {
        setSavingSettings(true);
        try {
            const res = await authFetch(`${API_URL}/api/media/hero/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
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

            const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setDeleting(true);
        try {
            const res = await authFetch(`${API_URL}/api/media/hero/${deleteTarget}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Essence purged successfully');
                load();
            } else {
                toast.error(data.message || 'Failed to purge essence');
            }
        } catch (error) {
            toast.error('An error occurred while purging');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleToggle = async (s: HeroSlide, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            const res = await authFetch(`${API_URL}/api/media/hero/${s.id}/toggle`, { method: 'PATCH' });
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
        <>
            <div className="max-w-6xl mx-auto space-y-5 animate-fadeIn mb-24 min-h-screen">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="font-serif text-2xl font-bold text-black">Visual Repository</h1>
                        </div>
                        <p className="text-sm font-semibold text-black">
                            Manage hero carousel slides for the storefront landing gallery.
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="group flex items-center gap-2 rounded-xl border border-gold/10 bg-primary px-4 py-2 text-[13px] font-semibold text-[#E8D8B9] hover:opacity-90 transition-all duration-300 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                        Manifest Slide
                    </button>
                </div>

                {/* Settings Bar */}
                <div className={`border border-border/40 rounded-2xl p-5 shadow-sm backdrop-blur-md flex flex-col gap-6 animate-fadeInUp ${isDark ? 'bg-gradient-to-br from-card-bg to-card-bg-elevated' : 'bg-white/90'}`} style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-neutral-100 border-neutral-200'}`}>
                            <Settings className={`w-5 h-5 ${isDark ? 'text-white' : 'text-black'}`} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className={`font-serif text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>System Dynamics</h2>
                            <p className={`text-[10px] font-bold uppercase tracking-wider opacity-40 ${isDark ? 'text-white' : 'text-black'}`}>Engine Configuration & Global State</p>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-5 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-neutral-50/50 border-neutral-200'}`}>
                        {/* Speed Config */}
                        <div className="flex flex-col gap-2 group">
                            <label className={`text-[11px] font-bold uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-neutral-400 group-hover:text-white' : 'text-neutral-500 group-hover:text-black'} transition-colors`}>
                                <Clock className="w-3 h-3" /> Temporal Flow
                            </label>
                            <select
                                value={settings.slider_speed}
                                disabled={savingSettings}
                                onChange={(e) => saveSettings({ ...settings, slider_speed: parseInt(e.target.value) })}
                                className={`w-full border text-[11px] font-bold rounded-lg px-3 py-2 disabled:opacity-50 transition-all outline-none cursor-pointer appearance-none ${isDark ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-neutral-200 text-black shadow-sm'}`}
                            >
                                <option value={2000}>Fast (2s)</option>
                                <option value={3000}>Normal (3s)</option>
                                <option value={5000}>Slow (5s)</option>
                                <option value={8000}>Stagnant (8s)</option>
                            </select>
                        </div>

                        {/* Arrow Config */}
                        <div className="flex flex-col gap-2 group">
                            <label className={`text-[11px] font-bold uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-neutral-400 group-hover:text-white' : 'text-neutral-500 group-hover:text-black'} transition-colors`}>
                                <MousePointer2 className="w-3 h-3" /> Navigation
                            </label>
                            <select
                                value={settings.arrow_visibility}
                                disabled={savingSettings}
                                onChange={(e) => saveSettings({ ...settings, arrow_visibility: e.target.value as any })}
                                className={`w-full border text-[11px] font-bold rounded-lg px-3 py-2 disabled:opacity-50 transition-all outline-none cursor-pointer appearance-none ${isDark ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-neutral-200 text-black shadow-sm'}`}
                            >
                                <option value="hover">On Presence</option>
                                <option value="visible">Omnipresent</option>
                                <option value="hidden">Ethereal</option>
                            </select>
                        </div>

                        {/* Loop Config */}
                        <div className="flex flex-col gap-2 group">
                            <label className={`text-[11px] font-bold uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-neutral-400 group-hover:text-white' : 'text-neutral-500 group-hover:text-black'} transition-colors`}>
                                <Repeat className="w-3 h-3" /> Cycle
                            </label>
                            <select
                                value={settings.loop ? 'true' : 'false'}
                                disabled={savingSettings}
                                onChange={(e) => saveSettings({ ...settings, loop: e.target.value === 'true' })}
                                className={`w-full border text-[11px] font-bold rounded-lg px-3 py-2 disabled:opacity-50 transition-all outline-none cursor-pointer appearance-none ${isDark ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-neutral-200 text-black shadow-sm'}`}
                            >
                                <option value="true">Infinite</option>
                                <option value="false">Finite</option>
                            </select>
                        </div>

                        {/* Transition Config */}
                        <div className="flex flex-col gap-2 group">
                            <label className={`text-[11px] font-bold uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-neutral-400 group-hover:text-white' : 'text-neutral-500 group-hover:text-black'} transition-colors`}>
                                <MonitorPlay className="w-3 h-3" /> Effect
                            </label>
                            <select
                                value={settings.slideshow_type}
                                disabled={savingSettings}
                                onChange={(e) => saveSettings({ ...settings, slideshow_type: e.target.value as any })}
                                className={`w-full border text-[11px] font-bold rounded-lg px-3 py-2 disabled:opacity-50 transition-all outline-none cursor-pointer appearance-none ${isDark ? 'bg-black/40 border-white/5 text-white' : 'bg-white border-neutral-200 text-black shadow-sm'}`}
                            >
                                <option value="fade">Dissolve</option>
                                <option value="slide_right_to_left">Transversal Link</option>
                                <option value="slide_left_to_right">Transversal Reverse</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Live preview bar */}
                <div className="bg-black/5 border border-border/40 rounded-xl p-3.5 text-[13px] font-semibold text-neutral-600 flex items-center gap-3 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <Eye className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <span>
                        <span className="text-black">{slides.filter(s => s.is_active).length}</span> Slides currently active.
                    </span>
                </div>

                {/* Slides Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-32 space-y-4 animate-pulse">
                        <div className="w-16 h-16 rounded-full border-t-2 border-l-2 border-gold animate-spin" />
                        <p className="text-[10px] font-bold uppercase text-gold/60">Synchronizing Visual Assets...</p>
                    </div>
                ) : slides.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 border border-dashed border-border/40 rounded-2xl bg-black/5 text-neutral-400 animate-fadeIn">
                        <Images className="w-16 h-16 mb-4 opacity-20 text-black" />
                        <p className="text-lg font-bold text-black mb-1">No Visual Essences Found</p>
                        <p className="text-[11px] font-bold uppercase opacity-60 mb-6 tracking-wide">Begin by manifesting your first storefront visual asset.</p>
                        <button onClick={openCreate} className="group flex items-center gap-2 rounded-xl border border-gold/10 bg-primary px-6 py-2.5 text-[13px] font-semibold text-[#E8D8B9] hover:opacity-90 transition-all duration-300 shadow-sm">
                            <UploadCloud className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                            Upload Essence
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {slides.map((slide, index) => (
                            <div
                                key={slide.id}
                                className={`group relative rounded-xl overflow-hidden border border-border/40 bg-black/5 aspect-[1920/500] transition-all duration-500 hover:border-black/30 hover:-translate-y-0.5 ${!slide.is_active ? 'opacity-50 grayscale-[50%]' : ''}`}
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


                                {/* Hover Actions Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                    <button
                                        onClick={() => openEdit(slide)}
                                        className="flex items-center gap-2 px-6 py-2 bg-white text-black text-[11px] font-bold uppercase rounded-full hover:scale-105 transition-all border border-white/20"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Reconfigure
                                    </button>

                                    <div className="flex items-center gap-3 scale-90 group-hover:scale-100 transition-transform duration-500">
                                        <button
                                            onClick={(e) => handleToggle(slide, e)}
                                            className={`p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-all duration-300 ${slide.is_active ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-neutral-200'}`}
                                            title={slide.is_active ? 'Deactivate Essence' : 'Manifest Essence'}
                                        >
                                            {slide.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(slide.id)}
                                            className="p-2.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/40 backdrop-blur-md hover:bg-red-500/40 transition-all duration-300"
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
            </div>

            {/* Edit / Create Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setModalOpen(false)}
                    />

                    {/* Modal Container */}
                    <div className="relative bg-white border border-border rounded-[32px] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white sticky top-0 z-20">
                            <div>
                                <h4 className="font-serif text-xl font-bold text-gold tracking-tight">
                                    {editing ? 'Refine Visual Essence' : 'Manifest New Essence'}
                                </h4>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                                    Configuration & Global State
                                </p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                            <div className="p-6 space-y-8">

                                {/* Prime Visual Asset Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                            <Images className="w-3.5 h-3.5" /> Prime Visual Asset <span className="text-danger">*</span>
                                        </label>
                                        {form.image_url && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-[10px] font-bold uppercase text-gold hover:opacity-70 transition-all flex items-center gap-1.5"
                                            >
                                                <UploadCloud className="w-3 h-3" /> Change Image
                                            </button>
                                        )}
                                    </div>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />

                                    {form.image_url ? (
                                        <div className="relative rounded-2xl overflow-hidden border border-neutral-200 aspect-[1920/500] bg-neutral-50 group shadow-sm">
                                            <img
                                                src={form.image_url}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBmaWxsPSIjMDcwYTA4Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+'; }}
                                            />

                                            {/* Storefront appearance simulation */}
                                            <div className="absolute inset-0 bg-black pointer-events-none"
                                                style={{ opacity: form.overlay_opacity }}>
                                            </div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white pointer-events-none px-6">
                                                {/* Headings Preview */}
                                                <div className="space-y-1 mb-4">
                                                    {form.headings.map(h => {
                                                        const isNum = !isNaN(Number(h.fontSize)) && h.fontSize !== '';
                                                        return (
                                                            <h1 key={h.id} style={{ color: h.color, fontSize: isNum ? `${parseInt(h.fontSize) / 2}px` : undefined }} className={`font-bold leading-tight drop-shadow-2xl ${!isNum ? `text-${h.fontSize}` : ''}`}>
                                                                {h.text || 'Heading Preview'}
                                                            </h1>
                                                        )
                                                    })}
                                                </div>

                                                {/* Subheadings Preview */}
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

                                                {/* Buttons Preview */}
                                                <div className="flex flex-wrap gap-3">
                                                    {form.buttons.map(b => (
                                                        <span
                                                            key={b.id}
                                                            style={{ backgroundColor: b.bgColor, color: b.textColor }}
                                                            className="inline-flex items-center gap-2 rounded-lg px-6 py-2 text-[10px] font-bold uppercase shadow-2xl"
                                                        >
                                                            {b.label || 'Action'}
                                                            <ArrowRight className="h-2.5 w-2.5" />
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full border-2 border-dashed border-neutral-200 rounded-3xl p-12 hover:bg-neutral-50 hover:border-gold/30 transition-all duration-500 cursor-pointer flex flex-col items-center justify-center text-center group"
                                        >
                                            <div className="w-16 h-16 bg-gold/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <UploadCloud className="w-8 h-8 text-gold" />
                                            </div>
                                            <p className="text-lg font-bold text-neutral-800 mb-1">Manifest Visual Essence</p>
                                            <p className="text-xs text-neutral-400 font-medium max-w-xs">High-resolution PNG, WebP or JPEG recommended for maximum clarity (Up to 10MB)</p>
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Headings Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-serif text-base font-bold text-gold uppercase tracking-tight">Headings</h4>
                                        <button
                                            type="button"
                                            onClick={addHeading}
                                            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-neutral-800 hover:text-gold transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Append Heading
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.headings.map((h, i) => (
                                            <div key={h.id} className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 group transition-all hover:bg-white hover:shadow-md animate-fadeIn">
                                                <span className="text-xs font-bold text-neutral-300 w-4">{i + 1}.</span>
                                                <input
                                                    type="text"
                                                    value={h.text}
                                                    onChange={e => updateHeading(h.id, 'text', e.target.value)}
                                                    placeholder="Enter heading text..."
                                                    className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-neutral-800 placeholder:text-neutral-300 focus:ring-0"
                                                />
                                                <div className="flex items-center gap-4 border-l border-neutral-200 pl-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Color</span>
                                                        <input
                                                            type="color"
                                                            value={h.color}
                                                            onChange={e => updateHeading(h.id, 'color', e.target.value)}
                                                            className="w-6 h-6 p-0.5 border border-neutral-200 rounded-md bg-white cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="10"
                                                            max="150"
                                                            value={!isNaN(Number(h.fontSize)) ? h.fontSize : h.fontSize.replace(/\D/g, '') || '72'}
                                                            onChange={e => updateHeading(h.id, 'fontSize', e.target.value)}
                                                            className="w-10 text-xs font-bold text-neutral-800 bg-transparent text-center focus:outline-none"
                                                        />
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">px</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeHeading(h.id)}
                                                    className="p-2 text-neutral-300 hover:text-red-500 transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {form.headings.length === 0 && (
                                            <div className="text-center py-8 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50">
                                                <p className="text-xs text-neutral-400 font-medium italic">No active headings manifested.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Subheadings Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-serif text-base font-bold text-gold uppercase tracking-tight">Subheadings</h4>
                                        <button
                                            type="button"
                                            onClick={addSubheading}
                                            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-neutral-800 hover:text-gold transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Append Subheading
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.subheadings.map((s, i) => (
                                            <div key={s.id} className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 group transition-all hover:bg-white hover:shadow-md animate-fadeIn">
                                                <span className="text-xs font-bold text-neutral-300 w-4">{i + 1}.</span>
                                                <input
                                                    type="text"
                                                    value={s.text}
                                                    onChange={e => updateSubheading(s.id, 'text', e.target.value)}
                                                    placeholder="Enter subtext..."
                                                    className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-neutral-800 placeholder:text-neutral-300 focus:ring-0"
                                                />
                                                <div className="flex items-center gap-4 border-l border-neutral-200 pl-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Color</span>
                                                        <input
                                                            type="color"
                                                            value={s.color}
                                                            onChange={e => updateSubheading(s.id, 'color', e.target.value)}
                                                            className="w-6 h-6 p-0.5 border border-neutral-200 rounded-md bg-white cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="10"
                                                            max="150"
                                                            value={!isNaN(Number(s.fontSize)) ? s.fontSize : s.fontSize.replace(/\D/g, '') || '18'}
                                                            onChange={e => updateSubheading(s.id, 'fontSize', e.target.value)}
                                                            className="w-10 text-xs font-bold text-neutral-800 bg-transparent text-center focus:outline-none"
                                                        />
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">px</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSubheading(s.id)}
                                                    className="p-2 text-neutral-300 hover:text-red-500 transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Interaction Nodes Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-serif text-base font-bold text-gold uppercase tracking-tight">Interaction Nodes</h4>
                                        <button
                                            type="button"
                                            onClick={addButton}
                                            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-neutral-800 hover:text-gold transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Link Aspect
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {form.buttons.map((b, i) => (
                                            <div key={b.id} className="relative bg-neutral-50 p-6 rounded-3xl border border-neutral-100 space-y-5 transition-all hover:bg-white hover:shadow-lg animate-fadeIn">
                                                <button
                                                    type="button"
                                                    onClick={() => removeButton(b.id)}
                                                    className="absolute top-4 right-4 p-2 text-neutral-300 hover:text-red-500 transition-all bg-white rounded-full shadow-sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Label</label>
                                                        <input
                                                            type="text"
                                                            value={b.label}
                                                            onChange={e => updateButton(b.id, 'label', e.target.value)}
                                                            placeholder="e.g. Shop Collection"
                                                            className="w-full bg-white rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-800 focus:border-gold/50 focus:outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Destination URL</label>
                                                        <input
                                                            type="text"
                                                            value={b.url}
                                                            onChange={e => updateButton(b.id, 'url', e.target.value)}
                                                            placeholder="/products/new-arrivals"
                                                            className="w-full bg-white rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-800 focus:border-gold/50 focus:outline-none transition-all font-mono"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 pt-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Background</span>
                                                        <input
                                                            type="color"
                                                            value={b.bgColor}
                                                            onChange={e => updateButton(b.id, 'bgColor', e.target.value)}
                                                            className="w-8 h-8 p-1 border border-neutral-200 rounded-lg bg-white cursor-pointer shadow-sm"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Text Color</span>
                                                        <input
                                                            type="color"
                                                            value={b.textColor}
                                                            onChange={e => updateButton(b.id, 'textColor', e.target.value)}
                                                            className="w-8 h-8 p-1 border border-neutral-200 rounded-lg bg-white cursor-pointer shadow-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Atmospheric Density Section */}
                                <div className="p-5 bg-neutral-50 rounded-[24px] border border-neutral-100 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                                            <MousePointer2 className="w-3 h-3 text-gold" /> Banner blurriness
                                        </label>
                                        <span className="text-[10px] font-serif font-bold text-gold bg-white px-2 py-0.5 rounded-full shadow-sm border border-gold/10">{Math.round(form.overlay_opacity * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min={0} max={1} step={0.05}
                                        value={form.overlay_opacity}
                                        onChange={e => setForm({ ...form, overlay_opacity: parseFloat(e.target.value) })}
                                        className="w-full accent-gold h-1 bg-neutral-200 rounded-full cursor-pointer transition-all"
                                    />
                                    <div className="flex justify-between text-[8px] font-bold text-neutral-400 uppercase tracking-widest px-1">
                                        <span>Light</span>
                                        <span>Heavy</span>
                                    </div>
                                    <div className="flex items-start gap-2.5 pt-1.5 bg-white/50 p-2.5 rounded-xl border border-neutral-200/50">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-gold/40 mt-0.5" />
                                        <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                                            Modulate the layer density to balance visual impact with typographic legibility.
                                        </p>
                                    </div>
                                </div>

                                {/* Manifest Status Section */}
                                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${form.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-400'}`}>
                                            <Eye className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-neutral-800">Manifest Immediately</p>
                                            <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-tight">Publish essence to storefront gallery</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-all duration-300 ${form.is_active ? 'bg-primary' : 'bg-neutral-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3 sticky bottom-0 z-20">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                disabled={saving}
                                className="px-5 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-800 transition-all rounded-lg border border-neutral-200 bg-white shadow-sm"
                            >
                                Abort
                            </button>
                            <button
                                type="submit"
                                onClick={handleSave}
                                disabled={saving}
                                className="group flex items-center gap-2 px-6 py-2 bg-primary border border-gold/10 text-[#E8D8B9] text-sm font-bold rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing Essence…</>
                                ) : (
                                    <><Save className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> {editing ? 'Commit Changes' : 'Manifest Slide'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Purge Visual Essence"
                confirmLabel="Purge Immediately"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={handleDelete}
            >
                <div className="space-y-4">
                    <p className="text-text-primary font-medium">
                        Are you sure you want to permanently remove this visual essence from the repository?
                    </p>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3.5 items-start">
                        <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm font-bold text-red-900 uppercase tracking-tight">Destructive Action</p>
                            <p className="text-sm text-red-800/80 leading-relaxed font-medium">
                                This action will immediately retract the asset from the storefront. This process is irreversible.
                            </p>
                        </div>
                    </div>
                </div>
            </ConfirmModal>
        </>
    );
}
