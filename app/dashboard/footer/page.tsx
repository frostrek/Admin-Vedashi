'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, X, Loader2, ChevronDown, ChevronUp,
    Save, RefreshCw, Layout, Link2, Eye, EyeOff,
    Instagram, Facebook, Twitter, Mail, MapPin, Phone, Clock,
    Youtube, Linkedin, AlertCircle, Building2, ExternalLink, Globe,
    Newspaper, Shield, AlignLeft, GripVertical, Info
} from 'lucide-react';

import { API_URL } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────

interface CompanySection {
    logo_url: string;
    tagline: string;
    description: string;
    copyright: string;
}

interface LinkItem { label: string; url: string; open_new_tab: boolean; }
interface LinkColumn { column_title: string; items: LinkItem[]; }

interface SocialLink { platform: string; url: string; icon: string; }

interface ContactSection { address: string; phone: string; email: string; hours: string; }

interface LegalLink { label: string; url: string; }

interface NewsletterSection { enabled: boolean; heading: string; subtext: string; }

interface BottomBarSection { text: string; }

interface FooterData {
    company: CompanySection;
    links: LinkColumn[];
    social: SocialLink[];
    contact: ContactSection;
    legal: LegalLink[];
    newsletter: NewsletterSection;
    bottom_bar: BottomBarSection;
}

// ─── Helpers ──────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    youtube: Youtube,
    linkedin: Linkedin,
};

const PLATFORM_OPTIONS = ['instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'other'];

// ─── Shared UI Pieces ─────────────────────────────────────────────

const SectionCard = ({ icon: Icon, title, subtitle, children, defaultOpen = true }: {
    icon: any; title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white border border-[#C5A46D]/20 rounded-2xl transition-all duration-500 shadow-[0_4px_20px_-4px_rgba(197,164,109,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(197,164,109,0.15)]">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 bg-[#FDFCF8]/50 hover:bg-[#FDFCF8] transition-all duration-300 border-b border-[#C5A46D]/10"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#C5A46D]/20 shadow-sm">
                        <Icon className="w-5 h-5 text-[#8B7355]" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-serif text-xl font-bold text-[#8B7355] tracking-tight">{title}</h4>
                        {subtitle && <p className="text-[9px] text-[#8B7355]/50 mt-0.5 font-black uppercase tracking-[0.2em]">{subtitle}</p>}
                    </div>
                </div>
                <div className={`p-1.5 rounded-full border border-[#C5A46D]/20 transition-transform duration-500 ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8B7355]" />
                </div>
            </button>
            <div className={`transition-all duration-500 ${open ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="pt-8 pb-4 px-5 space-y-5 animate-fadeIn">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, hint, info, children }: { label: string; hint?: string; info?: string; children: React.ReactNode }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
            <label className="text-[11px] font-black text-[#8B7355] uppercase tracking-[0.15em] flex items-center gap-2">
                {label}
                {info && (
                    <span className="relative group cursor-pointer inline-flex items-center">
                        <Info className="w-3.5 h-3.5 text-[#C5A46D]/40 hover:text-[#8B7355] transition-colors" />
                        <span className="absolute bottom-full left-0 origin-bottom-left mb-3 w-max max-w-[240px] px-4 py-3 font-sans text-xs font-semibold text-neutral-800 bg-white border border-neutral-200 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999] normal-case tracking-normal leading-relaxed">
                            {info}
                            <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-white border-b border-r border-neutral-200 rotate-45" />
                        </span>
                    </span>
                )}
            </label>
            {hint && <span className="text-[9px] text-[#8B7355]/40 font-bold uppercase tracking-tighter italic">{hint}</span>}
        </div>
        {children}
    </div>
);

const inputCls = "w-full rounded-xl border border-[#C5A46D]/20 bg-page-bg/30 px-4 py-2.5 text-sm text-[#1D351D] focus:border-[#C5A46D]/50 focus:outline-none focus:ring-4 focus:ring-[#C5A46D]/5 transition-all duration-300 font-medium shadow-inner";
const textareaCls = `${inputCls} resize-none min-h-[100px] leading-relaxed`;

// ─── Main Component ───────────────────────────────────────────────

export default function FooterManagementPage() {
    const [footer, setFooter] = useState<FooterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/footer/admin`);
            const data = await res.json();
            if (data.success) setFooter(data.data);
            else toast.error('Failed to load footer content');
        } catch { toast.error('Network error loading footer'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const saveSection = async (section: keyof FooterData) => {
        if (!footer) return;
        setSaving(true);
        setActiveSection(section);
        try {
            const res = await authFetch(`${API_URL}/api/footer/admin/${section}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: footer[section] }),
            });
            const data = await res.json();
            if (data.success) toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} saved!`);
            else toast.error(data.message || 'Failed to save');
        } catch { toast.error('Error saving section'); }
        finally { setSaving(false); setActiveSection(null); }
    };

    const saveAll = async () => {
        if (!footer) return;
        setSaving(true);
        setActiveSection('all');
        try {
            const res = await authFetch(`${API_URL}/api/footer/admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(footer),
            });
            const data = await res.json();
            if (data.success) toast.success('All footer sections saved!');
            else toast.error(data.message || 'Failed to save');
        } catch { toast.error('Error saving footer'); }
        finally { setSaving(false); setActiveSection(null); }
    };

    const update = <K extends keyof FooterData>(section: K, value: FooterData[K]) => {
        setFooter(prev => prev ? { ...prev, [section]: value } : prev);
    };

    const SaveBtn = ({ section }: { section: keyof FooterData }) => (
        <button
            onClick={() => saveSection(section)}
            disabled={saving}
            className="group flex items-center gap-2 px-4 py-2 bg-primary border border-gold/10 text-[#E8D8B9] text-[13px] font-semibold rounded-lg hover:bg-primary-light transition-all duration-300 shadow-sm disabled:opacity-50"
        >
            {saving && activeSection === section
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> Save Section</>}
        </button>
    );

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center min-h-[600px] space-y-6">
                <Loader2 className="w-12 h-12 animate-spin text-[#8B7355]" />
                <p className="text-[11px] font-black uppercase tracking-widest text-[#8B7355]/60 animate-pulse">Synchronizing Stratum...</p>
            </div>
        );
    }

    if (!footer) {
        return (
            <div className="p-20 text-center space-y-6 max-w-lg mx-auto">
                <div className="p-8 bg-red-50 rounded-[2.5rem] w-24 h-24 flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="font-serif text-3xl font-bold text-[#8B7355]">Manifestation Failure</h2>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                        The footer architecture remains unmanifested from the repository frequencies.
                    </p>
                </div>
                <button onClick={load} className="w-full px-8 py-4 bg-[#1D351D] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#2d4d2d] transition-all">
                    Retry Manifestation
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn mb-24">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-fadeInUp">
                <div className="space-y-1">
                    <h1 className="font-serif text-3xl font-bold text-[#8B7355] tracking-tighter">Footer Stratum</h1>
                    <p className="text-sm font-semibold text-black/80 ml-1 max-w-2xl">
                        Architect your storefront foundation — manage brand identity, navigation menage, and global compliance frequencies.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="group flex items-center gap-2 px-5 py-2.5 border border-gold/10 bg-white text-[#8B7355] text-sm font-semibold rounded-lg hover:bg-[#FDFCF8] transition-all duration-300 shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5 ${loading ? 'animate-spin' : ''}`} /> Recalibrate
                    </button>
                    <button
                        onClick={saveAll}
                        disabled={saving}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-primary border border-gold/10 text-[#E8D8B9] text-sm font-semibold rounded-lg hover:bg-primary-light transition-all duration-300 shadow-sm disabled:opacity-50"
                    >
                        {saving && activeSection === 'all'
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Save className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" /> Save Global Configuration</>}
                    </button>
                </div>
            </div>

            <div className="space-y-6">

                {/* ── 1. Brand Identity ────────────────────────── */}
                <SectionCard icon={Building2} title="Brand Identity" subtitle="Primary logo, taglines and descriptions">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Footer Logo URI" info="The direct URL path to your brand signature.">
                            <input
                                className={inputCls}
                                value={footer?.company?.logo_url || ''}
                                onChange={e => update('company', { ...footer!.company, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                            />
                        </Field>
                        <Field label="Brand Tagline" info="A short phrase manifesting the spiritual resonance of your brand.">
                            <input
                                className={inputCls}
                                value={footer?.company?.tagline || ''}
                                onChange={e => update('company', { ...footer!.company, tagline: e.target.value })}
                                placeholder="Premium Ayurvedic Wellness"
                            />
                        </Field>
                        <div className="md:col-span-2">
                            <Field label="Company Narrative" info="The brief description of your journey to be displayed in the stratum.">
                                <textarea
                                    className={textareaCls}
                                    value={footer?.company?.description || ''}
                                    onChange={e => update('company', { ...footer!.company, description: e.target.value })}
                                    placeholder="Describe the company's story here..."
                                />
                            </Field>
                        </div>
                        <Field label="Copyright Signature" info="The legal temporal marking for your creation.">
                            <input
                                className={inputCls}
                                value={footer?.company?.copyright || ''}
                                onChange={e => update('company', { ...footer!.company, copyright: e.target.value })}
                                placeholder={`© ${new Date().getFullYear()} Vedashi. All rights reserved.`}
                            />
                        </Field>
                        <div className="md:col-span-2 flex justify-end pt-6 border-t border-[#C5A46D]/10">
                            <SaveBtn section="company" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 2. Navigation Menus ────────────────────────── */}
                <SectionCard icon={Link2} title="Navigation Menus" subtitle="Architect link columns and associations">
                    <div className="space-y-10">
                        {(footer?.links || []).map((col, ci) => (
                            <div key={ci} className="bg-page-bg/20 rounded-2xl border border-[#C5A46D]/10 p-5 md:p-6 space-y-5 relative group transition-all hover:border-[#C5A46D]/30 shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[9px] font-black text-[#8B7355] uppercase tracking-widest mb-2 ml-1">Stratum Title</label>
                                        <input
                                            className={`${inputCls} font-serif text-lg font-bold italic !bg-white group-hover:border-[#C5A46D]/40 transition-colors`}
                                            value={col.column_title}
                                            onChange={e => {
                                                const cols = [...footer.links];
                                                cols[ci] = { ...cols[ci], column_title: e.target.value };
                                                update('links', cols);
                                            }}
                                            placeholder="e.g., Exploration"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const cols = footer.links.filter((_, i) => i !== ci);
                                            update('links', cols);
                                        }}
                                        className="mt-6 p-3 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all border border-red-100"
                                        title="Delete Stratum"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-[#8B7355] uppercase tracking-widest ml-2">Navigation Nodes</label>
                                    <div className="space-y-3">
                                        {col.items.map((item, ii) => (
                                            <div key={ii} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center group/node">
                                                <input
                                                    className={`${inputCls} !py-3 !px-5 !bg-white`}
                                                    value={item.label}
                                                    onChange={e => {
                                                        const cols = [...footer.links];
                                                        cols[ci].items[ii] = { ...item, label: e.target.value };
                                                        update('links', cols);
                                                    }}
                                                    placeholder="Label"
                                                />
                                                <input
                                                    className={`${inputCls} !py-3 !px-5 !bg-white font-mono text-[11px]`}
                                                    value={item.url}
                                                    onChange={e => {
                                                        const cols = [...footer.links];
                                                        cols[ci].items[ii] = { ...item, url: e.target.value };
                                                        update('links', cols);
                                                    }}
                                                    placeholder="/pathway"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const cols = [...footer.links];
                                                        cols[ci].items[ii] = { ...item, open_new_tab: !item.open_new_tab };
                                                        update('links', cols);
                                                    }}
                                                    className={`p-3.5 rounded-xl border transition-all ${item.open_new_tab ? 'bg-[#1D351D] text-white border-[#1D351D]' : 'bg-white text-[#C5A46D]/40 border-[#C5A46D]/20'}`}
                                                    title="New Tab"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const cols = [...footer.links];
                                                        cols[ci].items = cols[ci].items.filter((_, i) => i !== ii);
                                                        update('links', cols);
                                                    }}
                                                    className="p-3.5 rounded-xl text-neutral-300 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const cols = [...footer.links];
                                            cols[ci].items = [...cols[ci].items, { label: '', url: '', open_new_tab: false }];
                                            update('links', cols);
                                        }}
                                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-white border border-[#C5A46D]/30 text-[9px] font-black uppercase tracking-widest text-[#8B7355] hover:bg-[#FDFCF8] rounded-lg transition-all shadow-sm ml-1"
                                    >
                                        <Plus className="w-3 h-3" /> Append Node
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div className="flex items-center justify-between pt-10 border-t border-[#C5A46D]/10">
                            <button
                                onClick={() => update('links', [...(footer?.links || []), { column_title: 'New Stratum', items: [] }])}
                                className="flex items-center gap-2.5 px-6 py-3 bg-white border border-[#C5A46D]/20 text-[#8B7355] text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[#FDFCF8] transition-all shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Manifest New Stratum
                            </button>
                            <SaveBtn section="links" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 3. Social Presence ────────────────────────── */}
                <SectionCard icon={Globe} title="Social Connectivity" subtitle="Manage digital resonance platforms">
                    <div className="space-y-6">
                        {(footer?.social || []).map((s, i) => {
                            const IconComp = PLATFORM_ICONS[s.icon] || Globe;
                            return (
                                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 items-center bg-page-bg/10 p-4 rounded-xl border border-[#C5A46D]/10 group transition-all hover:border-[#C5A46D]/30">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#C5A46D]/20 shadow-sm text-[#8B7355]">
                                        <IconComp className="w-5 h-5" />
                                    </div>
                                    <select
                                        value={s.icon}
                                        onChange={e => {
                                            const updated = [...(footer?.social || [])];
                                            updated[i] = { ...s, icon: e.target.value, platform: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) };
                                            update('social', updated);
                                        }}
                                        className={inputCls}
                                    >
                                        {PLATFORM_OPTIONS.map(p => (
                                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                        ))}
                                    </select>
                                    <input
                                        className={inputCls}
                                        value={s.url}
                                        onChange={e => {
                                            const updated = [...(footer?.social || [])];
                                            updated[i] = { ...s, url: e.target.value };
                                            update('social', updated);
                                        }}
                                        placeholder="https://social.link"
                                    />
                                    <button
                                        onClick={() => update('social', (footer?.social || []).filter((_, idx) => idx !== i))}
                                        className="p-4 rounded-2xl bg-red-50 text-red-400 hover:bg-red-100 transition-all border border-red-100"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-between pt-8 border-t border-[#C5A46D]/10">
                            <button
                                onClick={() => update('social', [...(footer?.social || []), { platform: 'Other', url: '', icon: 'other' }])}
                                className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-[#C5A46D]/30 text-[9px] font-black uppercase tracking-widest text-[#8B7355] hover:bg-[#FDFCF8] rounded-lg transition-all shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Expand Connectivity
                            </button>
                            <SaveBtn section="social" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 4. Contact Details ────────────────────────── */}
                <SectionCard icon={Phone} title="Spiritual Availability" subtitle="Manage physical and temporal presence">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Sanctuary Address" info="The physical origin point for your brand.">
                            <div className="relative group">
                                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A46D]/40 group-focus-within:text-[#8B7355] transition-colors" />
                                <input
                                    className={`${inputCls} pl-16`}
                                    value={footer?.contact?.address || ''}
                                    onChange={e => update('contact', { ...footer!.contact, address: e.target.value })}
                                    placeholder="City, Cosmos"
                                />
                            </div>
                        </Field>
                        <Field label="Voice Frequency" info="The primary telepathic link.">
                            <div className="relative group">
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A46D]/40 group-focus-within:text-[#8B7355] transition-colors" />
                                <input
                                    className={`${inputCls} pl-16`}
                                    value={footer?.contact?.phone || ''}
                                    onChange={e => update('contact', { ...footer!.contact, phone: e.target.value })}
                                    placeholder="+ frequency"
                                />
                            </div>
                        </Field>
                        <Field label="Digital Correspondence" info="The main support frequency.">
                            <div className="relative group">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A46D]/40 group-focus-within:text-[#8B7355] transition-colors" />
                                <input
                                    className={`${inputCls} pl-16`}
                                    value={footer?.contact?.email || ''}
                                    onChange={e => update('contact', { ...footer!.contact, email: e.target.value })}
                                    placeholder="aura@vedashiherbals.com"
                                />
                            </div>
                        </Field>
                        <Field label="Temporal Alignment" info="Business operating hours.">
                            <div className="relative group">
                                <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C5A46D]/40 group-focus-within:text-[#8B7355] transition-colors" />
                                <input
                                    className={`${inputCls} pl-16`}
                                    value={footer?.contact?.hours || ''}
                                    onChange={e => update('contact', { ...footer!.contact, hours: e.target.value })}
                                    placeholder="Sun–Sat 9am–9pm"
                                />
                            </div>
                        </Field>
                        <div className="md:col-span-2 flex justify-end pt-6 border-t border-[#C5A46D]/10">
                            <SaveBtn section="contact" />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard icon={Newspaper} title="Vibration Subscription" subtitle="Configure newsletter oscillation">
                    <div className="space-y-6">
                        <label className="flex items-center gap-5 cursor-pointer select-none p-5 md:p-6 bg-[#FDFCF8]/50 rounded-2xl border border-[#C5A46D]/20 shadow-inner group transition-all hover:bg-[#FDFCF8]">
                            <div className={`relative w-12 h-6 rounded-full transition-all duration-500 flex-shrink-0 ${footer?.newsletter?.enabled ? 'bg-[#1D351D]' : 'bg-neutral-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-500 ${footer?.newsletter?.enabled ? 'translate-x-6' : ''}`} />
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={footer?.newsletter?.enabled || false}
                                    onChange={e => update('newsletter', { ...(footer?.newsletter || { enabled: false, heading: '', subtext: '' }), enabled: e.target.checked })}
                                />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-lg font-serif font-bold text-[#8B7355]">Manifest Newsletter Node</p>
                                <p className="text-[9px] text-[#8B7355]/50 font-black uppercase tracking-[0.1em] italic">Display the subscription oscillation at the foundation</p>
                            </div>
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="Vibration Heading" info="The main title for the subscription module.">
                                <input
                                    className={inputCls}
                                    value={footer?.newsletter?.heading || ''}
                                    onChange={e => update('newsletter', { ...(footer?.newsletter || { enabled: false, heading: '', subtext: '' }), heading: e.target.value })}
                                    placeholder="Stay In The Resonance"
                                />
                            </Field>
                            <Field label="Vibration Subtext" info="Additional descriptive metadata.">
                                <input
                                    className={inputCls}
                                    value={footer?.newsletter?.subtext || ''}
                                    onChange={e => update('newsletter', { ...(footer?.newsletter || { enabled: false, heading: '', subtext: '' }), subtext: e.target.value })}
                                    placeholder="Receive exclusive updates…"
                                />
                            </Field>
                        </div>
                        <div className="flex justify-end pt-8 border-t border-[#C5A46D]/10">
                            <SaveBtn section="newsletter" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 6. Legal Links ────────────────────────────── */}
                <SectionCard icon={Shield} title="Legal Resonance" subtitle="Manage compliance and dharma documents">
                    <div className="space-y-6">
                        {(footer?.legal || []).map((l, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-6 items-center group/legal">
                                <input
                                    className={`${inputCls} !bg-white group-hover/legal:border-[#C5A46D]/40 font-serif font-bold italic`}
                                    value={l.label}
                                    onChange={e => {
                                        const updated = [...(footer?.legal || [])];
                                        updated[i] = { ...l, label: e.target.value };
                                        update('legal', updated);
                                    }}
                                    placeholder="Dharma Policy"
                                />
                                <input
                                    className={`${inputCls} !bg-white group-hover/legal:border-[#C5A46D]/40 font-mono text-[11px]`}
                                    value={l.url}
                                    onChange={e => {
                                        const updated = [...(footer?.legal || [])];
                                        updated[i] = { ...l, url: e.target.value };
                                        update('legal', updated);
                                    }}
                                    placeholder="/dharma"
                                />
                                <button
                                    onClick={() => update('legal', (footer?.legal || []).filter((_, idx) => idx !== i))}
                                    className="p-4 rounded-2xl bg-red-50 text-red-400 hover:bg-red-100 transition-all border border-red-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-8 border-t border-[#C5A46D]/10">
                            <button
                                onClick={() => update('legal', [...(footer?.legal || []), { label: '', url: '' }])}
                                className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-[#C5A46D]/30 text-[9px] font-black uppercase tracking-widest text-[#8B7355] hover:bg-[#FDFCF8] rounded-lg transition-all shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Annex Legal Node
                            </button>
                            <SaveBtn section="legal" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 7. Bottom Disclaimer ───────────────────────── */}
                <SectionCard icon={AlignLeft} title="Bottom Stratum Disclaimer" subtitle="Global compliance manifestations" defaultOpen={false}>
                    <div className="space-y-6">
                        <Field label="Compliance Disclaimer" info="Manifested at the absolute foundation for maximum visibility.">
                            <textarea
                                className={`${textareaCls} !bg-white italic shadow-lg`}
                                rows={6}
                                value={footer?.bottom_bar?.text || ''}
                                onChange={e => update('bottom_bar', { text: e.target.value })}
                                placeholder="Consult with a physician before use. Keep out of reach of children…"
                            />
                        </Field>
                        <div className="flex justify-end pt-8 border-t border-[#C5A46D]/10">
                            <SaveBtn section="bottom_bar" />
                        </div>
                    </div>
                </SectionCard>

            </div>

            {/* ── Sticky Global Save ── */}
            <div className="flex justify-end pt-12">
                <button
                    onClick={saveAll}
                    disabled={saving}
                    className="group flex items-center gap-3 px-8 py-3 bg-primary border border-gold/10 text-[#E8D8B9] text-sm font-semibold rounded-xl hover:bg-primary-light hover:shadow-[0_12px_30px_rgba(29,53,29,0.3)] transition-all duration-300 disabled:opacity-50 transform hover:-translate-y-1 active:scale-[0.98]"
                >
                    {saving && activeSection === 'all'
                        ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
                        : <><Save className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-1" /> Save Global Configuration</>}
                </button>
            </div>
        </div>
    );
}
