'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch, authHeaders } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Loader2, Save, Image as ImageIcon, Map } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import { API_URL } from '@/lib/api';

interface NeedHelpCategory {
    id: string;
    name: string;
    image_url: string;
    bg_color: string;
    text_color: string;
    link_url: string;
    sort_order: number;
    is_active: boolean;
    created_at?: string;
}

const emptyCategory: Omit<NeedHelpCategory, 'id' | 'created_at'> = {
    name: '',
    image_url: '',
    bg_color: '#f3f4f6',
    text_color: '#111827',
    link_url: '/products',
    sort_order: 0,
    is_active: true,
};

export default function NeedHelpAdminPage() {
    const [categories, setCategories] = useState<NeedHelpCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<NeedHelpCategory | null>(null);
    const [form, setForm] = useState(emptyCategory);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const loadCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/need-help`);
            const data = await res.json();
            if (data.success) setCategories(data.data || []);
        } catch { 
            toast.error('Failed to load categories'); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { loadCategories(); }, [loadCategories]);

    useEffect(() => {
        if (modalOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [modalOpen]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyCategory);
        setImagePreview(null);
        setModalOpen(true);
    };

    const openEdit = (cat: NeedHelpCategory) => {
        setEditing(cat);
        setForm({ ...cat });
        setImagePreview(cat.image_url);
        setModalOpen(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setImagePreview(base64String);
            setForm(prev => ({ ...prev, image_url: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.link_url) {
            toast.error('Name and Link URL are required');
            return;
        }
        if (!form.image_url) {
            toast.error('An image is required');
            return;
        }

        setSaving(true);
        try {
            const url = editing 
                ? `${API_URL}/api/admin/need-help/${editing.id}` 
                : `${API_URL}/api/admin/need-help`;
            const method = editing ? 'PUT' : 'POST';

            const res = await authFetch(url, {
                method,
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Category ${editing ? 'updated' : 'created'} successfully`);
                setModalOpen(false);
                loadCategories();
            } else {
                toast.error(data.message || 'Failed to save category');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error saving category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/need-help/${deleteTarget}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Category deleted');
                setCategories(prev => prev.filter(c => c.id !== deleteTarget));
            } else {
                toast.error(data.message || 'Failed to delete');
            }
        } catch {
            toast.error('Error deleting category');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const cat = categories.find(c => c.id === id);
            if (!cat) return;
            const res = await authFetch(`${API_URL}/api/admin/need-help/${id}`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ ...cat, is_active: !currentStatus })
            });
            const data = await res.json();
            if (data.success) {
                setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
                toast.success('Status updated');
            }
        } catch {
            toast.error('Failed to update status');
        }
    };

    const resolveImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://localhost:3000${url.startsWith('/') ? url : '/' + url}`;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Map className="w-6 h-6 text-[#3d5c3a]" />
                        Need Help Guide
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage the 'Need Help Choosing? Start Here!' category blocks on the homepage.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center justify-center px-4 py-2 bg-[#3d5c3a] text-white rounded-lg hover:bg-[#2c422a] transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#3d5c3a]" />
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <Map className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No categories found</h3>
                    <p className="text-gray-500 mt-1 mb-4">Create your first category to display on the storefront.</p>
                    <button onClick={openCreate} className="inline-flex items-center text-[#3d5c3a] font-medium hover:underline">
                        <Plus className="w-4 h-4 mr-1" /> Add Category
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sort Order</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div 
                                                className="w-16 h-20 rounded-lg overflow-hidden relative shadow-sm"
                                                style={{ backgroundColor: cat.bg_color }}
                                            >
                                                <img src={resolveImageUrl(cat.image_url)} alt={cat.name} className="w-full h-full object-cover" />
                                                <div 
                                                    className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center text-[8px] font-bold z-10"
                                                    style={{ backgroundColor: cat.bg_color, color: cat.text_color }}
                                                >
                                                    {cat.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{cat.name}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-1 truncate max-w-[200px]">{cat.link_url}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {cat.sort_order}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => toggleStatus(cat.id, cat.is_active)}
                                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${cat.is_active ? 'bg-[#91ca35]' : 'bg-gray-200'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${cat.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => openEdit(cat)} className="text-[#3d5c3a] hover:text-[#2c422a] p-2 bg-[#3d5c3a]/5 hover:bg-[#3d5c3a]/10 rounded-lg mr-2 transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteTarget(cat.id)} className="text-red-600 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Editor Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-900/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                        
                        <div className="relative inline-block w-full max-w-2xl overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl border border-gray-100 sm:my-8">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {editing ? 'Edit Category' : 'Add New Category'}
                                </h3>
                                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-1 hover:bg-gray-100 rounded-md transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="px-6 py-6 space-y-6">
                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
                                    <div className="flex items-start gap-6">
                                        <div className="w-32 h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group">
                                            {imagePreview ? (
                                                <>
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ImageIcon className="w-6 h-6 text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-4">
                                                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                                    <span className="text-xs text-gray-500 font-medium">Upload</span>
                                                </div>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1 text-sm text-gray-500">
                                            <p className="font-medium text-gray-700">Image Requirements:</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li>Recommended size: 400x500px</li>
                                                <li>Format: PNG, JPG, WEBP</li>
                                                <li>Max size: 2MB</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name / Label</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#3d5c3a]/20 focus:border-[#3d5c3a] outline-none transition-all"
                                            placeholder="e.g. BODY WASH"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Link URL</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.link_url}
                                            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#3d5c3a]/20 focus:border-[#3d5c3a] outline-none transition-all font-mono text-sm"
                                            placeholder="/products?category=Body Wash"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="color"
                                                value={form.bg_color}
                                                onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                                                className="w-12 h-11 rounded-lg border border-gray-200 cursor-pointer p-1"
                                            />
                                            <input
                                                type="text"
                                                value={form.bg_color}
                                                onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#3d5c3a]/20 focus:border-[#3d5c3a] outline-none transition-all font-mono text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="color"
                                                value={form.text_color}
                                                onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                                                className="w-12 h-11 rounded-lg border border-gray-200 cursor-pointer p-1"
                                            />
                                            <input
                                                type="text"
                                                value={form.text_color}
                                                onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#3d5c3a]/20 focus:border-[#3d5c3a] outline-none transition-all font-mono text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                    <input
                                        type="number"
                                        value={form.sort_order}
                                        onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                                        className="w-full md:w-1/3 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#3d5c3a]/20 focus:border-[#3d5c3a] outline-none transition-all"
                                    />
                                    <p className="text-xs text-gray-500 mt-1.5">Lower numbers appear first.</p>
                                </div>
                                
                                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-[#3d5c3a] rounded-xl hover:bg-[#2c422a] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Category
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Category"
                confirmLabel="Delete"
                confirmVariant="danger"
                loading={deleting}
            >
                Are you sure you want to delete this category? This will remove it from the storefront permanently.
            </ConfirmModal>
        </div>
    );
}
