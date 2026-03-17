'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, X, Loader2, ChevronDown, ChevronUp,
    Save, RefreshCw, Palette, Layout, Link2, Eye, EyeOff,
    GripVertical, AlignLeft, MonitorSmartphone, Zap, Info
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
        <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-500">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-primary/10 transition-all duration-300"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 border border-border">
                        <Icon className="w-5 h-5 text-gold" />
                    </div>
                    <h2 className="text-sm font-serif font-bold text-gold tracking-widest uppercase">{title}</h2>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-gold-soft" /> : <ChevronDown className="w-4 h-4 text-gold-soft" />}
            </button>
            {open && <div className="px-6 pb-6 border-t border-border/50 animate-fadeIn">{children}</div>}
        </div>
    );
};

const Field = ({ label, hint, info, children }: { label: string; hint?: string; info?: string; children: React.ReactNode }) => (
    <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
            {label}
            {info && (
                <span className="relative group cursor-pointer inline-flex items-center normal-case tracking-normal">
                    <Info className="w-4 h-4 text-neutral-400 hover:text-gold transition-colors duration-300" />
                    <span className="absolute bottom-full left-0 origin-bottom-left mb-2 w-max max-w-xs px-3 py-2 font-sans text-xs font-medium text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                        {info}
                    </span>
                </span>
            )}
        </label>
        {hint && <p className="text-[10px] text-text-muted/60 leading-relaxed font-medium">{hint}</p>}
        {children}
    </div>
);

const Toggle = ({ checked, onChange, label, sub, info }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; info?: string }) => (
    <label className="flex items-center gap-4 cursor-pointer select-none p-4 bg-black/20 rounded-2xl border border-border hover:bg-black/30 transition-all duration-300">
        <div className={`relative w-12 h-6 rounded-full transition-all duration-500 flex-shrink-0 ${checked ? 'bg-gold shadow-[0_0_10px_rgba(197,164,109,0.3)]' : 'bg-border'}`}>
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-500 ease-out ${checked ? 'translate-x-6' : ''}`} />
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        </div>
        <div>
            <div className="flex items-center gap-2 text-sm font-serif font-bold text-gold-soft tracking-wide">
                {label}
                {info && (
                    <span className="relative group cursor-pointer inline-flex items-center font-sans tracking-normal font-medium">
                        <Info className="w-4 h-4 text-neutral-400 hover:text-gold transition-colors duration-300" />
                        <span className="absolute bottom-full left-0 origin-bottom-left mb-2 w-max max-w-xs px-3 py-2 text-xs text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                            {info}
                        </span>
                    </span>
                )}
            </div>
            {sub && <p className="text-[10px] text-text-muted mt-0.5 font-medium uppercase tracking-widest">{sub}</p>}
        </div>
    </label>
);

const inputCls = "w-full rounded-xl border border-border bg-black/20 px-4 py-2.5 text-sm text-gold-soft placeholder:text-text-muted/40 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/10 transition-all duration-300 font-medium";

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
                className={`${inputCls} font-mono uppercase tracking-widest`}
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

    const getCsrfToken = useCallback((): string | null => {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : null;
    }, []);

    const authHeaders = useCallback(() => {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) h['Authorization'] = `Bearer ${token}`;
        const csrf = getCsrfToken();
        if (csrf) h['X-CSRF-Token'] = csrf;
        return h;
    }, [getCsrfToken]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/header/admin`, { headers: authHeaders(), credentials: 'include' });
            const data = await res.json();
            if (data.success) setHeader(data.data);
            else toast.error('Failed to load header config');
        } catch { toast.error('Network error loading header'); }
        finally { setLoading(false); }
    }, [authHeaders]);

    useEffect(() => { load(); }, [load]);

    const saveSection = async (section: keyof HeaderData) => {
        if (!header) return;
        setSaving(true);
        setActiveSection(section);
        try {
            const res = await authFetch(`${API_URL}/api/header/admin/${section}`, {
                method: 'PUT',
                headers: authHeaders(),
                credentials: 'include',
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
                headers: authHeaders(),
                credentials: 'include',
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
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary to-primary-light text-gold text-[10px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(197,164,109,0.2)] transition-all duration-300 disabled:opacity-50 border border-gold/20"
        >
            {saving && activeSection === section
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> saving…</>
                : <><Save className="w-3.5 h-3.5" /> Commit</>}
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
        <div className="p-8 max-w-5xl mx-auto space-y-10 min-h-screen">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-border shadow-lg">
                            <MonitorSmartphone className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-gold tracking-tighter">Header Canvas</h1>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                        Configure your storefront architecture — navigation links and dynamic settings.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 border border-border bg-primary/10 text-[10px] font-bold uppercase tracking-widest text-gold-soft rounded-xl hover:bg-primary/20 transition-all duration-300"
                    >
                        <RefreshCw className="w-4 h-4" /> Recalibrate
                    </button>
                    <button
                        onClick={saveAll}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary border border-gold/20 text-gold text-[11px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all duration-300 disabled:opacity-50"
                    >
                        {saving && activeSection === 'all'
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> finalizing…</>
                            : <><Save className="w-4 h-4" /> Save Universe</>}
                    </button>
                </div>
            </div>

            <div className="space-y-4">

                
                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
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

                {/* ── 1. Branding ───────────────────────────────── */}
                <SectionCard icon={Layout} title="Branding">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        {/* Logo Upload */}
                        <Field label="Logo Image" hint="Upload a PNG / SVG / WebP. Stored as base64 — no external URL needed." info="Upload the main logo for your storefront. High quality transparent PNG or SVG is recommended.">
                            <div className="space-y-4">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-gold/30 hover:bg-primary/5 transition-all duration-300 group">
                                    <div className="flex flex-col items-center gap-2 text-text-muted/60 group-hover:text-gold transition-colors">
                                        <Layout className="w-7 h-7" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Select Visual Asset</span>
                                        <span className="text-[9px] opacity-60">PNG, SVG, WebP, JPG</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = ev => {
                                                const result = ev.target?.result as string;
                                                update('branding', { ...header.branding, logo_url: result });
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                </label>
                                {header.branding.logo_url && (
                                    <button
                                        onClick={() => update('branding', { ...header.branding, logo_url: '' })}
                                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-danger hover:text-danger/70 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Purge Asset
                                    </button>
                                )}
                            </div>
                        </Field>

                        <Field label="Logo Alt Text" info="Alternative text for your logo. This is crucial for screen readers and search engine optimization.">
                            <input
                                className={inputCls}
                                value={header.branding.logo_alt}
                                onChange={e => update('branding', { ...header.branding, logo_alt: e.target.value })}
                                placeholder="Vedashi"
                            />
                        </Field>

                        {/* Preview */}
                        {header.branding.logo_url && (
                            <div className="col-span-2 space-y-3">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Visual Preview</p>
                                <div className="p-6 bg-black/40 rounded-2xl border border-border flex items-center justify-center gap-6 shadow-inner">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <img src={header.branding.logo_url} alt={header.branding.logo_alt} className="h-16 w-auto object-contain brightness-110 drop-shadow-md" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gold/60">{header.branding.logo_alt}</span>
                                </div>
                            </div>
                        )}
                        <div className="col-span-2 flex justify-end"><SaveBtn section="branding" /></div>
                    </div>
                </SectionCard>

                {/* ── 2. Colour Palette ─────────────────────────── */}
                <SectionCard icon={Palette} title="Colour Management">
                    <div className="mt-4 space-y-5">
                        <div>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Main Navbar</p>
                            <div className="grid grid-cols-3 gap-4">
                                <ColorField
                                    label="Navbar Background"
                                    value={header.colors.navbar_bg}
                                    onChange={v => update('colors', { ...header.colors, navbar_bg: v })}
                                    info="The primary background color of your main navigation bar."
                                />
                                <ColorField
                                    label="Navbar Text"
                                    value={header.colors.navbar_text}
                                    onChange={v => update('colors', { ...header.colors, navbar_text: v })}
                                    info="The base color for text and links appearing within the navbar."
                                />
                                <ColorField
                                    label="Hover / Active Colour"
                                    value={header.colors.navbar_hover}
                                    onChange={v => update('colors', { ...header.colors, navbar_hover: v })}
                                    info="The accent color applied when a user hovers over or activates a navigation link."
                                />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Strip Bar</p>
                            <div className="grid grid-cols-3 gap-4">
                                <ColorField
                                    label="Strip Background"
                                    value={header.colors.strip_bg}
                                    onChange={v => update('colors', { ...header.colors, strip_bg: v })}
                                    info="The background color for the top information strip."
                                />
                                <ColorField
                                    label="Strip Text"
                                    value={header.colors.strip_text}
                                    onChange={v => update('colors', { ...header.colors, strip_text: v })}
                                    info="The primary text color within the top information strip."
                                />
                                <ColorField
                                    label="Strip Accent (Hotline)"
                                    value={header.colors.strip_accent}
                                    onChange={v => update('colors', { ...header.colors, strip_accent: v })}
                                    info="The highlight color specifically targeting contact numbers or important alerts in the strip."
                                />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">UI Elements</p>
                            <div className="grid grid-cols-3 gap-4">
                                <ColorField
                                    label="Cart Badge Background"
                                    value={header.colors.cart_badge_bg}
                                    onChange={v => update('colors', { ...header.colors, cart_badge_bg: v })}
                                    info="The background color for the shopping cart item count badge."
                                />
                            </div>
                        </div>
                        {/* Live mini-preview */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Real-time Synthesis</p>
                            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl scale-[0.98] origin-left">
                                {/* Navbar preview */}
                                <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: header.colors.navbar_bg }}>
                                    <span className="font-bold text-sm" style={{ color: header.colors.navbar_hover }}>Vedashi</span>
                                    <div className="flex items-center gap-4">
                                        {['Home', 'Shop', 'Blog'].map(l => (
                                            <span key={l} className="text-xs font-semibold uppercase tracking-widest" style={{ color: header.colors.navbar_text }}>{l}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: header.colors.cart_badge_bg }}>
                                                <span className="text-[9px] text-white flex items-center justify-center h-full font-bold">2</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Strip preview */}
                                <div className="flex items-center justify-between px-5 py-1.5" style={{ backgroundColor: header.colors.strip_bg }}>
                                    <span className="text-[11px] font-medium" style={{ color: header.colors.strip_text }}>Track Orders | Categories</span>
                                    <span className="text-[11px] font-medium" style={{ color: header.colors.strip_text }}>
                                        {header.strip.center_message}
                                    </span>
                                    <span className="text-[11px] font-semibold" style={{ color: header.colors.strip_accent }}>
                                        ✆ {header.strip.hotline}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end"><SaveBtn section="colors" /></div>
                    </div>
                </SectionCard>

                {/* ── 3. Navigation Links ───────────────────────── */}
                <SectionCard icon={Link2} title="Navigation Protocol">
                    <div className="mt-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-4">Toggle visibility or reconfigure access nodes. Drag to reorder sequence.</p>
                        {header.nav_links.map((link, i) => (
                            <div
                                key={i}
                                draggable
                                onDragStart={() => handleDragStart(i)}
                                onDragOver={(e) => handleDragOver(e, i)}
                                onDragEnd={handleDragEnd}
                                className={`group grid grid-cols-[auto_1fr_1fr_auto_auto] gap-3 items-center p-4 rounded-2xl border transition-all duration-300 ${
                                    draggedIndex === i 
                                        ? 'opacity-50 border-gold bg-primary/10 scale-[0.98]' 
                                        : link.enabled 
                                            ? 'border-border bg-black/20' 
                                            : 'border-border/30 bg-black/10 opacity-40 shadow-inner'
                                } cursor-move hover:border-gold/30`}
                            >
                                <GripVertical className="w-5 h-5 text-text-muted/30 cursor-grab group-hover:text-gold transition-colors" />
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
                                    className={`p-2.5 rounded-xl transition-all duration-300 ${link.enabled ? 'text-gold bg-primary/20 border border-gold/20' : 'text-text-muted/40 hover:text-gold hover:bg-white/5 border border-transparent'}`}
                                    title={link.enabled ? 'Active — click to disable' : 'Inactive — click to enable'}
                                >
                                    {link.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => update('nav_links', header.nav_links.filter((_, idx) => idx !== i))}
                                    className="p-2 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                                    title="Remove link"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-4">
                            <button
                                onClick={() => update('nav_links', [...header.nav_links, { label: '', url: '/', enabled: true }])}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold hover:text-gold-soft transition-all group"
                            >
                                <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-all">
                                    <Plus className="w-4 h-4" />
                                </div>
                                Append Access Node
                            </button>
                            <SaveBtn section="nav_links" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 4. Strip Bar ──────────────────────────────── */}
                <SectionCard icon={Zap} title="Sub-Link Stratum" defaultOpen={true}>
                    <div className="mt-4 space-y-4">
                        <Toggle
                            checked={header.strip.enabled}
                            onChange={v => update('strip', { ...header.strip, enabled: v })}
                            label="Manifest Sub-link Stratum"
                            sub="The secondary atmospheric layer below the primary navbar"
                            info="Toggle to show or hide the top strip containing secondary links and announcements."
                        />
                        <div className={`space-y-4 transition-opacity ${!header.strip.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Centre Message" info="A promotional or informational message displayed in the center of the top strip.">
                                    <input
                                        className={inputCls}
                                        value={header.strip.center_message}
                                        onChange={e => update('strip', { ...header.strip, center_message: e.target.value })}
                                        placeholder="✦ Thank You for Choosing Us ✦"
                                    />
                                </Field>
                                <Field label="Hotline Number" info="The primary contact phone number prominently displayed in the top strip for user convenience.">
                                    <input
                                        className={inputCls}
                                        value={header.strip.hotline}
                                        onChange={e => update('strip', { ...header.strip, hotline: e.target.value })}
                                        placeholder="090 202 5806"
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Toggle
                                    checked={header.strip.show_track_orders}
                                    onChange={v => update('strip', { ...header.strip, show_track_orders: v })}
                                    label="Show Track Orders link"
                                    sub="Left side of the strip bar"
                                    info="Displays a convenient link for users to track their existing orders."
                                />
                                <Toggle
                                    checked={header.strip.show_categories}
                                    onChange={v => update('strip', { ...header.strip, show_categories: v })}
                                    label="Show Categories dropdown"
                                    sub="Left side of the strip bar"
                                    info="Provides a dropdown menu summarizing main shop categories within the strip bar."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end"><SaveBtn section="strip" /></div>
                    </div>
                </SectionCard>

            </div>

            {/* ── Sticky Save All ── */}
            <div className="pt-6 flex justify-end">
                <button
                    onClick={saveAll}
                    disabled={saving}
                    className="flex items-center gap-3 px-8 py-4 bg-primary border border-gold/30 text-gold font-serif font-bold text-base uppercase tracking-[0.1em] rounded-2xl hover:shadow-[0_0_30px_rgba(197,164,109,0.4)] hover:-translate-y-1 transition-all duration-500 disabled:opacity-50"
                >
                    {saving && activeSection === 'all'
                        ? <><Loader2 className="w-5 h-5 animate-spin" /> saving manifold…</>
                        : <><Save className="w-5 h-5" /> Save Global Configuration</>}
                </button>
            </div>
        </div>
    );
}
