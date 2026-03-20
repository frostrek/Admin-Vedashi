'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, BookOpen, Folder, Globe, GlobeLock } from 'lucide-react';
import {
    getAdminKBArticles, getAdminKBCategories, createAdminKBCategory, deleteAdminKBCategory,
    createAdminKBArticle, updateAdminKBArticle, deleteAdminKBArticle
} from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminKBPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArticleForm, setShowArticleForm] = useState(false);
    const [showCatForm, setShowCatForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [aForm, setAForm] = useState({ category_id: '', title: '', slug: '', content: '', excerpt: '', status: 'draft' });
    const [cForm, setCForm] = useState({ name: '', slug: '', description: '' });

    const load = async () => {
        const [a, c] = await Promise.all([getAdminKBArticles(), getAdminKBCategories()]);
        setArticles(Array.isArray(a) ? a : []);
        setCategories(Array.isArray(c) ? c : []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const submitCat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cForm.name) return;
        const r = await createAdminKBCategory({ ...cForm, slug: cForm.slug || slug(cForm.name) });
        if (r.success) { toast.success('Created'); setCForm({ name: '', slug: '', description: '' }); setShowCatForm(false); load(); }
        else toast.error(r.message || 'Failed');
    };

    const submitArticle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aForm.title || !aForm.content) { toast.error('Title & content required'); return; }
        const s = aForm.slug || slug(aForm.title);
        const p = { ...aForm, slug: s, category_id: aForm.category_id || undefined };
        const r = editId ? await updateAdminKBArticle(editId, p) : await createAdminKBArticle(p);
        if (r.success) { toast.success(editId ? 'Updated' : 'Created'); setShowArticleForm(false); setEditId(null); setAForm({ category_id: '', title: '', slug: '', content: '', excerpt: '', status: 'draft' }); load(); }
        else toast.error(r.message || 'Failed');
    };

    const editArticle = (a: any) => {
        setEditId(a.article_id);
        setAForm({ category_id: a.category_id || '', title: a.title, slug: a.slug, content: a.content, excerpt: a.excerpt || '', status: a.status });
        setShowArticleForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold">Knowledge Base</h1>
                    <p className="text-[15px] font-semibold text-brown mt-1">{categories.length} categories · {articles.length} articles</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setShowCatForm(!showCatForm); setShowArticleForm(false); }} className="flex items-center gap-2 bg-card-bg border border-border px-3 py-2 rounded-xl text-sm text-text-muted hover:text-gold">
                        <Folder className="h-4 w-4" /> {showCatForm ? 'Cancel' : 'Add Category'}
                    </button>
                    <button onClick={() => { setShowArticleForm(!showArticleForm); setShowCatForm(false); setEditId(null); }} className="flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold/30">
                        {showArticleForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showArticleForm ? 'Cancel' : 'Add Article'}
                    </button>
                </div>
            </div>

            {showCatForm && (
                <form onSubmit={submitCat} className="bg-card-bg border border-border rounded-xl p-5 space-y-3">
                    <h3 className="font-serif font-semibold text-gold-soft text-sm">New Category</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <input value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })} placeholder="Name" className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text" required />
                        <input value={cForm.slug} onChange={e => setCForm({ ...cForm, slug: e.target.value })} placeholder="Slug (auto)" className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text" />
                        <input value={cForm.description} onChange={e => setCForm({ ...cForm, description: e.target.value })} placeholder="Description" className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text" />
                    </div>
                    <button type="submit" className="bg-gold/20 text-gold px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold/30">Create</button>
                </form>
            )}

            {showArticleForm && (
                <form onSubmit={submitArticle} className="bg-card-bg border border-border rounded-xl p-5 space-y-3">
                    <h3 className="font-serif font-semibold text-gold-soft text-sm">{editId ? 'Edit Article' : 'New Article'}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <select value={aForm.category_id} onChange={e => setAForm({ ...aForm, category_id: e.target.value })} className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text">
                            <option value="">No category</option>
                            {categories.map((c: any) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                        </select>
                        <input value={aForm.title} onChange={e => setAForm({ ...aForm, title: e.target.value })} placeholder="Title" className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text" required />
                        <select value={aForm.status} onChange={e => setAForm({ ...aForm, status: e.target.value })} className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                    <input value={aForm.excerpt} onChange={e => setAForm({ ...aForm, excerpt: e.target.value })} placeholder="Excerpt" className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text" />
                    <textarea value={aForm.content} onChange={e => setAForm({ ...aForm, content: e.target.value })} placeholder="Content..." rows={6} className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text resize-none" required />
                    <button type="submit" className="flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold/30">
                        <Save className="h-4 w-4" /> {editId ? 'Update' : 'Create'}
                    </button>
                </form>
            )}

            {categories.length > 0 && (
                <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-surface"><h3 className="font-serif text-sm font-semibold text-gold-soft">Categories</h3></div>
                    <div className="divide-y divide-border">
                        {categories.map((c: any) => (
                            <div key={c.category_id} className="px-4 py-3 flex items-center justify-between">
                                <span className="text-[15px] font-medium text-text">{c.name} <span className="text-sm text-text-muted">/{c.slug}</span></span>
                                <button onClick={() => { if (confirm('Delete?')) deleteAdminKBCategory(c.category_id).then(r => { if (r.success) { toast.success('Deleted'); load(); } }); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? <div className="text-text-muted p-8 text-center">Loading...</div> : articles.length === 0 ? (
                <div className="bg-card-bg border border-border rounded-xl p-12 text-center"><BookOpen className="h-10 w-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No articles</p></div>
            ) : (
                <div className="bg-card-bg border border-border rounded-xl overflow-x-auto">
                    <table className="w-full text-[15px]">
                        <thead className="border-b border-border"><tr className="text-left text-sm font-semibold text-text-muted uppercase"><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Actions</th></tr></thead>
                        <tbody className="divide-y divide-border">
                            {articles.map((a: any) => (
                                <tr key={a.article_id} className="hover:bg-gold/[0.03]">
                                    <td className="px-4 py-3"><p className="font-semibold text-text">{a.title}</p><p className="text-sm text-text-muted">/{a.slug}</p></td>
                                    <td className="px-4 py-3 text-text-muted">{a.category_name || '—'}</td>
                                    <td className="px-4 py-3"><span className={`text-xs uppercase font-bold ${a.status === 'published' ? 'text-green-400' : 'text-text-muted'}`}>{a.status}</span></td>
                                    <td className="px-4 py-3 text-text-muted">{a.view_count || 0}</td>
                                    <td className="px-4 py-3 flex gap-1">
                                        <button onClick={() => editArticle(a)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-gold"><Edit2 className="h-4 w-4" /></button>
                                        <button onClick={() => { if (confirm('Delete?')) deleteAdminKBArticle(a.article_id).then(r => { if (r.success) { toast.success('Deleted'); load(); } }); }} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
