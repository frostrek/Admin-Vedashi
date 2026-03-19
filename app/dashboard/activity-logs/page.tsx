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
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-10 min-h-screen animate-fadeIn">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-fadeInUp">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${isDark ? 'bg-primary/20 border-border' : 'bg-gold/10 border-gold/20'} border shadow-lg`}>
                            <Activity className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-gold' : 'text-emerald-950'}`}>Interaction Chronicles</h1>
                    </div>
                    <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-text-muted' : 'text-emerald-900/40'} ml-1`}>
                        An irreversible audit trail of administrative vibrations and system evolutions.
                    </p>
                </div>
                <button
                    onClick={() => fetchLogs(pagination.page.toString())}
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase px-6 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Recalibrate Chronicles
                </button>
            </div>

            {/* Filters */}
            <form onSubmit={handleFilterSubmit} className={`grid grid-cols-1 sm:grid-cols-4 gap-4 p-6 ${isDark ? 'bg-card-bg border-border-subtle' : 'bg-white/80 border-gold/15 shadow-sm'} rounded-2xl border`}>
                <div className="relative">
                    <label className={`text-[10px] font-black uppercase ${isDark ? 'text-gold' : 'text-emerald-900'} mb-2 block ml-1`}>Actor Email</label>
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
                    <label className={`text-[10px] font-black uppercase ${isDark ? 'text-gold' : 'text-emerald-900'} mb-2 block ml-1`}>Entity Type</label>
                    <div className="relative">
                        <Filter className={`absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? 'text-gold/40' : 'text-emerald-900/40'}`} />
                        <input
                            type="text"
                            placeholder="e.g., product, order"
                            value={filterEntity}
                            onChange={(e) => setFilterEntity(e.target.value)}
                            className={`${inputCls} !pl-10 !py-3`}
                        />
                    </div>
                </div>

                <div className="relative">
                    <label className={`text-[10px] font-black uppercase ${isDark ? 'text-gold' : 'text-emerald-900'} mb-2 block ml-1`}>Action</label>
                    <div className="relative">
                        <Filter className={`absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${isDark ? 'text-gold/40' : 'text-emerald-900/40'}`} />
                        <input
                            type="text"
                            placeholder="e.g., created, updated"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className={`${inputCls} !pl-10 !py-3`}
                        />
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <button type="submit" className="flex-1 bg-gold/10 text-gold border border-gold/30 hover:bg-gold hover:text-black py-2.5 rounded-xl font-bold uppercase transition-all flex justify-center items-center gap-2 text-[10px] shadow-sm active:scale-95">
                        <Search className="w-4 h-4" /> Filter
                    </button>
                    <button 
                        type="button" 
                        onClick={handleClearFilters}
                        className={`p-2.5 rounded-xl border ${isDark ? 'border-border text-text-muted hover:text-gold' : 'border-gold/20 text-emerald-900/60 hover:text-gold'} transition-all`}
                        title="Clear Filters"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </form>

            <div className={`${isDark ? 'bg-card-bg border-border-subtle' : 'bg-white/95 border-gold/15 shadow-xl shadow-gold/5'} rounded-2xl border overflow-hidden`}>
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full whitespace-nowrap">
                        <thead>
                            <tr className={`border-b ${isDark ? 'border-border/50 bg-sidebar-bg' : 'border-gold/10 bg-emerald-50/40'}`}>
                                <th className={`px-5 py-4 text-left text-[10px] font-black ${isDark ? 'text-text-muted' : 'text-emerald-900/60'} uppercase`}>Time</th>
                                <th className={`px-5 py-4 text-left text-[10px] font-black ${isDark ? 'text-text-muted' : 'text-emerald-900/60'} uppercase`}>Actor</th>
                                <th className={`px-5 py-4 text-left text-[10px] font-black ${isDark ? 'text-text-muted' : 'text-emerald-900/60'} uppercase`}>Action</th>
                                <th className={`px-5 py-4 text-left text-[10px] font-black ${isDark ? 'text-text-muted' : 'text-emerald-900/60'} uppercase`}>Entity Type</th>
                                <th className={`px-5 py-4 text-left text-[10px] font-black ${isDark ? 'text-text-muted' : 'text-emerald-900/60'} uppercase`}>Entity ID</th>
                                <th className={`px-5 py-4 text-left text-[10px] font-black ${isDark ? 'text-text-muted' : 'text-emerald-900/60'} uppercase`}>Metadata</th>
                                <th className={`px-5 py-4 text-right text-[10px] font-black ${isDark ? 'text-text-muted' : 'text-emerald-900/60'} uppercase`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-border/30' : 'divide-gold/5'} relative`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="h-48 text-center text-text-muted italic text-xs animate-pulse">Synchronizing Chronicles...</td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={7} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center p-8 text-danger/60">
                                            <ShieldAlert className="w-12 h-12 mb-4" />
                                            <p className={`text-[10px] font-black uppercase`}>{error}</p>
                                            <button 
                                                onClick={() => fetchLogs('1')}
                                                className="mt-4 text-[10px] font-bold uppercase text-gold hover:underline"
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
                                            <p className={`text-[10px] font-black uppercase ${isDark ? 'text-text-muted' : 'text-emerald-900'}`}>No traces found in this timeline</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr 
                                        key={log.id} 
                                        onClick={() => setActiveLog(log)}
                                        className={`group hover:bg-gold/[0.03] transition-all duration-300 cursor-pointer border-l-2 border-transparent hover:border-gold`}
                                    >
                                        <td className={`px-5 py-4 text-xs font-medium ${isDark ? 'text-text-muted' : 'text-emerald-900/70'}`}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className={`text-sm font-bold ${isDark ? 'text-text' : 'text-emerald-950'} group-hover:text-gold transition-colors`}>{log.actor_email || 'System'}</div>
                                            <div className="text-[10px] text-text-muted opacity-60 font-mono">IP: {log.ip_address || 'N/A'}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full ${isDark ? 'bg-gold/10 text-gold border-gold/20' : 'bg-emerald-900/5 text-emerald-900 border-emerald-900/10'} border shadow-sm`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className={`px-5 py-4 text-xs font-bold uppercase ${isDark ? 'text-text' : 'text-emerald-950/80'}`}>
                                            {log.entity_type || '-'}
                                        </td>
                                        <td className="px-5 py-4 text-[11px] font-mono text-text-muted/60">
                                            {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                                        </td>
                                        <td className="px-5 py-4 text-[11px] text-text-muted/60 max-w-[200px] truncate italic" title={log.metadata ? JSON.parse(typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : ''}>
                                            {log.metadata ? (typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata)) : '-'}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => setActiveLog(log)}
                                                className={`p-2.5 rounded-xl transition-all ${isDark ? 'text-text-muted hover:text-gold hover:bg-gold/10' : 'text-emerald-900/40 hover:text-gold hover:bg-gold/5'}`}
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
                    <div className={`px-5 py-5 border-t ${isDark ? 'border-border-subtle bg-sidebar-bg' : 'border-gold/10 bg-emerald-50/30'} flex items-center justify-between`}>
                        <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-text-muted' : 'text-emerald-900/50'}`}>
                            Showing <span className={`text-gold font-black`}>{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                            <span className={`text-gold font-black`}>
                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span>{' '}
                            of <span className={`text-gold font-black`}>{pagination.total}</span> vibrations
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => fetchLogs((pagination.page - 1).toString())}
                                disabled={pagination.page <= 1 || loading}
                                className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-card-bg border-border text-text-muted hover:text-gold' : 'bg-white border-gold/20 text-emerald-900 hover:bg-emerald-50'} disabled:opacity-20 shadow-sm`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => fetchLogs((pagination.page + 1).toString())}
                                disabled={pagination.page >= pagination.totalPages || loading}
                                className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-card-bg border-border text-text-muted hover:text-gold' : 'bg-white border-gold/20 text-emerald-900 hover:bg-emerald-50'} disabled:opacity-20 shadow-sm`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
                    {/* Log Detail Modal - Moved outside to escape stacking context trap */}
            {activeLog && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fadeIn">
                    <div className={`w-full max-w-2xl rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-zoomIn border ${isDark ? 'bg-[#0A0D0A] border-gold/20' : 'bg-white/95 border-gold/10'}`}>
                        <div className={`flex items-center justify-between p-8 border-b ${isDark ? 'border-gold/10 bg-white/5' : 'border-gold/5 bg-gold/5'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${isDark ? 'bg-gold/20 text-gold' : 'bg-gold/10 text-emerald-900'} shadow-inner`}>
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-gold' : 'text-emerald-950'}`}>Chronicle Entry</h4>
                                    <p className={`text-[10px] uppercase font-black ${isDark ? 'text-gold/50' : 'text-emerald-900/40'}`}>Detail Analysis</p>
                                </div>
                            </div>
                            <button onClick={() => {
                                setActiveLog(null);
                                router.push('/dashboard/activity-logs');
                            }} className={`p-2 ${isDark ? 'text-text-muted hover:text-danger hover:bg-danger/10' : 'text-emerald-900/40 hover:text-danger hover:bg-danger/5'} rounded-full transition-all duration-300`}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 max-h-[70vh] overflow-y-auto space-y-10 scrollbar-thin scrollbar-thumb-gold/20">
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-1">
                                    <label className={`text-[10px] uppercase font-black ${isDark ? 'text-gold/60' : 'text-emerald-900/60'} mb-2 block`}>Origin Actor</label>
                                    <div className={`text-lg font-bold ${isDark ? 'text-text' : 'text-emerald-950'}`}>{activeLog.actor_email || 'System Operation'}</div>
                                    <div className={`text-[11px] ${isDark ? 'text-text-muted/60' : 'text-emerald-900/40'} mt-1 font-mono uppercase mt-1 italic`}>Vibration Source: {activeLog.ip_address || 'LOCALHOST'}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-[10px] uppercase font-black ${isDark ? 'text-gold/60' : 'text-emerald-900/60'} mb-2 block`}>Recorded At</label>
                                    <div className={`text-lg font-bold ${isDark ? 'text-text' : 'text-emerald-950'}`}>{new Date(activeLog.created_at).toLocaleString()}</div>
                                    <div className={`text-[11px] ${isDark ? 'text-text-muted/60' : 'text-emerald-900/50'} mt-2 p-2 ${isDark ? 'bg-gold/5 border-gold/10' : 'bg-emerald-50/50 border-gold/5'} rounded-lg border text-center uppercase font-bold`}>
                                        Vedic Timestamp: {activeLog.created_at.split('T')[0]}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className={`text-[10px] uppercase font-black ${isDark ? 'text-gold/60' : 'text-emerald-900/60'} block underline decoration-gold/20 underline-offset-8`}>Manifested Action</label>
                                <span className={`inline-block px-8 py-3 text-xs font-black uppercase rounded-full border shadow-xl ${isDark ? 'bg-gold/10 text-gold border-gold/30' : 'bg-emerald-900/5 text-emerald-900 border-emerald-900/20'}`}>
                                    {activeLog.action}
                                </span>
                            </div>

                            <div className={`p-8 border rounded-[2rem] space-y-4 shadow-inner ${isDark ? 'bg-white/[0.02] border-gold/15' : 'bg-emerald-50/30 border-gold/10'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <label className={`text-[10px] uppercase font-black ${isDark ? 'text-gold/60' : 'text-emerald-900/60'} mb-3 block`}>Entity Association</label>
                                        <div className="flex flex-col gap-2">
                                            <span className={`text-3xl italic ${isDark ? 'text-gold' : 'text-emerald-900'}`}>{activeLog.entity_type || 'General System'}</span>
                                            <span className={`font-mono text-xs break-all p-2 rounded-lg ${isDark ? 'text-text-muted/70 bg-black/5' : 'text-emerald-900/60 bg-white shadow-sm'}`}>
                                                {activeLog.entity_id || 'NO_ENTITY_ID'}
                                            </span>
                                        </div>
                                    </div>
                                    {activeLog.entity_id && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(activeLog.entity_id);
                                                    toast.success('Signature ID copied to ether');
                                                }}
                                                className={`p-4 rounded-2xl transition-all border shadow-lg ${isDark ? 'bg-gold/5 text-gold border-gold/20 hover:bg-gold/20' : 'bg-white text-emerald-900 border-gold/20 hover:bg-emerald-50'}`}
                                                title="Copy ID"
                                            >
                                                <Copy className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const path = 
                                                        activeLog.entity_type === 'customer' ? `/dashboard/customers/${activeLog.entity_id}` :
                                                        activeLog.entity_type === 'product' ? `/dashboard/products/edit/${activeLog.entity_id}` :
                                                        activeLog.entity_type === 'order' ? `/dashboard/orders` : 
                                                        null;
                                                    
                                                    if (path) {
                                                        router.push(path);
                                                        setActiveLog(null);
                                                    } else {
                                                        toast.error('No direct portal available for this entity vibration');
                                                    }
                                                }}
                                                className={`p-4 rounded-2xl transition-all border shadow-lg ${isDark ? 'bg-gold/5 text-gold border-gold/20 hover:bg-gold/20' : 'bg-white text-emerald-900 border-gold/20 hover:bg-emerald-50'}`}
                                                title="Visit Entity"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className={`text-[10px] uppercase font-black ${isDark ? 'text-gold/60' : 'text-emerald-900/60'} block`}>Evolutionary Metadata (JSON)</label>
                                    {activeLog.metadata && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(formatMetadata(activeLog.metadata));
                                                toast.success('Scroll copied');
                                            }}
                                            className="text-[10px] font-black uppercase text-gold hover:text-gold-soft transition-colors flex items-center gap-2"
                                        >
                                            <Copy className="w-3.5 h-3.5" /> Copy Scroll
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <pre className={`p-8 rounded-[2rem] border overflow-x-auto text-sm font-mono leading-relaxed max-h-[400px] overflow-y-auto scrollbar-thin shadow-2xl ${isDark ? 'bg-black/60 border-gold/10 text-gold-soft' : 'bg-white border-gold/10 text-emerald-950'}`}>
                                        {formatMetadata(activeLog.metadata)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className={`p-8 border-t flex justify-end gap-4 ${isDark ? 'border-gold/10 bg-white/5' : 'border-gold/5 bg-gold/5'}`}>
                            <button
                                onClick={() => {
                                    setActiveLog(null);
                                    router.push('/dashboard/activity-logs');
                                }}
                                className={`px-12 py-4 rounded-2xl font-black uppercase text-[11px] transition-all duration-300 shadow-xl ${isDark ? 'bg-gold text-primary hover:bg-gold-soft' : 'bg-emerald-950 text-gold hover:bg-emerald-900'} hover:scale-105 active:scale-95`}
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
