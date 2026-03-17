'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, X, Loader2, ChevronDown, ChevronUp,
    Save, RefreshCw, Layout, Link2, Eye, EyeOff,
    Instagram, Facebook, Twitter, Mail, MapPin, Phone, Clock,
    Youtube, Linkedin, AlertCircle, Building2, ExternalLink, Globe,
    Newspaper, Shield, AlignLeft, GripVertical, Info
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
        <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-500 hover:shadow-gold/5">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-primary/10 transition-all duration-300"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 border border-border">
                        <Icon className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                        <h2 className="text-sm font-serif font-bold text-gold tracking-widest uppercase">{title}</h2>
                        {subtitle && <p className="text-[10px] text-text-muted mt-0.5 font-medium uppercase tracking-widest">{subtitle}</p>}
                    </div>
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

const inputCls = "w-full rounded-xl border border-border bg-black/20 px-4 py-2.5 text-sm text-gold-soft placeholder:text-text-muted/40 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/10 transition-all duration-300 font-medium";
const textareaCls = `${inputCls} resize-none min-h-[100px] leading-relaxed`;

// ─── Main Component ───────────────────────────────────────────────

export default function FooterManagementPage() {
    const [footer, setFooter] = useState<FooterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const headers = useCallback(() => {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) h['Authorization'] = `Bearer ${token}`;
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
            if (match) h['X-CSRF-Token'] = decodeURIComponent(match[1]);
        }
        return h;
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/footer/admin`, { headers: headers(), credentials: 'include' });
            const data = await res.json();
            if (data.success) setFooter(data.data);
            else toast.error('Failed to load footer content');
        } catch { toast.error('Network error loading footer'); }
        finally { setLoading(false); }
    }, [headers]);

    useEffect(() => { load(); }, [load]);

    const saveSection = async (section: keyof FooterData) => {
        if (!footer) return;
        setSaving(true);
        setActiveSection(section);
        try {
            const res = await authFetch(`${API_URL}/api/footer/admin/${section}`, {
                method: 'PUT',
                headers: headers(),
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
                headers: headers(),
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
            className="flex items-center gap-2 px-5 py-2 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(197,164,109,0.2)] transition-all duration-300 disabled:opacity-50"
        >
            {saving && activeSection === section
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> saving…</>
                : <><Save className="w-3.5 h-3.5" /> Commit</>}
        </button>
    );

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center min-h-[600px] space-y-6 animate-pulse">
                <div className="w-20 h-20 rounded-full border-t-2 border-l-2 border-gold animate-spin shadow-[0_0_20px_rgba(197,164,109,0.3)]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold/60">Illuminating Footer Foundations...</p>
            </div>
        );
    }

    if (!footer) {
        return (
            <div className="p-20 text-center space-y-6">
                <div className="p-6 bg-danger/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-danger/20">
                    <AlertCircle className="w-10 h-10 text-danger" />
                </div>
                <div className="space-y-2">
                    <p className="text-xl font-serif text-gold-soft">Frequencies Disorganized</p>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted/60 leading-loose mx-auto max-w-xs">
                        The footer architecture remains unmanifested from the repository.
                    </p>
                </div>
                <button onClick={load} className="px-8 py-3 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.2)] transition-all">
                    Attempt Manifestation
                </button>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-12 animate-fadeIn mb-20">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-border shadow-lg">
                            <Layout className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-gold tracking-tighter">Footer Stratum</h1>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                        Configure your storefront foundation — navigation strata, branding essence, and legal resonance.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 border border-border bg-primary/10 text-[10px] font-bold uppercase tracking-widest text-gold-soft rounded-xl hover:bg-primary/20 transition-all duration-300"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recalibrate
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

                {/* ── 1. Company ────────────────────────────────── */}
                <SectionCard icon={Building2} title="Branding Essence">
                    <div className="grid grid-cols-1 gap-8 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Field label="Logo Node" hint="The visual signature of your storefront. Manifested via direct URI." info="URL path to the footer logo image.">
                                <input
                                    className={inputCls}
                                    value={footer?.company?.logo_url || ''}
                                    onChange={e => update('company', { ...footer!.company, logo_url: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                />
                            </Field>
                            <Field label="Primary Tagline" hint="The spiritual resonance of your brand in a single phrase." info="A short catchy phrase appearing immediately below the logo.">
                                <input
                                    className={inputCls}
                                    value={footer?.company?.tagline || ''}
                                    onChange={e => update('company', { ...footer!.company, tagline: e.target.value })}
                                    placeholder="Premium Ayurvedic Wellness"
                                />
                            </Field>
                        </div>
                        <Field label="Atmospheric Narrative" hint="A brief description of your journey to be displayed in the stratum." info="Paragraph text summarizing the company's mission or description.">
                            <textarea
                                className={textareaCls}
                                rows={4}
                                value={footer?.company?.description || ''}
                                onChange={e => update('company', { ...footer!.company, description: e.target.value })}
                                placeholder="Manifest the company's story here..."
                            />
                        </Field>
                        <Field label="Chronological Signature" hint="The legal temporal marking for your creation." info="The copyright string appearing at the very bottom of the footer.">
                            <input
                                className={inputCls}
                                value={footer?.company?.copyright || ''}
                                onChange={e => update('company', { ...footer!.company, copyright: e.target.value })}
                                placeholder={`© ${new Date().getFullYear()} Vedashi. All rights reserved.`}
                            />
                        </Field>
                        <div className="flex justify-end pt-4 border-t border-white/5"><SaveBtn section="company" /></div>
                    </div>
                </SectionCard>

                {/* ── 2. Navigation Link Columns ────────────────── */}
                <SectionCard icon={Link2} title="Access Strata">
                    <div className="mt-4 space-y-8">
                        {(footer?.links || []).map((col, ci) => (
                            <div key={ci} className="border border-white/5 rounded-[2rem] p-8 space-y-6 bg-black/40 shadow-inner group/col transition-all hover:border-gold/10">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[8px] font-bold text-gold/40 uppercase tracking-[0.2em] mb-2 px-1">Stratum Title</label>
                                        <input
                                            className={`${inputCls} font-serif font-bold text-lg bg-black/20 italic group-hover/col:text-gold transition-colors`}
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
                                        className="self-end p-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-all shadow-lg"
                                        title="Retract stratum"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[8px] font-bold text-gold/40 uppercase tracking-[0.2em] px-1">Navigation Nodes</label>
                                    {col.items.map((item, ii) => (
                                        <div key={ii} className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 items-center group/node">
                                            <input
                                                className={`${inputCls} bg-black/20 group-hover/node:border-gold/20 transition-all`}
                                                value={item.label}
                                                onChange={e => {
                                                    const cols = [...footer.links];
                                                    cols[ci].items[ii] = { ...item, label: e.target.value };
                                                    update('links', cols);
                                                }}
                                                placeholder="Node Label"
                                            />
                                            <input
                                                className={`${inputCls} bg-black/20 group-hover/node:border-gold/20 transition-all`}
                                                value={item.url}
                                                onChange={e => {
                                                    const cols = [...footer.links];
                                                    cols[ci].items[ii] = { ...item, url: e.target.value };
                                                    update('links', cols);
                                                }}
                                                placeholder="/pathway"
                                            />
                                            <label className="flex items-center justify-center p-3 rounded-xl bg-black/40 border border-border cursor-pointer select-none text-gold-soft hover:text-gold transition-all shadow-inner" title="External Pathway">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={item.open_new_tab}
                                                    onChange={e => {
                                                        const cols = [...footer.links];
                                                        cols[ci].items[ii] = { ...item, open_new_tab: e.target.checked };
                                                        update('links', cols);
                                                    }}
                                                />
                                                <div className="w-4 h-4 peer-checked:text-gold peer-checked:drop-shadow-[0_0_5px_rgba(197,164,109,0.5)] transition-all">
                                                    <ExternalLink className="w-full h-full" />
                                                </div>
                                            </label>
                                            <button
                                                onClick={() => {
                                                    const cols = [...footer.links];
                                                    cols[ci].items = cols[ci].items.filter((_, i) => i !== ii);
                                                    update('links', cols);
                                                }}
                                                className="p-3 rounded-xl bg-black/10 border border-border text-text-muted/40 hover:text-danger hover:border-danger/20 transition-all"
                                            >
                                                <X className="w-4 h-4" />
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
                                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold/60 hover:text-gold transition-all group/add self-start px-2"
                                >
                                    <div className="p-1 rounded-md bg-gold/10 border border-gold/20 group-hover/add:scale-110 transition-transform">
                                        <Plus className="w-3 h-3" />
                                    </div>
                                    Append Node
                                </button>
                            </div>
                        ))}

                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <button
                                onClick={() => update('links', [...(footer?.links || []), { column_title: 'New Stratum', items: [] }])}
                                className="flex items-center gap-3 px-6 py-2.5 bg-black/40 border border-border text-gold-soft text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Manifest New Stratum
                            </button>
                            <SaveBtn section="links" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 3. Social Media ───────────────────────────── */}
                <SectionCard icon={Globe} title="Social Connectivity">
                    <div className="mt-4 space-y-4">
                        {(footer?.social || []).map((s, i) => {
                            const IconComp = PLATFORM_ICONS[s.icon] || Globe;
                            return (
                                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 items-center group/social">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 shadow-lg text-gold group-hover/social:scale-110 transition-transform">
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
                                            <option key={p} value={p} className="bg-card-bg">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
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
                                        placeholder="https://pathway"
                                    />
                                    <button
                                        onClick={() => update('social', (footer?.social || []).filter((_, idx) => idx !== i))}
                                        className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-all shadow-lg"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                            <button
                                onClick={() => update('social', [...(footer?.social || []), { platform: 'Other', url: '', icon: 'other' }])}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold/60 hover:text-gold transition-all"
                            >
                                <Plus className="w-4 h-4" /> Expand Connectivity
                            </button>
                            <SaveBtn section="social" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 4. Contact Info ───────────────────────────── */}
                <SectionCard icon={Phone} title="Spiritual Availability">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        <Field label="Sanctuary Address" info="The physical address of your business, displayed in the footer.">
                            <div className="relative group/input">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/40 group-focus-within/input:text-gold transition-colors" />
                                <input
                                    className={`${inputCls} pl-12`}
                                    value={footer?.contact?.address || ''}
                                    onChange={e => update('contact', { ...footer!.contact, address: e.target.value })}
                                    placeholder="City, Cosmos"
                                />
                            </div>
                        </Field>
                        <Field label="Voice Frequency" info="The primary contact phone number for customer support or inquiries.">
                            <div className="relative group/input">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/40 group-focus-within/input:text-gold transition-colors" />
                                <input
                                    className={`${inputCls} pl-12`}
                                    value={footer?.contact?.phone || ''}
                                    onChange={e => update('contact', { ...footer!.contact, phone: e.target.value })}
                                    placeholder="+ frequency"
                                />
                            </div>
                        </Field>
                        <Field label="Digital Correspondence" info="The primary email address where customers can reach you.">
                            <div className="relative group/input">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/40 group-focus-within/input:text-gold transition-colors" />
                                <input
                                    className={`${inputCls} pl-12`}
                                    value={footer?.contact?.email || ''}
                                    onChange={e => update('contact', { ...footer!.contact, email: e.target.value })}
                                    placeholder="aura@vedashi.com"
                                />
                            </div>
                        </Field>
                        <Field label="Temporal Alignment" info="Your business operating hours.">
                            <div className="relative group/input">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/40 group-focus-within/input:text-gold transition-colors" />
                                <input
                                    className={`${inputCls} pl-12`}
                                    value={footer?.contact?.hours || ''}
                                    onChange={e => update('contact', { ...footer!.contact, hours: e.target.value })}
                                    placeholder="Sun–Sat 9am–9pm"
                                />
                            </div>
                        </Field>
                        <div className="md:col-span-2 flex justify-end pt-6 border-t border-white/5"><SaveBtn section="contact" /></div>
                    </div>
                </SectionCard>

                {/* ── 5. Newsletter ─────────────────────────────── */}
                <SectionCard icon={Newspaper} title="Vibration Subscription">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-6 cursor-pointer select-none p-6 bg-black/40 rounded-[2rem] border border-border shadow-inner hover:border-gold/20 transition-all">
                                <div className={`relative w-14 h-7 rounded-full transition-all duration-500 shadow-lg ${footer?.newsletter?.enabled ? 'bg-gold' : 'bg-white/5 border border-border'}`}>
                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-2xl transition-transform duration-500 ${footer?.newsletter?.enabled ? 'translate-x-7' : ''}`} />
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={footer?.newsletter?.enabled || false}
                                        onChange={e => update('newsletter', { ...(footer?.newsletter || { enabled: false, heading: '', subtext: '' }), enabled: e.target.checked })}
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gold-soft uppercase tracking-widest">Manifest Newsletter Node</p>
                                    <p className="text-[10px] text-text-muted/40 font-bold uppercase tracking-widest mt-1 italic">Display the email subscription oscillation in the stratum</p>
                                </div>
                            </label>
                        </div>
                        <Field label="Vibration Heading" info="The main title for the newsletter subscription section.">
                            <input
                                className={inputCls}
                                value={footer?.newsletter?.heading || ''}
                                onChange={e => update('newsletter', { ...(footer?.newsletter || { enabled: false, heading: '', subtext: '' }), heading: e.target.value })}
                                placeholder="Stay In The Resonance"
                            />
                        </Field>
                        <Field label="Vibration Subtext" info="Additional descriptive text encouraging users to subscribe.">
                            <input
                                className={inputCls}
                                value={footer?.newsletter?.subtext || ''}
                                onChange={e => update('newsletter', { ...(footer?.newsletter || { enabled: false, heading: '', subtext: '' }), subtext: e.target.value })}
                                placeholder="Receive exclusive vibrations…"
                            />
                        </Field>
                        <div className="md:col-span-2 flex justify-end pt-6 border-t border-white/5"><SaveBtn section="newsletter" /></div>
                    </div>
                </SectionCard>

                {/* ── 6. Legal Links ────────────────────────────── */}
                <SectionCard icon={Shield} title="Legal Resonance">
                    <div className="mt-4 space-y-4">
                        {(footer?.legal || []).map((l, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center group/legal">
                                <input
                                    className={`${inputCls} bg-black/20 group-hover/legal:border-gold/20 transition-all font-bold italic`}
                                    value={l.label}
                                    onChange={e => {
                                        const updated = [...(footer?.legal || [])];
                                        updated[i] = { ...l, label: e.target.value };
                                        update('legal', updated);
                                    }}
                                    placeholder="Dharma Policy"
                                />
                                <input
                                    className={`${inputCls} bg-black/20 group-hover/legal:border-gold/20 transition-all font-mono`}
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
                                    className="p-3 rounded-xl bg-black/10 border border-border text-text-muted/40 hover:text-danger hover:border-danger/20 transition-all shadow-inner"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                            <button
                                onClick={() => update('legal', [...(footer?.legal || []), { label: '', url: '' }])}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold/60 hover:text-gold transition-all"
                            >
                                <Plus className="w-4 h-4" /> Annex Legal Node
                            </button>
                            <SaveBtn section="legal" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 7. Bottom Bar ─────────────────────────────── */}
                <SectionCard icon={AlignLeft} title="Bottom Stratum Disclaimer" defaultOpen={false}>
                    <div className="mt-4 space-y-6">
                        <Field label="Compliance / Dharma Disclaimer" hint="Manifested at the absolute foundation of the footer, e.g. wellness disclaimer." info="Legal disclaimer text placed at the very bottom of the store for maximum visibility.">
                            <textarea
                                className={`${textareaCls} min-h-[120px] italic leading-relaxed shadow-lg`}
                                rows={4}
                                value={footer?.bottom_bar?.text || ''}
                                onChange={e => update('bottom_bar', { text: e.target.value })}
                                placeholder="Consult with a physician before use. Keep out of reach of children…"
                            />
                        </Field>
                        <div className="flex justify-end pt-6 border-t border-white/5"><SaveBtn section="bottom_bar" /></div>
                    </div>
                </SectionCard>

            </div>

            {/* ── Sticky Save All Footer ── */}
            <div className="pt-6 flex justify-end pb-20">
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
