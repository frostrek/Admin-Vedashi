'use client';

import { useState, useEffect } from 'react';
import { 
    getAdminReviews, 
    getReviewReports, 
    adminReplyToReview, 
    resolveReviewReport, 
    AdminReview, 
    ReviewReport 
} from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    Star, MessageSquare, AlertTriangle, 
    CheckCircle, XCircle, Search, Filter,
    Loader2
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function AdminReviewsPage() {
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<'all' | 'reports'>('all');

    // Reviews State
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    // Reports State
    const [reports, setReports] = useState<ReviewReport[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);

    useEffect(() => {
        if (activeTab === 'all') fetchReviews();
        else fetchReports();
    }, [activeTab]);

    const fetchReviews = async () => {
        setLoadingReviews(true);
        try {
            const data = await getAdminReviews(1, 100);
            setReviews(data);
        } catch (err) {
            toast.error('Failed to resonance reviews');
        } finally {
            setLoadingReviews(false);
        }
    };

    const fetchReports = async () => {
        setLoadingReports(true);
        try {
            const data = await getReviewReports('pending');
            setReports(data);
        } catch (err) {
            toast.error('Failed to resonance reports');
        } finally {
            setLoadingReports(false);
        }
    };

    const handleReplyChange = (reviewId: string, text: string) => {
        setReplyDrafts((prev: Record<string, string>) => ({ ...prev, [reviewId]: text }));
    };

    const handleSubmitReply = async (reviewId: string) => {
        const text = replyDrafts[reviewId];
        if (!text || text.trim() === '') return toast.error('Reply cannot be empty.');

        toast.loading('Submitting reply...', { id: 'reply' });
        const success = await adminReplyToReview(reviewId, text);
        if (success) {
            toast.success('Reply submitted!', { id: 'reply' });
            setReplyingTo(null);
            setReviews(reviews.map((r: AdminReview) => r.review_id === reviewId ? { ...r, admin_reply: text, admin_reply_at: new Date().toISOString() } : r));
        } else {
            toast.error('Failed to submit reply.', { id: 'reply' });
        }
    };

    const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
        toast.loading(`Marking report as ${status}...`, { id: 'resolve' });
        const success = await resolveReviewReport(reportId, status);
        if (success) {
            toast.success(`Report ${status}`, { id: 'resolve' });
            setReports(reports.filter((r: ReviewReport) => r.report_id !== reportId));
        } else {
            toast.error('Failed to update report status', { id: 'resolve' });
        }
    };

    const inputCls = `w-full rounded-2xl border ${isDark ? 'border-white/10 bg-black/80 text-gold-soft' : 'border-gold/40 bg-white shadow-sm'} px-6 py-4 text-sm focus:border-gold focus:outline-none transition-all`;

    return (
        <div className={`p-6 max-w-5xl mx-auto space-y-5 animate-fadeIn min-h-screen ${isDark ? '' : 'bg-white/60 backdrop-blur-xl rounded-[2.5rem] mt-4'}`}>
            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20 border border-gold/20 shadow-md">
                            <Star className="w-5 h-5 text-gold fill-gold/20" />
                        </div>
                        <h1 className={`text-2xl font-serif font-bold tracking-tighter ${isDark ? 'text-text-primary' : 'text-emerald-950'}`}>Reviews Moderation</h1>
                    </div>
                    <p className={`text-[9px] font-bold uppercase tracking-[0.2em] ml-13 ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>
                        Monitor customer feedback and manage product resonance.
                    </p>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-4 border-b border-gold/10 pb-0">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`pb-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'all' ? 'text-gold' : isDark ? 'text-text-muted hover:text-gold/60' : 'text-emerald-900/60 hover:text-emerald-900'}`}
                >
                    All Reviews
                    {activeTab === 'all' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold rounded-full shadow-[0_0_8px_#C5A46D]" />}
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`pb-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'reports' ? 'text-gold' : isDark ? 'text-text-muted hover:text-gold/60' : 'text-emerald-900/60 hover:text-emerald-900'}`}
                >
                    Reported {reports.length > 0 && `(${reports.length})`}
                    {activeTab === 'reports' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold rounded-full shadow-[0_0_8px_#C5A46D]" />}
                </button>
            </div>

            {/* ── Content ── */}
            <div className="space-y-6">
                {activeTab === 'all' && (
                    <div className="grid gap-6">
                        {loadingReviews ? (
                            <div className="py-20 flex flex-col items-center justify-center animate-pulse">
                                <Search className="w-12 h-12 text-gold/30 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Synchronizing Resonance...</p>
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className={`py-20 flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gold/40 bg-primary/5'}`}>
                                <MessageSquare className="w-12 h-12 text-gold/30 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">No reviews found in the chronicle.</p>
                            </div>
                        ) : (
                            reviews.map((review: AdminReview) => (
                                <div key={review.review_id} className={`${isDark ? 'bg-primary/20 border-primary/20' : 'bg-white border-primary/20 shadow-[0_2px_15px_rgba(0,0,0,0.03)]'} border rounded-2xl p-4 md:p-5 transition-all hover:shadow-[0_4px_20px_rgba(59,93,59,0.05)] group overflow-hidden relative flex flex-col md:flex-row gap-4`}>
                                    {/* Green vertical accent */}
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                                    
                                    <div className="flex-1 relative z-10">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-2">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-1 opacity-80">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <Star key={i} size={8} className={i < review.rating ? 'text-gold fill-gold' : 'text-gold/20'} />
                                                    ))}
                                                </div>
                                                <h3 className={`text-base font-serif font-bold tracking-tight ${isDark ? 'text-text-primary' : 'text-emerald-950'}`}>
                                                    {review.title}
                                                </h3>
                                                <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-text-muted' : 'text-emerald-900/80'}`}>
                                                    <span className={isDark ? 'text-primary' : 'text-emerald-700'}>{review.reviewer_name}</span>
                                                    <span className="opacity-20">•</span>
                                                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                                                    <span className="opacity-20">•</span>
                                                    <span className={isDark ? 'text-gold' : 'text-primary'}>{review.product_name}</span>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-md border ${isDark ? 'bg-white/5 border-white/10 text-gold-soft/60' : 'bg-primary/10 border-primary/20 text-primary-dark'} text-[7px] font-black uppercase tracking-widest h-fit`}>
                                                {review.helpful_count} Helpful
                                            </div>
                                        </div>

                                        <p className={`text-[11px] leading-relaxed mb-3 italic font-medium ${isDark ? 'text-text-secondary' : 'text-emerald-900'}`}>
                                            "{review.body}"
                                        </p>
                                    </div>

                                    {/* Reply Stratum */}
                                    <div className={`w-full md:w-64 relative z-10 rounded-xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-primary/10 border-primary/20'} p-3 flex flex-col justify-center`}>
                                        {review.admin_reply ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] uppercase ${isDark ? 'text-gold' : 'text-primary'}`}>Administrative Response</span>
                                                    <div className={`h-px flex-1 ${isDark ? 'bg-gold/20' : 'bg-primary/20'}`} />
                                                </div>
                                                <p className={`text-xs font-medium ${isDark ? 'text-text-primary' : 'text-emerald-950'}`}>{review.admin_reply}</p>
                                            </div>
                                        ) : (
                                            replyingTo === review.review_id ? (
                                                <div className="space-y-4">
                                                    <textarea
                                                        rows={3}
                                                        className={`${inputCls} !py-3 !px-4 !rounded-xl !text-xs`}
                                                        placeholder="Administrative resonance..."
                                                        value={replyDrafts[review.review_id] || ''}
                                                        onChange={(e) => handleReplyChange(review.review_id, e.target.value)}
                                                    />
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={() => setReplyingTo(null)}
                                                            className={`px-4 py-2 rounded-lg border ${isDark ? 'border-white/10 text-text-muted' : 'border-gold/10 text-emerald-900'} text-[9px] font-black uppercase tracking-widest hover:bg-gold/10 transition-all`}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSubmitReply(review.review_id)}
                                                            className="px-6 py-2 bg-gold text-primary rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Deliver
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setReplyingTo(review.review_id)}
                                                    className={`w-full py-2.5 border border-dashed rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isDark ? 'border-gold/30 text-text-muted hover:text-gold hover:border-gold' : 'border-primary/30 text-primary hover:bg-primary/5 hover:border-primary'}`}
                                                >
                                                    <MessageSquare size={10} />
                                                    Add Reply
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="grid gap-6">
                        {loadingReports ? (
                            <div className="py-20 flex flex-col items-center justify-center animate-pulse">
                                <AlertTriangle className="w-12 h-12 text-gold/20 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gold/40">Auditing Deviations...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className={`py-20 flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gold/20 bg-emerald-50/50'}`}>
                                <CheckCircle className="w-12 h-12 text-emerald-500/30 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-gold/40">All vibrations are in harmony. No pending reports.</p>
                            </div>
                        ) : (
                            reports.map((report: ReviewReport) => (
                                <div key={report.report_id} className={`border ${isDark ? 'bg-primary/20 border-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.02)]' : 'bg-red-50/50 border-red-100'} rounded-xl p-4 md:p-5 relative overflow-hidden group border-l-4 border-l-red-500/30`}>
                                   
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-2 relative z-10">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2 text-red-500/80">
                                                <AlertTriangle size={12} />
                                                <span className="text-[7px] font-black uppercase tracking-[0.2em]">Discord Reported</span>
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                                                By {report.reporter_name} • {new Date(report.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-red-500/5 text-red-400/80' : 'bg-red-50 text-red-700/80'} border border-red-500/10`}>
                                        <p className="text-[7px] uppercase tracking-widest font-black mb-0.5 opacity-50">Reason</p>
                                        <p className="text-[11px] font-bold leading-relaxed">{report.reason}</p>
                                    </div>

                                    <div className={`border-l-2 border-gold/20 pl-3 py-0.5 mb-4`}>
                                        <p className="text-[7px] uppercase tracking-widest font-black mb-1 text-text-muted">Original Vibration</p>
                                        <p className="text-[11px] italic text-text-secondary font-medium leading-relaxed">
                                            "{report.review_body}"
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-2 relative z-10">
                                        <button
                                            onClick={() => handleResolveReport(report.report_id, 'dismissed')}
                                            className={`px-3 py-1.5 rounded-lg border ${isDark ? 'border-white/10 text-text-muted/60' : 'border-gold/10 text-emerald-900'} text-[8px] font-black uppercase tracking-widest hover:bg-white/[0.05] transition-all`}
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={() => handleResolveReport(report.report_id, 'resolved')}
                                            className="px-4 py-1.5 bg-red-600/10 border border-red-600/20 text-red-500 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Execute
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

