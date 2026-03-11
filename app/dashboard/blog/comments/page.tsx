'use client';

import { useState, useEffect } from 'react';
import { getAdminAllComments, moderateBlogComment, deleteBlogComment, BlogComment } from '@/lib/api';
import { MessageSquare, CheckCircle, XCircle, Trash2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommentsModerationPage() {
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');

    const loadComments = async (status: 'all' | 'approved' | 'rejected') => {
        setLoading(true);
        const res = await getAdminAllComments({ status });
        setComments(res.comments || []);
        setLoading(false);
    };

    useEffect(() => {
        loadComments(statusFilter);
    }, [statusFilter]);

    const handleModerate = async (id: string, action: 'approved' | 'rejected') => {
        const success = await moderateBlogComment(id, action);
        if (success) {
            toast.success(`Comment ${action}!`);
            setComments(comments.filter(c => c.comment_id !== id));
        } else {
            toast.error(`Failed to ${action} comment`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this comment permanently?')) return;
        const success = await deleteBlogComment(id);
        if (success) {
            toast.success('Comment deleted');
            setComments(comments.filter(c => c.comment_id !== id));
        } else {
            toast.error('Failed to delete comment');
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Comments Management</h1>
                    <p className="text-sm text-text-secondary">View and moderate blog comments</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
                {(['all', 'approved', 'rejected'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${
                            statusFilter === status 
                            ? 'text-gold border-b-2 border-gold bg-gold/[0.05]' 
                            : 'text-text-muted hover:text-text-primary hover:bg-page-bg'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border border-border bg-card-bg overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border bg-page-bg/50">
                    <h2 className="font-semibold text-text-primary flex items-center gap-2 capitalize">
                        <MessageSquare className="w-4 h-4 text-gold" />
                        {statusFilter} Comments
                    </h2>
                </div>

                {loading ? (
                    <div className="p-10 text-center">
                        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-text-muted">Loading comments...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="p-16 text-center text-text-muted">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
                        <h3 className="text-lg font-medium text-text-primary mb-1">No comments found!</h3>
                        <p>There are no comments matching this filter.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border-subtle">
                        {comments.map(comment => (
                            <div key={comment.comment_id} className="p-5 hover:bg-gold/[0.02] transition-colors">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                                        {comment.commenter_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-text-primary">{comment.commenter_name}</span>
                                                {comment.commenter_email && (
                                                    <span className="text-xs text-text-muted">&lt;{comment.commenter_email}&gt;</span>
                                                )}
                                                {comment.status === 'approved' && <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-500 font-medium">APPROVED</span>}
                                                {comment.status === 'rejected' && <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-medium">REJECTED</span>}
                                            </div>
                                            <span className="text-xs text-text-muted">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </span>
                                        </div>

                                        {comment.post_title && (
                                            <div className="text-xs text-text-secondary mb-3 flex items-center gap-1">
                                                On post: <span className="font-medium text-gold-muted">{comment.post_title}</span>
                                            </div>
                                        )}

                                        <div className="bg-page-bg rounded-lg p-3 text-sm text-text-primary border border-border mb-4">
                                            {comment.body}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {comment.status !== 'approved' && (
                                                <button
                                                    onClick={() => handleModerate(comment.comment_id, 'approved')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded text-xs font-semibold transition-colors"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                                                </button>
                                            )}
                                            {comment.status !== 'rejected' && (
                                                <button
                                                    onClick={() => handleModerate(comment.comment_id, 'rejected')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded text-xs font-semibold transition-colors"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(comment.comment_id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-danger hover:bg-danger/10 rounded text-xs font-medium ml-auto transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
