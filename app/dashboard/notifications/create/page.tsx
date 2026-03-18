'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Send, Clock, Users, Loader2, Eye, EyeOff,
    Leaf, ChevronDown, X as XIcon,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
type Audience = 'all' | 'subscribed_only' | 'repeat_buyers' | 'category_buyers';

interface Category {
    category_id: string;
    name: string;
    slug: string;
}

function CreateCampaignForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');

    const [form, setForm] = useState({
        title: '',
        subject: '',
        body_html: '',
        target_audience: 'subscribed_only' as Audience,
    });
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
    const [scheduledAt, setScheduledAt] = useState('');
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [preview, setPreview] = useState(false);
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [recipientsList, setRecipientsList] = useState<{ email: string; full_name?: string }[]>([]);
    const [loadingCount, setLoadingCount] = useState(false);
    const [showRecipientsModal, setShowRecipientsModal] = useState(false);

    // Categories state
    const [categories, setCategories] = useState<Category[]>([]);
    const [catPickerOpen, setCatPickerOpen] = useState(false);

    const headers = useCallback((): Record<string, string> => {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) h['Authorization'] = `Bearer ${token}`;
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
            if (match) h['X-CSRF-Token'] = decodeURIComponent(match[1]);
        }
        return h;
    }, []);

    // Load categories once
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/admin/campaigns/categories`, { headers: headers(), credentials: 'include' });
                const data = await res.json();
                if (data.success) setCategories(data.data || []);
            } catch { /* silent */ }
        })();
    }, [headers]);

    // Load existing campaign for editing
    useEffect(() => {
        if (!editId) return;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/admin/campaigns/${editId}`, { headers: headers(), credentials: 'include' });
                const data = await res.json();
                if (data.success && data.data) {
                    const c = data.data;
                    setForm({ title: c.title, subject: c.subject, body_html: c.body_html, target_audience: c.target_audience });
                    if (c.selected_category_ids) setSelectedCategoryIds(c.selected_category_ids);
                    if (c.scheduled_at) {
                        setScheduleMode('later');
                        setScheduledAt(new Date(c.scheduled_at).toISOString().slice(0, 16));
                    }
                }
            } catch { toast.error('Failed to load campaign'); }
        })();
    }, [editId, headers]);

    // Fetch recipient count when audience / category selection changes
    useEffect(() => {
        let cancelled = false;
        const fetchCount = async () => {
            // Short-circuit: no categories selected → 0 recipients, no API call needed
            if (form.target_audience === 'category_buyers' && selectedCategoryIds.length === 0) {
                setRecipientCount(0);
                setRecipientsList([]);
                setLoadingCount(false);
                return;
            }

            setLoadingCount(true);
            // Debounce: wait 350ms after last change before hitting the API
            const timer = setTimeout(async () => {
                try {
                    let url = `${API_URL}/api/admin/campaigns/preview-recipients?audience=${form.target_audience}`;
                    if (form.target_audience === 'category_buyers' && selectedCategoryIds.length > 0) {
                        url += `&category_ids=${selectedCategoryIds.join(',')}`;
                    }
                    const res = await fetch(url, { headers: headers(), credentials: 'include' });
                    const data = await res.json();
                    if (!cancelled && data.success) {
                        setRecipientCount(data.data?.count ?? null);
                        setRecipientsList(data.data?.recipients ?? []);
                    }
                } catch { /* silent */ }

                finally { if (!cancelled) setLoadingCount(false); }
            }, 350);

            return () => clearTimeout(timer);
        };
        fetchCount();
        return () => { cancelled = true; };
    }, [form.target_audience, selectedCategoryIds, headers]);


    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const buildPayload = () => ({
        ...form,
        selected_category_ids: form.target_audience === 'category_buyers' ? selectedCategoryIds : null,
    });

    // Save as draft — PATCH if editing, POST if new
    const handleSaveDraft = async () => {
        if (!form.title.trim() || !form.subject.trim() || !form.body_html.trim()) {
            toast.error('Title, subject, and body are required');
            return;
        }
        setSaving(true);
        try {
            const url = editId
                ? `${API_URL}/api/admin/campaigns/${editId}`
                : `${API_URL}/api/admin/campaigns`;
            const method = editId ? 'PATCH' : 'POST';

            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(buildPayload()), credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                toast.success(editId ? 'Campaign updated!' : 'Campaign saved as draft!');
                router.push('/dashboard/notifications');
            } else {
                toast.error(data.message || 'Failed to save');
            }
        } catch { toast.error('Error saving campaign'); }
        finally { setSaving(false); }
    };

    const handleSendOrSchedule = async () => {
        if (!form.title.trim() || !form.subject.trim() || !form.body_html.trim()) {
            toast.error('Title, subject, and body are required');
            return;
        }
        if (form.target_audience === 'category_buyers' && selectedCategoryIds.length === 0) {
            toast.error('Please select at least one alcohol type');
            return;
        }

        setSending(true);
        try {
            let campaignId = editId;
            if (campaignId) {
                const res = await authFetch(`${API_URL}/api/admin/campaigns/${campaignId}`, {
                    method: 'PATCH', headers: headers(), body: JSON.stringify(buildPayload()),
                });
                const data = await res.json();
                if (!data.success) { toast.error(data.message || 'Failed to update campaign'); return; }
            } else {
                const res = await authFetch(`${API_URL}/api/admin/campaigns`, {
                    method: 'POST', headers: headers(), body: JSON.stringify(buildPayload()),
                });
                const data = await res.json();
                if (!data.success) { toast.error(data.message || 'Failed to create campaign'); return; }
                campaignId = data.data.campaign_id;
            }

            if (scheduleMode === 'later') {
                if (!scheduledAt) { toast.error('Please pick a future date/time'); return; }
                const res = await authFetch(`${API_URL}/api/admin/campaigns/${campaignId}/schedule`, {
                    method: 'PATCH', headers: headers(),
                    body: JSON.stringify({ scheduled_at: new Date(scheduledAt).toISOString() }),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success('Campaign scheduled!');
                    router.push('/dashboard/notifications');
                } else {
                    toast.error(data.message || 'Failed to schedule');
                }
            } else {
                if (!confirm(`Send this campaign now to ~${recipientCount ?? '?'} recipient(s)? This cannot be undone.`)) return;
                const res = await authFetch(`${API_URL}/api/admin/campaigns/${campaignId}/send`, {
                    method: 'POST', headers: headers(),
                });
                const data = await res.json();
                if (data.success) {
                    toast.success(`Campaign sent to ${data.data?.recipientCount ?? 0} recipient(s)!`);
                    router.push('/dashboard/notifications');
                } else {
                    toast.error(data.message || 'Failed to send');
                }
            }
        } catch { toast.error('Error processing campaign'); }
        finally { setSending(false); }
    };

    const audienceOptions: { value: Audience; label: string; desc: string; icon: React.ElementType }[] = [
        { value: 'all', label: 'All Customers', desc: 'Every registered customer with an email', icon: Users },
        { value: 'subscribed_only', label: 'Subscribed Only', desc: 'Only customers who opted in to promotions', icon: Users },
        { value: 'repeat_buyers', label: 'Repeat Buyers', desc: 'Customers with 2+ completed orders', icon: Users },
        { value: 'category_buyers', label: 'Ayurvedic Buyers', desc: 'Customers who bought from selected categories', icon: Leaf },
    ];

    const selectedCatNames = categories.filter(c => selectedCategoryIds.includes(c.category_id)).map(c => c.name);

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/notifications" className="p-2 rounded-lg hover:bg-gold/10 text-text-muted hover:text-gold transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold">
                        {editId ? 'Edit Campaign' : 'New Campaign'}
                    </h1>
                    <p className="text-sm text-text-muted mt-0.5">Create a promotional email campaign</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Campaign Details */}
                <div className="bg-card-bg border border-border rounded-xl p-5 space-y-4">
                    <h2 className="font-serif text-sm font-semibold text-text-secondary uppercase tracking-wider">Campaign Details</h2>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Campaign Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text" required
                            placeholder="e.g. Summer Sale 2026"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                        />
                        <p className="text-xs text-text-muted mt-1">Internal reference name, not shown to customers.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            Email Subject <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text" required
                            placeholder="e.g. 🌿 Seasonal Wellness Sale — Up to 25% Off!"
                            value={form.subject}
                            onChange={e => setForm({ ...form, subject: e.target.value })}
                            className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                        />
                    </div>
                </div>

                {/* Audience */}
                <div className="bg-card-bg border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-serif text-sm font-semibold text-text-secondary uppercase tracking-wider">Target Audience</h2>
                        <button
                            type="button"
                            onClick={() => {
                                if (recipientCount !== null && recipientCount > 0) {
                                    setShowRecipientsModal(true);
                                }
                            }}
                            disabled={!recipientCount || recipientCount === 0}
                            className={`flex items-center gap-1.5 text-xs ${recipientCount && recipientCount > 0 ? 'text-text-muted hover:text-gold hover:underline cursor-pointer' : 'text-text-muted cursor-default'}`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            {loadingCount
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : recipientCount !== null
                                    ? <span className="font-medium">{recipientCount} recipients</span>
                                    : null
                            }
                        </button>
                    </div>

                    <div className="grid gap-2">
                        {audienceOptions.map(opt => (
                            <label
                                key={opt.value}
                                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${form.target_audience === opt.value ? 'border-gold/40 bg-gold/[0.04]' : 'border-border hover:border-gold/20'}`}
                            >
                                <input
                                    type="radio"
                                    name="audience"
                                    value={opt.value}
                                    checked={form.target_audience === opt.value}
                                    onChange={() => {
                                        setForm({ ...form, target_audience: opt.value });
                                        if (opt.value !== 'category_buyers') setSelectedCategoryIds([]);
                                    }}
                                    className="mt-0.5 accent-gold"
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                                        <opt.icon className="w-3.5 h-3.5 text-text-muted" />
                                        {opt.label}
                                    </p>
                                    <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    {/* Category Multi-Select — shown only when category_buyers is selected */}
                    {form.target_audience === 'category_buyers' && (
                        <div className="mt-1 space-y-2">
                            <label className="block text-sm font-medium text-text-secondary">
                                Select Alcohol Types <span className="text-red-400">*</span>
                            </label>

                            {/* Selected tags */}
                            {selectedCatNames.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedCatNames.map((name, i) => (
                                        <span
                                            key={selectedCategoryIds[i]}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs text-gold font-medium"
                                        >
                                            {name}
                                            <button
                                                type="button"
                                                onClick={() => toggleCategory(selectedCategoryIds[i])}
                                                className="hover:text-white ml-0.5"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Dropdown picker */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setCatPickerOpen(v => !v)}
                                    className="w-full flex items-center justify-between rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary hover:border-gold/30 transition-colors"
                                >
                                    <span className="text-text-muted">
                                        {categories.length === 0
                                            ? 'Loading categories…'
                                            : selectedCategoryIds.length === 0
                                                ? 'Choose one or more categories…'
                                                : `${selectedCategoryIds.length} selected`
                                        }
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${catPickerOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {catPickerOpen && categories.length > 0 && (
                                    <div className="absolute z-20 mt-1 w-full bg-card-bg border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                        {categories.map(cat => (
                                            <label
                                                key={cat.category_id}
                                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gold/[0.04] transition-colors ${selectedCategoryIds.includes(cat.category_id) ? 'bg-gold/[0.06]' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategoryIds.includes(cat.category_id)}
                                                    onChange={() => toggleCategory(cat.category_id)}
                                                    className="accent-gold rounded"
                                                />
                                                <span className="text-sm text-text-primary">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-text-muted">
                                Targets customers who have ordered at least one product from any of the selected categories.
                            </p>
                        </div>
                    )}
                </div>

                {/* Email Body */}
                <div className="bg-card-bg border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-serif text-sm font-semibold text-text-secondary uppercase tracking-wider">Email Body (HTML)</h2>
                        <button
                            type="button"
                            onClick={() => setPreview(!preview)}
                            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-gold transition-colors"
                        >
                            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {preview ? 'Edit' : 'Preview'}
                        </button>
                    </div>

                    {preview ? (
                        <div className="rounded-lg border border-border overflow-hidden bg-white min-h-[300px]">
                            <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-b">Email Preview</div>
                            <div
                                className="p-4"
                                dangerouslySetInnerHTML={{ __html: form.body_html || '<p style="color:#6b7280;font-size:14px;">Nothing to preview yet.</p>' }}
                            />
                        </div>
                    ) : (
                        <textarea
                            rows={12}
                            required
                            placeholder={`<p>🌿 Our biggest wellness sale of the year is here!</p>\n<p>Get up to <strong>25% off</strong> on all supplements this summer.</p>\n<p>Use code: <strong>SUMMER25</strong></p>`}
                            value={form.body_html}
                            onChange={e => setForm({ ...form, body_html: e.target.value })}
                            className="w-full rounded-lg border border-border bg-page-bg px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 resize-y"
                        />
                    )}
                    <p className="text-xs text-text-muted">HTML will be wrapped in a branded email shell with your storefront header and footer.</p>
                </div>

                {/* Send Mode */}
                <div className="bg-card-bg border border-border rounded-xl p-5 space-y-4">
                    <h2 className="font-serif text-sm font-semibold text-text-secondary uppercase tracking-wider">Delivery</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${scheduleMode === 'now' ? 'border-gold/40 bg-gold/[0.04]' : 'border-border hover:border-gold/20'}`}>
                            <input type="radio" name="scheduleMode" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="accent-gold" />
                            <div>
                                <p className="text-sm font-medium text-text-primary flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />Send Now</p>
                                <p className="text-xs text-text-muted">Immediately</p>
                            </div>
                        </label>
                        <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${scheduleMode === 'later' ? 'border-gold/40 bg-gold/[0.04]' : 'border-border hover:border-gold/20'}`}>
                            <input type="radio" name="scheduleMode" checked={scheduleMode === 'later'} onChange={() => setScheduleMode('later')} className="accent-gold" />
                            <div>
                                <p className="text-sm font-medium text-text-primary flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Schedule</p>
                                <p className="text-xs text-text-muted">Pick a date & time</p>
                            </div>
                        </label>
                    </div>

                    {scheduleMode === 'later' && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Schedule Date & Time</label>
                            <input
                                type="datetime-local"
                                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                                value={scheduledAt}
                                onChange={e => setScheduledAt(e.target.value)}
                                className="rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pb-4">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={saving || sending}
                        className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-text-secondary hover:text-white hover:border-gold/30 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                        Save as Draft
                    </button>
                    <button
                        type="button"
                        onClick={handleSendOrSchedule}
                        disabled={saving || sending}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {sending
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                            : scheduleMode === 'later'
                                ? <><Clock className="w-4 h-4" /> Schedule Campaign</>
                                : <><Send className="w-4 h-4" /> Send Campaign</>
                        }
                    </button>
                </div>
            </div>

            {/* Recipients Modal */}
            {showRecipientsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card-bg border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-page-bg/50">
                            <div>
                                <h3 className="font-serif text-lg font-bold text-gold">Recipient List</h3>
                                <p className="text-xs text-text-muted mt-0.5">{recipientCount} matching customers</p>
                            </div>
                            <button
                                onClick={() => setShowRecipientsModal(false)}
                                className="p-2 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: email list */}
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="space-y-2">
                                {recipientsList.map((r, idx) => (
                                    <div key={idx} className="flex flex-col p-3 rounded-lg border border-border/40 bg-page-bg/30 hover:border-gold/30 transition-colors">
                                        <span className="text-sm font-medium text-text-primary">{r.email}</span>
                                        {r.full_name && <span className="text-xs text-text-muted mt-0.5">{r.full_name}</span>}
                                    </div>
                                ))}
                                {recipientsList.length === 0 && (
                                    <div className="text-center py-8 text-text-muted text-sm">
                                        No recipients found or data not loaded.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-border/50 bg-page-bg/50 flex justify-end">
                            <button
                                onClick={() => setShowRecipientsModal(false)}
                                className="px-4 py-2 text-sm font-medium text-text-primary bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-border"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CreateCampaignPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
        }>
            <CreateCampaignForm />
        </Suspense>
    );
}
