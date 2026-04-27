'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, X, Loader2, ChevronDown, ChevronUp,
    Save, RefreshCw, Palette, Layout, Link2, Eye, EyeOff,
    GripVertical, AlignLeft, MonitorSmartphone, Zap, Info
} from 'lucide-react';

import { API_URL } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────

interface BrandingSection {
    logo_url: string;
    logo_alt: string;
}

interface ColorsSection {
    navbar_bg: string;
    navbar_text: string;
    navbar_hover: string;
    strip_bg: string;
    strip_text: string;
    strip_accent: string;
    cart_badge_bg: string;
}

interface NavLink {
    label: string;
    url: string;
    enabled: boolean;
}

interface StripSection {
    enabled: boolean;
    center_message: string;
    hotline: string;
    show_track_orders: boolean;
    show_categories: boolean;
}

interface SettingsSection {
    use_backend_navbar: boolean;
}

interface HeaderData {
    settings: SettingsSection;
    branding: BrandingSection;
    colors: ColorsSection;
    nav_links: NavLink[];
    strip: StripSection;
}

// ─── Shared UI ────────────────────────────────────────────────────

const SectionCard = ({ icon: Icon, title, children, defaultOpen = true }: {
    icon: typeof Layout; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border/50 rounded-xl backdrop-blur-sm transition-all duration-500">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-black/5 transition-all duration-300"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/5 border border-border/40">
                        <Icon className="w-4 h-4 text-black" />
                    </div>
                    <h4 className="font-serif text-xs font-bold text-black uppercase tracking-wider">{title}</h4>
                </div>
                {open ? <ChevronUp className="w-3.5 h-3.5 text-black/60" /> : <ChevronDown className="w-3.5 h-3.5 text-black/60" />}
            </button>
            {open && <div className="pt-6 pb-4 px-5 border-t border-border/30 animate-fadeIn">{children}</div>}
        </div>
    );
};

const Field = ({ label, hint, info, children }: { label: string; hint?: string; info?: string; children: React.ReactNode }) => (
    <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase">
            {label}
            {info && (
                <span className="relative group cursor-pointer inline-flex items-center normal-case tracking-normal">
                    <Info className="w-4 h-4 text-neutral-400 hover:text-gold transition-colors duration-300" />
                    <span className="absolute bottom-full left-0 origin-bottom-left mb-3 w-max max-w-[240px] px-4 py-3 font-sans text-xs font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999] normal-case tracking-normal leading-relaxed">
                        {info}
                        <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-white border-b border-r border-neutral-200 rotate-45" />
                    </span>
                </span>
            )}
        </label>
        {hint && <p className="text-[10px] text-text-muted/60 leading-relaxed font-medium">{hint}</p>}
        {children}
    </div>
);

const Toggle = ({ checked, onChange, label, sub, info }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; info?: string }) => (
    <label className="flex items-center gap-4 cursor-pointer select-none p-3 bg-neutral-100 rounded-xl border border-border/40 hover:bg-neutral-200 transition-all duration-300">
        <div className={`relative w-10 h-5 rounded-full transition-all duration-500 flex-shrink-0 ${checked ? 'bg-primary shadow-[0_0_10px_rgba(59,93,59,0.2)]' : 'bg-border/60'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-500 ease-out ${checked ? 'translate-x-5' : ''}`} />
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        </div>
        <div>
            <div className="flex items-center gap-2 text-[13px] font-bold text-black">
                {label}
                {info && (
                    <span className="relative group cursor-pointer inline-flex items-center font-sans tracking-normal font-medium">
                        <Info className="w-3.5 h-3.5 text-neutral-400 hover:text-primary transition-colors duration-300" />
                        <span className="absolute bottom-full left-0 origin-bottom-left mb-3 w-max max-w-[240px] px-4 py-3 font-sans text-xs font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999] normal-case tracking-normal leading-relaxed">
                            {info}
                            <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-white border-b border-r border-neutral-200 rotate-45" />
                        </span>
                    </span>
                )}
            </div>
            {sub && <p className="text-[9px] text-text-muted mt-0.5 font-medium uppercase">{sub}</p>}
        </div>
    </label>
);

const inputCls = "w-full rounded-lg border border-border/40 bg-black/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 focus:border-black/40 focus:outline-none focus:ring-1 focus:ring-black/5 transition-all duration-300 font-medium";

const ColorField = ({ label, value, info, onChange }: { label: string; value: string; info?: string; onChange: (v: string) => void }) => (
    <Field label={label} info={info}>
        <div className="flex items-center gap-2">
            <div className="relative">
                <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-12 h-10 rounded-xl border border-border cursor-pointer p-1 bg-black/20"
                />
            </div>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`${inputCls} font-mono uppercase`}
                placeholder="#000000"
                maxLength={7}
            />
        </div>
    </Field>
);

// ─── Main Component ───────────────────────────────────────────────

export default function HeaderManagementPage() {
    const [header, setHeader] = useState<HeaderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);



    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/header/admin`);
            const data = await res.json();
            if (data.success) setHeader(data.data);
            else toast.error('Failed to load header config');
        } catch { toast.error('Network error loading header'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const saveSection = async (section: keyof HeaderData) => {
        if (!header) return;
        setSaving(true);
        setActiveSection(section);
        try {
            const res = await authFetch(`${API_URL}/api/header/admin/${section}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: header[section] }),
            });
            const data = await res.json();
            if (data.success) toast.success(`${section.replace('_', ' ')} saved!`);
            else toast.error(data.message || 'Failed to save');
        } catch { toast.error('Error saving section'); }
        finally { setSaving(false); setActiveSection(null); }
    };

    const saveAll = async () => {
        if (!header) return;
        setSaving(true);
        setActiveSection('all');
        try {
            const res = await authFetch(`${API_URL}/api/header/admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(header),
            });
            const data = await res.json();
            if (data.success) toast.success('All header sections saved!');
            else toast.error(data.message || 'Failed to save');
        } catch { toast.error('Error saving header'); }
        finally { setSaving(false); setActiveSection(null); }
    };

    const update = <K extends keyof HeaderData>(section: K, value: HeaderData[K]) => {
        setHeader(prev => prev ? { ...prev, [section]: value } : prev);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const links = [...(header?.nav_links || [])];
        const draggedItem = links[draggedIndex];
        links.splice(draggedIndex, 1);
        links.splice(index, 0, draggedItem);

        setDraggedIndex(index);
        update('nav_links', links);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const SaveBtn = ({ section }: { section: keyof HeaderData }) => (
        <button
            onClick={() => saveSection(section)}
            disabled={saving}
            className="group flex items-center gap-2 px-5 py-2.5 bg-primary border border-gold/10 text-[#E8D8B9] text-sm font-semibold rounded-lg hover:bg-primary-light transition-all duration-300 shadow-sm disabled:opacity-50"
        >
            {saving && activeSection === section
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> Commit</>}
        </button>
    );

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#C5A46D] mx-auto mb-3" />
                    <p className="text-sm text-neutral-500">Loading header configuration…</p>
                </div>
            </div>
        );
    }

    if (!header) {
        return (
            <div className="p-8 text-center text-neutral-500">
                <p>Failed to load header data. <button onClick={load} className="text-[#C5A46D] underline">Retry</button></p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn mb-24 min-h-screen">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="font-serif text-2xl font-bold text-black">Header Canvas</h1>
                    </div>
                    <p className="text-sm font-semibold text-black">
                        Configure your storefront architecture — navigation links and dynamic settings.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="group flex items-center gap-2 px-4 py-2 border border-black/5 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-[#FDFCF8] transition-all duration-300"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 ${loading ? 'animate-spin' : ''}`} /> Recalibrate
                    </button>
                    <button
                        onClick={saveAll}
                        disabled={saving}
                        className="group flex items-center gap-2 px-6 py-2.5 bg-primary border border-gold/10 text-[#E8D8B9] text-sm font-semibold rounded-lg hover:bg-primary-light transition-all duration-300 shadow-sm disabled:opacity-50"
                    >
                        {saving && activeSection === 'all'
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Save className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> Save Global Configuration</>}
                    </button>
                </div>
            </div>

            <div className="space-y-4">


                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border/40 rounded-xl backdrop-blur-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                    <div className="flex-1">
                        <Toggle
                            checked={header.settings?.use_backend_navbar ?? true}
                            onChange={v => update('settings', { ...header.settings, use_backend_navbar: v })}
                            label="Enable Dynamic Navbar Synthesis"
                            info="When enabled, the storefront syncs with these settings rather than hardcoded configurations."
                            sub={
                                (header.settings?.use_backend_navbar ?? true)
                                    ? "ON: Storefront will dynamically fetch and display this canvas configuration."
                                    : "OFF: Storefront will revert to the default hardcoded components."
                            }
                        />
                    </div>
                    <div className="flex-shrink-0">
                        <SaveBtn section="settings" />
                    </div>
                </div>




                {/* ── 1. Navigation Links ───────────────────────── */}
                <SectionCard icon={Link2} title="Navigation Protocol">
                    <div className="space-y-3">
                        <p className="text-[15px] font-semibold text-text-muted/60 mb-4">Toggle visibility or reconfigure access nodes. Drag to reorder sequence.</p>
                        {header.nav_links.map((link, i) => (
                            <div
                                key={i}
                                draggable
                                onDragStart={() => handleDragStart(i)}
                                onDragOver={(e) => handleDragOver(e, i)}
                                onDragEnd={handleDragEnd}
                                className={`group grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 items-center p-3 rounded-xl border transition-all duration-300 ${draggedIndex === i
                                    ? 'opacity-50 border-black bg-neutral-50 scale-[0.98]'
                                    : link.enabled
                                        ? 'border-border/40 bg-neutral-100'
                                        : 'border-border/10 bg-neutral-50/50 opacity-40 shadow-inner'
                                    } cursor-move hover:border-black/30`}
                            >
                                <GripVertical className="w-4 h-4 text-black/40 cursor-grab group-hover:text-black transition-colors" />
                                <input
                                    className={inputCls}
                                    value={link.label}
                                    onChange={e => {
                                        const links = [...header.nav_links];
                                        links[i] = { ...link, label: e.target.value };
                                        update('nav_links', links);
                                    }}
                                    placeholder="Link label"
                                />
                                <input
                                    className={inputCls}
                                    value={link.url}
                                    onChange={e => {
                                        const links = [...header.nav_links];
                                        links[i] = { ...link, url: e.target.value };
                                        update('nav_links', links);
                                    }}
                                    placeholder="/url"
                                />
                                {/* Visibility toggle */}
                                <button
                                    onClick={() => {
                                        const links = [...header.nav_links];
                                        links[i] = { ...link, enabled: !link.enabled };
                                        update('nav_links', links);
                                    }}
                                    className={`p-2 rounded-xl transition-all duration-300 ${link.enabled ? 'text-[#C5A46D] bg-black/5 border border-[#C5A46D]/20' : 'text-text-muted/40 hover:text-[#C5A46D] hover:bg-white/5 border border-transparent'}`}
                                    title={link.enabled ? 'Active — click to disable' : 'Inactive — click to enable'}
                                >
                                    {link.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={() => update('nav_links', header.nav_links.filter((_, idx) => idx !== i))}
                                    className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                    title="Remove link"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-4">
                            <button
                                onClick={() => update('nav_links', [...header.nav_links, { label: '', url: '/', enabled: true }])}
                                className="flex items-center gap-2 text-[9px] font-bold uppercase text-black hover:text-neutral-700 transition-all group"
                            >
                                <div className="p-1.5 bg-black/5 rounded-lg group-hover:bg-black/10 transition-all">
                                    <Plus className="w-3.5 h-3.5" />
                                </div>
                                Append Access Node
                            </button>
                            <SaveBtn section="nav_links" />
                        </div>
                    </div>
                </SectionCard>



            </div>

            <div className="pt-6 flex justify-end">
                <button
                    onClick={saveAll}
                    disabled={saving}
                    className="group flex items-center gap-3 px-8 py-3 bg-primary border border-black/5 text-[#E8D8B9] text-sm font-semibold rounded-xl hover:bg-primary-light hover:shadow-[0_12px_30px_rgba(29,53,29,0.3)] transition-all duration-300 disabled:opacity-50 transform hover:-translate-y-1 active:scale-[0.98]"
                >
                    {saving && activeSection === 'all'
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                        : <><Save className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-1" /> Save Global Configuration</>}
                </button>
            </div>
        </div>
    );
}
