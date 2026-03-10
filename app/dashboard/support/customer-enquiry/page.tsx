'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Star, Clock, Search, Filter, CheckCircle } from 'lucide-react';
import { getAdminFeedback, updateFeedbackStatus } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPES = ['all', 'suggestion', 'complaint', 'bug_report', 'contact', 'other'];
const STATUSES = ['all', 'new', 'reviewed', 'actioned', 'dismissed'];
const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    reviewed: 'bg-yellow-100 text-yellow-700',
    actioned: 'bg-green-100 text-green-700',
    dismissed: 'bg-gray-200 text-gray-500',
};

export default function AdminFeedbackPage() {
    const [data, setData] = useState<any>({ feedback: [], total: 0 });
    const [filters, setFilters] = useState({ type: 'all', status: 'all', search: '' });
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const params: any = {};
        if (filters.type !== 'all') params.type = filters.type;
        if (filters.status !== 'all') params.status = filters.status;
        if (filters.search) params.search = filters.search;
        const result = await getAdminFeedback(params);
        setData(result);
        setLoading(false);
    };

    useEffect(() => { load(); }, [filters.type, filters.status]);

    const handleStatus = async (id: string, status: string) => {
        const r = await updateFeedbackStatus(id, status);
        if (r.success) { toast.success('Updated'); load(); }
        else toast.error('Failed');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gold">Customer Enquiry</h1>
                <p className="text-sm text-text-muted mt-1">Manage customer enquiries, feedback and suggestions</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && load()}
                        placeholder="Search enquiries..."
                        className="w-full pl-9 pr-4 py-2 bg-card-bg border border-border rounded-xl text-sm text-text focus:outline-none focus:border-gold/50"
                    />
                </div>
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="bg-card-bg border border-border rounded-xl px-3 py-2 text-sm text-text-muted capitalize">
                    {TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t.replace('_', ' ')}</option>)}
                </select>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="bg-card-bg border border-border rounded-xl px-3 py-2 text-sm text-text-muted capitalize">
                    {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
                </select>
            </div>

            {/* Feedback List */}
            {loading ? (
                <div className="text-text-muted p-8 text-center">Loading...</div>
            ) : (data.feedback || []).length === 0 ? (
                <div className="bg-card-bg border border-border rounded-xl p-12 text-center">
                    <MessageSquare className="h-10 w-10 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-text-muted">No enquiries found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {(data.feedback || []).map((fb: any) => (
                        <div key={fb.feedback_id} className="bg-card-bg border border-border rounded-xl p-5 hover:border-gold/20 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gold/10 text-gold">{fb.type?.replace('_', ' ')}</span>
                                        <select
                                            value={fb.status}
                                            onChange={(e) => handleStatus(fb.feedback_id, e.target.value)}
                                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[fb.status] || STATUS_COLORS.new}`}
                                        >
                                            {STATUSES.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        {fb.rating > 0 && (
                                            <span className="flex items-center gap-0.5 text-xs text-gold">
                                                <Star className="h-3 w-3 fill-current" /> {fb.rating}/5
                                            </span>
                                        )}
                                    </div>
                                    {fb.subject && <p className="text-sm font-semibold text-text mb-1">{fb.subject}</p>}
                                    <p className="text-sm text-text-muted">{fb.message}</p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                                        {fb.name && <span>{fb.name}</span>}
                                        {fb.email && <span>{fb.email}</span>}
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(fb.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-text-muted text-right">{data.total} enquiry item{data.total !== 1 ? 's' : ''}</p>
        </div>
    );
}
