'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getAdminBlogPost, createBlogPost, updateBlogPost, getAdminBlogCategories, getAdminBlogTags,
    BlogPost, BlogCategory, BlogTag
} from '@/lib/api';
import { ChevronLeft, Save, Globe, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function WritePostContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const postId = searchParams.get('id');
    const isEditing = !!postId;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);

    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [tagsList, setTagsList] = useState<BlogTag[]>([]);

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [body, setBody] = useState('');
    const [blogType, setBlogType] = useState('wine_guides');
    const [categoryId, setCategoryId] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);

    useEffect(() => {
        (async () => {
            const [cats, tags] = await Promise.all([getAdminBlogCategories(), getAdminBlogTags()]);
            setCategories(cats);
            setTagsList(tags);

            if (isEditing && postId) {
                const post = await getAdminBlogPost(postId);
                if (post) {
                    setTitle(post.title);
                    setSlug(post.slug);
                    setExcerpt(post.excerpt || '');
                    setBody(post.body);
                    setBlogType(post.blog_type || 'wine_guides');
                    setCategoryId(post.category_id || '');
                    setCoverImage(post.cover_image || '');
                    setIsFeatured(post.is_featured || false);
                    setSelectedTags(post.tags?.map(t => t.tag_id) || []);
                } else {
                    toast.error('Post not found');
                    router.push('/dashboard/blog');
                }
            }
            setLoading(false);
        })();
    }, [isEditing, postId, router]);

    const handleSave = async (publish: boolean = false) => {
        if (!title.trim() || !body.trim()) {
            toast.error('Title and body are required');
            return;
        }

        setSaving(true);
        // We omit the conflicting `tags` property from Partial<BlogPost> here and pass our own.
        const data: Omit<Partial<BlogPost>, 'tags'> & { tags?: string[] } = {
            title,
            slug: slug || undefined,
            excerpt,
            body,
            blog_type: blogType,
            category_id: categoryId || undefined,
            cover_image: coverImage || undefined,
            is_featured: isFeatured,
            tags: selectedTags,
            status: (publish ? 'published' : 'draft') as BlogPost['status'],
        };

        let res;
        if (isEditing && postId) {
            res = await updateBlogPost(postId, data as any);
        } else {
            res = await createBlogPost(data as any);
        }

        if (res.success) {
            toast.success(`Post ${publish ? 'published' : 'saved'} successfully!`);
            router.push('/dashboard/blog');
            router.refresh();
        } else {
            toast.error(res.error || 'Failed to save post');
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/blog" className="p-2 rounded-lg border border-border bg-card-bg hover:bg-border transition-colors text-text-muted">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">
                        {isEditing ? 'Edit Post' : 'Write New Post'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card-bg text-text-primary hover:bg-border transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> Save as Draft
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-[#E8D8B9] hover:bg-primary-light transition-colors disabled:opacity-50"
                    >
                        <Globe className="w-4 h-4" /> Publish Now
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <div className="rounded-xl border border-border bg-card-bg p-6 space-y-5 shadow-sm">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Post Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-3 text-lg font-serif text-text-primary focus:border-gold/50 focus:outline-none"
                                placeholder="A Catchy Title..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Slug (optional)</label>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => setSlug(e.target.value)}
                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                placeholder="auto-generated-from-title"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Excerpt (Short description)</label>
                            <textarea
                                value={excerpt}
                                onChange={e => setExcerpt(e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Post Body * (HTML/Markdown supported in future, generic text for now)</label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={18}
                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-4 text-sm text-text-primary focus:border-gold/50 focus:outline-none font-mono"
                                placeholder="<h2>Section 1</h2><p>Content goes here...</p>"
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Organization */}
                    <div className="rounded-xl border border-border bg-card-bg p-5 shadow-sm space-y-4">
                        <h3 className="font-semibold text-text-primary border-b border-border pb-2">Organization</h3>

                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Blog Type</label>
                            <select
                                value={blogType}
                                onChange={e => setBlogType(e.target.value)}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                            >
                                <option value="wine_guides">Wine Guides</option>
                                <option value="food_pairing">Food Pairing</option>
                                <option value="vineyard_stories">Vineyard Stories</option>
                                <option value="legal_compliance">Legal & Compliance</option>
                                <option value="tasting_notes">Tasting Notes</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
                            <select
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                            >
                                <option value="">No Category</option>
                                {categories.map(c => (
                                    <option key={c.category_id} value={c.category_id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Tags (Multiple)</label>
                            <select
                                multiple
                                value={selectedTags}
                                onChange={e => setSelectedTags(Array.from(e.target.selectedOptions, option => option.value))}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none min-h-[100px]"
                            >
                                {tagsList.map(t => (
                                    <option key={t.tag_id} value={t.tag_id}>{t.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-text-muted mt-1">Hold Ctrl/Cmd to select multiple</p>
                        </div>

                        <div className="pt-2 border-t border-border">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isFeatured}
                                    onChange={e => setIsFeatured(e.target.checked)}
                                    className="rounded border-border bg-page-bg text-gold focus:ring-gold"
                                />
                                <span className="text-sm font-medium text-text-primary">Featured Post</span>
                            </label>
                            <p className="text-[10px] text-text-muted ml-6 mt-0.5">Show this post in the featured hero section.</p>
                        </div>
                    </div>

                    {/* Media */}
                    <div className="rounded-xl border border-border bg-card-bg p-5 shadow-sm space-y-4">
                        <h3 className="font-semibold text-text-primary border-b border-border pb-2">Media</h3>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Cover Image URL</label>
                            <input
                                type="url"
                                value={coverImage}
                                onChange={e => setCoverImage(e.target.value)}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        {coverImage ? (
                            <img src={coverImage} alt="Cover Preview" className="w-full h-32 object-cover rounded-lg border border-border" />
                        ) : (
                            <div className="w-full h-32 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-text-muted">
                                <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                                <span className="text-xs">No image provided</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function WritePostPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>}>
            <WritePostContent />
        </Suspense>
    );
}
