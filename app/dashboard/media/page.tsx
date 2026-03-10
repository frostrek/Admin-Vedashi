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

const inputCls = "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D] transition-colors";

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
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#C5A46D]/10">
                            <Images className="w-5 h-5 text-[#C5A46D]" />
                        </div>
                        <h1 className="text-2xl font-serif text-neutral-900">Media Library</h1>
                    </div>
                    <p className="text-sm text-neutral-500 ml-[52px]">
                        Manage hero carousel slides for the storefront landing page.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#C5A46D] hover:bg-[#B3935C] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Slide
                </button>
            </div>

            {/* Settings Bar */}
            <div className="mb-6 bg-white border border-neutral-100 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-neutral-700 font-medium text-sm">
                    <Settings className="w-4 h-4 text-[#C5A46D]" /> Slider Settings
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    {/* Speed Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-neutral-500 uppercase flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" /> Speed
                        </label>
                        <select
                            value={settings.slider_speed}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, slider_speed: parseInt(e.target.value) })}
                            className="bg-neutral-50 border border-neutral-200 text-sm rounded-lg px-3 py-1.5 focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D] disabled:opacity-50"
                        >
                            <option value={3000}>Fast (3s)</option>
                            <option value={5000}>Normal (5s)</option>
                            <option value={7000}>Slow (7s)</option>
                            <option value={10000}>Very Slow (10s)</option>
                        </select>
                    </div>

                    {/* Arrow Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-neutral-500 uppercase flex items-center gap-1.5 whitespace-nowrap">
                            <MousePointer2 className="w-3.5 h-3.5" /> Arrows
                        </label>
                        <select
                            value={settings.arrow_visibility}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, arrow_visibility: e.target.value as any })}
                            className="bg-neutral-50 border border-neutral-200 text-sm rounded-lg px-3 py-1.5 focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D] disabled:opacity-50"
                        >
                            <option value="hover">Show on Hover</option>
                            <option value="visible">Always Visible</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </div>

                    {/* Loop Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-neutral-500 uppercase flex items-center gap-1.5 whitespace-nowrap">
                            <Repeat className="w-3.5 h-3.5" /> Loop
                        </label>
                        <select
                            value={settings.loop ? 'true' : 'false'}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, loop: e.target.value === 'true' })}
                            className="bg-neutral-50 border border-neutral-200 text-sm rounded-lg px-3 py-1.5 focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D] disabled:opacity-50"
                        >
                            <option value="true">Enabled</option>
                            <option value="false">Disabled</option>
                        </select>
                    </div>

                    {/* Transition Config */}
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-neutral-500 uppercase flex items-center gap-1.5 whitespace-nowrap">
                            <MonitorPlay className="w-3.5 h-3.5" /> Effect
                        </label>
                        <select
                            value={settings.slideshow_type}
                            disabled={savingSettings}
                            onChange={(e) => saveSettings({ ...settings, slideshow_type: e.target.value as any })}
                            className="bg-neutral-50 border border-neutral-200 text-sm rounded-lg px-3 py-1.5 focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D] disabled:opacity-50"
                        >
                            <option value="fade">Fade (Default)</option>
                            <option value="slide_right_to_left">Slide Right-to-Left</option>
                            <option value="slide_left_to_right">Slide Left-to-Right</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Live preview bar */}
            <div className="mb-6 flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-500">
                <Eye className="w-4 h-4 text-[#C5A46D] flex-shrink-0" />
                <span>
                    <span className="font-semibold text-neutral-700">{slides.filter(s => s.is_active).length}</span> active slide{slides.filter(s => s.is_active).length !== 1 ? 's' : ''} showing on the storefront.
                    Inactive slides are hidden from visitors.
                </span>
            </div>

            {/* Slides Grid */}
            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[#C5A46D]" />
                </div>
            ) : slides.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-400">
                    <Images className="w-16 h-16 mb-4 opacity-30 text-[#C5A46D]" />
                    <p className="text-base font-medium text-neutral-600 mb-1">No hero slides found</p>
                    <p className="text-sm mb-6">Upload your first image to get started.</p>
                    <button onClick={openCreate} className="px-5 py-2.5 bg-neutral-800 text-white rounded-lg text-sm font-medium hover:bg-neutral-900 transition-colors">
                        Upload Image
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 aspect-[16/10] shadow-sm transition-all hover:shadow-md ${!slide.is_active ? 'opacity-60 grayscale-[30%]' : ''}`}
                        >
                            {/* The Image */}
                            <img
                                src={slide.image_url}
                                alt={slide.headings[0]?.text || 'Hero slide'}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBmaWxsPSIjZjNmNGY2Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+'; }}
                            />

                            {/* Overlay simulating storefront */}
                            <div
                                className="absolute inset-0 bg-black pointer-events-none"
                                style={{ opacity: slide.overlay_opacity * 0.7 }}
                            />

                            {/* Static overlay text (visible normally) */}
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
                                <p className="text-white font-serif font-bold text-lg truncate drop-shadow-md">
                                    {slide.headings[0]?.text || <span className="italic opacity-50">Untitled</span>}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${slide.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-neutral-500/30 text-neutral-300 border border-neutral-500/30'}`}>
                                        {slide.is_active ? 'Active' : 'Hidden'}
                                    </span>
                                </div>
                            </div>

                            {/* Hover Actions Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                                <button
                                    onClick={() => openEdit(slide)}
                                    className="flex items-center gap-2 px-6 py-2 bg-white text-neutral-900 text-sm font-semibold rounded-full hover:scale-105 transition-transform shadow-lg"
                                >
                                    <Edit2 className="w-4 h-4" /> Edit Slide
                                </button>

                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        onClick={(e) => handleToggle(slide, e)}
                                        className={`p-2.5 rounded-full text-white backdrop-blur-md transition-colors ${slide.is_active ? 'bg-neutral-600/50 hover:bg-neutral-500/80' : 'bg-emerald-600/60 hover:bg-emerald-500/80'}`}
                                        title={slide.is_active ? 'Hide from storefront' : 'Show on storefront'}
                                    >
                                        {slide.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(slide.id, e)}
                                        className="p-2.5 rounded-full bg-red-600/60 text-white backdrop-blur-md hover:bg-red-500/80 transition-colors"
                                        title="Delete forever"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-serif font-semibold text-neutral-800">
                                {editing ? 'Edit Hero Slide' : 'Upload Hero Image'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">

                            {/* File Upload Area */}
                            <div>
                                <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
                                    Hero Image <span className="text-red-500">*</span>
                                </label>

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />

                                {form.image_url ? (
                                    <div className="relative rounded-xl overflow-hidden border border-neutral-200 aspect-[16/7] bg-neutral-100 group">
                                        <img
                                            src={form.image_url}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiBmaWxsPSIjZjNmNGY2Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+'; }}
                                        />

                                        {/* Storefront appearance simulation */}
                                        <div className="absolute inset-0 bg-black flex items-end p-4 pointer-events-none"
                                            style={{ opacity: form.overlay_opacity }}>
                                        </div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white pointer-events-none px-6">
                                            {/* Headings */}
                                            <div className="space-y-2 mb-4">
                                                {form.headings.map(h => {
                                                    const isNum = !isNaN(Number(h.fontSize)) && h.fontSize !== '';
                                                    return (
                                                        <h1 key={h.id} style={{ color: h.color, fontSize: isNum ? `${h.fontSize}px` : undefined }} className={`font-serif font-bold leading-tight drop-shadow-lg ${!isNum ? `text-${h.fontSize}` : ''}`}>
                                                            {h.text || 'Heading Preview'}
                                                        </h1>
                                                    )
                                                })}
                                            </div>

                                            {/* Subheadings */}
                                            <div className="space-y-2 mb-8">
                                                {form.subheadings.map(s => {
                                                    const isNum = !isNaN(Number(s.fontSize)) && s.fontSize !== '';
                                                    return (
                                                        <p key={s.id} style={{ color: s.color, fontSize: isNum ? `${s.fontSize}px` : undefined }} className={`max-w-xl leading-relaxed drop-shadow-md ${!isNum ? `text-${s.fontSize}` : ''}`}>
                                                            {s.text || 'Subheading Preview'}
                                                        </p>
                                                    )
                                                })}
                                            </div>

                                            {/* Buttons */}
                                            <div className="flex flex-wrap gap-4">
                                                {form.buttons.map(b => (
                                                    <span
                                                        key={b.id}
                                                        style={{ backgroundColor: b.bgColor, color: b.textColor }}
                                                        className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
                                                    >
                                                        {b.label || 'Button'}
                                                        <ArrowRight className="h-4 w-4" />
                                                    </span>
                                                ))}
                                            </div></div>

                                        {/* Change Image Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 bg-white text-neutral-900 rounded-lg text-sm font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                                            >
                                                <UploadCloud className="w-4 h-4" /> Change Image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-neutral-300 rounded-xl p-8 hover:bg-neutral-50 hover:border-[#C5A46D] transition-colors cursor-pointer flex flex-col items-center justify-center text-center"
                                    >
                                        <div className="w-12 h-12 bg-[#C5A46D]/10 rounded-full flex items-center justify-center mb-3">
                                            <UploadCloud className="w-6 h-6 text-[#C5A46D]" />
                                        </div>
                                        <p className="text-sm font-semibold text-neutral-800">Click to upload image</p>
                                        <p className="text-xs text-neutral-500 mt-1">JPEG, PNG, WebP up to 10MB</p>
                                        <p className="text-xs text-neutral-400 mt-4">Recommended size: 1920x1080px</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Dynamic Headings ── */}
                            <div className="space-y-4 pt-4 border-t border-neutral-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold tracking-wider text-neutral-500 uppercase">Headings</h3>
                                    <button
                                        type="button"
                                        onClick={addHeading}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#722F37] hover:text-[#5A252C]"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Heading
                                    </button>
                                </div>
                                {form.headings.map((h, i) => (
                                    <div key={h.id} className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                        <span className="text-xs font-medium text-neutral-400 w-5">{i + 1}.</span>
                                        <input
                                            type="text"
                                            value={h.text}
                                            onChange={e => updateHeading(h.id, 'text', e.target.value)}
                                            placeholder="E.g., The Art of Fine Wine"
                                            className={`${inputCls} flex-1`}
                                        />
                                        <div className="flex items-center gap-2 px-2 py-1 bg-white border border-neutral-200 rounded-md">
                                            <label className="text-xs font-medium text-neutral-500 cursor-pointer flex items-center gap-1">
                                                Color
                                                <input
                                                    type="color"
                                                    value={h.color}
                                                    onChange={e => updateHeading(h.id, 'color', e.target.value)}
                                                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-1 border border-neutral-200 rounded-md bg-white px-2">
                                            <input
                                                type="number"
                                                min="10"
                                                max="150"
                                                value={!isNaN(Number(h.fontSize)) ? h.fontSize : h.fontSize.replace(/\D/g, '') || '72'}
                                                onChange={e => updateHeading(h.id, 'fontSize', e.target.value)}
                                                className="w-12 text-xs py-1.5 focus:outline-none"
                                            />
                                            <span className="text-xs text-neutral-400">px</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeHeading(h.id)}
                                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 rounded-md transition-colors"
                                            title="Remove Heading"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {form.headings.length === 0 && (
                                    <p className="text-sm text-neutral-400 italic">No headings added.</p>
                                )}
                            </div>

                            {/* ── Dynamic Subheadings ── */}
                            <div className="space-y-4 pt-4 border-t border-neutral-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold tracking-wider text-neutral-500 uppercase">Subheadings</h3>
                                    <button
                                        type="button"
                                        onClick={addSubheading}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#722F37] hover:text-[#5A252C]"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Subheading
                                    </button>
                                </div>
                                {form.subheadings.map((s, i) => (
                                    <div key={s.id} className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                        <span className="text-xs font-medium text-neutral-400 w-5">{i + 1}.</span>
                                        <input
                                            type="text"
                                            value={s.text}
                                            onChange={e => updateSubheading(s.id, 'text', e.target.value)}
                                            placeholder="Subheading text..."
                                            className={`${inputCls} flex-1`}
                                        />
                                        <div className="flex items-center gap-2 px-2 py-1 bg-white border border-neutral-200 rounded-md">
                                            <label className="text-xs font-medium text-neutral-500 cursor-pointer flex items-center gap-1">
                                                Color
                                                <input
                                                    type="color"
                                                    value={s.color}
                                                    onChange={e => updateSubheading(s.id, 'color', e.target.value)}
                                                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-1 border border-neutral-200 rounded-md bg-white px-2">
                                            <input
                                                type="number"
                                                min="10"
                                                max="150"
                                                value={!isNaN(Number(s.fontSize)) ? s.fontSize : s.fontSize.replace(/\D/g, '') || '18'}
                                                onChange={e => updateSubheading(s.id, 'fontSize', e.target.value)}
                                                className="w-12 text-xs py-1.5 focus:outline-none"
                                            />
                                            <span className="text-xs text-neutral-400">px</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSubheading(s.id)}
                                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 rounded-md transition-colors"
                                            title="Remove Subheading"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* ── Dynamic Buttons ── */}
                            <div className="space-y-4 pt-4 border-t border-neutral-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold tracking-wider text-neutral-500 uppercase">Call to Action Buttons</h3>
                                    <button
                                        type="button"
                                        onClick={addButton}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#722F37] hover:text-[#5A252C]"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Button
                                    </button>
                                </div>
                                {form.buttons.map((b, i) => (
                                    <div key={b.id} className="flex flex-col gap-3 bg-neutral-50 p-4 rounded-lg border border-neutral-100 relative">
                                        <button
                                            type="button"
                                            onClick={() => removeButton(b.id)}
                                            className="absolute top-2 right-2 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-200 rounded-md transition-colors"
                                            title="Remove Button"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <div className="flex gap-4 pr-8">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-medium text-neutral-500">Label</label>
                                                <input
                                                    type="text"
                                                    value={b.label}
                                                    onChange={e => updateButton(b.id, 'label', e.target.value)}
                                                    placeholder="E.g. Shop Now"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-medium text-neutral-500">URL</label>
                                                <input
                                                    type="text"
                                                    value={b.url}
                                                    onChange={e => updateButton(b.id, 'url', e.target.value)}
                                                    placeholder="/products"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 px-2 py-1 bg-white border border-neutral-200 rounded-md">
                                                <label className="text-xs font-medium text-neutral-500 cursor-pointer flex items-center gap-1">
                                                    Background
                                                    <input
                                                        type="color"
                                                        value={b.bgColor}
                                                        onChange={e => updateButton(b.id, 'bgColor', e.target.value)}
                                                        className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                                                    />
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-2 px-2 py-1 bg-white border border-neutral-200 rounded-md">
                                                <label className="text-xs font-medium text-neutral-500 cursor-pointer flex items-center gap-1">
                                                    Text Color
                                                    <input
                                                        type="color"
                                                        value={b.textColor}
                                                        onChange={e => updateButton(b.id, 'textColor', e.target.value)}
                                                        className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                                <label className="flex items-center justify-between text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">
                                    <span>Dark Overlay Opacity</span>
                                    <span className="text-[#C5A46D] bg-[#C5A46D]/10 px-2 py-0.5 rounded">{Math.round(form.overlay_opacity * 100)}%</span>
                                </label>
                                <input
                                    type="range" min={0} max={1} step={0.05}
                                    value={form.overlay_opacity}
                                    onChange={e => setForm({ ...form, overlay_opacity: parseFloat(e.target.value) })}
                                    className="w-full accent-[#C5A46D]"
                                />
                                <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-400 mt-1">
                                    <span>Transparent</span>
                                    <span>Solid Black</span>
                                </div>
                                <p className="text-[11px] text-neutral-500 mt-2 flex items-start gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Increase opacity if white text is hard to read against the uploaded image.</span>
                                </p>
                            </div>

                            <label className="flex items-center justify-between cursor-pointer select-none p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-neutral-800">Publish immediately</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">Toggle off to hide this slide from the storefront</p>
                                </div>
                                <div className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-[#C5A46D]' : 'bg-neutral-300'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : ''}`} />
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={form.is_active}
                                        onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                    />
                                </div>
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} disabled={saving}
                                    className="px-5 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-[#C5A46D] hover:bg-[#B3935C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm hover:shadow">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> {editing ? 'Save Changes' : 'Upload Slide'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
