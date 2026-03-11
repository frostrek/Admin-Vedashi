'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, X, Loader2, ChevronDown, ChevronUp,
    Save, RefreshCw, Palette, Layout, Link2, Eye, EyeOff,
    GripVertical, AlignLeft, MonitorSmartphone, Zap
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

interface HeaderData {
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
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50/60 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#C5A46D]/10">
                        <Icon className="w-4 h-4 text-[#C5A46D]" />
                    </div>
                    <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>
            {open && <div className="px-6 pb-6 border-t border-neutral-100">{children}</div>}
        </div>
    );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">{label}</label>
        {hint && <p className="text-xs text-neutral-400 mb-1.5">{hint}</p>}
        {children}
    </div>
);

const Toggle = ({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) => (
    <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-neutral-50 rounded-xl border border-neutral-200">
        <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#C5A46D]' : 'bg-neutral-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        </div>
        <div>
            <p className="text-sm font-medium text-neutral-700">{label}</p>
            {sub && <p className="text-xs text-neutral-400">{sub}</p>}
        </div>
    </label>
);

const inputCls = "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D] transition-colors";

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <Field label={label}>
        <div className="flex items-center gap-2">
            <div className="relative">
                <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-10 h-9 rounded-lg border border-neutral-200 cursor-pointer p-0.5 bg-white"
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

    const SaveBtn = ({ section }: { section: keyof HeaderData }) => (
        <button
            onClick={() => saveSection(section)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A46D] hover:bg-[#B3935C] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
            {saving && activeSection === section
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><Save className="w-3.5 h-3.5" /> Save</>}
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
        <div className="p-8 max-w-4xl mx-auto">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#C5A46D]/10">
                            <MonitorSmartphone className="w-5 h-5 text-[#C5A46D]" />
                        </div>
                        <h1 className="text-2xl font-serif text-neutral-900">Header Management</h1>
                    </div>
                    <p className="text-sm text-neutral-500 ml-[52px]">
                        Configure your storefront navbar — links, colours, strip bar, and branding. Changes reflect live after saving.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 border border-neutral-200 text-sm text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Reload
                    </button>
                    <button
                        onClick={saveAll}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C5A46D] hover:bg-[#B3935C] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {saving && activeSection === 'all'
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Save className="w-4 h-4" /> Save All</>}
                    </button>
                </div>
            </div>

            <div className="space-y-4">

                {/* ── 1. Branding ───────────────────────────────── */}
                <SectionCard icon={Layout} title="Branding">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        {/* Logo Upload */}
                        <Field label="Logo Image" hint="Upload a PNG / SVG / WebP. Stored as base64 — no external URL needed.">
                            <div className="space-y-3">
                                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:border-[#C5A46D] hover:bg-[#C5A46D]/[0.03] transition-colors group">
                                    <div className="flex flex-col items-center gap-1.5 text-neutral-400 group-hover:text-[#C5A46D] transition-colors">
                                        <Layout className="w-6 h-6" />
                                        <span className="text-xs font-medium">Click to upload</span>
                                        <span className="text-[11px]">PNG, SVG, WebP, JPG</span>
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
                                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Remove logo
                                    </button>
                                )}
                            </div>
                        </Field>

                        <Field label="Logo Alt Text">
                            <input
                                className={inputCls}
                                value={header.branding.logo_alt}
                                onChange={e => update('branding', { ...header.branding, logo_alt: e.target.value })}
                                placeholder="Vedashi"
                            />
                        </Field>

                        {/* Preview */}
                        {header.branding.logo_url && (
                            <div className="col-span-2">
                                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Preview</p>
                                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={header.branding.logo_url} alt={header.branding.logo_alt} className="h-14 w-auto object-contain" />
                                    <span className="text-xs text-neutral-400">{header.branding.logo_alt}</span>
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
                                />
                                <ColorField
                                    label="Navbar Text"
                                    value={header.colors.navbar_text}
                                    onChange={v => update('colors', { ...header.colors, navbar_text: v })}
                                />
                                <ColorField
                                    label="Hover / Active Colour"
                                    value={header.colors.navbar_hover}
                                    onChange={v => update('colors', { ...header.colors, navbar_hover: v })}
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
                                />
                                <ColorField
                                    label="Strip Text"
                                    value={header.colors.strip_text}
                                    onChange={v => update('colors', { ...header.colors, strip_text: v })}
                                />
                                <ColorField
                                    label="Strip Accent (Hotline)"
                                    value={header.colors.strip_accent}
                                    onChange={v => update('colors', { ...header.colors, strip_accent: v })}
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
                                />
                            </div>
                        </div>
                        {/* Live mini-preview */}
                        <div>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">Live Preview</p>
                            <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-md">
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
                <SectionCard icon={Link2} title="Navigation Links">
                    <div className="mt-4 space-y-2">
                        <p className="text-xs text-neutral-400 mb-3">Toggle a link off to hide it from the navbar. Reorder by dragging (visual order is top → left).</p>
                        {header.nav_links.map((link, i) => (
                            <div
                                key={i}
                                className={`grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center p-3 rounded-xl border transition-colors ${link.enabled ? 'border-neutral-200 bg-white' : 'border-neutral-100 bg-neutral-50 opacity-60'}`}
                            >
                                <GripVertical className="w-4 h-4 text-neutral-300 cursor-grab" />
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
                                    className={`p-2 rounded-lg transition-colors ${link.enabled ? 'text-[#C5A46D] hover:bg-[#C5A46D]/10' : 'text-neutral-300 hover:bg-neutral-100'}`}
                                    title={link.enabled ? 'Visible — click to hide' : 'Hidden — click to show'}
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
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => update('nav_links', [...header.nav_links, { label: '', url: '/', enabled: true }])}
                                className="flex items-center gap-1.5 text-sm text-[#C5A46D] hover:text-[#B3935C] font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add Link
                            </button>
                            <SaveBtn section="nav_links" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 4. Strip Bar ──────────────────────────────── */}
                <SectionCard icon={Zap} title="Strip Bar (Below Navbar)" defaultOpen={true}>
                    <div className="mt-4 space-y-4">
                        <Toggle
                            checked={header.strip.enabled}
                            onChange={v => update('strip', { ...header.strip, enabled: v })}
                            label="Show Strip Bar"
                            sub="The thin coloured bar below the main navbar"
                        />
                        <div className={`space-y-4 transition-opacity ${!header.strip.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Centre Message">
                                    <input
                                        className={inputCls}
                                        value={header.strip.center_message}
                                        onChange={e => update('strip', { ...header.strip, center_message: e.target.value })}
                                        placeholder="✦ Thank You for Choosing Us ✦"
                                    />
                                </Field>
                                <Field label="Hotline Number">
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
                                />
                                <Toggle
                                    checked={header.strip.show_categories}
                                    onChange={v => update('strip', { ...header.strip, show_categories: v })}
                                    label="Show Categories dropdown"
                                    sub="Left side of the strip bar"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end"><SaveBtn section="strip" /></div>
                    </div>
                </SectionCard>

            </div>

            {/* ── Sticky Save All ── */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={saveAll}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C5A46D] hover:bg-[#B3935C] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-lg"
                >
                    {saving && activeSection === 'all'
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving All…</>
                        : <><Save className="w-4 h-4" /> Save All Sections</>}
                </button>
            </div>
        </div>
    );
}
