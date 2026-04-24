'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, BookOpen, Globe, GlobeLock } from 'lucide-react';
import { getAdminHelpArticles, createAdminHelpArticle, updateAdminHelpArticle, deleteAdminHelpArticle } from '@/lib/api';
import toast from 'react-hot-toast';

const SECTIONS = ['General', 'Account', 'Orders & Shipping', 'Payments', 'Returns', 'Products', 'Privacy & Security'];

export default function AdminHelpArticlesPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ section: 'General', title: '', slug: '', content: '', is_published: false });

    const load = async () => { const data = await getAdminHelpArticles(); setArticles(Array.isArray(data) ? data : []); setLoading(false); };
    useEffect(() => { load(); }, []);

    const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.content) { toast.error('Title and content required'); return; }
        const slug = form.slug || generateSlug(form.title);
        const result = editId
            ? await updateAdminHelpArticle(editId, { ...form, slug })
            : await createAdminHelpArticle({ ...form, slug });
        if (result.success) {
            toast.success(editId ? 'Updated' : 'Created');
            setShowForm(false); setEditId(null);
            setForm({ section: 'General', title: '', slug: '', content: '', is_published: false });
            load();
        } else toast.error(result.message || 'Failed');
    };

    const handleEdit = (a: any) => {
        setEditId(a.article_id);
        setForm({ section: a.section, title: a.title, slug: a.slug, content: a.content, is_published: a.is_published });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this article?')) return;
        const result = await deleteAdminHelpArticle(id);
        if (result.success) { toast.success('Deleted'); load(); }
    };

    // Group by section
    const grouped: Record<string, any[]> = {};
    articles.forEach(a => { if (!grouped[a.section]) grouped[a.section] = []; grouped[a.section].push(a); });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold">Help Articles</h1>
                    <p className="text-[15px] font-semibold text-brown mt-1">{articles.length} articles total</p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ section: 'General', title: '', slug: '', content: '', is_published: false }); }}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300 shadow-sm"
                >
                    {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showForm ? 'Cancel' : 'Add Article'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-card-bg border border-border rounded-xl p-6 space-y-4">
                    <h3 className="font-serif font-semibold text-gold-soft">{editId ? 'Edit Article' : 'New Article'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text">
                            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text" required />
                        <label className="flex items-center gap-2 text-sm text-text-muted">
                            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
                            Published
                        </label>
                    </div>
                    <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Slug (auto-generated)" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text" />
                    <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Article content..." rows={8} className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text resize-none" required />
                    <button type="submit" className="flex items-center gap-2 bg-primary text-[#E8D8B9] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors shadow-sm">
                        <Save className="h-4 w-4" /> {editId ? 'Update' : 'Create'}
                    </button>
                </form>
            )}

            {loading ? (
                <div className="text-text-muted p-8 text-center">Loading...</div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="bg-card-bg border border-border rounded-xl p-12 text-center">
                    <BookOpen className="h-10 w-10 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-text-muted">No articles yet</p>
                </div>
            ) : (
                Object.entries(grouped).map(([section, items]) => (
                    <div key={section} className="bg-card-bg border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border bg-surface">
                            <h3 className="font-serif text-sm font-semibold text-gold-soft">{section} ({items.length})</h3>
                        </div>
                        <div className="divide-y divide-border">
                            {items.map((a: any) => (
                                <div key={a.article_id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gold/[0.02] transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {a.is_published ? <Globe className="h-3 w-3 text-green-400" /> : <GlobeLock className="h-3 w-3 text-text-muted" />}
                                            <span className={`text-[9px] uppercase font-bold ${a.is_published ? 'text-green-400' : 'text-text-muted'}`}>{a.is_published ? 'Published' : 'Draft'}</span>
                                            <span className="text-xs text-text-muted">• {a.view_count} views</span>
                                        </div>
                                        <p className="text-sm font-medium text-text">{a.title}</p>
                                        <p className="text-xs text-text-muted mt-0.5">/{a.slug}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => handleEdit(a)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-gold transition-colors"><Edit2 className="h-4 w-4" /></button>
                                        <button onClick={() => handleDelete(a.article_id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
