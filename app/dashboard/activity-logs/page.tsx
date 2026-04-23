'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
    Activity,
    ShieldAlert,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Search,
    FileText,
    Eye,
    X,
    Copy,
    ExternalLink,
    Filter,
    Calendar,
    Clock,
    User,
    Shield,
    AlertCircle,
    Info,
    FileSearch,
    Database,
    Download,
    Trash2
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { getActivityLogs, type ActivityLog } from '@/lib/api';
import toast from 'react-hot-toast';

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

function ActivityLogsPageContent() {
    const { user } = useAdminAuth();
    const router = useRouter();
    const { isDark } = useTheme();
    const searchParams = useSearchParams();
    const logIdFromUrl = searchParams.get('log_id');
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeLog, setActiveLog] = useState<ActivityLog | null>(null);
    const [error, setError] = useState<string | null>(null);

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
    const inputCls = `w-full ${isDark ? 'bg-sidebar-bg border-border text-gold-soft' : 'bg-white border-gold/20 text-emerald-950'} border rounded-xl px-4 py-2 text-sm outline-none focus:border-gold transition-all shadow-inner`;

    // Stable fetch function that takes explicit values to avoid dependency on typing state
    const fetchLogs = useCallback(async (
        pageStr = '1',
        email = filterEmail,
        entity = filterEntity,
        action = filterAction
    ) => {
        setLoading(true);
        setError(null);

        try {
            const filterParams: Record<string, string> = {
                page: pageStr,
                limit: pagination.limit.toString(),
            };

            if (email) filterParams.actor_email = email;
            if (entity) filterParams.entity_type = entity;
            if (action) filterParams.action = action;

            const res = await getActivityLogs(filterParams);

            if (res && res.logs) {
                setLogs(res.logs);
                setPagination(res.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
            } else {
                setLogs([]);
                setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
            }
        } catch (err: any) {
            const msg = err.message || 'Could not load activity logs';
            setError(msg);
            toast.error(msg);
            console.error('[ActivityLogs] fetch error:', err);
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

    // Initial load only
    useEffect(() => {
        if (isAuthorized) {
            // We use a timeout to ensure state is settled or just call it once
            fetchLogs('1');
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthorized]); // ONLY run when authorization changes (initial load)

    // Handle deep link to specific log
    useEffect(() => {
        if (logIdFromUrl && logs.length > 0) {
            const logToActivate = logs.find(l => l.id === logIdFromUrl);
            if (logToActivate) {
                setActiveLog(logToActivate);
            }
        }
    }, [logIdFromUrl, logs]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLogs('1');
    };

    const handleClearFilters = () => {
        setFilterEmail('');
        setFilterEntity('');
        setFilterAction('');
        // Trigger fetch with empty values immediately
        fetchLogs('1', '', '', '');
    };

    if (!isAuthorized && !loading) {
        return (
            <div className={`flex flex-col items-center justify-center p-12 rounded-2xl border ${isDark ? 'bg-card-bg/50 border-danger/20' : 'bg-white border-danger/10 shadow-xl shadow-danger/5'}`}>
                <ShieldAlert className="w-12 h-12 text-danger mb-4" />
                <h4 className={`text-xl font-bold ${isDark ? 'text-text' : 'text-emerald-950'} mb-2`}>Access Denied</h4>
                <p className={`${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>You must be an Owner or Admin to view activity logs.</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6 animate-fadeIn">
                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fadeInUp">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className={`text-2xl font-bold ${isDark ? 'text-gold' : 'text-black'}`}>Interaction Chronicles</h1>
                        </div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-gold-soft/60' : 'text-black/80'} ml-1`}>
                            An irreversible audit trail of administrative vibrations and system evolutions.
                        </p>
                    </div>
                    <button
                        onClick={() => fetchLogs(pagination.page.toString())}
                        disabled={loading}
                        className="flex items-center gap-2 bg-primary border border-border/20 text-[#E8D8B9] text-[10px] font-bold uppercase px-4 py-2 rounded-lg hover:bg-primary-light transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Recalibrate Chronicles
                    </button>
                </div>

                {/* Filters */}
                <form onSubmit={handleFilterSubmit} className={`grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 ${isDark ? 'bg-card-bg border-border-subtle' : 'bg-white/80 border-border'} rounded-xl border`}>
                    <div className="relative">
                        <label className={`text-[10px] font-black uppercase ${isDark ? 'text-gold' : 'text-black'} mb-1 block ml-1`}>Actor Email</label>
                        <div className="relative">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? 'text-gold/40' : 'text-emerald-900/40'}`} />
                            <input
                                type="text"
                                placeholder="Search email..."
                                value={filterEmail}
                                onChange={(e) => setFilterEmail(e.target.value)}
                                className={`${inputCls} !pl-10 !py-3`}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className={`text-[10px] font-black uppercase ${isDark ? 'text-gold' : 'text-black'} mb-1 block ml-1`}>Entity Type</label>
                        <div className="relative">
                            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? 'text-gold/40' : 'text-emerald-900/40'}`} />
                            <input
                                type="text"
                                placeholder="e.g., product, order"
                                value={filterEntity}
                                onChange={(e) => setFilterEntity(e.target.value)}
                                className={`${inputCls} !pl-9 !py-2.5 !text-xs`}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className={`text-[10px] font-black uppercase ${isDark ? 'text-gold' : 'text-black'} mb-1 block ml-1`}>Action</label>
                        <div className="relative">
                            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? 'text-gold/40' : 'text-emerald-900/40'}`} />
                            <input
                                type="text"
                                placeholder="e.g., created, updated"
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className={`${inputCls} !pl-9 !py-2.5 !text-xs`}
                            />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <button type="submit" className="flex-1 bg-primary text-[#E8D8B9] border border-border/20 hover:bg-primary-light py-2 rounded-lg font-bold uppercase transition-all flex justify-center items-center gap-2 text-[10px] active:scale-95">
                            <Search className="w-3.5 h-3.5" /> Filter
                        </button>
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className={`p-2 rounded-lg border ${isDark ? 'border-border text-text-muted hover:text-gold' : 'border-gold/20 text-black/60 hover:text-gold'} transition-all`}
                            title="Clear Filters"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </form>

                <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                    <div className="overflow-x-auto min-h-[350px]">
                        <table className="w-full whitespace-nowrap text-left">
                            <thead>
                                <tr className="border-b border-border bg-page-bg">
                                    <th className="px-4 py-3.5 text-sm font-semibold text-gold-muted uppercase">Time</th>
                                    <th className="px-4 py-3.5 text-sm font-semibold text-gold-muted uppercase">Actor</th>
                                    <th className="px-4 py-3.5 text-sm font-semibold text-gold-muted uppercase">Action</th>
                                    <th className="px-4 py-3.5 text-sm font-semibold text-gold-muted uppercase">Entity Type</th>
                                    <th className="px-4 py-3.5 text-sm font-semibold text-gold-muted uppercase">Entity ID</th>
                                    <th className="px-4 py-3.5 text-sm font-semibold text-gold-muted uppercase">Metadata</th>
                                    <th className="px-4 py-3.5 text-right text-sm font-semibold text-gold-muted uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle relative">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="h-48 text-center text-text-muted italic text-xs animate-pulse">Synchronizing Chronicles...</td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={7} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center p-8 text-danger/60">
                                                <ShieldAlert className="w-12 h-12 mb-4" />
                                                <p className={`text-[12px] font-black uppercase`}>{error}</p>
                                                <button
                                                    onClick={() => fetchLogs('1')}
                                                    className="mt-4 text-[12px] font-bold uppercase text-gold hover:underline"
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center p-8 opacity-40">
                                                <FileText className="w-12 h-12 text-gold mb-4" />
                                                <p className={`text-[12px] font-black uppercase ${isDark ? 'text-text-muted' : 'text-emerald-900'}`}>No traces found in this timeline</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr
                                            key={log.id}
                                            onClick={() => setActiveLog(log)}
                                            className="group hover:bg-gold/[0.03] transition-all duration-300 cursor-pointer"
                                        >
                                            <td className={`px-4 py-3.5 text-xs font-semibold ${isDark ? 'text-text-muted' : 'text-black/70'}`}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-primary/10 border border-primary/5 flex items-center justify-center text-primary/60">
                                                        {log.actor_email ? <User className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold ${isDark ? 'text-text' : 'text-black'} group-hover:text-primary transition-colors`}>{log.actor_email || 'System'}</div>
                                                        <div className="text-[10px] text-text-muted opacity-60 font-mono">IP: {log.ip_address || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-block rounded-full bg-gold/10 px-2.5 py-0.5 text-[10px] font-medium text-gold-muted border border-gold/5">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-[11px] font-bold uppercase text-black/70">
                                                {log.entity_type || '-'}
                                            </td>
                                            <td className={`px-4 py-3.5 text-[11px] font-mono ${isDark ? 'text-text-muted/50' : 'text-black/40'}`}>
                                                {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                                            </td>
                                            <td className={`px-4 py-3.5 text-[11px] max-w-[150px] truncate ${isDark ? 'text-text-muted/40' : 'text-black/30'}`} title={log.metadata ? JSON.parse(typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : ''}>
                                                {log.metadata ? (typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : '-'}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    onClick={() => setActiveLog(log)}
                                                    className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
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

                    {logs.length > 0 && (
                        <div className={`px-4 py-3 border-t ${isDark ? 'border-border-subtle bg-sidebar-bg' : 'border-border/10 bg-page-bg'} flex items-center justify-between`}>
                            <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-text-muted' : 'text-black/50'}`}>
                                Showing <span className={`text-gold font-black`}>{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                <span className={`text-gold font-black`}>
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span>{' '}
                                of <span className={`text-gold font-black`}>{pagination.total}</span> vibrations
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchLogs((pagination.page - 1).toString())}
                                    disabled={pagination.page <= 1 || loading}
                                    className={`p-1.5 rounded-lg border transition-all ${isDark ? 'bg-card-bg border-border text-text-muted hover:text-gold' : 'bg-white border-gold/20 text-black hover:bg-emerald-50'} disabled:opacity-20 shadow-sm`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => fetchLogs((pagination.page + 1).toString())}
                                    disabled={pagination.page >= pagination.totalPages || loading}
                                    className={`p-1.5 rounded-lg border transition-all ${isDark ? 'bg-card-bg border-border text-text-muted hover:text-gold' : 'bg-white border-gold/20 text-black hover:bg-emerald-50'} disabled:opacity-20 shadow-sm`}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Log Detail Modal - Moved outside to escape stacking context trap */}
            {activeLog && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
                        onClick={() => setActiveLog(null)}
                    />

                    {/* Modal Card */}
                    <div className={`relative z-10 w-full max-w-lg rounded-2xl border border-border ${isDark ? 'bg-card-bg shadow-2xl' : 'bg-white shadow-xl'} p-6 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]`}>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <h4 className={`font-serif text-xl font-bold ${isDark ? 'text-primary' : 'text-text-primary'}`}>
                                    Chronicle Entry
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-text-muted">
                                    <Activity className="h-3 w-3" />
                                    <span>Administrative Vibration Sync</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveLog(null)}
                                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-page-bg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-5 scrollbar-thin">
                            {/* Actor & Time Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Origin Actor</label>
                                    <div className={`w-full rounded-lg border border-border px-4 py-2.5 text-sm ${isDark ? 'bg-black/20' : 'bg-white'} font-bold`}>
                                        {activeLog.actor_email || 'System Operation'}
                                    </div>
                                    <p className="mt-1 text-[11px] text-text-muted font-mono uppercase italic">Source: {activeLog.ip_address || 'LOCALHOST'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Recorded At</label>
                                    <div className={`w-full rounded-lg border border-border px-4 py-2.5 text-sm ${isDark ? 'bg-black/20' : 'bg-white'} font-bold`}>
                                        {new Date(activeLog.created_at).toLocaleString()}
                                    </div>
                                    <p className="mt-1 text-[11px] text-text-muted font-mono uppercase italic">ID: {activeLog.id.substring(0, 8)}</p>
                                </div>
                            </div>

                            {/* Action Highlight */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">Manifested Action</label>
                                <div className={`w-full rounded-lg border border-border px-4 py-2.5 text-sm ${isDark ? 'bg-primary/5 text-primary' : 'bg-primary/5 text-primary'} font-black uppercase tracking-wider`}>
                                    {activeLog.action}
                                </div>
                            </div>

                            {/* Entity Details */}
                            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-black/20 border-border/40' : 'bg-page-bg/50 border-border/10'} space-y-4`}>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-text-muted uppercase tracking-widest">Entity Association</label>
                                        <div className={`text-xl font-serif italic ${isDark ? 'text-primary' : 'text-primary'}`}>{activeLog.entity_type || 'General System'}</div>
                                    </div>
                                    {activeLog.entity_id && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(activeLog.entity_id);
                                                    toast.success('Signature ID copied');
                                                }}
                                                className="p-2 rounded-lg border border-border bg-white text-text-muted hover:text-primary transition-colors shadow-sm"
                                                title="Copy ID"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const path =
                                                        activeLog.entity_type === 'customer' ? `/dashboard/customers/${activeLog.entity_id}` :
                                                            activeLog.entity_type === 'product' ? `/dashboard/products/edit/${activeLog.entity_id}` :
                                                                activeLog.entity_type === 'order' ? `/dashboard/orders` :
                                                                    null;

                                                    if (path) {
                                                        router.push(path);
                                                        setActiveLog(null);
                                                    } else {
                                                        toast.error('No direct portal available');
                                                    }
                                                }}
                                                className="p-2 rounded-lg border border-border bg-white text-text-muted hover:text-primary transition-colors shadow-sm"
                                                title="Visit Entity"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-widest">Signature ID</label>
                                    <div className={`font-mono text-[11px] p-2.5 rounded-xl border ${isDark ? 'bg-black/40 text-text-muted border-border/20' : 'bg-white text-black/60 border-border/20'} break-all`}>
                                        {activeLog.entity_id || 'NO_ENTITY_ID'}
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-text-primary">Evolutionary Metadata (JSON)</label>
                                    {activeLog.metadata && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(formatMetadata(activeLog.metadata));
                                                toast.success('Scroll copied');
                                            }}
                                            className="text-[10px] font-bold uppercase text-primary hover:underline"
                                        >
                                            Copy Scroll
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <pre className={`p-4 rounded-xl border overflow-x-auto text-xs font-mono leading-relaxed ${isDark ? 'bg-black/60 border-border/20 text-text-muted' : 'bg-page-bg border-border/10 text-black/60'}`}>
                                        {formatMetadata(activeLog.metadata)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-2 pt-6 mt-2 border-t border-border">
                            <button
                                type="button"
                                onClick={() => setActiveLog(null)}
                                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary hover:bg-page-bg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setActiveLog(null)}
                                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors shadow-sm"
                            >
                                Dismiss Chronicles
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


export default function ActivityLogsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <RefreshCw className="w-8 h-8 text-gold animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase text-gold/40">Synchronizing Chronicles...</p>
            </div>
        }>
            <ActivityLogsPageContent />
        </Suspense>
    );
}
