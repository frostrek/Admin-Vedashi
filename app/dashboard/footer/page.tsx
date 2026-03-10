'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, X, Loader2, LayoutTemplate, ChevronDown, ChevronUp,
    GripVertical, Save, RefreshCw, Globe, Instagram, Facebook,
    Twitter, Youtube, Linkedin, Phone, Mail, MapPin, Clock, ExternalLink,
    Link2, AlignLeft, Building2, Newspaper, Shield, Eye
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

const SectionCard = ({ icon: Icon, title, children, defaultOpen = true }: {
    icon: typeof Globe; title: string; children: React.ReactNode; defaultOpen?: boolean;
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

const inputCls = "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-[#C5A46D] focus:outline-none focus:ring-1 focus:ring-[#C5A46D] transition-colors";
const textareaCls = `${inputCls} resize-none`;

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
            const res = await fetch(`${API_URL}/api/footer/admin`, { headers: headers() });
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
                    <p className="text-sm text-neutral-500">Loading footer configuration…</p>
                </div>
            </div>
        );
    }

    if (!footer) {
        return (
            <div className="p-8 text-center text-neutral-500">
                <p>Failed to load footer data. <button onClick={load} className="text-[#C5A46D] underline">Retry</button></p>
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
                            <LayoutTemplate className="w-5 h-5 text-[#C5A46D]" />
                        </div>
                        <h1 className="text-2xl font-serif text-neutral-900">Footer Management</h1>
                    </div>
                    <p className="text-sm text-neutral-500 ml-[52px]">
                        Configure every section of your storefront footer. Changes reflect live instantly after saving.
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

                {/* ── 1. Company ────────────────────────────────── */}
                <SectionCard icon={Building2} title="Company Info">
                    <div className="grid grid-cols-1 gap-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Logo URL" hint="Direct image URL for your footer logo. Leave blank to hide.">
                                <input
                                    className={inputCls}
                                    value={footer.company.logo_url}
                                    onChange={e => update('company', { ...footer.company, logo_url: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                />
                            </Field>
                            <Field label="Tagline">
                                <input
                                    className={inputCls}
                                    value={footer.company.tagline}
                                    onChange={e => update('company', { ...footer.company, tagline: e.target.value })}
                                    placeholder="Premium Global Wines"
                                />
                            </Field>
                        </div>
                        <Field label="Description">
                            <textarea
                                className={textareaCls}
                                rows={3}
                                value={footer.company.description}
                                onChange={e => update('company', { ...footer.company, description: e.target.value })}
                                placeholder="Brief company description shown in footer…"
                            />
                        </Field>
                        <Field label="Copyright Text">
                            <input
                                className={inputCls}
                                value={footer.company.copyright}
                                onChange={e => update('company', { ...footer.company, copyright: e.target.value })}
                                placeholder={`© ${new Date().getFullYear()} KSP Wines. All rights reserved.`}
                            />
                        </Field>
                        <div className="flex justify-end"><SaveBtn section="company" /></div>
                    </div>
                </SectionCard>

                {/* ── 2. Navigation Link Columns ────────────────── */}
                <SectionCard icon={Link2} title="Navigation Link Columns">
                    <div className="mt-4 space-y-4">
                        {footer.links.map((col, ci) => (
                            <div key={ci} className="border border-neutral-200 rounded-xl p-4 space-y-3 bg-neutral-50/50">
                                <div className="flex items-center gap-3">
                                    <input
                                        className={`${inputCls} font-semibold`}
                                        value={col.column_title}
                                        onChange={e => {
                                            const cols = [...footer.links];
                                            cols[ci] = { ...cols[ci], column_title: e.target.value };
                                            update('links', cols);
                                        }}
                                        placeholder="Column Title"
                                    />
                                    <button
                                        onClick={() => {
                                            const cols = footer.links.filter((_, i) => i !== ci);
                                            update('links', cols);
                                        }}
                                        className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                                        title="Remove column"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {col.items.map((item, ii) => (
                                        <div key={ii} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                                            <input
                                                className={inputCls}
                                                value={item.label}
                                                onChange={e => {
                                                    const cols = [...footer.links];
                                                    cols[ci].items[ii] = { ...item, label: e.target.value };
                                                    update('links', cols);
                                                }}
                                                placeholder="Link label"
                                            />
                                            <input
                                                className={inputCls}
                                                value={item.url}
                                                onChange={e => {
                                                    const cols = [...footer.links];
                                                    cols[ci].items[ii] = { ...item, url: e.target.value };
                                                    update('links', cols);
                                                }}
                                                placeholder="/url or https://…"
                                            />
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-neutral-500 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={item.open_new_tab}
                                                    onChange={e => {
                                                        const cols = [...footer.links];
                                                        cols[ci].items[ii] = { ...item, open_new_tab: e.target.checked };
                                                        update('links', cols);
                                                    }}
                                                    className="rounded accent-[#C5A46D]"
                                                />
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </label>
                                            <button
                                                onClick={() => {
                                                    const cols = [...footer.links];
                                                    cols[ci].items = cols[ci].items.filter((_, i) => i !== ii);
                                                    update('links', cols);
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
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
                                    className="flex items-center gap-1.5 text-xs text-[#C5A46D] hover:text-[#B3935C] font-medium transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Link
                                </button>
                            </div>
                        ))}

                        <div className="flex items-center justify-between pt-1">
                            <button
                                onClick={() => update('links', [...footer.links, { column_title: 'New Column', items: [] }])}
                                className="flex items-center gap-1.5 text-sm text-[#C5A46D] hover:text-[#B3935C] font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add Column
                            </button>
                            <SaveBtn section="links" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 3. Social Media ───────────────────────────── */}
                <SectionCard icon={Globe} title="Social Media Links">
                    <div className="mt-4 space-y-3">
                        {footer.social.map((s, i) => {
                            const IconComp = PLATFORM_ICONS[s.icon] || Globe;
                            return (
                                <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100">
                                        <IconComp className="w-4 h-4 text-neutral-500" />
                                    </div>
                                    <select
                                        value={s.icon}
                                        onChange={e => {
                                            const updated = [...footer.social];
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
                                            const updated = [...footer.social];
                                            updated[i] = { ...s, url: e.target.value };
                                            update('social', updated);
                                        }}
                                        placeholder="https://…"
                                    />
                                    <button
                                        onClick={() => update('social', footer.social.filter((_, idx) => idx !== i))}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                        <div className="flex items-center justify-between pt-1">
                            <button
                                onClick={() => update('social', [...footer.social, { platform: 'Other', url: '', icon: 'other' }])}
                                className="flex items-center gap-1.5 text-sm text-[#C5A46D] hover:text-[#B3935C] font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add Platform
                            </button>
                            <SaveBtn section="social" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 4. Contact Info ───────────────────────────── */}
                <SectionCard icon={Phone} title="Contact Information">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <Field label="Address">
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                                <input
                                    className={`${inputCls} pl-9`}
                                    value={footer.contact.address}
                                    onChange={e => update('contact', { ...footer.contact, address: e.target.value })}
                                    placeholder="City, Country"
                                />
                            </div>
                        </Field>
                        <Field label="Phone">
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                                <input
                                    className={`${inputCls} pl-9`}
                                    value={footer.contact.phone}
                                    onChange={e => update('contact', { ...footer.contact, phone: e.target.value })}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                        </Field>
                        <Field label="Email">
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                                <input
                                    className={`${inputCls} pl-9`}
                                    value={footer.contact.email}
                                    onChange={e => update('contact', { ...footer.contact, email: e.target.value })}
                                    placeholder="support@example.com"
                                />
                            </div>
                        </Field>
                        <Field label="Business Hours">
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                                <input
                                    className={`${inputCls} pl-9`}
                                    value={footer.contact.hours}
                                    onChange={e => update('contact', { ...footer.contact, hours: e.target.value })}
                                    placeholder="Mon–Sat 9am–9pm"
                                />
                            </div>
                        </Field>
                        <div className="col-span-2 flex justify-end"><SaveBtn section="contact" /></div>
                    </div>
                </SectionCard>

                {/* ── 5. Newsletter ─────────────────────────────── */}
                <SectionCard icon={Newspaper} title="Newsletter CTA">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="col-span-2">
                            <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                                <div className={`relative w-10 h-5.5 rounded-full transition-colors ${footer.newsletter.enabled ? 'bg-[#C5A46D]' : 'bg-neutral-300'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${footer.newsletter.enabled ? 'translate-x-[18px]' : ''}`} />
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={footer.newsletter.enabled}
                                        onChange={e => update('newsletter', { ...footer.newsletter, enabled: e.target.checked })}
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-neutral-700">Show Newsletter Signup</p>
                                    <p className="text-xs text-neutral-400">Display the email subscription CTA in the footer</p>
                                </div>
                            </label>
                        </div>
                        <Field label="Heading">
                            <input
                                className={inputCls}
                                value={footer.newsletter.heading}
                                onChange={e => update('newsletter', { ...footer.newsletter, heading: e.target.value })}
                                placeholder="Stay In The Loop"
                            />
                        </Field>
                        <Field label="Subtext">
                            <input
                                className={inputCls}
                                value={footer.newsletter.subtext}
                                onChange={e => update('newsletter', { ...footer.newsletter, subtext: e.target.value })}
                                placeholder="Get exclusive offers…"
                            />
                        </Field>
                        <div className="col-span-2 flex justify-end"><SaveBtn section="newsletter" /></div>
                    </div>
                </SectionCard>

                {/* ── 6. Legal Links ────────────────────────────── */}
                <SectionCard icon={Shield} title="Legal Links">
                    <div className="mt-4 space-y-2">
                        {footer.legal.map((l, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                <input
                                    className={inputCls}
                                    value={l.label}
                                    onChange={e => {
                                        const updated = [...footer.legal];
                                        updated[i] = { ...l, label: e.target.value };
                                        update('legal', updated);
                                    }}
                                    placeholder="Privacy Policy"
                                />
                                <input
                                    className={inputCls}
                                    value={l.url}
                                    onChange={e => {
                                        const updated = [...footer.legal];
                                        updated[i] = { ...l, url: e.target.value };
                                        update('legal', updated);
                                    }}
                                    placeholder="/privacy"
                                />
                                <button
                                    onClick={() => update('legal', footer.legal.filter((_, idx) => idx !== i))}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-1">
                            <button
                                onClick={() => update('legal', [...footer.legal, { label: '', url: '' }])}
                                className="flex items-center gap-1.5 text-sm text-[#C5A46D] hover:text-[#B3935C] font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add Legal Link
                            </button>
                            <SaveBtn section="legal" />
                        </div>
                    </div>
                </SectionCard>

                {/* ── 7. Bottom Bar ─────────────────────────────── */}
                <SectionCard icon={AlignLeft} title="Bottom Bar Text" defaultOpen={false}>
                    <div className="mt-4 space-y-3">
                        <Field label="Compliance / Disclaimer Text" hint="Shown at the very bottom of the footer, e.g. age restriction notice.">
                            <textarea
                                className={textareaCls}
                                rows={2}
                                value={footer.bottom_bar.text}
                                onChange={e => update('bottom_bar', { text: e.target.value })}
                                placeholder="Please enjoy responsibly. Must be of legal drinking age…"
                            />
                        </Field>
                        <div className="flex justify-end"><SaveBtn section="bottom_bar" /></div>
                    </div>
                </SectionCard>

            </div>

            {/* ── Sticky Save All Footer ── */}
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
