'use client';
import { authFetch } from '@/lib/api';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
    Plus, Megaphone, Send, Trash2, Loader2, Users,
    Calendar, CheckCircle2, AlertCircle, Clock, FilePenLine,
    Pencil, XCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
type CampaignAudience = 'all' | 'subscribed_only' | 'repeat_buyers';

interface Campaign {
    campaign_id: string;
    title: string;
    subject: string;
    target_audience: CampaignAudience;
    status: CampaignStatus;
    scheduled_at: string | null;
    sent_at: string | null;
    total_recipients: number;
    created_at: string;
}

const statusConfig: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
    draft: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400', icon: FilePenLine },
    scheduled: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
    sending: { label: 'Sending…', color: 'bg-amber-500/20 text-amber-400', icon: Loader2 },
    sent: { label: 'Sent', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-500', icon: XCircle },
};

const audienceLabel: Record<CampaignAudience, string> = {
    all: 'All Customers',
    subscribed_only: 'Subscribed Only',
    repeat_buyers: 'Repeat Buyers',
};

export default function NotificationsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

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

    const loadCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/campaigns`, { headers: headers() });
            const data = await res.json();
            if (data.success) setCampaigns(data.data?.campaigns || []);
            else toast.error(data.message || 'Failed to load campaigns');
        } catch {
            toast.error('Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    }, [headers]);

    useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

    const handleSendNow = async (id: string, title: string) => {
        if (!confirm(`Send campaign "${title}" now? This will email all qualifying customers.`)) return;
        setSendingId(id);
        try {
            const res = await authFetch(`${API_URL}/api/admin/campaigns/${id}/send`, {
                method: 'POST', headers: headers(),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Campaign sent to ${data.data?.recipientCount ?? 0} recipient(s)!`);
                loadCampaigns();
            } else {
                toast.error(data.message || 'Failed to send campaign');
            }
        } catch {
            toast.error('Error sending campaign');
        } finally {
            setSendingId(null);
        }
    };

    const handleCancel = async (id: string, status: CampaignStatus) => {
        const label = status === 'sending' ? 'stop this campaign mid-send' : 'cancel this scheduled campaign';
        if (!confirm(`Are you sure you want to ${label}? This cannot be undone.`)) return;
        setCancellingId(id);
        try {
            const res = await authFetch(`${API_URL}/api/admin/campaigns/${id}/cancel`, {
                method: 'POST', headers: headers(),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(status === 'sending' ? 'Campaign stopped' : 'Campaign cancelled');
                loadCampaigns();
            } else {
                toast.error(data.message || 'Failed to cancel');
            }
        } catch {
            toast.error('Error cancelling campaign');
        } finally {
            setCancellingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this draft? This cannot be undone.')) return;
        try {
            const res = await authFetch(`${API_URL}/api/admin/campaigns/${id}`, {
                method: 'DELETE', headers: headers(),
            });
            const data = await res.json();
            if (data.success) { toast.success('Campaign deleted'); loadCampaigns(); }
            else toast.error(data.message || 'Failed to delete');
        } catch {
            toast.error('Error deleting campaign');
        }
    };

    // Stats
    const stats = {
        total: campaigns.length,
        sent: campaigns.filter(c => c.status === 'sent').length,
        draft: campaigns.filter(c => c.status === 'draft').length,
        totalReached: campaigns.filter(c => c.status === 'sent').reduce((sum, c) => sum + c.total_recipients, 0),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-gold">Promotional Notifications</h1>
                    <p className="text-sm text-text-muted mt-1">Create and send email campaigns to your customers</p>
                </div>
                <Link
                    href="/dashboard/notifications/create"
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Campaign
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Campaigns', value: stats.total, icon: Megaphone, color: 'text-gold' },
                    { label: 'Sent', value: stats.sent, icon: CheckCircle2, color: 'text-emerald-400' },
                    { label: 'Drafts', value: stats.draft, icon: FilePenLine, color: 'text-gray-400' },
                    { label: 'Total Reached', value: stats.totalReached, icon: Users, color: 'text-blue-400' },
                ].map(stat => (
                    <div key={stat.label} className="bg-card-bg border border-border rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            <div>
                                <p className="text-xs text-text-muted">{stat.label}</p>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Campaigns Table */}
            <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-text-muted">
                        <Megaphone className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No campaigns yet</p>
                        <p className="text-xs mt-1">Create your first promotional email campaign</p>
                        <Link
                            href="/dashboard/notifications/create"
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Create Campaign
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-text-muted">
                                    <th className="text-left px-4 py-3 font-medium">Campaign</th>
                                    <th className="text-left px-4 py-3 font-medium">Audience</th>
                                    <th className="text-left px-4 py-3 font-medium">Status</th>
                                    <th className="text-left px-4 py-3 font-medium">Recipients</th>
                                    <th className="text-left px-4 py-3 font-medium">Date</th>
                                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map(c => {
                                    const cfg = statusConfig[c.status];
                                    const StatusIcon = cfg.icon;
                                    return (
                                        <tr key={c.campaign_id} className="border-b border-border/50 hover:bg-gold/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-text-primary">{c.title}</p>
                                                <p className="text-xs text-text-muted truncate max-w-[220px]">{c.subject}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {audienceLabel[c.target_audience]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                                                    <StatusIcon className={`w-3 h-3 ${c.status === 'sending' ? 'animate-spin' : ''}`} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.status === 'sent'
                                                    ? <span className="text-emerald-400 font-medium">{c.total_recipients}</span>
                                                    : <span className="text-text-muted">—</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">
                                                {c.status === 'sent' && c.sent_at
                                                    ? <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sent {new Date(c.sent_at).toLocaleDateString()}</div>
                                                    : c.status === 'scheduled' && c.scheduled_at
                                                        ? <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" /> {new Date(c.scheduled_at).toLocaleString()}</div>
                                                        : <div>{new Date(c.created_at).toLocaleDateString()}</div>
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">

                                                    {/* Send Now — draft / failed / cancelled can be sent */}
                                                    {['draft', 'failed', 'cancelled'].includes(c.status) && (
                                                        <button
                                                            onClick={() => handleSendNow(c.campaign_id, c.title)}
                                                            disabled={sendingId === c.campaign_id}
                                                            title="Send Now"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary-light text-xs font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {sendingId === c.campaign_id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Send className="w-3 h-3" />
                                                            }
                                                            Send Now
                                                        </button>
                                                    )}

                                                    {/* Edit — draft or scheduled */}
                                                    {['draft', 'scheduled'].includes(c.status) && (
                                                        <Link
                                                            href={`/dashboard/notifications/create?id=${c.campaign_id}`}
                                                            title="Edit Campaign"
                                                            className="p-1.5 rounded-lg hover:bg-gold/10 text-text-muted hover:text-gold transition-colors"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Link>
                                                    )}

                                                    {/* Stop/Cancel — scheduled or sending */}
                                                    {['scheduled', 'sending'].includes(c.status) && (
                                                        <button
                                                            onClick={() => handleCancel(c.campaign_id, c.status)}
                                                            disabled={cancellingId === c.campaign_id}
                                                            title={c.status === 'sending' ? 'Stop Sending' : 'Cancel Schedule'}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            {cancellingId === c.campaign_id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <XCircle className="w-3 h-3" />
                                                            }
                                                            {c.status === 'sending' ? 'Stop' : 'Cancel'}
                                                        </button>
                                                    )}

                                                    {/* Delete — only drafts */}
                                                    {c.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleDelete(c.campaign_id)}
                                                            title="Delete Draft"
                                                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
