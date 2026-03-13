'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Activity, ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, Search, FileText, Eye, X, Copy } from 'lucide-react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';

interface ActivityLog {
    id: string;
    actor_type: string;
    actor_id: string;
    actor_email: string;
    action: string;
    entity_type: string;
    entity_id: string;
    ip_address: string;
    metadata: string | null;
    created_at: string;
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function ActivityLogsPage() {
    const { user } = useAdminAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeLog, setActiveLog] = useState<ActivityLog | null>(null);

    const formatMetadata = (metadata: any) => {
        if (!metadata) return '-';
        try {
            const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return String(metadata);
        }
    };

    // Filters
    const [filterEmail, setFilterEmail] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [filterAction, setFilterAction] = useState('');

    // Pagination
    const [pagination, setPagination] = useState<PaginationMeta>({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
    });

    const isAuthorized = user?.role === 'owner' || user?.role === 'admin';

    const fetchLogs = useCallback(async (pageStr = '1') => {
        const token = getToken();
        if (!token) return;
        setLoading(true);

        const params = new URLSearchParams({
            page: pageStr,
            limit: pagination.limit.toString(),
            ...(filterEmail && { actor_email: filterEmail }),
            ...(filterEntity && { entity_type: filterEntity }),
            ...(filterAction && { action: filterAction }),
        });

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API_URL}/api/admin/activity-logs?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch activity logs');
            const data = await res.json();

            setLogs(data.data.logs);
            setPagination(data.data.pagination);
        } catch (err: any) {
            toast.error(err.message || 'Could not load activity logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, filterEmail, filterEntity, filterAction]);

    useEffect(() => {
        if (activeLog) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [activeLog]);

    useEffect(() => {
        if (isAuthorized) {
            fetchLogs('1');
        } else {
            setLoading(false);
        }
    }, [isAuthorized, fetchLogs]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs('1');
    };

    if (!isAuthorized && !loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-card-bg/50 rounded-2xl border border-danger/20">
                <ShieldAlert className="w-12 h-12 text-danger mb-4" />
                <h2 className="text-xl font-bold text-text mb-2">Access Denied</h2>
                <p className="text-text-muted">You must be an Owner or Admin to view activity logs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 min-h-screen animate-fadeIn">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-fadeInUp">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-border shadow-lg">
                            <Activity className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-gold tracking-tighter">Interaction Chronicles</h1>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                        An irreversible audit trail of administrative vibrations and system evolutions.
                    </p>
                </div>
                <button
                    onClick={() => fetchLogs(pagination.page.toString())}
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Recalibrate Chronicles
                </button>
            </div>

            {/* Filters */}
            <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-card-bg rounded-xl border border-border-subtle">
                <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 block">Actor Email</label>
                    <input
                        type="email"
                        placeholder="Search email..."
                        value={filterEmail}
                        onChange={(e) => setFilterEmail(e.target.value)}
                        className="w-full bg-sidebar-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-gold outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 block">Entity Type</label>
                    <input
                        type="text"
                        placeholder="e.g., product, order"
                        value={filterEntity}
                        onChange={(e) => setFilterEntity(e.target.value)}
                        className="w-full bg-sidebar-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-gold outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 block">Action</label>
                    <input
                        type="text"
                        placeholder="e.g., updated_order_status"
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="w-full bg-sidebar-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-gold outline-none"
                    />
                </div>
                <div className="flex items-end">
                    <button type="submit" className="w-full bg-gold/10 text-gold border border-gold/30 hover:bg-gold hover:text-black py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2 text-sm">
                        <Search className="w-4 h-4" /> Filter
                    </button>
                </div>
            </form>

            <div className="bg-card-bg rounded-xl border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border/50 bg-sidebar-bg">
                                <th className="px-5 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Time</th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Actor</th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Action</th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Entity Type</th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Entity ID</th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Metadata</th>
                                <th className="px-5 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 relative">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="h-48 text-center text-text-muted">Loading logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-48 text-center bg-card-bg">
                                        <div className="flex flex-col items-center justify-center p-8">
                                            <FileText className="w-12 h-12 text-border mb-4" />
                                            <p className="text-text-muted text-sm">No activity logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gold/[0.02] transition-colors">
                                        <td className="px-5 py-3 text-sm text-text-muted">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-sm font-medium text-text">{log.actor_email || 'System'}</div>
                                            <div className="text-xs text-text-muted opacity-60">IP: {log.ip_address || 'N/A'}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="px-2 py-1 text-[11px] font-medium tracking-wide uppercase rounded-md bg-gold/10 text-gold border border-gold/20">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-text">
                                            {log.entity_type || '-'}
                                        </td>
                                        <td className="px-5 py-3 text-sm font-mono text-text-muted">
                                            {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                                        </td>
                                        <td className="px-5 py-3 text-xs text-text-muted max-w-[200px] truncate overflow-hidden" title={log.metadata ? JSON.stringify(log.metadata) : ''}>
                                            {log.metadata ? (typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : '-'}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => setActiveLog(log)}
                                                className="p-2 text-text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Log Detail Modal */}
                {activeLog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#0c0d0a] border border-gold/20 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-zoomIn">
                            <div className="flex items-center justify-between p-6 border-b border-gold/10 bg-sidebar-bg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gold/10 text-gold">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold text-text font-serif tracking-tight">Chronicle Entry Details</h2>
                                </div>
                                <button onClick={() => setActiveLog(null)} className="p-2 text-text-muted hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-gold/20">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted mb-2 block">Origin Actor</label>
                                        <div className="text-text font-medium">{activeLog.actor_email || 'System Operation'}</div>
                                        <div className="text-[10px] text-text-muted/60 mt-1 font-mono uppercase tracking-tight">ID: {activeLog.actor_id}</div>
                                        <div className="text-[10px] text-text-muted/60 font-mono uppercase tracking-tight">IP: {activeLog.ip_address || 'LOCALHOST'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted mb-2 block">Recorded At</label>
                                        <div className="text-text font-medium">{new Date(activeLog.created_at).toLocaleString()}</div>
                                        <div className="text-[10px] text-text-muted/60 mt-1 uppercase tracking-tight">{activeLog.created_at}</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted block">Manifested Action</label>
                                    <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-[0.1em] uppercase rounded-full bg-gold/10 text-gold border border-gold/20">
                                        {activeLog.action}
                                    </span>
                                </div>

                                <div className="p-5 bg-sidebar-bg border border-gold/10 rounded-2xl space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted mb-2 block">Entity Association</label>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-gold text-lg font-serif italic">{activeLog.entity_type || 'General System'}</span>
                                                <span className="text-text-muted/80 font-mono text-sm tracking-tight break-all">
                                                    {activeLog.entity_id || 'NO_ENTITY_ID'}
                                                </span>
                                            </div>
                                        </div>
                                        {activeLog.entity_id && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(activeLog.entity_id);
                                                    toast.success('Entity ID copied');
                                                }}
                                                className="p-3 bg-gold/5 text-gold hover:bg-gold/20 rounded-xl transition-all border border-gold/10"
                                                title="Copy Full ID"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted block">Evolutionary Metadata (JSON)</label>
                                    <div className="relative group">
                                        <pre className="p-6 bg-black/40 rounded-2xl border border-gold/10 overflow-x-auto text-[13px] text-gold/90 font-mono leading-relaxed max-h-[300px] overflow-y-auto">
                                            {formatMetadata(activeLog.metadata)}
                                        </pre>
                                        {activeLog.metadata && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(formatMetadata(activeLog.metadata));
                                                    toast.success('Metadata copied');
                                                }}
                                                className="absolute top-4 right-4 p-2 bg-gold/10 text-gold opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                                title="Copy JSON"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-sidebar-bg border-t border-gold/10 flex justify-end">
                                <button
                                    onClick={() => setActiveLog(null)}
                                    className="px-8 py-3 bg-gold/5 hover:bg-gold hover:text-black border border-gold/20 text-gold rounded-xl font-bold uppercase text-[10px] tracking-[0.3em] transition-all"
                                >
                                    Dismiss Chronicles
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {logs.length > 0 && (
                    <div className="px-5 py-4 border-t border-border-subtle bg-sidebar-bg flex items-center justify-between">
                        <p className="text-sm text-text-muted">
                            Showing <span className="font-medium text-text">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                            <span className="font-medium text-text">
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{' '}
                            of <span className="font-medium text-text">{pagination.total}</span> logs
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchLogs((pagination.page - 1).toString())}
                                disabled={pagination.page <= 1 || loading}
                                className="p-1 rounded bg-card-bg border border-border text-text-muted hover:text-gold disabled:opacity-30 disabled:hover:text-text-muted"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => fetchLogs((pagination.page + 1).toString())}
                                disabled={pagination.page >= pagination.totalPages || loading}
                                className="p-1 rounded bg-card-bg border border-border text-text-muted hover:text-gold disabled:opacity-30 disabled:hover:text-text-muted"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
