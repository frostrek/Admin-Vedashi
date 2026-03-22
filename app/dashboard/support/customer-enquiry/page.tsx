'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    MessageSquare, Clock, Search, Mail, User,
    ChevronDown, CheckCircle, HelpCircle, Bug, Inbox, XCircle,
    Send, Lock, Edit3, RefreshCw, GripVertical,
    Phone, Package, Sparkles, TrendingUp, ShoppingBag, MapPin, Calendar,
    BarChart2, ChevronRight, Activity, ArrowRight, X, Heart, ChevronUp
} from 'lucide-react';
import { getAdminFeedback, updateFeedbackStatus, replyToFeedback, getCustomer360, formatINR } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import toast from 'react-hot-toast';

/* ─── Config using your globals.css theme tokens ─── */

const STATUS_CONFIG: Record<string, { badgeCls: string; dotCls: string; icon: any; label: string }> = {
    new:       { badgeCls: 'bg-info/10 text-info dark:border-info/25 border-info/40',    dotCls: 'bg-info',       icon: Inbox,       label: 'Pending'   },
    reviewed:  { badgeCls: 'bg-warning/10 text-warning dark:border-warning/25 border-warning/40', dotCls: 'bg-warning',    icon: Search,      label: 'Open'      },
    resolved:  { badgeCls: 'bg-success/10 text-success dark:border-success/25 border-success/40', dotCls: 'bg-success',    icon: CheckCircle, label: 'Resolved'  },
    dismissed: { badgeCls: 'bg-text-muted/10 text-text-muted border-text-muted/20',      dotCls: 'bg-text-muted', icon: XCircle,     label: 'Dismissed' },
};

const TYPE_CONFIG: Record<string, { icon: any; colorCls: string; label: string }> = {
    suggestion: { icon: Sparkles,   colorCls: 'text-primary dark:text-primary-light',    label: 'Suggestion' },
    complaint:  { icon: Activity,   colorCls: 'text-danger dark:text-red-400',           label: 'Complaint'  },
    bug_report: { icon: Bug,        colorCls: 'text-warning dark:text-warning-dark',     label: 'Bug Report' },
    contact:    { icon: Mail,       colorCls: 'text-info dark:text-info',                label: 'Contact'    },
    other:      { icon: HelpCircle, colorCls: 'text-text-muted dark:text-text-muted',    label: 'General'    },
};

const DOSHA_CONFIG: Record<string, { bg: string; text: string; bar: string; glyph: string }> = {
    Vata:  { bg: 'bg-info/10',    text: 'text-info',    bar: 'bg-info',    glyph: '🌬️' },
    Pitta: { bg: 'bg-danger/10',  text: 'text-danger',  bar: 'bg-danger',  glyph: '🔥' },
    Kapha: { bg: 'bg-success/10', text: 'text-success', bar: 'bg-success', glyph: '🌿' },
};

const CANNED_RESPONSES = [
    { name: 'Namaste Greeting',  text: 'Namaste! Thank you for reaching out to Vedashi. How can we assist you with your herbal wellness journey today?' },
    { name: 'Order Status',      text: 'Thank you for your enquiry. Your order is currently being processed and will be dispatched shortly. You will receive a tracking link via email once it is on its way.' },
    { name: 'Shipping Delay',    text: 'Namaste! We sincerely apologize for the delay in your order. Due to high demand for our authentic herbal formulations, processing is taking slightly longer than usual. Your order will be dispatched within the next 24–48 hours. Thank you for your patience.' },
    { name: 'Dosha Guide',       text: 'To assist you better, we recommend taking our Dosha quiz on the website. Ayurveda works best when tailored to your unique Prakriti (constitution).' },
    { name: 'Ayurvedic Consult', text: 'Namaste! For a more personalized wellness plan, we suggest booking a private consultation with our Ayurvedic experts. They can provide deeper insights into your specific health needs.' },
    { name: 'Product Quality',   text: 'All Vedashi products are 100% natural, ethically sourced, and follow authentic Ayurvedic formulations without any synthetic additives.' },
    { name: 'Usage Directions',  text: 'For best results, we recommend taking this formulation twice a day, preferably after meals with warm water or as directed by your physician.' },
    { name: 'Feedback Request',  text: 'We hope you are enjoying your Vedashi experience! If you have a moment, we would love to hear your feedback on our products.' },
    { name: 'Out of Stock',      text: "Namaste! We're sorry, but the item you requested is currently out of stock due to the seasonal nature of our high-quality ingredients. We expect a fresh batch soon!" },
    { name: 'Refund Status',     text: "Namaste. Your refund has been initiated from our end. It typically takes 5–7 business days to reflect in your account." },
    { name: 'Damaged Product',   text: "We are deeply sorry that your package arrived damaged. Please share a photo of the damaged items, and we will ship a fresh replacement immediately at no extra cost." },
    { name: 'Order Cancelled',   text: "As per your request, we have cancelled your order. If any payment was made, the full amount has been reversed to your original payment method." },
    { name: 'Warm Closing',      text: 'We hope this helps! Please let us know if you have any other questions. Wishing you vitality and balance.' },
];

const getInitials = (name?: string) =>
    name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

const timeAgo = (d?: string | Date) => {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const PAGE_STYLES = `
    @keyframes vd-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes vd-right { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
    @keyframes vd-left  { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
    @keyframes vd-fade  { from{opacity:0} to{opacity:1} }
    @keyframes vd-pop   { 0%{opacity:0;transform:scale(.92) translateY(6px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes vd-bar   { from{width:0%} to{width:var(--w,0%)} }
    @keyframes vd-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes vd-pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
    @keyframes vd-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes vd-msg-in-right { from{opacity:0;transform:translateX(16px) scale(.97)} to{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes vd-msg-in-left  { from{opacity:0;transform:translateX(-16px) scale(.97)} to{opacity:1;transform:translateX(0) scale(1)} }
    @keyframes vd-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes vd-dropdown { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes vd-slide-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

    .vd-in       { animation: vd-in    .35s cubic-bezier(.16,1,.3,1) both }
    .vd-right    { animation: vd-right .38s cubic-bezier(.16,1,.3,1) both }
    .vd-left     { animation: vd-left  .35s cubic-bezier(.16,1,.3,1) both }
    .vd-fade     { animation: vd-fade  .28s ease both }
    .vd-pop      { animation: vd-pop   .32s cubic-bezier(.34,1.56,.64,1) both }
    .vd-bar      { animation: vd-bar   .9s cubic-bezier(.16,1,.3,1) both; animation-delay:.2s; width:0% }
    .vd-blink    { animation: vd-blink 2.2s ease infinite }
    .vd-float    { animation: vd-float 3s ease-in-out infinite }
    .vd-msg-r    { animation: vd-msg-in-right .3s cubic-bezier(.16,1,.3,1) both }
    .vd-msg-l    { animation: vd-msg-in-left  .3s cubic-bezier(.16,1,.3,1) both }
    .vd-dropdown { animation: vd-dropdown .22s cubic-bezier(.16,1,.3,1) both }
    .vd-slide-up { animation: vd-slide-up .28s cubic-bezier(.16,1,.3,1) both }

    .s1{animation-delay:.03s} .s2{animation-delay:.07s} .s3{animation-delay:.11s}
    .s4{animation-delay:.15s} .s5{animation-delay:.19s} .s6{animation-delay:.23s}

    /* Pulse ring on live indicators */
    .vd-pulse-ring::before {
        content:''; position:absolute; inset:-3px; border-radius:50%;
        border:2px solid currentColor; opacity:0;
        animation: vd-pulse-ring 2s ease-out infinite;
    }

    .vd-row { border-left:3px solid transparent; transition:border-color .18s,background .18s,transform .12s }
    .vd-row.sel  { border-left-color: var(--t-primary) }
    .vd-row:not(.sel):hover { 
        border-left-color: color-mix(in srgb, var(--t-primary) 35%, transparent);
        transform: translateX(1px);
    }

    .vd-scroll::-webkit-scrollbar { width:3px }
    .vd-scroll::-webkit-scrollbar-track { background:transparent }
    .vd-scroll::-webkit-scrollbar-thumb { background:var(--t-border); border-radius:99px }
    .vd-scroll:hover::-webkit-scrollbar-thumb { background:var(--t-primary-dark) }

    .vd-skel {
        background: linear-gradient(90deg,
            var(--surface-shimmer-a) 25%,
            var(--surface-shimmer-b) 50%,
            var(--surface-shimmer-a) 75%);
        background-size:200% 100%;
        animation: vd-shimmer 1.5s ease infinite;
    }

    .vd-card { transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease }
    .vd-card:hover { transform:translateY(-1.5px); box-shadow:0 6px 24px rgba(0,0,0,.25) }

    /* Agent bubble — bright contrast fix */
    .vd-bubble-agent {
        background: var(--t-primary);
        color: #fff !important;
        position: relative;
        overflow: hidden;
    }
    .vd-bubble-agent::before {
        content:'';
        position:absolute;
        inset:0;
        background: linear-gradient(135deg, rgba(255,255,255,.12) 0%, transparent 60%);
        pointer-events:none;
        border-radius:inherit;
    }
    .vd-bubble-agent p { color: #fff !important; }

    /* Bot bubble */
    .vd-bubble-bot {
        background: linear-gradient(135deg, rgba(var(--color-info-rgb, 100,160,200),.15) 0%, rgba(var(--color-info-rgb, 100,160,200),.08) 100%);
        border: 1px solid rgba(var(--color-info-rgb, 100,160,200),.25);
    }

    /* Customer bubble */
    .vd-bubble-customer {
        background: var(--t-card-bg);
        border: 1px solid var(--t-border);
        transition: border-color .2s, box-shadow .2s;
    }
    .vd-bubble-customer:hover { border-color: color-mix(in srgb, var(--t-primary) 30%, transparent); }

    /* Note bubble */
    .vd-bubble-note {
        background: linear-gradient(135deg, rgba(var(--color-warning-rgb, 197,164,109),.1) 0%, rgba(var(--color-warning-rgb, 197,164,109),.06) 100%);
        border: 1px solid rgba(var(--color-warning-rgb, 197,164,109),.25);
        border-left: 3px solid var(--t-gold, #c5a46d);
    }

    /* Panel custom scrollbar */
    .vd-panel-scroll { scrollbar-width: thin; scrollbar-color: var(--t-border) transparent; }
    .vd-panel-scroll::-webkit-scrollbar { width: 4px }
    .vd-panel-scroll::-webkit-scrollbar-track { background: transparent; margin: 8px 0 }
    .vd-panel-scroll::-webkit-scrollbar-thumb { background: var(--t-border); border-radius: 99px; }
    .vd-panel-scroll:hover::-webkit-scrollbar-thumb { background: var(--t-primary-dark) }

    /* Resize handle — sidebar */
    .vd-resize {
        width: 5px; cursor: col-resize; position: relative; flex-shrink: 0;
        background: transparent; transition: background .15s; z-index: 20;
    }
    .vd-resize::after {
        content: ''; position: absolute; inset: 0; left: 50%;
        transform: translateX(-50%); width: 3px;
        background: var(--t-border); border-radius: 99px;
        opacity: 0; transition: opacity .15s, background .15s;
    }
    .vd-resize:hover::after, .vd-resize.active::after { opacity: 1; background: var(--t-primary); }
    .vd-resize-dots {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        display: flex; flex-direction: column; gap: 3px;
        opacity: 0; transition: opacity .15s; pointer-events: none;
    }
    .vd-resize:hover .vd-resize-dots, .vd-resize.active .vd-resize-dots { opacity: 1; }
    .vd-resize-dots span { width: 3px; height: 3px; border-radius: 50%; background: var(--t-primary); display: block; }

    /* Reply box vertical resize handle */
    .vd-reply-resize {
        height: 5px; cursor: row-resize; position: relative;
        flex-shrink: 0; background: transparent; z-index: 10;
        transition: background .15s;
    }
    .vd-reply-resize::before {
        content: ''; position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 32px; height: 3px;
        background: var(--t-border); border-radius: 99px;
        transition: background .15s, width .15s;
    }
    .vd-reply-resize:hover::before,
    .vd-reply-resize.active::before { background: var(--t-primary); width: 48px; }
    .vd-reply-resize:hover { background: color-mix(in srgb, var(--color-primary) 5%, transparent); }

    .vd-resizing * { user-select: none !important; cursor: col-resize !important; }
    .vd-reply-resizing * { user-select: none !important; cursor: row-resize !important; }

    /* Hover lift on avatar */
    .vd-avatar-lift { transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease; }
    .vd-avatar-lift:hover { transform: scale(1.08) translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,.3); }

    /* Button press effect */
    .vd-btn-press { transition: transform .12s ease, opacity .12s ease; }
    .vd-btn-press:active { transform: scale(.94); }

    /* Template item hover */
    .vd-tpl-item { transition: background .15s, padding-left .15s; }
    .vd-tpl-item:hover { padding-left: 20px; background: var(--card-bg-elevated); }

    /* Status select ring */
    .vd-status-select:focus { outline: none; box-shadow: 0 0 0 3px rgba(140,175,140,.18); }

    /* Thread date divider glow */
    .vd-divider-line { background: linear-gradient(90deg, transparent, var(--t-border), transparent); }

    /* Header gradient shimmer */
    @keyframes vd-header-shimmer {
        0%  { background-position: 0%   50%; }
        50% { background-position: 100% 50%; }
        100%{ background-position: 0%   50%; }
    }

    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* Mobile: hide scrollbar on chip rows */
    .scrollbar-none { -ms-overflow-style:none; scrollbar-width:none; }
    .scrollbar-none::-webkit-scrollbar { display:none; }

    /* Mobile slide transitions */
    @keyframes vd-slide-in-left  { from{transform:translateX(-100%)} to{transform:translateX(0)} }
    @keyframes vd-slide-in-right { from{transform:translateX(100%)}  to{transform:translateX(0)} }
    .vd-slide-in-left  { animation: vd-slide-in-left  .28s cubic-bezier(.16,1,.3,1) both }
    .vd-slide-in-right { animation: vd-slide-in-right .28s cubic-bezier(.16,1,.3,1) both }

    /* Touch-friendly tap highlight */
    @media (max-width:1023px) {
        .vd-row { -webkit-tap-highlight-color: transparent; }
        .vd-row:active { background: rgba(140,175,140,.12) !important; }
    }
`;

export default function AdminFeedbackPage() {
    const { isDark }                          = useTheme();
    const [data, setData]                     = useState<any>({ feedback: [], total: 0 });
    const [filters, setFilters]               = useState({ type: 'all', status: 'all', search: '', assignee: 'all' });
    const [loading, setLoading]               = useState(true);
    const [selectedId, setSelectedId]         = useState<string | null>(null);
    const [checkedIds, setCheckedIds]         = useState<string[]>([]);
    const [replyText, setReplyText]           = useState('');
    const [replyType, setReplyType]           = useState<'reply' | 'note'>('reply');
    const [showTemplates, setShowTemplates]   = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [localTags, setLocalTags]           = useState<Record<string, string[]>>({});
    const [localAssign, setLocalAssign]       = useState<Record<string, string>>({});
    const [profileId, setProfileId]           = useState<string | null>(null);
    const [c360, setC360]                     = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileTab, setProfileTab]         = useState<'overview' | 'orders' | 'addresses'>('overview');
    const [sidebarWidth, setSidebarWidth]     = useState(360);
    const [isResizing, setIsResizing]         = useState(false);
    const [replyBoxHeight, setReplyBoxHeight] = useState(120);
    const [isReplyResizing, setIsReplyResizing] = useState(false);
    const [mobileView, setMobileView]           = useState<'list' | 'detail'>('list');

    /* ── Custom input modals (replaces window.prompt) ── */
    const [modal, setModal] = useState<{
        type: 'tag' | 'assign';
        value: string;
    } | null>(null);
    const modalInputRef = useRef<HTMLInputElement>(null);

    const threadRef         = useRef<HTMLDivElement>(null);
    const sidebarResizeRef  = useRef<{ startX: number; startW: number } | null>(null);
    const replyResizeRef    = useRef<{ startY: number; startH: number } | null>(null);
    const templateSearchRef = useRef<HTMLInputElement>(null);
    const templateBtnRef    = useRef<HTMLButtonElement>(null);
    const [templatePos, setTemplatePos] = useState<{ top: number; right: number } | null>(null);

    /* ── Sidebar resize ── */
    const onResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        sidebarResizeRef.current = { startX: e.clientX, startW: sidebarWidth };
        const onMove = (ev: MouseEvent) => {
            if (!sidebarResizeRef.current) return;
            const delta = ev.clientX - sidebarResizeRef.current.startX;
            const next  = Math.min(560, Math.max(260, sidebarResizeRef.current.startW + delta));
            setSidebarWidth(next);
        };
        const onUp = () => {
            setIsResizing(false);
            sidebarResizeRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    /* ── Reply box vertical resize ── */
    const onReplyResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsReplyResizing(true);
        replyResizeRef.current = { startY: e.clientY, startH: replyBoxHeight };
        const onMove = (ev: MouseEvent) => {
            if (!replyResizeRef.current) return;
            const delta = replyResizeRef.current.startY - ev.clientY; // drag up = taller
            const next  = Math.min(320, Math.max(72, replyResizeRef.current.startH + delta));
            setReplyBoxHeight(next);
        };
        const onUp = () => {
            setIsReplyResizing(false);
            replyResizeRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    useEffect(() => {
        const id = 'vd-page-styles';
        if (!document.getElementById(id)) {
            const el = document.createElement('style');
            el.id = id; el.textContent = PAGE_STYLES;
            document.head.appendChild(el);
        }
        return () => { document.getElementById(id)?.remove(); };
    }, []);

    const load = async () => {
        setLoading(true);
        const params: any = {};
        if (filters.type !== 'all') params.type = filters.type;
        if (filters.status !== 'all') params.status = filters.status;
        if (filters.search) params.search = filters.search;
        const res = await getAdminFeedback(params);
        setData(res);
        if (res.feedback?.length && !selectedId) setSelectedId(res.feedback[0].feedback_id);
        setLoading(false);
    };

    useEffect(() => { load(); }, [filters.type, filters.status, filters.search]);

    useEffect(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
    }, [selectedId]);

    // Focus template search when dropdown opens
    useEffect(() => {
        if (showTemplates) {
            setTimeout(() => templateSearchRef.current?.focus(), 50);
        } else {
            setTemplateSearch('');
        }
    }, [showTemplates]);

    const handleStatus = async (id: string, status: string) => {
        const r = await updateFeedbackStatus(id, status);
        if (r.success) { toast.success(`Marked as ${status}`); load(); }
        else toast.error('Update failed');
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedId) return;
        const t = toast.loading(replyType === 'note' ? 'Saving note…' : 'Sending reply…');
        try {
            const r = await replyToFeedback(selectedId, replyText, replyType);
            if (r.success) { toast.success(replyType === 'note' ? 'Note saved' : 'Reply sent!', { id: t }); setReplyText(''); load(); }
            else toast.error(r.message || 'Failed', { id: t });
        } catch { toast.error('Network error', { id: t }); }
    };

    const handleAssign = () => {
        if (!selectedId) return;
        setModal({ type: 'assign', value: localAssign[selectedId] || '' });
        setTimeout(() => { modalInputRef.current?.focus(); modalInputRef.current?.select(); }, 60);
    };

    const handleAddTag = () => {
        if (!selectedId) return;
        setModal({ type: 'tag', value: '' });
        setTimeout(() => modalInputRef.current?.focus(), 60);
    };

    const confirmModal = () => {
        if (!modal || !selectedId) return;
        const val = modal.value.trim();
        if (!val) { setModal(null); return; }
        if (modal.type === 'assign') {
            setLocalAssign(p => ({ ...p, [selectedId]: val }));
            toast.success(`Assigned to ${val}`);
        } else {
            setLocalTags(p => ({ ...p, [selectedId]: [...(p[selectedId] || []), val] }));
            toast.success('Tag added');
        }
        setModal(null);
    };

    const openProfile = async (cid: string) => {
        setProfileId(cid); setLoadingProfile(true); setProfileTab('overview');
        try {
            const d = await getCustomer360(cid);
            if (d) setC360(d);
            else { toast.error('Failed to load'); setProfileId(null); }
        } catch { toast.error('Error'); setProfileId(null); }
        finally { setLoadingProfile(false); }
    };

    const closeProfile = () => { setProfileId(null); setC360(null); };

    const toggleCheck = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCheckedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
    };

    const handleBulk = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const action = e.target.value;
        if (!action || !checkedIds.length) return;
        if (!confirm(`Apply "${action}" to ${checkedIds.length} items?`)) { e.target.value = ''; return; }
        let ok = 0;
        for (const id of checkedIds) { const r = await updateFeedbackStatus(id, action); if (r.success) ok++; }
        toast.success(`Updated ${ok} enquiries`); setCheckedIds([]); load(); e.target.value = '';
    };

    const applyTemplate = (text: string) => {
        setReplyText(p => p ? p + '\n\n' + text : text);
        setShowTemplates(false);
        setTemplatePos(null);
        toast.success('Template applied ✓');
    };

    const openTemplates = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showTemplates) {
            setShowTemplates(false);
            setTemplatePos(null);
            return;
        }
        const btn = templateBtnRef.current;
        if (btn) {
            const rect = btn.getBoundingClientRect();
            // top = rect.bottom so panel bottom anchors just above the button
            setTemplatePos({
                top:   rect.bottom,
                right: window.innerWidth - rect.right,
            });
        }
        setShowTemplates(true);
    };

    const filteredTemplates = CANNED_RESPONSES.filter(r =>
        r.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        r.text.toLowerCase().includes(templateSearch.toLowerCase())
    );

    const selected   = data.feedback?.find((f: any) => f.feedback_id === selectedId);
    const newCount   = (data.feedback || []).filter((f: any) => f.status === 'new').length;
    const doneCount  = (data.feedback || []).filter((f: any) => f.status === 'resolved').length;
    const baseTags   = (fb: any) =>
        fb.type === 'bug_report' ? ['bug', 'priority'] :
        fb.type === 'complaint'  ? ['complaint'].concat(fb.rating ? [`⭐${fb.rating}`] : []) :
        fb.type === 'suggestion' ? ['enhancement'] : ['support'];

    const filtered = (data.feedback || []).filter((fb: any) => {
        const a = localAssign[fb.feedback_id];
        if (filters.assignee === 'unassigned') return !a;
        if (filters.assignee === 'me')         return a === 'Aditya N.';
        if (filters.assignee === 'other')      return a && a !== 'Aditya N.';
        return true;
    });

    return (
        <>
            <div className={`flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6 lg:-m-8
                            bg-background text-text-primary overflow-hidden vd-fade font-sans
                            ${isDark ? 'dark' : ''}
                            ${isResizing ? 'vd-resizing' : ''}
                            ${isReplyResizing ? 'vd-reply-resizing' : ''}`}>

                {/* ══ HEADER ══ */}
                <header className="flex items-center justify-between px-4 lg:px-6 py-2.5 lg:py-3.5
                                   border-b border-border bg-card-bg shrink-0 z-10
                                   bg-gradient-to-r from-card-bg via-card-bg to-primary/3">
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25
                                            flex items-center justify-center vd-float">
                                <MessageSquare className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-serif text-lg lg:text-2xl font-bold text-[#A89250] leading-none mb-1">
                                    Customer Enquiries
                                </h1>
                                <p className="hidden sm:block text-[15px] font-semibold text-brown leading-none mt-1">
                                    Manage and resolve support requests
                                </p>
                            </div>
                        </div>
                        <div className="hidden xl:flex items-center gap-2 pl-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold
                                             bg-info/10 text-info border border-info/20 px-3 py-1.5 rounded-full relative">
                                <span className="relative w-1.5 h-1.5">
                                    <span className="absolute inset-0 rounded-full bg-info vd-blink" />
                                    <span className="absolute inset-0 rounded-full bg-info vd-pulse-ring" />
                                </span>
                                {newCount} Pending
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold
                                             bg-success/10 text-success border border-success/20 px-3 py-1.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                {doneCount} Resolved
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

                        <button onClick={load}
                            className="p-2 rounded-lg border border-border text-text-muted
                                       hover:text-primary hover:border-primary/30 hover:bg-primary/5
                                       transition-all active:scale-95 vd-btn-press"
                            title="Refresh">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <div className="hidden sm:block h-5 w-px bg-border" />
                        <div className="hidden sm:relative sm:block relative">
                            <select onChange={handleBulk} disabled={!checkedIds.length}
                                className="appearance-none pl-4 pr-8 py-2 text-[12.5px] font-semibold rounded-lg
                                           bg-card-bg border border-border text-text-primary
                                           hover:bg-card-bg-elevated transition-colors cursor-pointer
                                           disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none">
                                <option value="">Bulk Actions {checkedIds.length ? `(${checkedIds.length})` : ''}</option>
                                <option value="resolved">Mark as Resolved</option>
                                <option value="reviewed">Mark as Open</option>
                                <option value="dismissed">Dismiss Selected</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                                                    text-text-muted pointer-events-none" />
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">

                    {/* ══ LEFT: LIST ══ */}
                    <aside className={`flex flex-col border-r border-border bg-card-bg overflow-hidden
                                      ${mobileView === 'detail'
                                          ? 'hidden'
                                          : 'flex w-full vd-slide-in-left'}
                                      lg:flex lg:shrink-0 lg:w-auto`}
                           style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? sidebarWidth : undefined }}>

                        {/* Mobile stats strip */}
                        <div className="flex lg:hidden items-center gap-2 px-4 py-2 border-b border-border bg-card-bg/80">
                            <span className="flex items-center gap-1.5 text-xs font-bold
                                             bg-info/10 text-info border border-info/20 px-2.5 py-1.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-info vd-blink" />
                                {newCount} Pending
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold
                                             bg-success/10 text-success border border-success/20 px-2.5 py-1.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                {doneCount} Resolved
                            </span>
                            <span className="ml-auto text-xs font-bold text-[#A89250]/60">{filtered.length} total</span>
                        </div>

                        <div className="hidden lg:flex items-center justify-between px-4 pt-3 pb-0 shrink-0">
                            <span className="text-sm font-bold uppercase text-[#A89250]/80">
                                Inbox
                                <span className="ml-2 text-xs font-bold bg-primary/15 text-primary border border-primary/25
                                                 px-2 py-0.5 rounded-full">{filtered.length}</span>
                            </span>
                            <span className="text-xs text-[#A89250]/60 font-semibold select-none">drag edge to resize</span>
                        </div>

                        {/* Search + filters */}
                        <div className="p-3 lg:p-4 border-b border-border space-y-2.5 lg:space-y-3 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input value={filters.search}
                                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && load()}
                                    placeholder="Search queries…"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm font-medium
                                               bg-page-bg border border-border text-text-primary
                                               placeholder:text-text-muted focus:outline-none
                                               focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                            </div>
                            {/* Mobile: horizontal chip scroll for status filter */}
                            <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                                {['all','new','reviewed','resolved','dismissed'].map(s => (
                                    <button key={s}
                                        onClick={() => setFilters(f => ({ ...f, status: s }))}
                                        className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all
                                                    ${filters.status === s
                                                        ? 'bg-primary/20 text-primary border-primary/40'
                                                        : 'bg-card-bg-elevated text-[#A89250]/60 border-border hover:border-primary/30'}`}>
                                        {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
                                    </button>
                                ))}
                            </div>
                            <div className="hidden lg:grid grid-cols-2 gap-2">
                                <select value={filters.status}
                                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                                    className="appearance-none w-full bg-page-bg border border-border rounded-lg
                                               px-3 py-2 text-[12px] font-semibold text-text-secondary
                                               focus:outline-none cursor-pointer hover:border-primary/40 transition-colors">
                                    <option value="all">All Statuses</option>
                                    {['new','reviewed','resolved','dismissed'].map(s => (
                                        <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>
                                    ))}
                                </select>
                                <select value={filters.assignee}
                                    onChange={e => setFilters({ ...filters, assignee: e.target.value })}
                                    className="appearance-none w-full bg-page-bg border border-border rounded-lg
                                               px-3 py-2 text-[12px] font-semibold text-text-secondary
                                               focus:outline-none cursor-pointer hover:border-primary/40 transition-colors">
                                    <option value="all">All Agents</option>
                                    <option value="unassigned">Unassigned</option>
                                    <option value="me">Assigned to me</option>
                                    <option value="other">Other agents</option>
                                </select>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto vd-scroll">
                            {loading ? (
                                <div className="p-4 space-y-3">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className={`h-[90px] rounded-xl vd-skel s${i+1}`} />
                                    ))}
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                                    <div className="w-14 h-14 rounded-2xl bg-card-bg-elevated border border-border
                                                    flex items-center justify-center mb-4 vd-float">
                                        <Search className="w-6 h-6 text-text-muted opacity-40" />
                                    </div>
                                    <p className="text-base text-text-secondary mb-1">No results found</p>
                                    <p className="text-[11px] text-text-muted">Try adjusting your filters</p>
                                </div>
                            ) : filtered.map((fb: any, idx: number) => {
                                const isActive  = selectedId === fb.feedback_id;
                                const isChecked = checkedIds.includes(fb.feedback_id);
                                const sc  = STATUS_CONFIG[fb.status] || STATUS_CONFIG.new;
                                const tc  = TYPE_CONFIG[fb.type]    || TYPE_CONFIG.other;
                                const TI  = tc.icon;
                                const tags = [...baseTags(fb), ...(localTags[fb.feedback_id] || [])];
                                const assignee = localAssign[fb.feedback_id];

                                return (
                                    <div key={fb.feedback_id}
                                        onClick={() => { setSelectedId(fb.feedback_id); setMobileView('detail'); }}
                                        className={`vd-row vd-in px-3 lg:px-4 py-3.5 lg:py-4 cursor-pointer border-b border-border-subtle
                                                    s${Math.min(idx+1,6)}
                                                    ${isActive ? 'sel bg-primary/10' : 'hover:bg-card-bg-elevated'}`}>
                                        <div className="flex gap-2.5 lg:gap-3">
                                            <div className="pt-0.5 shrink-0 hidden lg:block" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={isChecked}
                                                    onChange={e => toggleCheck(fb.feedback_id, e as any)}
                                                    className="w-4 h-4 rounded border-border bg-page-bg accent-primary cursor-pointer" />
                                            </div>
                                            <div
                                                onClick={e => { e.stopPropagation(); fb.customer_id && openProfile(fb.customer_id); }}
                                                className={`w-9 h-9 rounded-xl ${isDark ? 'bg-primary-dark/50' : 'bg-primary/10'} border border-primary/25
                                                            flex items-center justify-center text-primary font-bold text-[12px] shrink-0
                                                            vd-avatar-lift
                                                            ${fb.customer_id ? 'cursor-pointer' : ''}`}>
                                                {getInitials(fb.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <span
                                                        onClick={e => { e.stopPropagation(); fb.customer_id && openProfile(fb.customer_id); }}
                                                        className={`font-bold text-sm text-[#A89250] truncate
                                                                    ${fb.customer_id ? 'hover:text-primary cursor-pointer transition-colors' : ''}`}>
                                                        {fb.name || 'Anonymous'}
                                                    </span>
                                                    <span className="text-xs text-[#A89250]/60 whitespace-nowrap font-bold shrink-0">
                                                        {timeAgo(fb.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[#A89250]/80 font-medium leading-snug mb-2.5 truncate flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${fb.status === 'new' ? 'bg-info vd-blink' : 'bg-border'}`} />
                                                    {fb.subject || (fb.type || 'General').replace('_', ' ')}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <span className={`flex items-center gap-1 text-xs font-bold uppercase ${tc.colorCls}`}>
                                                        <TI className="w-3 h-3" /> {tc.label}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-bold
                                                                      px-2.5 py-0.5 rounded-full border ${sc.badgeCls}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dotCls}`} />
                                                        {sc.label}
                                                    </span>
                                                </div>
                                                {(tags.length > 0 || assignee) && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                        {tags.map((t: string) => (
                                                            <span key={t} className="text-xs font-bold px-2.5 py-1
                                                                                     bg-card-bg-elevated border border-border
                                                                                     text-[#A89250]/60 rounded-md uppercase">
                                                                {t}
                                                            </span>
                                                        ))}
                                                        {assignee && (
                                                            <span className="text-xs font-bold px-2.5 py-1 rounded-md
                                                                             bg-gold/10 text-gold-muted dark:text-gold border border-gold/25
                                                                             flex items-center gap-1">
                                                                <User className="w-3 h-3" /> {assignee}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Mobile chevron */}
                                            <ChevronRight className="lg:hidden w-4 h-4 text-text-muted shrink-0 self-center ml-auto" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-border bg-card-bg shrink-0
                                        flex items-center justify-between text-xs font-bold text-[#A89250]/60">
                            <span>
                                {checkedIds.length > 0
                                    ? `${checkedIds.length} selected`
                                    : `Showing 1–${Math.min(filtered.length,25)} of ${filtered.length}`}
                            </span>
                            <div className="flex items-center gap-1">
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg
                                                   bg-primary/20 text-primary font-bold text-xs
                                                   hover:bg-primary/30 transition-colors">1</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg
                                                   hover:bg-card-bg-elevated text-[#A89250]/40 transition-colors">2</button>
                                <span className="mx-1">…</span>
                            </div>
                        </div>
                    </aside>

                    {/* ══ RESIZE HANDLE ══ */}
                    <div className={`vd-resize hidden lg:block ${isResizing ? 'active' : ''}`}
                         onMouseDown={onResizeStart}>
                        <div className="vd-resize-dots">
                            <span /><span /><span /><span /><span />
                        </div>
                    </div>

                    {/* ══ RIGHT: DETAIL ══ */}
                    {selected ? (
                        <main className={`flex-col flex-1 min-w-0 h-full bg-page-bg
                                      ${mobileView === 'detail'
                                          ? 'flex vd-slide-in-right'
                                          : 'hidden lg:flex lg:vd-fade'}`}>

                            {/* Detail header */}
                            <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-border bg-card-bg shrink-0">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                        {/* Mobile back button */}
                                        <button
                                            onClick={() => setMobileView('list')}
                                            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg
                                                       bg-card-bg-elevated border border-border text-text-muted
                                                       hover:text-primary hover:border-primary/30 transition-all shrink-0">
                                            <ChevronRight className="w-4 h-4 rotate-180" />
                                        </button>
                                        <div className="hidden lg:flex p-2 rounded-xl bg-card-bg-elevated border border-border shrink-0
                                                        transition-transform hover:scale-110 duration-200">
                                            {(() => { const tc = TYPE_CONFIG[selected.type] || TYPE_CONFIG.other; return <tc.icon className={`w-4.5 h-4.5 ${isDark ? tc.colorCls : tc.colorCls.replace('text-', 'text-[#A89250]-')}`} style={{width:18,height:18}} />; })()}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className={`font-serif text-lg font-bold leading-tight truncate ${isDark ? 'text-text-primary' : 'text-[#A89250]'}
                                                           flex items-center gap-2`}>
                                                <span className="truncate">{selected.subject || (selected.type || 'Enquiry').replace('_', ' ')}</span>
                                                <span className={`${isDark ? 'text-text-muted' : 'text-[#A89250]/50'} text-sm font-bold shrink-0`}>
                                                    #{selected.feedback_id.substring(0,6).toUpperCase()}
                                                </span>
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-[#A89250]/60 font-bold flex-wrap">
                                                <span className="capitalize">{(selected.type||'General').replace('_',' ')}</span>
                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                <span>PID-{selected.feedback_id.substring(0,3).toUpperCase()}</span>
                                                {localAssign[selected.feedback_id] && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        <span className="flex items-center gap-1 font-bold text-gold
                                                                         bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-md">
                                                            <User className="w-3.5 h-3.5" />{localAssign[selected.feedback_id]}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 lg:gap-2 shrink-0 flex-wrap justify-end">
                                        <select value={selected.status}
                                            onChange={e => handleStatus(selected.feedback_id, e.target.value)}
                                            className={`appearance-none px-3 py-1.5 rounded-lg text-[11.5px] font-bold
                                                        border cursor-pointer focus:outline-none bg-card-bg vd-status-select
                                                        transition-all ${STATUS_CONFIG[selected.status]?.badgeCls}`}>
                                            <option value="new">Pending</option>
                                            <option value="reviewed">Open</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="dismissed">Dismissed</option>
                                        </select>
                                        <button onClick={() => toast('Ticket locked.', { icon: '🔒' })}
                                            className="p-2 rounded-lg text-text-muted hover:text-text-primary
                                                       hover:bg-card-bg-elevated transition-all vd-btn-press">
                                            <Lock className={`w-4 h-4 ${isDark ? '' : 'text-[#A89250]/60'}`} />
                                        </button>
                                        <div className="h-5 w-px bg-border" />
                                        <button onClick={handleAssign}
                                            className="px-3 py-1.5 rounded-lg text-[12px] font-bold
                                                       bg-card-bg border border-border text-text-primary
                                                       flex items-center gap-1.5 hover:bg-card-bg-elevated
                                                       hover:border-primary/30 transition-all vd-btn-press">
                                            <User className="w-3.5 h-3.5" /> Assign
                                        </button>
                                        {selected.status !== 'resolved' && (
                                            <button onClick={() => handleStatus(selected.feedback_id, 'resolved')}
                                                className="px-4 py-1.5 rounded-lg text-[12px] font-bold
                                                           bg-success text-background flex items-center gap-1.5
                                                           hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-success/20 vd-btn-press">
                                                <CheckCircle className="w-3.5 h-3.5" /> Resolve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Thread */}
                            <div ref={threadRef}
                                className="flex-1 overflow-y-auto vd-scroll px-4 lg:px-8 py-4 lg:py-8 space-y-4 lg:space-y-6 bg-page-bg">

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px vd-divider-line" />
                                    <span className="text-xs font-bold uppercase text-[#A89250]/60
                                                     bg-card-bg border border-border px-4 py-2 rounded-full whitespace-nowrap">
                                        {new Date(selected.created_at).toLocaleDateString('en-US', {
                                            weekday:'long', month:'long', day:'numeric'
                                        }).toUpperCase()}
                                    </span>
                                    <div className="flex-1 h-px vd-divider-line" />
                                </div>

                                {/* Customer message */}
                                <div className="flex gap-4 vd-msg-l max-w-3xl">
                                    <div onClick={() => selected.customer_id && openProfile(selected.customer_id)}
                                        className={`w-10 h-10 rounded-xl bg-primary-dark/50 border border-primary/25
                                                    flex items-center justify-center text-primary font-bold text-sm shrink-0
                                                    vd-avatar-lift
                                                    ${selected.customer_id ? 'cursor-pointer' : ''}`}>
                                        {getInitials(selected.name)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span onClick={() => selected.customer_id && openProfile(selected.customer_id)}
                                                className={`font-bold text-sm ${isDark ? 'text-text-primary' : 'text-[#A89250]'}
                                                            ${selected.customer_id ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}>
                                                {selected.name || 'Customer'}
                                            </span>
                                            <span className="text-xs text-[#A89250]/50 font-bold">
                                                {new Date(selected.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                                            </span>
                                            {selected.customer_id && (
                                                <button onClick={() => openProfile(selected.customer_id)}
                                                    className="ml-auto text-xs font-bold text-gold hover:text-gold-dark
                                                               flex items-center gap-1.5 transition-colors vd-btn-press bg-gold/5 px-2.5 py-1 rounded-lg border border-gold/10">
                                                    <User className="w-3.5 h-3.5" /> View 360°
                                                </button>
                                            )}
                                        </div>
                                        <div className="vd-bubble-customer rounded-2xl rounded-tl-sm p-4 shadow-sm">
                                            <p className="text-[14px] text-text-primary leading-relaxed font-medium whitespace-pre-wrap">
                                                {selected.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {(selected.replies || []).map((reply: any, i: number) => {
                                    if (reply.type === 'note') return (
                                        <div key={reply.reply_id||i} className="ml-14 max-w-3xl vd-msg-l">
                                            <div className="vd-bubble-note rounded-2xl p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-warning/20 text-warning text-[11px] font-bold uppercase
                                                                     px-2 py-0.5 rounded-md border border-warning/30">
                                                        Internal Note
                                                    </span>
                                                    <span className="text-[12px] text-warning/60 font-medium">
                                                        {timeAgo(reply.timestamp)} · Admin
                                                    </span>
                                                </div>
                                                <p className="text-[14px] text-warning leading-relaxed italic font-medium whitespace-pre-wrap">
                                                    "{reply.message}"
                                                </p>
                                            </div>
                                        </div>
                                    );

                                    if (reply.author_type === 'customer') return (
                                        <div key={reply.reply_id||i} className="flex gap-4 max-w-3xl vd-msg-l">
                                            <div className="w-10 h-10 rounded-xl bg-card-bg-elevated border border-border
                                                            flex items-center justify-center text-text-muted font-bold text-sm shrink-0">C</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-bold text-[13px] text-text-primary">Customer</span>
                                                    <span className="text-[11px] text-text-muted font-medium">{timeAgo(reply.timestamp)}</span>
                                                </div>
                                                <div className="vd-bubble-customer rounded-2xl rounded-tl-sm p-4 shadow-sm inline-block">
                                                    <p className="text-[14px] text-text-primary leading-relaxed font-medium whitespace-pre-wrap">{reply.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <div key={reply.reply_id||i} className="flex gap-4 justify-end vd-msg-r">
                                            <div className="flex-1 flex flex-col items-end max-w-3xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[12px] text-[#A89250]/50 font-medium">{timeAgo(reply.timestamp)}</span>
                                                    <span className={`font-bold text-[13px] ${isDark ? 'text-text-primary' : 'text-[#A89250]'}`}>
                                                        {reply.replier_id === 'SYSTEM-BOT' ? 'Vedashi Bot' : 'You (Agent)'}
                                                    </span>
                                                </div>
                                                {/* ✅ FIXED: agent bubble now uses high-contrast white text */}
                                                <div className={`rounded-2xl rounded-tr-sm p-4 shadow-sm
                                                    ${reply.replier_id === 'SYSTEM-BOT'
                                                        ? 'vd-bubble-bot'
                                                        : 'vd-bubble-agent'}`}>
                                                    <p className={`text-[14px] leading-relaxed font-medium whitespace-pre-wrap
                                                                  ${reply.replier_id === 'SYSTEM-BOT' ? 'text-text-primary' : 'text-white'}`}>
                                                        {reply.message}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm border vd-avatar-lift
                                                            ${reply.replier_id === 'SYSTEM-BOT'
                                                                ? 'bg-info/10 text-info border-info/20'
                                                                : 'bg-primary/20 text-primary border-primary/30'}`}>
                                                {reply.replier_id === 'SYSTEM-BOT' ? '✦' : 'AN'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Reply box ── */}
                            <div className={`px-3 lg:px-6 pb-3 lg:pb-5 shrink-0 transition-colors border-t
                                            ${replyType === 'note'
                                                ? 'border-warning/20 bg-warning/3'
                                                : 'border-border bg-card-bg'}`}>

                                {/* ✅ DRAG HANDLE — drag up to make taller, drag down to shrink */}
                                <div
                                    className={`vd-reply-resize w-full mt-1 mb-2 ${isReplyResizing ? 'active' : ''}`}
                                    onMouseDown={onReplyResizeStart}
                                    title="Drag to resize reply box"
                                />

                                <div className={`border rounded-2xl overflow-hidden transition-all duration-200
                                                 ${replyType === 'reply'
                                                    ? 'border-border bg-card-bg focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(140,175,140,0.08)]'
                                                    : 'border-warning/30 bg-warning/6 focus-within:border-warning/50 focus-within:shadow-[0_0_0_3px_rgba(197,164,109,0.08)]'}`}>

                                    {/* Tabs + toolbar */}
                                    <div className={`flex items-center border-b
                                                    ${replyType === 'note' ? 'border-warning/20 bg-warning/5' : 'border-border bg-card-bg/80'}`}>
                                        {([
                                            { id: 'reply', Icon: Mail, label: 'Reply to Customer' },
                                            { id: 'note',  Icon: Lock, label: 'Private Note'       },
                                        ] as const).map(({ id, Icon, label }) => (
                                            <button key={id} onClick={() => setReplyType(id)}
                                                className={`relative px-5 py-3 text-xs font-bold transition-all
                                                            flex items-center gap-2
                                                            ${replyType === id
                                                                ? id === 'reply' ? 'text-primary' : 'text-warning'
                                                                : 'text-[#A89250]/60 hover:text-[#A89250]'}`}>
                                                <Icon className="w-4 h-4" />{label}
                                                {replyType === id && (
                                                    <span className={`absolute bottom-0 left-4 right-4 h-[2.5px] rounded-full
                                                                      ${id === 'reply' ? 'bg-primary' : 'bg-warning'}`} />
                                                )}
                                            </button>
                                        ))}

                                        <div className="h-4 w-px bg-border mx-1" />
                                        <div className="flex items-center gap-1 px-1">
                                            {['🙏', '✅', '⚠️'].map(e => (
                                                <button key={e}
                                                    onClick={() => setReplyText(p => p + e)}
                                                    className="w-7 h-7 text-sm rounded-lg hover:bg-card-bg-elevated
                                                               flex items-center justify-center transition-all hover:scale-110 vd-btn-press">
                                                    {e}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex-1" />

                                        {/* ✅ TEMPLATES — portal-rendered to escape overflow:hidden */}
                                        <button
                                            ref={templateBtnRef}
                                            type="button"
                                            onClick={openTemplates}
                                            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold
                                                       uppercase transition-all rounded-lg
                                                       ${showTemplates
                                                           ? 'text-gold bg-gold/10 border border-gold/20'
                                                           : 'text-[#A89250]/60 hover:text-[#A89250] hover:bg-card-bg-elevated/60'}`}>
                                            Templates
                                            {showTemplates
                                                ? <ChevronUp className="w-4 h-4" />
                                                : <ChevronDown className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>

                                    {/* ✅ RESIZABLE Textarea */}
                                    <textarea
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply(); }}
                                        placeholder={replyType === 'reply'
                                            ? `Hello ${selected.name?.split(' ')[0] || ''}, write your reply here… (Ctrl+Enter to send)`
                                            : 'Add a private internal note for the team only…'}
                                        style={{ height: replyBoxHeight }}
                                        className="w-full px-5 py-4 bg-transparent outline-none resize-none
                                                   text-[13.5px] text-text-primary placeholder:text-text-muted/60
                                                   placeholder:font-medium leading-relaxed transition-all duration-150" />

                                    {/* Footer toolbar */}
                                    <div className={`flex items-center justify-between px-4 py-2.5 border-t
                                                    ${replyType === 'note' ? 'border-warning/15 bg-warning/5' : 'border-border bg-card-bg/60'}`}>
                                        <div className="flex items-center gap-2">
                                            <button onClick={handleAddTag}
                                                className="text-[11px] font-bold text-text-muted hover:text-primary
                                                           px-2.5 py-1.5 rounded-lg hover:bg-primary/8
                                                           transition-all flex items-center gap-1 vd-btn-press">
                                                + Tag
                                            </button>
                                            {replyText.length > 0 && (
                                                <span className={`text-[10.5px] font-medium tabular-nums vd-slide-up
                                                                  ${replyText.length > 500 ? 'text-warning' : 'text-text-muted/60'}`}>
                                                    {replyText.length} chars
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {replyText.trim() && (
                                                <button onClick={() => setReplyText('')}
                                                    className="text-[11px] font-bold text-text-muted hover:text-danger
                                                               px-2.5 py-1.5 rounded-lg hover:bg-danger/8 transition-all vd-btn-press">
                                                    Clear
                                                </button>
                                            )}
                                            <button onClick={handleSendReply} disabled={!replyText.trim()}
                                                className={`px-5 py-2 rounded-xl text-[12.5px] font-bold
                                                            flex items-center gap-2
                                                            disabled:opacity-35 disabled:cursor-not-allowed
                                                            active:scale-95 transition-all shadow-sm vd-btn-press
                                                            ${replyType === 'reply'
                                                                ? 'bg-primary text-white hover:bg-primary-dark shadow-primary/20'
                                                                : 'bg-warning text-white hover:opacity-90 shadow-warning/20'}`}>
                                                {replyType === 'reply' ? 'Send Reply' : 'Save Note'}
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    ) : (
                        <div className="hidden lg:flex flex-col flex-1 items-center justify-center
                                        bg-page-bg p-12 text-center border-l border-border h-full">
                            <div className="w-20 h-20 rounded-2xl bg-card-bg border border-border
                                            flex items-center justify-center mb-6 mt-[-10%] vd-float">
                                <MessageSquare className="w-8 h-8 text-primary/30" />
                            </div>
                            <h4 className="font-serif text-xl font-bold text-text-primary mb-2">No conversation selected</h4>
                            <p className="text-[13px] text-text-muted max-w-xs leading-relaxed">
                                Select an enquiry from the left to view the conversation, reply, or add internal notes.
                            </p>
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════
                    CUSTOMER 360° PANEL
                ══════════════════════════════════════ */}
                {profileId && (
                    <div className="fixed inset-0 z-[100] flex items-stretch justify-end">
                        <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-[#A89250]/60'} backdrop-blur-[2px] vd-fade`}
                             onClick={closeProfile} />

                        <div className={`relative w-full max-w-[480px] h-full bg-card-bg shadow-2xl
                                        flex flex-col vd-right border-l border-border overflow-hidden
                                        ${isDark ? 'shadow-black/50' : 'shadow-emerald-950/10'}`}>

                            {loadingProfile ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-5">
                                    <div className="relative w-14 h-14">
                                        <div className="absolute inset-0 rounded-full border-4 border-border" />
                                        <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[15px] font-bold text-text-primary mb-1">Loading Profile</p>
                                        <p className="text-[12px] text-text-muted">Fetching customer data…</p>
                                    </div>
                                </div>

                            ) : c360 ? (
                                <>
                                    {/* Sticky header */}
                                    <div className="shrink-0 relative overflow-hidden border-b border-border">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                                        <div className="relative flex items-center justify-between px-5 pt-5 pb-0">
                                            <span className="text-[12px] font-bold uppercase text-[#A89250]/40 flex items-center gap-1.5">
                                                <span className="relative w-1.5 h-1.5">
                                                    <span className="absolute inset-0 rounded-full bg-primary vd-blink" />
                                                    <span className="absolute inset-0 rounded-full bg-primary vd-pulse-ring" />
                                                </span>
                                                Customer 360°
                                            </span>
                                            <button onClick={closeProfile}
                                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary
                                                           hover:bg-card-bg-elevated transition-all vd-btn-press">
                                                <X style={{width:18,height:18}} />
                                            </button>
                                        </div>

                                        <div className="relative px-5 pt-4 pb-4 flex items-center gap-4">
                                            <div className="relative shrink-0">
                                                <div className="w-[60px] h-[60px] rounded-2xl bg-primary-dark/70 border-2 border-primary/40
                                                                flex items-center justify-center text-primary font-bold text-xl
                                                                shadow-[0_0_20px_rgba(140,175,140,0.15)] vd-avatar-lift">
                                                    {getInitials(c360.profile?.full_name)}
                                                </div>
                                                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card-bg
                                                                  ${c360.profile?.account_status==='ACTIVE' ? 'bg-success' : 'bg-warning'}`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`font-serif text-[19px] font-bold leading-snug truncate ${isDark ? 'text-text-primary' : 'text-[#A89250]'}`}>
                                                    {c360.profile?.full_name || 'Customer'}
                                                </h4>
                                                <p className={`text-[12.5px] font-medium truncate mt-0.5 ${isDark ? 'text-text-muted' : 'text-[#A89250]/60'}`}>
                                                    {c360.profile?.email}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border
                                                                      ${c360.profile?.account_status==='ACTIVE'
                                                                        ? 'bg-success/12 text-success border-success/25'
                                                                        : 'bg-warning/12 text-warning border-warning/25'}`}>
                                                        {c360.profile?.account_status||'ACTIVE'}
                                                    </span>
                                                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border bg-primary/12 text-primary border-primary/25">
                                                        {c360.profile?.role||'Customer'}
                                                    </span>
                                                    <span className="text-[11px] text-[#A89250]/50 font-medium flex items-center gap-1 ml-auto">
                                                        <Calendar className="w-3 h-3" />
                                                        Since {new Date(c360.profile?.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 px-5 pb-4">
                                            {[
                                                { label:'Orders',    value:c360.orders?.length||0,                                                                    Icon:ShoppingBag, cls:'text-primary', bg:'bg-primary/10' },
                                                { label:'Spent',     value:formatINR(c360.orders?.reduce((a:number,o:any)=>a + (o.order_status?.toUpperCase() !== 'CANCELLED' ? Number(o.final_total||0) : 0), 0)||0), Icon:TrendingUp,  cls:'text-success', bg:'bg-success/10' },
                                                { label:'Addresses', value:c360.addresses?.length||0,                                                                  Icon:MapPin,      cls:'text-gold',    bg:'bg-gold/10'   },
                                            ].map((s,i)=>(
                                                <div key={s.label}
                                                    className={`vd-card rounded-xl p-3 text-center border border-border
                                                                bg-card-bg-elevated vd-in s${i+1}`}>
                                                    <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                                                        <s.Icon className={`w-3.5 h-3.5 ${s.cls}`} />
                                                    </div>
                                                    <div className="font-bold text-[16px] text-[#A89250] leading-none">{s.value}</div>
                                                    <div className="text-[11px] font-bold text-[#A89250]/60 uppercase mt-1">{s.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex border-t border-border/60 bg-card-bg/80">
                                            {(['overview','orders','addresses'] as const).map(tab => (
                                                <button key={tab} onClick={() => setProfileTab(tab)}
                                                    className={`flex-1 py-3 text-[12px] font-bold capitalize relative
                                                                transition-all duration-200
                                                                ${profileTab===tab
                                                                    ? 'text-primary'
                                                                    : 'text-text-muted hover:text-text-secondary hover:bg-card-bg-elevated/50'}`}>
                                                    {tab}
                                                    {profileTab===tab && (
                                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full
                                                                         transition-all duration-300" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Scrollable content */}
                                    <div className="flex-1 min-h-0 overflow-y-auto vd-panel-scroll"
                                         style={{ scrollbarGutter: 'stable' }}>

                                        {profileTab==='overview' && (
                                            <div className="p-5 space-y-5 vd-in">
                                                <section>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <User className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-[12px] font-bold uppercase text-[#A89250]/40">Contact Details</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        {[
                                                            { label:'Email',         value:c360.profile?.email,       Icon:Mail     },
                                                            { label:'Phone',         value:c360.profile?.phone||'—',  Icon:Phone    },
                                                            { label:'Date of Birth', value:c360.profile?.date_of_birth ? new Date(c360.profile.date_of_birth).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : 'Not set', Icon:Calendar },
                                                            { label:'Member Since',  value:new Date(c360.profile?.created_at).toLocaleDateString('en-IN',{month:'long',year:'numeric'}), Icon:Clock },
                                                        ].map(({ label, value, Icon }, i) => (
                                                            <div key={label}
                                                                className={`vd-card bg-page-bg border border-border rounded-xl p-3.5
                                                                           hover:border-primary/35 hover:bg-primary/4 transition-all vd-in s${i+1}`}>
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <Icon className="w-3.5 h-3.5 text-primary/70" />
                                                                    <span className="text-[11px] font-bold text-[#A89250]/60 uppercase">{label}</span>
                                                                </div>
                                                                <p className="text-[12.5px] font-bold text-[#A89250] truncate leading-snug">{value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>

                                                {c360.dosha && (() => {
                                                    const dom = c360.dosha.dominant_dosha;
                                                    const dc  = DOSHA_CONFIG[dom] || DOSHA_CONFIG['Vata'];
                                                    const scores = [
                                                        { name:'Vata',  pct:c360.dosha.vata_score,  ...DOSHA_CONFIG['Vata']  },
                                                        { name:'Pitta', pct:c360.dosha.pitta_score, ...DOSHA_CONFIG['Pitta'] },
                                                        { name:'Kapha', pct:c360.dosha.kapha_score, ...DOSHA_CONFIG['Kapha'] },
                                                    ];
                                                    return (
                                                        <section className="vd-in s3">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <Heart className="w-3.5 h-3.5 text-primary" />
                                                                <span className="text-[12px] font-bold uppercase text-[#A89250]/40">Ayurvedic Prakriti</span>
                                                            </div>
                                                            <div className={`rounded-2xl border border-border/60 p-5 relative overflow-hidden ${dc.bg}`}>
                                                                <div className="absolute -bottom-2 -right-2 text-7xl opacity-[0.07] pointer-events-none select-none rotate-[-15deg]">{dc.glyph}</div>
                                                                <div className="flex items-start justify-between mb-4">
                                                                    <div>
                                                                        <p className="text-[11px] font-bold text-[#A89250]/50 uppercase mb-1">Dominant Dosha</p>
                                                                        <p className={`text-[22px] font-bold ${dc.text} leading-tight`}>{dom} Prakriti</p>
                                                                        <p className="text-[12px] text-[#A89250]/60 mt-1 font-bold">
                                                                            Profiled {new Date(c360.dosha.created_at).toLocaleDateString('en-IN',{month:'short',day:'numeric',year:'numeric'})}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-[28px] select-none mt-0.5">{dc.glyph}</span>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {scores.map((s,i) => (
                                                                        <div key={s.name} className={`vd-in s${i+1}`}>
                                                                            <div className="flex justify-between items-center mb-1.5">
                                                                                <span className={`text-[12px] font-bold ${s.text}`}>{s.name}</span>
                                                                                <span className={`text-[12px] font-bold tabular-nums ${s.text}`}>{s.pct}%</span>
                                                                            </div>
                                                                            <div className="w-full rounded-full overflow-hidden" style={{height:6,background:'rgba(255,255,255,0.07)'}}>
                                                                                <div className={`vd-bar ${s.bar}`} style={{'--w':`${s.pct}%`,borderRadius:99} as any} />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <button className={`mt-4 text-[12px] font-bold ${dc.text} flex items-center gap-1.5 group transition-all`}>
                                                                    Full Consultation
                                                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                                                </button>
                                                            </div>
                                                        </section>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {profileTab==='orders' && (
                                            <div className="p-5 vd-in">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-[12px] font-bold uppercase text-emerald-900/40">Order History</span>
                                                    </div>
                                                    <span className="text-[11px] text-text-muted font-semibold bg-card-bg-elevated border border-border px-2 py-0.5 rounded-full">
                                                        {c360.orders?.length||0} total
                                                    </span>
                                                </div>
                                                {c360.orders?.length > 0 ? (
                                                    <div className="space-y-2.5">
                                                        {c360.orders.map((order: any, i: number) => (
                                                            <div key={order.order_id}
                                                                className="vd-card bg-page-bg border border-border rounded-xl p-4
                                                                           hover:border-primary/35 hover:bg-primary/4 cursor-pointer group transition-all"
                                                                style={{ animation: `vd-in .3s cubic-bezier(.16,1,.3,1) ${i*60}ms both` }}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-card-bg-elevated border border-border
                                                                                    flex items-center justify-center shrink-0
                                                                                    group-hover:bg-primary/15 group-hover:border-primary/30 transition-all">
                                                                        <Package className="w-4.5 h-4.5 text-text-muted group-hover:text-primary transition-colors" style={{width:18,height:18}} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <p className="text-[13px] font-bold text-emerald-950">#{order.order_number}</p>
                                                                            <p className="text-[13px] font-bold text-emerald-950 tabular-nums">{formatINR(order.final_total)}</p>
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <p className="text-[12px] text-emerald-900/60 font-bold">
                                                                                {new Date(order.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                                                                                <span className="mx-1 opacity-50">·</span>
                                                                                {order.item_count} items
                                                                            </p>
                                                                            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border
                                                                                ${order.order_status==='DELIVERED' ? 'bg-success/10 text-success border-success/20'
                                                                                : order.order_status==='CANCELLED' ? 'bg-danger/10 text-danger border-danger/20'
                                                                                : 'bg-warning/10 text-warning border-warning/20'}`}>
                                                                                {order.order_status}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight className="w-4 h-4 text-text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-16 text-center">
                                                        <div className="w-12 h-12 rounded-2xl bg-card-bg-elevated border border-border flex items-center justify-center mx-auto mb-3 vd-float">
                                                            <ShoppingBag className="w-5 h-5 text-primary/30" />
                                                        </div>
                                                        <p className="text-[13px] text-text-muted font-medium">No orders yet</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {profileTab==='addresses' && (
                                            <div className="p-5 vd-in">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-[12px] font-bold uppercase text-emerald-900/40">Saved Addresses</span>
                                                    </div>
                                                    <span className="text-[11px] text-text-muted font-semibold bg-card-bg-elevated border border-border px-2 py-0.5 rounded-full">
                                                        {c360.addresses?.length||0} saved
                                                    </span>
                                                </div>
                                                {c360.addresses?.length > 0 ? (
                                                    <div className="space-y-2.5">
                                                        {c360.addresses.map((addr: any, i: number) => (
                                                            <div key={addr.address_id}
                                                                className={`vd-card rounded-xl border p-4 transition-all
                                                                            ${addr.is_default
                                                                                ? 'bg-primary/8 border-primary/30 hover:border-primary/50'
                                                                                : 'bg-page-bg border-border hover:border-primary/30 hover:bg-primary/4'}`}
                                                                style={{ animation: `vd-in .3s cubic-bezier(.16,1,.3,1) ${i*60}ms both` }}>
                                                                <div className="flex items-start justify-between mb-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                                                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                                                        </div>
                                                                        <p className="text-[13px] font-bold text-emerald-950">{addr.full_name}</p>
                                                                    </div>
                                                                    {addr.is_default && (
                                                                        <span className="text-[11px] font-bold uppercase bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full">Default</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[12px] text-emerald-900/70 leading-relaxed font-bold pl-9">
                                                                    {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}<br/>
                                                                    {addr.city}, {addr.state} — {addr.postal_code}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-2.5 pl-9">
                                                                    <Phone className="w-3 h-3 text-primary/60" />
                                                                    <p className="text-[12px] text-emerald-900/60 font-bold">{addr.phone}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-16 text-center">
                                                        <div className="w-12 h-12 rounded-2xl bg-card-bg-elevated border border-border flex items-center justify-center mx-auto mb-3 vd-float">
                                                            <MapPin className="w-5 h-5 text-primary/30" />
                                                        </div>
                                                        <p className="text-[13px] text-text-muted font-medium">No addresses saved</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="h-4" />
                                    </div>

                                    {/* Pinned footer */}
                                    <div className="shrink-0 p-5 border-t border-border bg-card-bg/80 backdrop-blur-md">
                                        <button onClick={() => window.open(`/dashboard/customers/${c360.profile.customer_id}`,'_blank')}
                                            className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-bold
                                                       flex items-center justify-center gap-2.5
                                                       hover:bg-primary-dark active:scale-[.98] transition-all shadow-xl shadow-primary/20 vd-btn-press">
                                            <BarChart2 className="w-4.5 h-4.5" /> Open Full Customer Profile
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {/* ══ TEMPLATE PORTAL — renders at document.body level, escapes all overflow:hidden ══ */}
            {showTemplates && templatePos && typeof document !== 'undefined' && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[199]"
                        onClick={() => { setShowTemplates(false); setTemplatePos(null); }}
                    />
                    {/* Panel — positioned via JS rect, opens upward */}
                    <div
                        className="fixed z-[200] vd-dropdown"
                        style={{
                            bottom: window.innerHeight - templatePos.top + 6,
                            right:  templatePos.right,
                            width:  320,
                            maxHeight: '70vh',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            background: '#1e2820',
                            border: '1px solid #2e3d2e',
                            borderRadius: 16,
                            boxShadow: '0 24px 64px rgba(0,0,0,.7), 0 4px 20px rgba(0,0,0,.5)',
                            overflow: 'hidden',
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #2e3d2e',
                                background: '#252e25',
                            }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#d4e8d4', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 0 }}>
                                    📋 Canned Responses
                                </p>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b8f6b', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
                                    <input
                                        ref={templateSearchRef}
                                        type="text"
                                        value={templateSearch}
                                        onChange={e => setTemplateSearch(e.target.value)}
                                        placeholder="Search templates…"
                                        style={{
                                            width: '100%',
                                            paddingLeft: '2rem',
                                            paddingRight: '0.75rem',
                                            paddingTop: '6px',
                                            paddingBottom: '6px',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            background: isDark ? '#171e17' : 'var(--t-page-bg)',
                                            border: isDark ? '1px solid #2e3d2e' : '1px solid var(--t-border)',
                                            color: isDark ? '#d4e8d4' : 'var(--t-text-primary)',
                                            boxSizing: 'border-box',
                                            outline: 'none',
                                            display: 'block',
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(140,175,140,.6)' : 'var(--t-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(140,175,140,.12)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = isDark ? '#2e3a2e' : 'var(--t-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>
                            {/* List */}
                            <div style={{ maxHeight: 300, overflowY: 'auto', padding: '6px 0', background: isDark ? '#1e2820' : 'var(--t-card-bg-elevated)' }}>
                                {filteredTemplates.length === 0 ? (
                                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                        <p style={{ fontSize: 12, color: isDark ? '#6b8f6b' : 'var(--t-text-muted)' }}>No templates found</p>
                                    </div>
                                ) : filteredTemplates.map((res, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => applyTemplate(res.text)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '10px 16px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderBottom: `1px solid ${isDark ? 'rgba(46,61,46,.6)' : 'var(--t-border-subtle)'}`,
                                            cursor: 'pointer',
                                            transition: 'background .15s, padding-left .15s',
                                            display: 'block',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#252e25' : 'rgba(59, 93, 59, 0.05)'; e.currentTarget.style.paddingLeft = '20px'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = '16px'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#3b563bff' : 'var(--t-text-primary)' }}>{res.name}</span>
                                            <span style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#8caf8c' : 'var(--t-primary)', opacity: 0.7, whiteSpace: 'nowrap', flexShrink: 0 }}>Insert →</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: isDark ? '#7a9f7a' : 'var(--t-text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{res.text}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* ══ CUSTOM INPUT MODAL (Tag / Assign) ══ */}
            {modal && typeof document !== 'undefined' && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[300] flex items-center justify-center vd-fade"
                        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
                        onClick={() => setModal(null)}
                    >
                        {/* Panel */}
                        <div
                            className="vd-pop"
                            style={{
                                background: 'var(--t-card-bg)',
                                border: '1px solid var(--t-border)',
                                borderRadius: 18,
                                padding: '24px 24px 20px',
                                width: 340,
                                boxShadow: isDark ? '0 24px 64px rgba(0,0,0,.55), 0 4px 16px rgba(0,0,0,.3)' : '0 10px 30px rgba(59,93,59,0.1)',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Icon + Title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    background: isDark ? 'rgba(140,175,140,.15)' : 'rgba(59,93,59,0.1)',
                                    border: `1px solid ${isDark ? 'rgba(140,175,140,.25)' : 'rgba(59,93,59,0.2)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16,
                                }}>
                                    {modal.type === 'tag' ? '🏷️' : '👤'}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--t-text-primary)', margin: 0, lineHeight: 1.2 }}>
                                        {modal.type === 'tag' ? 'Add Tag' : 'Assign Ticket'}
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--t-text-muted)', margin: 0, marginTop: 2 }}>
                                        {modal.type === 'tag' ? 'Label this enquiry for easier filtering' : 'Assign to a team member'}
                                    </p>
                                </div>
                            </div>

                            {/* Input */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t-text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                                    {modal.type === 'tag' ? 'Tag name' : 'Agent name'}
                                </label>
                                <input
                                    ref={modalInputRef}
                                    type="text"
                                    value={modal.value}
                                    onChange={e => setModal(m => m ? { ...m, value: e.target.value } : m)}
                                    onKeyDown={e => { if (e.key === 'Enter') confirmModal(); if (e.key === 'Escape') setModal(null); }}
                                    placeholder={modal.type === 'tag' ? 'e.g. urgent, refund, vip…' : 'e.g. Aditya N.'}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        fontSize: 13.5,
                                        fontWeight: 500,
                                        background: 'var(--t-page-bg)',
                                        border: '1.5px solid var(--t-border)',
                                        color: 'var(--t-text-primary)',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'border-color .15s, box-shadow .15s',
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--t-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(140,175,140,.12)'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--t-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>

                            {/* Quick suggestions for tag */}
                            {modal.type === 'tag' && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                                    {['urgent', 'refund', 'vip', 'follow-up', 'shipping', 'quality'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setModal(m => m ? { ...m, value: s } : m)}
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: 99,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                background: modal.value === s ? 'rgba(140,175,140,.25)' : 'rgba(140,175,140,.08)',
                                                border: `1px solid ${modal.value === s ? 'rgba(140,175,140,.5)' : 'rgba(140,175,140,.15)'}`,
                                                color: modal.value === s ? '#8caf8c' : 'var(--t-text-muted, #6b7f6b)',
                                                cursor: 'pointer',
                                                transition: 'all .15s',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}
                                        >{s}</button>
                                    ))}
                                </div>
                            )}

                            {/* Agent suggestions for assign */}
                            {modal.type === 'assign' && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                                    {['Aditya N.', 'Priya S.', 'Rahul M.', 'Sunita K.'].map(a => (
                                        <button
                                            key={a}
                                            type="button"
                                            onClick={() => setModal(m => m ? { ...m, value: a } : m)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: 99,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                background: modal.value === a ? 'rgba(140,175,140,.25)' : 'rgba(140,175,140,.08)',
                                                border: `1px solid ${modal.value === a ? 'rgba(140,175,140,.5)' : 'rgba(140,175,140,.15)'}`,
                                                color: modal.value === a ? '#3b5d3b' : 'var(--t-text-muted, #6b7f6b)',
                                                cursor: 'pointer',
                                                transition: 'all .15s',
                                                display: 'flex', alignItems: 'center', gap: 5,
                                            }}
                                        >
                                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(140,175,140,.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                                                {a[0]}
                                            </span>
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setModal(null)}
                                    style={{
                                        flex: 1, padding: '9px 0', borderRadius: 10,
                                        fontSize: 13, fontWeight: 700,
                                        background: 'transparent',
                                        border: '1.5px solid var(--t-border)',
                                        color: 'var(--t-text-muted)',
                                        cursor: 'pointer', transition: 'all .15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t-primary)'; e.currentTarget.style.color = 'var(--t-text-primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-border)'; e.currentTarget.style.color = 'var(--t-text-muted)'; }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmModal}
                                    style={{
                                        flex: 1, padding: '9px 0', borderRadius: 10,
                                        fontSize: 13, fontWeight: 700,
                                        background: 'var(--t-primary)',
                                        border: '1.5px solid transparent',
                                        color: '#fff',
                                        cursor: 'pointer', transition: 'all .15s',
                                        boxShadow: isDark ? '0 4px 14px rgba(140,175,140,.25)' : '0 4px 14px rgba(59,93,59,0.2)',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                                >
                                    {modal.type === 'tag' ? 'Add Tag' : 'Assign'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}