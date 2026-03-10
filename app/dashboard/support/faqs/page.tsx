'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, HelpCircle, X, Edit2, Save } from 'lucide-react';
import { getAdminFaqs, createAdminFaq, updateAdminFaq, deleteAdminFaq, toggleFaqVisibility } from '@/lib/api';
import toast from 'react-hot-toast';

const DEFAULT_CATEGORIES = ['General', 'Orders', 'Payments', 'Shipping & Delivery', 'Product Issues', 'Returns & Refunds', 'Account Support'];

export default function AdminFaqsPage() {
    const [faqs, setFaqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ category: 'General', question: '', answer: '', sort_order: 0, is_visible: true });

    const load = async () => {
        const data = await getAdminFaqs();
        setFaqs(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.question || !form.answer) { toast.error('Question and answer required'); return; }
        const result = editId
            ? await updateAdminFaq(editId, form)
            : await createAdminFaq(form);
        if (result.success) {
            toast.success(editId ? 'FAQ updated' : 'FAQ created');
            setShowForm(false); setEditId(null);
            setForm({ category: 'General', question: '', answer: '', sort_order: 0, is_visible: true });
            load();
        } else toast.error(result.message || 'Failed');
    };

    const handleEdit = (faq: any) => {
        setEditId(faq.faq_id);
        setForm({ category: faq.category, question: faq.question, answer: faq.answer, sort_order: faq.sort_order, is_visible: faq.is_visible });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this FAQ?')) return;
        const result = await deleteAdminFaq(id);
        if (result.success) { toast.success('Deleted'); load(); }
        else toast.error('Delete failed');
    };

    const handleToggle = async (id: string) => {
        const result = await toggleFaqVisibility(id);
        if (result.success) { toast.success(result.data?.is_visible ? 'Visible' : 'Hidden'); load(); }
    };

    // Group FAQs by category
    const grouped: Record<string, any[]> = {};
    faqs.forEach(f => { if (!grouped[f.category]) grouped[f.category] = []; grouped[f.category].push(f); });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gold">FAQ Management</h1>
                    <p className="text-sm text-text-muted mt-1">{faqs.length} FAQs total</p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ category: 'General', question: '', answer: '', sort_order: 0, is_visible: true }); }}
                    className="flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gold/30 transition-colors"
                >
                    {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showForm ? 'Cancel' : 'Add FAQ'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-card-bg border border-border rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-gold-soft">{editId ? 'Edit FAQ' : 'New FAQ'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text"
                        >
                            {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                            type="number"
                            value={form.sort_order}
                            onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                            placeholder="Sort order"
                            className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text"
                        />
                        <label className="flex items-center gap-2 text-sm text-text-muted">
                            <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} />
                            Visible
                        </label>
                    </div>
                    <input
                        type="text"
                        value={form.question}
                        onChange={(e) => setForm({ ...form, question: e.target.value })}
                        placeholder="Question"
                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text"
                        required
                    />
                    <textarea
                        value={form.answer}
                        onChange={(e) => setForm({ ...form, answer: e.target.value })}
                        placeholder="Answer"
                        rows={4}
                        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text resize-none"
                        required
                    />
                    <button type="submit" className="flex items-center gap-2 bg-gold/20 text-gold px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gold/30 transition-colors">
                        <Save className="h-4 w-4" />
                        {editId ? 'Update' : 'Create'}
                    </button>
                </form>
            )}

            {/* FAQ List by Category */}
            {loading ? (
                <div className="text-text-muted p-8 text-center">Loading...</div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="bg-card-bg border border-border rounded-xl p-12 text-center">
                    <HelpCircle className="h-10 w-10 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-sm text-text-muted">No FAQs yet</p>
                </div>
            ) : (
                Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="bg-card-bg border border-border rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border bg-surface">
                            <h3 className="text-sm font-semibold text-gold-soft">{category} ({items.length})</h3>
                        </div>
                        <div className="divide-y divide-border">
                            {items.map((faq: any) => (
                                <div key={faq.faq_id} className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-gold/[0.02] transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {!faq.is_visible && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-bold">hidden</span>}
                                            <span className="text-xs text-text-muted">Order: {faq.sort_order}</span>
                                        </div>
                                        <p className="text-sm font-medium text-text">{faq.question}</p>
                                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{faq.answer}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => handleToggle(faq.faq_id)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-gold transition-colors" title={faq.is_visible ? 'Hide' : 'Show'}>
                                            {faq.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        </button>
                                        <button onClick={() => handleEdit(faq)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-gold transition-colors"><Edit2 className="h-4 w-4" /></button>
                                        <button onClick={() => handleDelete(faq.faq_id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"><Trash2 className="h-4 w-4" /></button>
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
