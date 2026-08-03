'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Pencil, Trash2, Search, X, Loader2, GripVertical, Layers, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getAdminHomepageReels, getAdminHomepageReel, createHomepageReel, updateHomepageReel,
    deleteHomepageReel, addHomepageReelProducts, removeHomepageReelProducts, reorderHomepageReelProducts,
    searchProductsAdmin, Product
} from '@/lib/api';
import { getCategories } from '@/lib/api/category';

type ModalMode = 'create' | 'edit' | null;

export default function ReelsManagementPage() {
    const [reels, setReels] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editingReel, setEditingReel] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '', subtitle: '', category_id: '', view_all_url: '',
        is_active: true, sort_order: 0, max_products: 12
    });

    // Product picker state
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const [reelProducts, setReelProducts] = useState<any[]>([]);

    // Track products added/removed during form editing (before save)
    const [pendingProductsToAdd, setPendingProductsToAdd] = useState<Product[]>([]);
    const [pendingProductIdsToRemove, setPendingProductIdsToRemove] = useState<Set<string>>(new Set());

    const fetchReels = useCallback(async () => {
        setLoading(true);
        const result = await getAdminHomepageReels({ limit: 50 });
        setReels(result.rows);
        setTotal(result.total);
        setLoading(false);
    }, []);

    const fetchCategories = useCallback(async () => {
        const result = await getCategories(true);
        // Flatten categories for dropdown
        const flatten = (cats: any[], prefix = '') => {
            let res: any[] = [];
            cats.forEach(c => {
                res.push({ id: c.category_id, name: `${prefix}${c.name}` });
                if (c.children && c.children.length > 0) {
                    res = res.concat(flatten(c.children, `${prefix}${c.name} > `));
                }
            });
            return res;
        };
        setCategories(flatten(result));
    }, []);

    useEffect(() => {
        fetchReels();
        fetchCategories();
    }, [fetchReels, fetchCategories]);

    // ── Debounced auto-search for products ──
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!productSearch.trim()) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const results = await searchProductsAdmin(productSearch.trim());

                const existingTargetIds = new Set([
                    ...reelProducts.map((p: any) => p.product_id),
                    ...pendingProductsToAdd.map(p => p.product_id)
                ]);
                Array.from(pendingProductIdsToRemove).forEach(id => existingTargetIds.delete(id));

                setSearchResults(results.filter(p => !existingTargetIds.has(p.product_id)));
            } catch {
                setSearchResults([]);
            }
            setSearching(false);
        }, 300);

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productSearch]);

    const openCreate = () => {
        setFormData({
            title: '', subtitle: '', category_id: '', view_all_url: '',
            is_active: true, sort_order: 0, max_products: 12
        });
        setEditingReel(null);
        setReelProducts([]);
        setPendingProductsToAdd([]);
        setPendingProductIdsToRemove(new Set());
        setProductSearch('');
        setSearchResults([]);
        setModalMode('create');
    };

    const openEdit = async (reel: any) => {
        setFormData({
            title: reel.title,
            subtitle: reel.subtitle || '',
            category_id: reel.category_id || '',
            view_all_url: reel.view_all_url || '',
            is_active: reel.is_active,
            sort_order: reel.sort_order,
            max_products: reel.max_products
        });
        setEditingReel(reel);

        // Fetch manual products for this reel
        const detail = await getAdminHomepageReel(reel.reel_id);
        setReelProducts(detail?.products || []);

        setPendingProductsToAdd([]);
        setPendingProductIdsToRemove(new Set());
        setProductSearch('');
        setSearchResults([]);
        setModalMode('edit');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) { toast.error('Title is required'); return; }
        setSaving(true);

        const payload: any = { ...formData };
        if (!payload.category_id) payload.category_id = null;
        if (!payload.view_all_url) payload.view_all_url = null;

        let reelId = editingReel?.reel_id;
        let success = false;

        // 1. Create or Update
        if (modalMode === 'create') {
            const result = await createHomepageReel(payload);
            if (result?.success && result.data) {
                reelId = result.data.reel_id;
                success = true;
                toast.success('Reel created!');
            } else {
                toast.error(result?.error || 'Failed to create reel');
            }
        } else if (modalMode === 'edit' && reelId) {
            const result = await updateHomepageReel(reelId, payload);
            if (result?.success) {
                success = true;
                toast.success('Reel updated!');
            } else {
                toast.error(result?.error || 'Failed to update reel');
            }
        }

        // 2. Sync Products if save was successful
        if (success && reelId) {
            let syncSuccess = true;

            // Remove products
            if (pendingProductIdsToRemove.size > 0) {
                const ok = await removeHomepageReelProducts(reelId, Array.from(pendingProductIdsToRemove));
                if (!ok) {
                    syncSuccess = false;
                    toast.error('Failed to remove some products');
                }
            }

            // Add products
            if (pendingProductsToAdd.length > 0) {
                const result = await addHomepageReelProducts(reelId, pendingProductsToAdd.map(p => p.product_id));
                if (!result.success) {
                    syncSuccess = false;
                    toast.error(result.error || 'Failed to add products');
                }
            }

            if (syncSuccess) {
                setModalMode(null);
                fetchReels();
            } else {
                // If sync failed, we reload data
                const detail = await getAdminHomepageReel(reelId);
                setReelProducts(detail?.products || []);
                setPendingProductsToAdd([]);
                setPendingProductIdsToRemove(new Set());
            }
        }

        setSaving(false);
    };

    const handleDelete = async (reel: any) => {
        if (!confirm(`Delete reel "${reel.title}"? This cannot be undone.`)) return;
        const ok = await deleteHomepageReel(reel.reel_id);
        if (ok) {
            toast.success('Reel deleted');
            fetchReels();
        } else {
            toast.error('Failed to delete reel');
        }
    };

    const handleAddProduct = (product: Product) => {
        if (pendingProductIdsToRemove.has(product.product_id)) {
            const newSet = new Set(pendingProductIdsToRemove);
            newSet.delete(product.product_id);
            setPendingProductIdsToRemove(newSet);
        } else {
            setPendingProductsToAdd(prev => [...prev, product]);
        }
        setSearchResults(prev => prev.filter(p => p.product_id !== product.product_id));
    };

    const handleRemoveProduct = (productId: string, isPendingAdd: boolean) => {
        if (!window.confirm('Are you sure you want to remove this product from the reel?')) return;

        if (isPendingAdd) {
            setPendingProductsToAdd(prev => prev.filter(p => p.product_id !== productId));
        } else {
            setPendingProductIdsToRemove(prev => new Set(prev).add(productId));
        }
    };

    const moveProduct = async (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === reelProducts.length - 1)
        ) return;

        const newProducts = [...reelProducts];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap locally
        const temp = newProducts[index];
        newProducts[index] = newProducts[swapIndex];
        newProducts[swapIndex] = temp;
        setReelProducts(newProducts);

        // Update backend immediately
        if (editingReel) {
            const ok = await reorderHomepageReelProducts(editingReel.reel_id, newProducts.map(p => p.product_id));
            if (!ok) toast.error('Failed to save order');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Homepage Reels
                    </h1>
                    <p className="text-gray-500 mt-1">Manage dynamic product sections on the storefront homepage.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-[#3B5D3B] text-white px-4 py-2 rounded-lg hover:bg-[#2c472c] transition-colors flex items-center gap-2 shadow-sm font-medium"
                >
                    <Plus className="h-4 w-4" />
                    Create Reel
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3B5D3B]" />
                </div>
            ) : reels.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No reels found</h3>
                    <p className="text-gray-500 mb-6">Create your first homepage reel to start featuring products.</p>
                    <button
                        onClick={openCreate}
                        className="bg-white text-[#3B5D3B] border-2 border-[#3B5D3B] px-6 py-2 rounded-lg hover:bg-[#3B5D3B]/10 transition-colors font-medium inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Create Reel
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Reel Details</th>
                                    <th className="px-6 py-4 font-medium">Source</th>
                                    <th className="px-6 py-4 font-medium text-center">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reels.map((reel) => (
                                    <tr key={reel.reel_id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gray-100 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-gray-400">
                                                    {reel.sort_order}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{reel.title}</div>
                                                    <div className="text-xs text-gray-500">{reel.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {reel.category_name ? (
                                                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-flex w-fit">
                                                        Auto: {reel.category_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No category (manual only)</span>
                                                )}
                                                <span className="text-xs text-gray-500">
                                                    {reel.manual_product_count} manual pick(s)
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${reel.is_active ? 'bg-emerald-500/20 text-emerald-600' : 'bg-gray-500/20 text-gray-500'}`}>
                                                {reel.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(reel)}
                                                    className="p-2 text-gray-400 hover:text-[#3B5D3B] hover:bg-[#3B5D3B]/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(reel)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">
                                {modalMode === 'create' ? 'Create Reel' : 'Edit Reel'}
                            </h2>
                            <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-2 hover:bg-gray-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="reelForm" onSubmit={handleSave} className="space-y-8">
                                {/* Basic Info Section */}
                                <div>
                                    <h3 className="text-sm font-semibold tracking-wide text-gray-900 mb-4 flex items-center gap-2">
                                        Display Info
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Title *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#3B5D3B] focus:ring-1 focus:ring-[#3B5D3B] outline-none transition-all"
                                                placeholder="e.g. Face Care Essentials"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Subtitle
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.subtitle}
                                                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#3B5D3B] focus:ring-1 focus:ring-[#3B5D3B] outline-none transition-all"
                                                placeholder="Optional italic text below title"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                "View All" Link Override (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.view_all_url}
                                                onChange={e => setFormData({ ...formData, view_all_url: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#3B5D3B] focus:ring-1 focus:ring-[#3B5D3B] outline-none transition-all"
                                                placeholder="e.g. /shop?category=face-care"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Configuration Section */}
                                <div>
                                    <h3 className="text-sm font-semibold tracking-wide text-gray-900 mb-4 flex items-center gap-2">
                                        Configuration
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 rounded-xl p-5 border border-gray-100">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.sort_order}
                                                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#3B5D3B] focus:ring-1 focus:ring-[#3B5D3B] outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Products</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={formData.max_products}
                                                onChange={e => setFormData({ ...formData, max_products: parseInt(e.target.value) || 12 })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#3B5D3B] focus:ring-1 focus:ring-[#3B5D3B] outline-none transition-all"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 pt-6 lg:justify-end">
                                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                                <input
                                                    type="checkbox"
                                                    id="toggleActive"
                                                    checked={formData.is_active}
                                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-200 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                                                    style={{ transform: formData.is_active ? 'translateX(100%)' : 'translateX(0)', borderColor: formData.is_active ? '#3B5D3B' : '#e5e7eb', background: formData.is_active ? '#3B5D3B' : '#fff' }}
                                                />
                                                <label htmlFor="toggleActive" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.is_active ? 'bg-[#3B5D3B]/20' : 'bg-gray-200'}`}></label>
                                            </div>
                                            <label htmlFor="toggleActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                Active Status
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Source Section */}
                                <div>
                                    <h3 className="text-sm font-semibold tracking-wide text-gray-900 mb-4 flex items-center gap-2">
                                        Content Source
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Auto population */}
                                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                            <label className="block text-sm font-medium text-blue-900 mb-2">
                                                Auto-populate from Category
                                            </label>
                                            <p className="text-xs text-blue-700 mb-4">
                                                Select a category to automatically fill the reel with its products.
                                                Manual picks below will appear first.
                                            </p>
                                            <div className="relative">
                                                <select
                                                    value={formData.category_id}
                                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-blue-200 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all appearance-none pr-10"
                                                >
                                                    <option value="">-- None (Manual Picks Only) --</option>
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Manual Picks */}
                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">Manual Picks</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Hand-picked products always appear first.</p>
                                                </div>
                                                <div className="relative w-full sm:w-72">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search products to add..."
                                                        value={productSearch}
                                                        onChange={e => setProductSearch(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#3B5D3B] focus:ring-1 focus:ring-[#3B5D3B] outline-none"
                                                    />
                                                    {searching && (
                                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Search Results Dropdown */}
                                            {searchResults.length > 0 && (
                                                <div className="bg-white border-b border-gray-200 max-h-60 overflow-y-auto">
                                                    {searchResults.map(p => (
                                                        <div key={p.product_id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                {p.thumbnail_url ? (
                                                                    <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-md object-cover border border-gray-100" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                                        <Layers className="h-4 w-4 text-gray-300" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900">{p.product_name}</div>
                                                                    <div className="text-xs text-gray-500">{p.slug}</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddProduct(p)}
                                                                className="text-[#3B5D3B] hover:bg-[#3B5D3B]/10 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Added Products List */}
                                            <div className="bg-white p-2">
                                                {/* Pending Adds */}
                                                {pendingProductsToAdd.map((p) => (
                                                    <div key={p.product_id} className="flex items-center justify-between p-3 mb-2 bg-[#3B5D3B]/5 rounded-lg border border-[#3B5D3B]/20">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-medium text-[#3B5D3B] bg-[#3B5D3B]/20 px-2 py-1 rounded">New</span>
                                                            <div className="text-sm font-medium text-gray-900">{p.product_name}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveProduct(p.product_id, true)}
                                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Existing Products */}
                                                {reelProducts.map((p, index) => {
                                                    const isRemoved = pendingProductIdsToRemove.has(p.product_id);
                                                    return (
                                                        <div
                                                            key={p.product_id}
                                                            className={`flex items-center justify-between p-3 mb-2 rounded-lg border transition-all ${isRemoved ? 'bg-gray-50 border-gray-100 opacity-50' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                {!isRemoved && (
                                                                    <div className="flex flex-col gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => moveProduct(index, 'up')}
                                                                            disabled={index === 0}
                                                                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                                                                        >
                                                                            ▲
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => moveProduct(index, 'down')}
                                                                            disabled={index === reelProducts.length - 1}
                                                                            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-0.5"
                                                                        >
                                                                            ▼
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {p.thumbnail_url ? (
                                                                    <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-md object-cover border border-gray-100" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                                        <Layers className="h-4 w-4 text-gray-300" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900 line-clamp-1">{p.product_name}</div>
                                                                    {isRemoved && <span className="text-xs text-red-500 font-medium mt-0.5 inline-block">Pending removal</span>}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isRemoved) {
                                                                        const newSet = new Set(pendingProductIdsToRemove);
                                                                        newSet.delete(p.product_id);
                                                                        setPendingProductIdsToRemove(newSet);
                                                                    } else {
                                                                        handleRemoveProduct(p.product_id, false);
                                                                    }
                                                                }}
                                                                className={`p-2 rounded-lg transition-colors ${isRemoved
                                                                    ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                                                    }`}
                                                            >
                                                                {isRemoved ? 'Undo' : <Trash2 className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                {reelProducts.length === 0 && pendingProductsToAdd.length === 0 && (
                                                    <div className="text-center py-8 text-sm text-gray-500">
                                                        No manual products selected.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setModalMode(null)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="reelForm"
                                disabled={saving}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-[#3B5D3B] hover:bg-[#2c472c] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {saving ? 'Saving...' : 'Save Reel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
