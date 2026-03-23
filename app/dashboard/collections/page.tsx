'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, Pencil, Trash2, Archive, Search, X, Loader2,
    Calendar, Star, StarOff, GripVertical, Package, Layers, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getAdminCollections, getAdminCollection, createCollection, updateCollection,
    deleteCollection, addCollectionProducts, removeCollectionProducts,
    searchProductsAdmin, SeasonalCollection, Product
} from '@/lib/api';

type ModalMode = 'create' | 'edit' | null;

export default function CollectionsPage() {
    const [collections, setCollections] = useState<SeasonalCollection[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editingCollection, setEditingCollection] = useState<SeasonalCollection | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '', description: '', image_url: '', icon: '', color_gradient: '',
        status: 'draft' as string, is_featured: false, sort_order: 0,
        start_date: '', end_date: '',
    });

    // Product picker state
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [searching, setSearching] = useState(false);
    const [collectionProducts, setCollectionProducts] = useState<any[]>([]);
    // Track products added/removed during form editing (before save)
    const [pendingProductsToAdd, setPendingProductsToAdd] = useState<Product[]>([]);
    const [pendingProductIdsToRemove, setPendingProductIdsToRemove] = useState<Set<string>>(new Set());

    const fetchCollections = useCallback(async () => {
        setLoading(true);
        const params: any = { limit: 50 };
        if (statusFilter) params.status = statusFilter;
        const result = await getAdminCollections(params);
        setCollections(result.rows);
        setTotal(result.total);
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { fetchCollections(); }, [fetchCollections]);

    // ── Debounced auto-search for products ──
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Clear previous timer
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        // If search is empty, clear results
        if (!productSearch.trim()) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        // Set a 300ms debounce
        setSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const results = await searchProductsAdmin(productSearch.trim());

                const existingTargetIds = new Set([
                    ...collectionProducts.map((p: any) => p.product_id),
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
            name: '', description: '', image_url: '', icon: '', color_gradient: '',
            status: 'draft', is_featured: false, sort_order: 0, start_date: '', end_date: '',
        });
        setEditingCollection(null);
        setCollectionProducts([]);
        setPendingProductsToAdd([]);
        setPendingProductIdsToRemove(new Set());
        setProductSearch('');
        setSearchResults([]);
        setModalMode('create');
    };

    const openEdit = async (col: SeasonalCollection) => {
        setFormData({
            name: col.name,
            description: col.description || '',
            image_url: col.image_url || '',
            icon: col.icon || '',
            color_gradient: col.color_gradient || '',
            status: col.status,
            is_featured: col.is_featured,
            sort_order: col.sort_order,
            start_date: col.start_date ? col.start_date.slice(0, 16) : '',
            end_date: col.end_date ? col.end_date.slice(0, 16) : '',
        });
        setEditingCollection(col);

        // Fetch products for this collection
        const detail = await getAdminCollection(col.collection_id);
        setCollectionProducts(detail?.products || []);

        setPendingProductsToAdd([]);
        setPendingProductIdsToRemove(new Set());
        setProductSearch('');
        setSearchResults([]);
        setModalMode('edit');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);

        const payload: any = { ...formData };
        if (!payload.start_date) payload.start_date = null;
        if (!payload.end_date) payload.end_date = null;

        let collectionId = editingCollection?.collection_id;
        let success = false;

        // 1. Create or Update the collection itself
        if (modalMode === 'create') {
            const result = await createCollection(payload);
            if (result?.success && result.data) {
                collectionId = result.data.collection_id;
                success = true;
                toast.success('Collection created!');
            } else {
                toast.error(result?.error || 'Failed to create collection');
            }
        } else if (modalMode === 'edit' && collectionId) {
            const result = await updateCollection(collectionId, payload);
            if (result?.success) {
                success = true;
                toast.success('Collection updated!');
            } else {
                toast.error(result?.error || 'Failed to update collection');
            }
        }

        // 2. Sync Products if collection save was successful
        if (success && collectionId) {
            let syncSuccess = true;

            // Remove products
            if (pendingProductIdsToRemove.size > 0) {
                const ok = await removeCollectionProducts(collectionId, Array.from(pendingProductIdsToRemove));
                if (!ok) {
                    syncSuccess = false;
                    toast.error('Failed to remove some products');
                }
            }

            // Add products
            if (pendingProductsToAdd.length > 0) {
                const result = await addCollectionProducts(collectionId, pendingProductsToAdd.map(p => p.product_id));
                if (!result.success) {
                    syncSuccess = false;
                    toast.error(result.error || 'Failed to add products');
                }
            }

            if (syncSuccess) {
                setModalMode(null);
                fetchCollections();
            } else {
                // If sync failed, we reload the collection data to stay consistent
                const detail = await getAdminCollection(collectionId);
                setCollectionProducts(detail?.products || []);
                setPendingProductsToAdd([]);
                setPendingProductIdsToRemove(new Set());
            }
        }

        setSaving(false);
    };

    const handleDelete = async (col: SeasonalCollection) => {
        if (!confirm(`Archive "${col.name}"? This will hide it from the storefront.`)) return;
        const ok = await deleteCollection(col.collection_id);
        if (ok) {
            toast.success('Collection archived');
            fetchCollections();
        } else {
            toast.error('Failed to archive collection');
        }
    };

    // Product search is now handled by the debounced useEffect above

    const handleAddProduct = (product: Product) => {
        // If it was pending removal, just un-remove it
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
        if (!window.confirm('Are you sure you want to remove this product from the collection?')) return;
        
        if (isPendingAdd) {
            setPendingProductsToAdd(prev => prev.filter(p => p.product_id !== productId));
        } else {
            setPendingProductIdsToRemove(prev => new Set(prev).add(productId));
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: 'bg-yellow-500/20 text-yellow-400',
            active: 'bg-emerald-500/20 text-emerald-400',
            archived: 'bg-gray-500/20 text-gray-400',
        };
        return (
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // Combined list of products to display in the modal
    const displayProducts = [
        ...collectionProducts.filter(p => !pendingProductIdsToRemove.has(p.product_id)),
        ...pendingProductsToAdd
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="font-serif text-4xl md:text-5xl font-bold text-gold mb-2">Seasonal Collections</h1>
                    <p className="text-[15px] font-semibold text-brown">Curate and manage product collections and seasonal offerings.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dark shadow-lg hover:shadow-primary/20 text-white text-sm font-bold rounded-2xl transition-all transform active:scale-95"
                >
                    <Plus className="w-5 h-5" /> New Collection
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-sidebar-bg/50 backdrop-blur-md p-2 rounded-2xl w-fit border border-border">
                <label className="text-xs text-text-muted uppercase font-semibold pl-3">Status</label>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="appearance-none rounded-xl border border-border bg-card-bg/60 backdrop-blur-sm px-6 py-2.5 text-sm font-bold text-text-primary focus:border-gold focus:outline-none cursor-pointer min-w-[150px] transition-all"
                >
                    <option value="">All Collections</option>
                    <option value="draft">Drafts</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                </select>
                <div className="h-6 w-px bg-border/50 mx-2" />
                <span className="text-sm font-bold text-text-muted pr-4">{total} Collection{total !== 1 ? 's' : ''}</span>
            </div>

            {/* Collections Table */}
            <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : collections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-text-muted">
                        <Layers className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">No collections found</p>
                        <button onClick={openCreate} className="mt-3 text-sm text-gold hover:text-gold/80">
                            Create your first collection →
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-text-muted">
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Collection</th>
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Products</th>
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Schedule</th>
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Featured</th>
                                    <th className="text-right px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map(col => (
                                    <tr key={col.collection_id} className="border-b border-border/50 hover:bg-gold/[0.03] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {col.image_url ? (
                                                    <img src={col.image_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-border" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center">
                                                        <Layers className="h-5 w-5 text-gold/50" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-text-primary">{col.name}</p>
                                                    <p className="text-xs text-text-muted">{col.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(col.status)}</td>
                                        <td className="px-4 py-3 text-text-muted">{col.product_count ?? 0}</td>
                                        <td className="px-4 py-3 text-xs text-text-muted">
                                            {col.start_date ? (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(col.start_date).toLocaleDateString()}
                                                    {col.end_date && ` → ${new Date(col.end_date).toLocaleDateString()}`}
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {col.is_featured ? (
                                                <Star className="h-4 w-4 fill-gold text-gold" />
                                            ) : (
                                                <StarOff className="h-4 w-4 text-text-muted/30" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(col)} title="Edit Collection & Products"
                                                    className="p-1.5 rounded-lg hover:bg-gold/10 text-text-muted hover:text-gold transition-colors">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                {col.status !== 'archived' && (
                                                    <button onClick={() => handleDelete(col)} title="Archive"
                                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors">
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Combined Create / Edit & Products Modal ── */}
            {(modalMode === 'create' || modalMode === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card-bg border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border bg-card-bg z-10 shrink-0">
                            <h4 className="font-serif text-xl font-bold text-gold">
                                {modalMode === 'create' ? 'Create Collection' : `Edit: ${editingCollection?.name}`}
                            </h4>
                            <button onClick={() => setModalMode(null)} className="text-text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

                            {/* Left Side: Collection Details Form */}
                            <div className="w-full md:w-1/2 p-5 overflow-y-auto border-r border-border custom-scrollbar">
                                <h4 className="font-serif text-xs font-semibold uppercase text-text-muted mb-4">Collection Details</h4>
                                <div className="space-y-4">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text" required
                                            value={formData.name}
                                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                            placeholder="Herbal Remedies 2026"
                                            className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                            rows={2}
                                            placeholder="A curated selection of refreshing herbal teas for summer..."
                                            className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none"
                                        />
                                    </div>

                                    {/* Image URL + Icon */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Image URL</label>
                                            <input
                                                type="url" value={formData.image_url}
                                                onChange={e => setFormData(p => ({ ...p, image_url: e.target.value }))}
                                                placeholder="https://..."
                                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Icon (Lucide name)</label>
                                            <input
                                                type="text" value={formData.icon}
                                                onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))}
                                                placeholder="Herbal, Wellness..."
                                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                            />
                                        </div>
                                    </div>

                                    {/* Status + Sort Order */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="active">Active</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">Sort Order</label>
                                            <input
                                                type="number" value={formData.sort_order}
                                                onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                                                className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                                min={0}
                                            />
                                        </div>
                                    </div>

                                    {/* Featured Toggle */}
                                    <div className="flex items-center justify-between rounded-lg border border-border bg-page-bg px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">Featured on Homepage</p>
                                            <p className="text-xs text-text-muted mt-0.5">
                                                {formData.is_featured ? 'Shown on storefront' : 'Hidden from storefront'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={formData.is_featured}
                                            onClick={() => setFormData(p => ({ ...p, is_featured: !p.is_featured }))}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold/40 focus:ring-offset-2 focus:ring-offset-page-bg ${formData.is_featured ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_featured ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {/* Schedule Dates */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                <Calendar className="inline w-3.5 h-3.5 mr-1" />Start Date
                                            </label>
                                            <input
                                                type="datetime-local" value={formData.start_date}
                                                onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
                                                className="w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                <Calendar className="inline w-3.5 h-3.5 mr-1" />End Date
                                            </label>
                                            <input
                                                type="datetime-local" value={formData.end_date}
                                                onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))}
                                                className="w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Product Management */}
                            <div className="w-full md:w-1/2 p-5 overflow-y-auto bg-page-bg/30 custom-scrollbar flex flex-col">
                                <h4 className="font-serif text-xs font-semibold uppercase text-text-muted mb-4">Collection Products &nbsp;·&nbsp; {displayProducts.length}</h4>

                                {/* Add Product Search */}
                                <div>
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                        <input
                                            type="text" value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                            className="w-full rounded-lg border border-border bg-page-bg pl-9 pr-16 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                            placeholder="Type to search products..."
                                            autoComplete="off"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                            {searching && <Loader2 className="w-4 h-4 animate-spin text-gold" />}
                                            {productSearch && !searching && (
                                                <button onClick={() => setProductSearch('')} className="p-0.5 rounded hover:bg-border text-text-muted hover:text-text-primary transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="mb-4 max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border/50 bg-card-bg custom-scrollbar shadow-md">
                                            {searchResults.map(product => (
                                                <div key={product.product_id} className="flex items-center justify-between px-3 py-2 hover:bg-gold/[0.03]">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {product.images?.[0] ? (
                                                            <img src={product.images[0]} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
                                                        ) : (
                                                            <div className="h-8 w-8 rounded bg-page-bg flex-shrink-0" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm text-text-primary truncate">{product.product_name}</p>
                                                            <p className="text-xs text-text-muted">{product.sku}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddProduct(product)}
                                                        className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-emerald-500/20"
                                                    >
                                                        <Plus className="h-3 w-3" /> Add
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Current Products */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar mt-2 pr-1 space-y-2">
                                    {displayProducts.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-text-muted h-full flex items-center justify-center flex-col gap-2">
                                            <Package className="w-8 h-8 opacity-20" />
                                            <span>No products selected. Search above to add.</span>
                                        </div>
                                    ) : (
                                        displayProducts.map((product: any, i: number) => {
                                            const isPendingAdd = pendingProductsToAdd.some(p => p.product_id === product.product_id);
                                            return (
                                                <div key={product.product_id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-card-bg ${isPendingAdd ? 'border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.05)]' : 'border-border/50'}`}>
                                                    <span className="text-xs font-semibold text-text-muted/50 w-4 flex-shrink-0 text-center">{i + 1}</span>
                                                    {product.thumbnail_url || product.images?.[0] ? (
                                                        <img src={product.thumbnail_url || product.images?.[0]} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0 border border-border" />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded bg-border flex-shrink-0" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-sm truncate ${isPendingAdd ? 'text-emerald-400 font-medium' : 'text-text-primary'}`}>
                                                            {product.product_name}
                                                        </p>
                                                        <p className="text-xs text-text-muted">{product.sku}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveProduct(product.product_id, isPendingAdd)}
                                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors flex-shrink-0"
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-border p-5 flex justify-end gap-3 shrink-0 bg-card-bg">
                            <button type="button" onClick={() => setModalMode(null)} disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors rounded-lg">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : modalMode === 'create' ? 'Create Collection' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
