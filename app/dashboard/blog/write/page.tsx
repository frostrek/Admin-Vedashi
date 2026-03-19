'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getAdminBlogPost, createBlogPost, updateBlogPost, getAdminBlogCategories, getAdminBlogTags,
    BlogPost, BlogCategory, BlogTag
} from '@/lib/api';
import { ChevronLeft, Save, Globe, Image as ImageIcon, Loader2, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

// Helper component for multi-select pills
function MultiSelectPills({ 
    options, 
    selectedIds, 
    onChange, 
    placeholder = "Select items..." 
}: { 
    options: { id: string, name: string }[], 
    selectedIds: string[], 
    onChange: (ids: string[]) => void,
    placeholder?: string
}) {
    const availableOptions = options.filter(opt => !selectedIds.includes(opt.id));
    const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

    return (
        <div className="space-y-2">
            {/* Selected Pills */}
            <div className="flex flex-wrap gap-2">
                {selectedOptions.map(opt => (
                    <span key={opt.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gold/10 text-gold border border-gold/20">
                        {opt.name}
                        <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); onChange(selectedIds.filter(id => id !== opt.id)); }}
                            className="hover:bg-vedic-gold/20 rounded-full p-0.5 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                {selectedOptions.length === 0 && (
                    <span className="text-xs text-text-muted italic py-1">None selected</span>
                )}
            </div>
            
            {/* Add Dropdown */}
            {availableOptions.length > 0 && (
                <div className="relative mt-2">
                    <select
                        className="w-full appearance-none rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                        onChange={(e) => {
                            if (e.target.value) {
                                onChange([...selectedIds, e.target.value]);
                                e.target.value = ""; // Reset after selection
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>{placeholder}</option>
                        {availableOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-muted">
                        <Plus className="w-4 h-4" />
                    </div>
                </div>
            )}
        </div>
    );
}

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
    // For legacy support, defaults to 'wellness_guides' but we generally won't use it now
    const [blogType, setBlogType] = useState('wellness_guides');
    const [categoryId, setCategoryId] = useState('');
    
    // Editorial Images
    const [image, setImage] = useState('');

    // CMS Flags
    const [isFeatured, setIsFeatured] = useState(false);
    const [isTrending, setIsTrending] = useState(false);
    const [isEditorPick, setIsEditorPick] = useState(false);
    const [complianceChecked, setComplianceChecked] = useState(false);
    const [displayOrder, setDisplayOrder] = useState(0);

    // Layout
    const [contentType, setContentType] = useState('Article');
    const [difficultyLevel, setDifficultyLevel] = useState('Beginner');

    // M2M Relations
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        (async () => {
            const [cats, tags] = await Promise.all([
                getAdminBlogCategories(),
                getAdminBlogTags()
            ]);
            setCategories(cats);
            setTagsList(tags);

            if (isEditing && postId) {
                const post = await getAdminBlogPost(postId);
                if (post) {
                    setTitle(post.title);
                    setSlug(post.slug);
                    setExcerpt(post.excerpt || '');
                    setBody(post.body);
                    setBlogType(post.blog_type || 'wellness_guides');
                    setCategoryId(post.category_id || '');
                    setImage(post.featured_image || post.cover_image || '');
                    setIsFeatured(post.is_featured || false);
                    setIsTrending(post.is_trending || false);
                    setIsEditorPick(post.is_editor_pick || false);
                    setComplianceChecked(post.compliance_checked || false);
                    setDisplayOrder(post.display_order || 0);
                    setContentType(post.content_type || 'Article');
                    setDifficultyLevel(post.difficulty_level || 'Beginner');

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
        // We omit the conflicting `tags`, `doshas`, `ingredients` property from Partial<BlogPost> here and pass our own.
        const data: any = {
            title,
            slug: slug || undefined,
            excerpt,
            body,
            blog_type: blogType,
            category_id: categoryId || undefined,
            cover_image: image || undefined,
            featured_image: image || undefined,
            is_featured: isFeatured,
            is_trending: isTrending,
            is_editor_pick: isEditorPick,
            compliance_checked: complianceChecked,
            display_order: displayOrder,
            content_type: contentType,
            difficulty_level: difficultyLevel,
            tags: selectedTags,
            status: (publish ? 'published' : 'draft') as BlogPost['status'],
        };

        let res;
        if (isEditing && postId) {
            res = await updateBlogPost(postId, data);
        } else {
            res = await createBlogPost(data);
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
                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-3 text-lg text-text-primary focus:border-gold/50 focus:outline-none"
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
                            <label className="block text-sm font-medium text-text-secondary mb-1">Post Body *</label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                rows={18}
                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-4 text-sm text-text-primary focus:border-gold/50 focus:outline-none font-mono"
                                placeholder="<h2 className='font-serif'>Section 1</h2><p>Content goes here...</p>"
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Organization */}
                    <div className="rounded-xl border border-border bg-card-bg p-5 shadow-sm space-y-4">
                        <h4 className="font-serif font-semibold text-text-primary border-b border-border pb-2">Organization & Layout</h4>

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
                            <label className="block text-xs font-medium text-text-secondary mb-1">Content Type</label>
                            <select
                                value={contentType}
                                onChange={e => setContentType(e.target.value)}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                            >
                                <option value="Article">Article</option>
                                <option value="Ritual">Ritual</option>
                                <option value="Ingredient Guide">Ingredient Guide</option>
                                <option value="Wellness Guide">Wellness Guide</option>
                                <option value="News">News</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Difficulty Level</label>
                            <select
                                value={difficultyLevel}
                                onChange={e => setDifficultyLevel(e.target.value)}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Tags</label>
                            <MultiSelectPills 
                                options={tagsList.map(t => ({ id: t.tag_id, name: t.name }))}
                                selectedIds={selectedTags}
                                onChange={setSelectedTags}
                                placeholder="Add Tag..."
                            />
                        </div>

                    </div>

                    {/* Editorial Flags */}
                    <div className="rounded-xl border border-border bg-card-bg p-5 shadow-sm space-y-3">
                        <h4 className="font-serif font-semibold text-text-primary border-b border-border pb-2">Editorial Flags</h4>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isFeatured}
                                onChange={e => setIsFeatured(e.target.checked)}
                                className="rounded border-border bg-page-bg text-gold focus:ring-gold"
                            />
                            <span className="text-sm font-medium text-text-primary">Featured Post</span>
                        </label>
                        <p className="text-[10px] text-text-muted ml-6 -mt-2">Replaces current featured post.</p>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isTrending}
                                onChange={e => setIsTrending(e.target.checked)}
                                className="rounded border-border bg-page-bg text-gold focus:ring-gold"
                            />
                            <span className="text-sm font-medium text-text-primary">Is Trending</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isEditorPick}
                                onChange={e => setIsEditorPick(e.target.checked)}
                                className="rounded border-border bg-page-bg text-gold focus:ring-gold"
                            />
                            <span className="text-sm font-medium text-text-primary">Editor's Pick</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer mt-4 pt-4 border-t border-border">
                            <input
                                type="checkbox"
                                checked={complianceChecked}
                                onChange={e => setComplianceChecked(e.target.checked)}
                                className="rounded border-border bg-page-bg text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Compliance Checked</span>
                        </label>
                        <p className="text-[10px] text-text-muted ml-6 -mt-2">Required before the post is visible publicly.</p>
                        
                        <div className="mt-2">
                            <label className="block text-xs font-medium text-text-secondary mb-1">Display Order</label>
                            <input
                                type="number"
                                value={displayOrder}
                                onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                            />
                        </div>

                    </div>

                    {/* Media */}
                    <div className="rounded-xl border border-border bg-card-bg p-5 shadow-sm space-y-4">
                        <h4 className="font-serif font-semibold text-text-primary border-b border-border pb-2">Media</h4>
                        
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Post Image URL</label>
                            <input
                                type="url"
                                value={image}
                                onChange={e => setImage(e.target.value)}
                                className="w-full rounded-md border border-border bg-page-bg px-3 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                placeholder="https://..."
                            />
                        </div>
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
