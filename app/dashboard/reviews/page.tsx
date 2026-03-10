'use client';

import { useState, useEffect } from 'react';
import { getAdminReviews, getReviewReports, adminReplyToReview, resolveReviewReport, AdminReview, ReviewReport } from '@/lib/api';
import toast from 'react-hot-toast';
import { Star, MessageSquare, AlertTriangle, CheckCircle, XCircle, Search, Filter } from 'lucide-react';

export default function AdminReviewsPage() {
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
        const data = await getAdminReviews(1, 100);
        setReviews(data);
        setLoadingReviews(false);
    };

    const fetchReports = async () => {
        setLoadingReports(true);
        const data = await getReviewReports('pending');
        setReports(data);
        setLoadingReports(false);
    };

    const handleReplyChange = (reviewId: string, text: string) => {
        setReplyDrafts(prev => ({ ...prev, [reviewId]: text }));
    };

    const handleSubmitReply = async (reviewId: string) => {
        const text = replyDrafts[reviewId];
        if (!text || text.trim() === '') return toast.error('Reply cannot be empty.');

        toast.loading('Submitting reply...', { id: 'reply' });
        const success = await adminReplyToReview(reviewId, text);
        if (success) {
            toast.success('Reply submitted!', { id: 'reply' });
            setReplyingTo(null);
            // Update local state
            setReviews(reviews.map(r => r.review_id === reviewId ? { ...r, admin_reply: text, admin_reply_at: new Date().toISOString() } : r));
        } else {
            toast.error('Failed to submit reply.', { id: 'reply' });
        }
    };

    const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
        toast.loading(`Marking report as ${status}...`, { id: 'resolve' });
        const success = await resolveReviewReport(reportId, status);
        if (success) {
            toast.success(`Report ${status}`, { id: 'resolve' });
            setReports(reports.filter(r => r.report_id !== reportId));
        } else {
            toast.error('Failed to update report status', { id: 'resolve' });
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-serif text-neutral-900 mb-2">Reviews Moderation</h1>
                    <p className="text-neutral-500 text-sm">Monitor customer feedback, reply to reviews, and manage reports.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-neutral-200 mb-6">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all'
                            ? 'border-[#C5A46D] text-[#C5A46D]'
                            : 'border-transparent text-neutral-500 hover:text-neutral-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare size={16} />
                        All Reviews
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports'
                            ? 'border-[#C5A46D] text-[#C5A46D]'
                            : 'border-transparent text-neutral-500 hover:text-neutral-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className={reports.length > 0 ? "text-red-500" : ""} />
                        Reported Reviews {reports.length > 0 && `(${reports.length})`}
                    </div>
                </button>
            </div>

            {/* All Reviews Tab */}
            {activeTab === 'all' && (
                <div className="space-y-4">
                    {loadingReviews ? (
                        <div className="py-12 text-center text-neutral-400">Loading reviews...</div>
                    ) : reviews.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400">No reviews found.</div>
                    ) : (
                        reviews.map(review => (
                            <div key={review.review_id} className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex text-yellow-500">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} size={14} className={i < review.rating ? 'fill-current' : 'text-neutral-300'} />
                                                ))}
                                            </div>
                                            <span className="text-sm font-semibold text-neutral-800">{review.title}</span>
                                        </div>
                                        <p className="text-xs text-neutral-500">
                                            By <span className="font-medium text-neutral-700">{review.reviewer_name}</span> on {new Date(review.created_at).toLocaleDateString()}
                                            &nbsp;• Product: <span className="font-medium text-[#C5A46D]">{review.product_name}</span>
                                        </p>
                                    </div>
                                    <div className="text-xs text-neutral-400 flex items-center gap-1">
                                        Helpful ({review.helpful_count})
                                    </div>
                                </div>
                                <p className="text-sm text-neutral-700 leading-relaxed mb-4">
                                    {review.body}
                                </p>

                                <div className="bg-neutral-50 rounded p-4 border border-neutral-100">
                                    {review.admin_reply ? (
                                        <div>
                                            <p className="text-xs font-semibold text-[#C5A46D] mb-1">Your Reply:</p>
                                            <p className="text-sm text-neutral-700">{review.admin_reply}</p>
                                        </div>
                                    ) : (
                                        replyingTo === review.review_id ? (
                                            <div>
                                                <textarea
                                                    className="w-full text-sm border-neutral-200 rounded p-2 focus:ring-[#C5A46D] focus:border-[#C5A46D] mb-2"
                                                    rows={3}
                                                    placeholder="Write your response to the customer..."
                                                    value={replyDrafts[review.review_id] || ''}
                                                    onChange={(e) => handleReplyChange(review.review_id, e.target.value)}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setReplyingTo(null)}
                                                        className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleSubmitReply(review.review_id)}
                                                        className="px-3 py-1.5 text-xs bg-[#C5A46D] text-white rounded hover:bg-[#B3935C] transition-colors"
                                                    >
                                                        Submit Reply
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setReplyingTo(review.review_id)}
                                                className="text-sm text-[#C5A46D] hover:underline font-medium"
                                            >
                                                Add a reply
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    {loadingReports ? (
                        <div className="py-12 text-center text-neutral-400">Loading reports...</div>
                    ) : reports.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400">
                            <CheckCircle className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                            <p>No pending review reports to review.</p>
                        </div>
                    ) : (
                        reports.map(report => (
                            <div key={report.report_id} className="bg-white border text-sm border-red-200 rounded-lg p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
                                        <AlertTriangle size={16} />
                                        Reported by {report.reporter_name}
                                    </div>
                                    <span className="text-xs text-neutral-500">{new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="mb-4 bg-red-50 p-3 rounded text-red-800">
                                    <span className="font-semibold">Reason:</span> {report.reason}
                                </div>

                                <div className="border border-neutral-200 rounded p-4 mb-4">
                                    <p className="font-medium text-neutral-800 mb-1">Review Content:</p>
                                    <p className="text-neutral-600 italic">"{report.review_body}"</p>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => handleResolveReport(report.report_id, 'dismissed')}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 border border-neutral-200 rounded transition-colors"
                                    >
                                        <XCircle size={14} />
                                        Dismiss Report
                                    </button>
                                    <button
                                        onClick={() => handleResolveReport(report.report_id, 'resolved')}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded transition-colors"
                                    >
                                        <CheckCircle size={14} />
                                        Mark Resolved
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
