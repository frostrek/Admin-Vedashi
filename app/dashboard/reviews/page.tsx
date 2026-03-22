'use client';

import { useState, useEffect, useMemo } from 'react';
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
    Loader2, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function AdminReviewsPage() {
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<'all' | 'reports' | 'by_product'>('all');

    // Reviews State
    const [reviews, setReviews] = useState<AdminReview[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    // Filters and Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
    const itemsPerPage = 10;

    // Reports State
    const [reports, setReports] = useState<ReviewReport[]>([]);
    const [loadingReports, setLoadingReports] = useState(true);

    useEffect(() => {
        if (activeTab === 'all' || activeTab === 'by_product') {
            if (reviews.length === 0) fetchReviews();
        } else {
            if (reports.length === 0) fetchReports();
        }
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

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, ratingFilter, sortBy, activeTab]);

    const filteredReviews = useMemo(() => {
        let list = [...reviews];
        
        // Filter by text
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(r => 
                (r.title?.toLowerCase() || '').includes(q) || 
                (r.body?.toLowerCase() || '').includes(q) ||
                (r.reviewer_name?.toLowerCase() || '').includes(q) ||
                (r.product_name?.toLowerCase() || '').includes(q)
            );
        }

        // Filter by rating
        if (ratingFilter !== 'all') {
            list = list.filter(r => r.rating === parseInt(ratingFilter));
        }

        // Sort
        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'highest') return b.rating - a.rating;
            if (sortBy === 'lowest') return a.rating - b.rating;
            return 0;
        });

        return list;
    }, [reviews, searchQuery, ratingFilter, sortBy]);

    const groupedReviews = useMemo(() => {
        return filteredReviews.reduce((acc, review) => {
            if (!acc[review.product_name]) acc[review.product_name] = [];
            acc[review.product_name].push(review);
            return acc;
        }, {} as Record<string, AdminReview[]>);
    }, [filteredReviews]);

    const paginatedAllReviews = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReviews.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReviews, currentPage]);

    const paginatedGroupKeys = useMemo(() => {
        const keys = Object.keys(groupedReviews);
        const startIndex = (currentPage - 1) * itemsPerPage;
        return keys.slice(startIndex, startIndex + itemsPerPage);
    }, [groupedReviews, currentPage]);

    const totalPagesAll = Math.ceil(filteredReviews.length / itemsPerPage);
    const totalPagesGroup = Math.ceil(Object.keys(groupedReviews).length / itemsPerPage);

    const toggleProductExpanded = (productName: string) => {
        setExpandedProducts(prev => ({
            ...prev,
            [productName]: !prev[productName]
        }));
    };

    const renderPagination = (totalPages: number) => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
                <p className={`text-[10px] font-black uppercase ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>
                    Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${isDark ? 'border-primary/30 text-gold-soft hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-transparent' : 'border-gold/30 text-emerald-900 hover:bg-gold/10 disabled:opacity-30 disabled:hover:bg-transparent'}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${isDark ? 'border-primary/30 text-gold-soft hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-transparent' : 'border-gold/30 text-emerald-900 hover:bg-gold/10 disabled:opacity-30 disabled:hover:bg-transparent'}`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    const renderReviewCard = (review: AdminReview, showProduct: boolean = true) => (
        <div key={review.review_id} className="rounded-[2.5rem] border border-border bg-card-bg/80 backdrop-blur-sm p-6 md:p-8 transition-all hover:shadow-xl hover:border-gold/30 group relative overflow-hidden flex flex-col md:flex-row gap-6">
            {/* Horizontal accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
            
            <div className="flex-1 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={`${review.review_id}-star-${i}`} size={16} className={i < review.rating ? 'text-gold fill-gold' : 'text-gold/20'} />
                            ))}
                        </div>
                        <h4 className={`font-serif text-2xl font-bold tracking-tight leading-tight ${isDark ? 'text-text-primary' : 'text-emerald-950'}`}>
                            {review.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-emerald-900/70">
                            <span className="text-primary">{review.reviewer_name}</span>
                            <span className="opacity-30">•</span>
                            <span>{new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            {showProduct && (
                                <>
                                    <span className="opacity-30">•</span>
                                    <span className="text-gold italic font-serif text-sm">{review.product_name}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary-dark text-xs font-bold uppercase shadow-sm">
                        {review.helpful_count} Helpful
                    </div>
                </div>

                <div className="relative mb-6">
                    <div className="absolute -left-4 top-0 text-gold/20 text-4xl font-serif">"</div>
                    <p className="text-base leading-relaxed text-text-secondary font-medium italic pl-2">
                        {review.body}
                    </p>
                    <div className="absolute -right-2 bottom-0 text-gold/20 text-4xl font-serif">"</div>
                </div>
            </div>

            {/* Response Section */}
            <div className="w-full md:w-80 relative z-10 shrink-0">
                <div className="h-full rounded-3xl border border-primary/10 bg-primary/5 p-5 flex flex-col justify-center min-h-[140px] transition-all hover:bg-primary/10">
                    {review.admin_reply ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold uppercase text-primary">Official Resonance</span>
                                <div className="h-px flex-1 bg-primary/20" />
                            </div>
                            <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-text-primary' : 'text-emerald-950'}`}>{review.admin_reply}</p>
                        </div>
                    ) : (
                        replyingTo === review.review_id ? (
                            <div className="space-y-4">
                                <textarea
                                    rows={3}
                                    className="w-full rounded-2xl border border-border bg-card-bg px-4 py-3 text-sm font-medium focus:border-gold focus:ring-4 focus:ring-gold/5 focus:outline-none transition-all resize-none min-h-[80px]"
                                    placeholder="Type your resonance..."
                                    value={replyDrafts[review.review_id] || ''}
                                    onChange={(e) => handleReplyChange(review.review_id, e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary transition-all"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => handleSubmitReply(review.review_id)}
                                        className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark active:scale-95"
                                    >
                                        Deliver
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setReplyingTo(review.review_id)}
                                className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-xs font-bold text-text-muted hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group/btn"
                            >
                                <div className="p-2 rounded-full bg-border/50 group-hover/btn:bg-primary/10 transition-colors">
                                    <MessageSquare size={20} className="group-hover/btn:scale-110 transition-transform" />
                                </div>
                                Compose Reply
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`p-6 max-w-5xl mx-auto space-y-5 animate-fadeIn min-h-screen ${isDark ? '' : 'bg-white/60 backdrop-blur-xl rounded-[2.5rem] mt-4'}`}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
                            <Star className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="font-serif text-4xl md:text-5xl font-bold text-emerald-950 tracking-tight">Reviews Moderation</h1>
                    </div>
                    <p className="text-[15px] font-semibold text-brown">
                        Curating customer experiences and managing product resonance.
                    </p>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-2 p-1.5 bg-sidebar-bg/50 backdrop-blur-md rounded-2xl border border-border w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-text-secondary hover:bg-primary/5 hover:text-primary'}`}
                >
                    All Reviews
                </button>
                <button
                    onClick={() => setActiveTab('by_product')}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'by_product' 
                         ? 'bg-primary text-white shadow-md' 
                        : 'text-text-secondary hover:bg-primary/5 hover:text-primary'}`}
                >
                    By Product
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' 
                         ? 'bg-danger text-white shadow-md' 
                        : 'text-text-secondary hover:bg-danger/5 hover:text-danger'}`}
                >
                    Reported {reports.length > 0 && <span className="ml-1 opacity-60">({reports.length})</span>}
                </button>
            </div>

            {/* ── Filters ── */}
            {(activeTab === 'all' || activeTab === 'by_product') && (
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search in reviews..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full rounded-2xl border border-border bg-card-bg/60 backdrop-blur-sm pl-12 pr-10 py-3 text-sm font-medium focus:border-gold focus:ring-4 focus:ring-gold/5 focus:outline-none transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            className="appearance-none rounded-2xl border border-border bg-card-bg/60 backdrop-blur-sm px-6 py-3 text-sm font-bold text-text-primary focus:border-gold focus:outline-none cursor-pointer min-w-[150px] transition-all"
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none rounded-2xl border border-border bg-card-bg/60 backdrop-blur-sm px-6 py-3 text-sm font-bold text-text-primary focus:border-gold focus:outline-none cursor-pointer min-w-[150px] transition-all"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="highest">Highest Rated</option>
                            <option value="lowest">Lowest Rated</option>
                        </select>
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            <div className="space-y-6">
                {activeTab === 'all' && (
                    <div className="grid gap-6">
                        {loadingReviews ? (
                            <div className="py-20 flex flex-col items-center justify-center animate-pulse">
                                <Search className="w-12 h-12 text-gold/30 mb-4" />
                                <p className="text-xs font-bold uppercase text-emerald-900/60">Synchronizing Resonance...</p>
                            </div>
                        ) : filteredReviews.length === 0 ? (
                            <div className={`py-20 flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed ${isDark ? 'border-primary/20 bg-primary/5' : 'border-primary/20 bg-primary/5'}`}>
                                <MessageSquare className="w-12 h-12 text-primary/30 mb-4" />
                                <p className="text-xs font-bold uppercase text-emerald-900/60">No reviews found matching criteria.</p>
                            </div>
                        ) : (
                            <>
                                {paginatedAllReviews.map((review: AdminReview) => renderReviewCard(review, true))}
                                {renderPagination(totalPagesAll)}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'by_product' && (
                    <div className="grid gap-6">
                        {loadingReviews ? (
                            <div className="py-20 flex flex-col items-center justify-center animate-pulse">
                                <Search className="w-12 h-12 text-primary/30 mb-4" />
                                <p className="text-xs font-bold uppercase text-emerald-900/60">Synchronizing Resonance...</p>
                            </div>
                        ) : Object.keys(groupedReviews).length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/5">
                                <MessageSquare className="w-12 h-12 text-primary/30 mb-4" />
                                <p className="text-xs font-bold uppercase text-emerald-900/60">No reviews found matching criteria.</p>
                            </div>
                        ) : (
                            <>
                                {paginatedGroupKeys.map((productName) => {
                                    const productReviews = groupedReviews[productName];
                                    const isExpanded = !!expandedProducts[productName];
                                    return (
                                        <div key={productName} className={`border ${isDark ? 'border-primary/20 bg-primary/20' : 'border-gold/20 bg-white shadow-sm'} rounded-2xl overflow-hidden group mb-4 transition-all duration-300`}>
                                            <div 
                                                onClick={() => toggleProductExpanded(productName)}
                                                className={`p-4 md:p-5 cursor-pointer flex justify-between items-center outline-none ${isDark ? 'hover:bg-primary/30' : 'hover:bg-primary/5'} transition-colors select-none ${isExpanded ? (isDark ? 'border-b border-primary/20' : 'border-b border-gold/20') : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-full ${isDark ? 'bg-primary/30 text-gold-soft' : 'bg-gold/10 text-primary'}`}>
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                    <h4 className={`text-lg font-bold tracking-tight ${isDark ? 'text-gold-soft' : 'text-emerald-950'}`}>
                                                        {productName}
                                                    </h4>
                                                </div>
                                                <span className="text-xs font-bold uppercase z-10 text-primary-dark bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 shadow-sm">
                                                    {productReviews.length} Review{productReviews.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {isExpanded && (
                                                <div className="p-4 md:p-6 grid gap-6 bg-primary/5 border-t border-primary/10 animate-fadeIn">
                                                    {productReviews.map(review => renderReviewCard(review, false))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {renderPagination(totalPagesGroup)}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="grid gap-6">
                        {loadingReports ? (
                            <div className="py-20 flex flex-col items-center justify-center animate-pulse">
                                <AlertTriangle className="w-12 h-12 text-primary/30 mb-4" />
                                <p className="text-xs font-bold uppercase text-emerald-900/50">Auditing Deviations...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/5">
                                <CheckCircle className="w-12 h-12 text-emerald-500/30 mb-4" />
                                <p className="text-xs font-bold uppercase text-emerald-900/50">All vibrations are in harmony. No pending reports.</p>
                            </div>
                        ) : (
                            reports.map((report: ReviewReport) => (
                                <div key={report.report_id} className={`border ${isDark ? 'bg-primary/20 border-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.02)]' : 'bg-red-50/50 border-red-100'} rounded-xl p-4 md:p-5 relative overflow-hidden group border-l-4 border-l-red-500/30`}>
                                   
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-2 relative z-10">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-red-600/90 bg-red-50 w-fit px-2 py-1 rounded-md">
                                                <AlertTriangle size={14} />
                                                <span className="text-xs font-bold uppercase">Discord Reported</span>
                                            </div>
                                            <p className="text-xs font-bold uppercase text-emerald-900/70 pt-1">
                                                By {report.reporter_name} • {new Date(report.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-900 border border-red-100">
                                        <p className="text-xs uppercase font-bold mb-1.5 opacity-60">Reason</p>
                                        <p className="text-sm font-medium leading-relaxed">{report.reason}</p>
                                    </div>

                                    <div className="border-l-4 border-primary/20 pl-4 py-1 mb-6">
                                        <p className="text-xs uppercase font-bold mb-1.5 text-emerald-900/60">Original Vibration</p>
                                        <p className="text-sm italic text-emerald-950 font-medium leading-relaxed">
                                            "{report.review_body}"
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 relative z-10">
                                        <button
                                            onClick={() => handleResolveReport(report.report_id, 'dismissed')}
                                            className="px-4 py-2 rounded-xl border border-primary/20 text-emerald-900 text-xs font-bold uppercase hover:bg-primary/5 transition-all"
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={() => handleResolveReport(report.report_id, 'resolved')}
                                            className="px-5 py-2 bg-red-100 border border-red-200 text-red-700 hover:bg-red-200 rounded-xl text-xs font-bold uppercase transition-all"
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

