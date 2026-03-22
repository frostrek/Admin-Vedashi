'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminBlogPosts, deleteBlogPost, publishBlogPost, archiveBlogPost, BlogPost } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, FileText, CheckCircle, Archive, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBlogPostsPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const loadPosts = async () => {
        setLoading(true);
        const res = await getAdminBlogPosts({ status: statusFilter || undefined, limit: 100 });
        setPosts(res.posts || []);
        setLoading(false);
    };

    useEffect(() => {
        loadPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete post "${title}"? This cannot be undone.`)) return;
        const success = await deleteBlogPost(id);
        if (success) {
            toast.success('Post deleted');
            loadPosts();
        } else {
            toast.error('Failed to delete post');
        }
    };

    const handlePublish = async (id: string) => {
        const success = await publishBlogPost(id);
        if (success) {
            toast.success('Post published!');
            loadPosts();
        } else {
            toast.error('Failed to publish post');
        }
    };

    const handleArchive = async (id: string) => {
        const success = await archiveBlogPost(id);
        if (success) {
            toast.success('Post archived');
            loadPosts();
        } else {
            toast.error('Failed to archive post');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold bg-green-100 text-green-700">Published</span>;
            case 'archived':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold bg-gray-100 text-gray-700">Archived</span>;
            case 'draft':
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold bg-amber-100 text-amber-700">Draft</span>;
        }
    };

    const filtered = posts.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Blog Posts</h1>
                    <p className="text-[15px] font-semibold text-brown">{posts.length} articles found</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/blog/write"
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300"
                    >
                        <Plus className="h-4 w-4" /> Write Post
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search posts..."
                        className="w-full rounded-lg border border-border bg-card-bg pl-10 pr-4 py-2 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none transition-colors w-full sm:w-auto"
                >
                    <option value="">All Statuses</option>
                    <option value="draft">Drafts</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card-bg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-page-bg/50">
                                <th className="px-5 py-3 text-sm font-semibold text-gold-muted uppercase">Post</th>
                                <th className="px-5 py-3 text-sm font-semibold text-gold-muted uppercase">Status</th>
                                <th className="px-5 py-3 text-sm font-semibold text-gold-muted uppercase">Type / Category</th>
                                <th className="px-5 py-3 text-sm font-semibold text-gold-muted uppercase">Stats</th>
                                <th className="px-5 py-3 text-sm font-semibold text-gold-muted uppercase">Date</th>
                                <th className="px-5 py-3 text-sm font-semibold text-gold-muted uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-6 animate-shimmer rounded bg-border-subtle" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        <p>No blog posts found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(post => (
                                    <tr key={post.post_id} className="hover:bg-gold/[0.02] transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-12 rounded bg-border/50 flex-shrink-0 overflow-hidden">
                                                    {(post.featured_image || post.cover_image) ? (
                                                        <img src={post.featured_image || post.cover_image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <FileText className="w-5 h-5 mx-auto mt-2.5 text-text-muted" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-base font-bold text-text-primary truncate max-w-[250px]" title={post.title}>{post.title}</p>
                                                    <p className="text-sm text-text-muted truncate max-w-[250px]">/{post.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            {getStatusBadge(post.status)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-base text-text-primary capitalize">{post.blog_type?.replace(/_/g, ' ') || 'Standard'}</div>
                                            <div className="text-sm text-text-muted">{post.category_name || '-'}</div>
                                        </td>
                                        <td className="px-5 py-3 text-sm">
                                            <div className="flex items-center gap-3 text-text-secondary">
                                                <span title="Views">👁️ {post.view_count || 0}</span>
                                                <span title="Comments">💬 {post.comment_count || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-text-secondary">
                                            {post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {post.status === 'draft' && (
                                                    <button onClick={() => handlePublish(post.post_id)} className="p-2 text-text-muted hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors" title="Publish">
                                                        <Globe className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {post.status === 'published' && (
                                                    <button onClick={() => handleArchive(post.post_id)} className="p-2 text-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Archive">
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <Link href={`/dashboard/blog/write?id=${post.post_id}`} className="p-2 text-text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors" title="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                                <button onClick={() => handleDelete(post.post_id, post.title)} className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
