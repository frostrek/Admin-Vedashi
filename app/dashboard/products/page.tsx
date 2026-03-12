'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { getProducts, deleteProduct, Product, getRankingOverrides, setRankingOverride, removeRankingOverride, RankingOverride, searchProductsAdmin, getProduct, updateVariantStatus, updateDefaultVariant, getDraftProducts } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, Package, Star, Loader2, Tag, ChevronDown, FileEdit, X } from 'lucide-react';
import toast from 'react-hot-toast';
import BulkDiscountModal from '@/components/BulkDiscountModal';
import BulkImportModal from '@/components/BulkImportModal';
import BulkExportModal from '@/components/BulkExportModal';
import { Download } from 'lucide-react';

const LOW_STOCK_THRESHOLD = 10;

export default function ProductsListPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filtered, setFiltered] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    // ─── Ranking override state ───
    const [overrideMap, setOverrideMap] = useState<Map<string, RankingOverride>>(new Map());
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
    const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);
    const [bulkExportOpen, setBulkExportOpen] = useState(false);
    const [draftsOpen, setDraftsOpen] = useState(false);
    const [drafts, setDrafts] = useState<Product[]>([]);
    const [draftsLoading, setDraftsLoading] = useState(false);

    // ─── Expanded variants state ───
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [productVariants, setProductVariants] = useState<Record<string, any[]>>({});
    const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set());

    const toggleExpand = async (productId: string) => {
        const nextIds = new Set(expandedIds);
        if (nextIds.has(productId)) {
            nextIds.delete(productId);
            setExpandedIds(nextIds);
            return;
        }

        nextIds.add(productId);
        setExpandedIds(nextIds);

        if (!productVariants[productId]) {
            setLoadingVariants(prev => new Set(prev).add(productId));
            const details = await getProduct(productId);
            if (details && details.variants) {
                const variants = details.variants;
                const hasDefault = variants.some((v: any) => v.is_default);
                const fetchedVariants = variants.map((v: any, index: number) => {
                    // Logic: if only 1 variant, or no variant is marked default, treat first one as default for UI
                    const effectivelyDefault = v.is_default || (variants.length === 1) || (!hasDefault && index === 0);
                    // Find matching image from assets using the same logic as the edit page
                    const allAssets = details.assets || [];
                    const specificImages = allAssets.filter((a: any) => {
                        const mt = (a.media_type || a.mime_type || '').toLowerCase();
                        const isImage = !mt.startsWith('video');
                        const belongsToVariant = a.variant_id === v.variant_id || (!a.variant_id && index === 0);
                        return isImage && belongsToVariant;
                    });

                    const thumbnail_url = specificImages.length > 0
                        ? (specificImages[0].base64_data || specificImages[0].asset_url)
                        : null;

                    return { ...v, thumbnail_url, effectivelyDefault };
                });
                setProductVariants(prev => ({ ...prev, [productId]: fetchedVariants }));
            }
            setLoadingVariants(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    const handleToggleVariantStatus = async (productId: string, variantId: string, currentStatus: boolean, isDefault: boolean) => {
        if (currentStatus === true && isDefault === true) {
            toast.error('Cannot deactivate the default variant. Set another variant as default first.');
            return;
        }

        const nextStatus = !currentStatus;

        // Optimistic UI update
        setProductVariants(prev => {
            const currentVariants = prev[productId] || [];
            return {
                ...prev,
                [productId]: currentVariants.map(v =>
                    (v.variant_id === variantId || v.sku === variantId) ? { ...v, is_active: nextStatus } : v
                )
            };
        });

        const success = await updateVariantStatus(productId, variantId, nextStatus);

        if (success) {
            toast.success(`Variant ${nextStatus ? 'activated' : 'deactivated'}`);
        } else {
            toast.error('Failed to update variant status');
            // Revert optimistic update
            setProductVariants(prev => {
                const currentVariants = prev[productId] || [];
                return {
                    ...prev,
                    [productId]: currentVariants.map(v =>
                        (v.variant_id === variantId || v.sku === variantId) ? { ...v, is_active: currentStatus } : v
                    )
                };
            });
        }
    };

    const handleSetDefaultVariant = async (productId: string, variantId: string, isCurrentlyDefault: boolean, isActive: boolean) => {
        if (isCurrentlyDefault) return; // Already default
        if (isActive === false) {
            toast.error('Cannot set an inactive variant as the default. Activate it first.');
            return;
        }

        // Optimistic UI update
        setProductVariants(prev => {
            const currentVariants = prev[productId] || [];
            return {
                ...prev,
                [productId]: currentVariants.map(v => ({
                    ...v,
                    is_default: (v.variant_id === variantId || v.sku === variantId),
                    effectivelyDefault: (v.variant_id === variantId || v.sku === variantId)
                }))
            };
        });

        const success = await updateDefaultVariant(productId, variantId);

        if (success) {
            toast.success('Default variant updated');
        } else {
            toast.error('Failed to update default variant');
            // We could revert optimistic update here, but it generally requires keeping track of the previous default.
            // For simplicity, we can reload or let the user try again.
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        const data = await getProducts();
        setProducts(data);
        setFiltered(data);
        setLoading(false);
    };

    const loadOverrides = useCallback(async () => {
        const overrides = await getRankingOverrides();
        const map = new Map<string, RankingOverride>();
        overrides.forEach(o => map.set(o.product_id, o));
        setOverrideMap(map);
    }, []);

    useEffect(() => {
        loadProducts();
        loadOverrides();
    }, [loadOverrides]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const fetchSearch = async () => {
            if (!debouncedSearch) {
                setFiltered(products);
                return;
            }
            setLoading(true);
            const results = await searchProductsAdmin(debouncedSearch);
            setFiltered(results);
            setLoading(false);
        };
        fetchSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const success = await deleteProduct(id);
        if (success) {
            toast.success('Product deleted');
            loadProducts();
        } else {
            toast.error('Failed to delete product');
        }
    };

    // ─── Best Seller toggle ───
    const handleToggleBestSeller = async (productId: string) => {
        const isCurrentlyOn = overrideMap.has(productId);

        // Optimistic update
        setTogglingIds(prev => new Set(prev).add(productId));

        if (isCurrentlyOn) {
            // Optimistically remove
            setOverrideMap(prev => {
                const next = new Map(prev);
                next.delete(productId);
                return next;
            });

            const ok = await removeRankingOverride(productId);
            if (ok) {
                toast.success('Best Seller removed');
            } else {
                // Revert
                await loadOverrides();
                toast.error('Failed to remove override');
            }
        } else {
            // Optimistically add with default priority 100
            const optimistic: RankingOverride = {
                override_id: 'temp',
                product_id: productId,
                priority: 100,
                reason: 'Admin promoted',
                expires_at: null,
                created_at: new Date().toISOString(),
            };
            setOverrideMap(prev => new Map(prev).set(productId, optimistic));

            const result = await setRankingOverride(productId, 100, 'Admin promoted');
            if (result.success) {
                toast.success('Best Seller added');
                // Reload to get real override_id
                await loadOverrides();
            } else {
                // Revert
                setOverrideMap(prev => {
                    const next = new Map(prev);
                    next.delete(productId);
                    return next;
                });
                toast.error(result.error || 'Failed to add override');
            }
        }

        setTogglingIds(prev => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
        });
    };

    const handleDeleteDraft = async (id: string, name: string) => {
        if (!confirm(`Delete draft "${name}"? This cannot be undone.`)) return;
        const success = await deleteProduct(id);
        if (success) {
            toast.success('Draft deleted');
            setDrafts(prev => prev.filter(d => d.product_id !== id));
        } else {
            toast.error('Failed to delete draft');
        }
    };

    const openDrafts = async () => {
        setDraftsOpen(true);
        setDraftsLoading(true);
        const data = await getDraftProducts();
        setDrafts(data);
        setDraftsLoading(false);
    };

    const getStockBadge = (qty: number) => {
        if (qty <= 0) return { text: 'Out of stock', className: 'bg-red-100 text-red-700 border-red-200' };
        if (qty <= LOW_STOCK_THRESHOLD) return { text: `${qty} left`, className: 'bg-amber-50 text-amber-700 border-amber-200' };
        return { text: `${qty} in stock`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Products</h1>
                    <p className="text-sm text-text-secondary">{products.length} total products</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button
                        onClick={openDrafts}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card-bg px-3 sm:px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-gold hover:border-gold/30 transition-all duration-300"
                    >
                        <FileEdit className="h-4 w-4" />
                        <span className="hidden sm:inline">Drafts</span>
                    </button>
                    <button
                        onClick={() => setBulkImportOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 sm:px-4 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold/[0.12] hover:border-gold/30 transition-all duration-300"
                    >
                        <Package className="h-4 w-4" />
                        <span className="hidden sm:inline">Bulk Import</span>
                    </button>
                    <button
                        onClick={() => setBulkDiscountOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 sm:px-4 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold/[0.12] hover:border-gold/30 transition-all duration-300"
                    >
                        <Tag className="h-4 w-4" />
                        <span className="hidden sm:inline">Bulk Actions</span>
                    </button>
                    <button
                        onClick={() => setBulkExportOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 sm:px-4 py-2.5 text-sm font-semibold text-gold-soft hover:bg-gold/[0.12] hover:border-gold/30 transition-all duration-300"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Bulk Export</span>
                    </button>
                    <Link
                        href="/dashboard/products/add"
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300"
                    >
                        <Plus className="h-4 w-4" /> Add Product
                    </Link>
                </div>
            </div>
            <BulkDiscountModal
                isOpen={bulkDiscountOpen}
                onClose={() => setBulkDiscountOpen(false)}
                onApply={() => { loadProducts(); setBulkDiscountOpen(false); }}
            />
            <BulkImportModal
                isOpen={bulkImportOpen}
                onClose={() => setBulkImportOpen(false)}
                onSuccess={loadProducts}
            />
            <BulkExportModal
                isOpen={bulkExportOpen}
                onClose={() => setBulkExportOpen(false)}
                products={products}
            />

            {/* ── Drafts Modal ── */}
            {draftsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setDraftsOpen(false)}
                    />

                    {/* Modal Card */}
                    <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                        {/* Header */}
                        <div className="px-7 pt-7 pb-5">
                            <div className="flex items-start justify-between mb-1">
                                <div>
                                    <h2 className="font-serif text-2xl font-bold text-[#8B4A1C]">Draft Products</h2>
                                    <p className="text-sm text-[#9C7B5B] mt-1">
                                        {draftsLoading
                                            ? 'Loading your drafts...'
                                            : `${drafts.length} draft${drafts.length !== 1 ? 's' : ''} saved — pick up where you left off.`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDraftsOpen(false)}
                                    className="rounded-full p-1.5 text-[#9C7B5B] hover:bg-[#F5EDE2] transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="mt-5 border-t border-[#EDE0D0]" />
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-7 pb-3">
                            {draftsLoading ? (
                                <div className="flex flex-col gap-3 py-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-[72px] rounded-xl bg-[#FAF4ED] animate-pulse" />
                                    ))}
                                </div>
                            ) : drafts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                    <div className="h-14 w-14 rounded-full bg-[#F5EDE2] flex items-center justify-center">
                                        <FileEdit className="h-7 w-7 text-[#C49A6C]" />
                                    </div>
                                    <p className="text-sm font-medium text-[#8B6B4A]">No drafts saved yet</p>
                                    <p className="text-xs text-[#B09070] text-center max-w-[220px]">
                                        Start filling a product form and click&nbsp;<strong>Save as Draft</strong>&nbsp;to continue later.
                                    </p>
                                    <Link
                                        href="/dashboard/products/add"
                                        onClick={() => setDraftsOpen(false)}
                                        className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#8B4A1C] px-4 py-2 text-sm font-semibold text-[#F5EDE2] hover:bg-[#7A3F18] transition-colors"
                                    >
                                        <Plus className="h-4 w-4" /> New Product
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col divide-y divide-[#EDE0D0]">
                                    {drafts.map(draft => (
                                        <div
                                            key={draft.product_id}
                                            className="group flex items-center gap-4 py-4 px-1 hover:bg-[#FAF4ED] rounded-xl transition-colors duration-150 -mx-1 px-2"
                                        >
                                            {/* Thumbnail */}
                                            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-[#F5EDE2] border border-[#E8D5BC] flex items-center justify-center overflow-hidden">
                                                {draft.images && draft.images.length > 0 ? (
                                                    <img src={draft.images[0]} alt={draft.product_name} className="h-12 w-12 object-cover" />
                                                ) : (
                                                    <span className="text-xl">🌿</span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[#4A2C1A] truncate">{draft.product_name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {draft.sku && (
                                                        <span className="font-mono text-[10px] text-[#9C7B5B] bg-[#F5EDE2] px-1.5 py-0.5 rounded">
                                                            {draft.sku}
                                                        </span>
                                                    )}
                                                    {draft.category && (
                                                        <span className="text-[10px] text-[#B09070]">{draft.category}</span>
                                                    )}
                                                </div>
                                                {draft.created_at && (
                                                    <p className="text-[10px] text-[#C4A882] mt-0.5">
                                                        Saved {new Date(draft.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <Link
                                                    href={`/dashboard/products/edit/${draft.slug || draft.product_id}`}
                                                    className="flex items-center gap-1.5 rounded-lg bg-[#8B4A1C] px-3 py-1.5 text-xs font-semibold text-[#F5EDE2] hover:bg-[#7A3F18] transition-colors"
                                                    title="Continue editing"
                                                >
                                                    <Pencil className="h-3 w-3" /> Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.product_id, draft.product_name)}
                                                    className="rounded-lg p-1.5 text-[#C49A6C] hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Delete draft"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-7 py-5 border-t border-[#EDE0D0] flex items-center justify-between bg-[#FAF7F3]">
                            <p className="text-xs text-[#B09070]">Drafts are not visible to customers.</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setDraftsOpen(false)}
                                    className="text-sm font-medium text-[#9C7B5B] hover:text-[#6B3A14] transition-colors px-1"
                                >
                                    Close
                                </button>
                                <Link
                                    href="/dashboard/products/add"
                                    onClick={() => setDraftsOpen(false)}
                                    className="flex items-center gap-1.5 rounded-lg bg-[#8B4A1C] px-4 py-2 text-sm font-semibold text-[#F5EDE2] hover:bg-[#7A3F18] transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> New Product
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* Search */}
            <div className="mb-4 relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full rounded-lg border border-border bg-card-bg pl-10 pr-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none transition-colors duration-300"
                />
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-page-bg">
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Product</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">SKU</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Price</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider text-center">Best Seller</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider">Stock</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gold-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={7} className="px-4 py-4">
                                            <div className="h-5 animate-shimmer rounded" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Package className="mx-auto h-10 w-10 text-text-muted/40 mb-2" />
                                        <p className="text-sm text-text-muted">No products found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(product => {
                                    const qty = product.stock_quantity ?? product.quantity ?? 0;
                                    const badge = getStockBadge(qty);
                                    const override = overrideMap.get(product.product_id);
                                    const isBestSeller = !!override;
                                    const isToggling = togglingIds.has(product.product_id);

                                    return (
                                        <Fragment key={product.product_id}>
                                            <tr className="hover:bg-gold/[0.03] transition-all duration-300 group">
                                                <td className="px-4 py-3 pl-8">
                                                    <div className="flex items-center gap-3 relative">
                                                        <div className={`absolute -left-6 transition-opacity duration-200 cursor-pointer ${expandedIds.has(product.product_id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                            <button onClick={() => toggleExpand(product.product_id)} className="text-text-muted hover:text-gold focus:outline-none">
                                                                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${expandedIds.has(product.product_id) ? 'rotate-180' : ''}`} />
                                                            </button>
                                                        </div>
                                                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary/15 border border-primary/10 flex items-center justify-center overflow-hidden">
                                                            {product.images && product.images.length > 0 ? (
                                                                <img
                                                                    src={product.images[0]}
                                                                    alt={product.product_name}
                                                                    className="h-10 w-10 rounded-lg object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-lg">🌿</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-text-primary">{product.product_name}</p>
                                                            {product.brand && <p className="text-xs text-text-muted">{product.brand}</p>}
                                                        </div>
                                                    </div>

                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-text-secondary">{product.sku}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {product.category && (
                                                        <span className="inline-block rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-muted">
                                                            {product.category}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gold">
                                                    ₹{(product.price ?? 0).toLocaleString('en-IN')}
                                                </td>

                                                {/* ─── Best Seller Column ─── */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <button
                                                            onClick={() => handleToggleBestSeller(product.product_id)}
                                                            disabled={isToggling}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:ring-offset-1 focus:ring-offset-card-bg ${isBestSeller
                                                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                                                : 'bg-border'
                                                                } ${isToggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                                                            title={isBestSeller ? 'Remove Best Seller' : 'Mark as Best Seller'}
                                                        >
                                                            {isToggling ? (
                                                                <span className="absolute inset-0 flex items-center justify-center">
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${isBestSeller ? 'translate-x-5.5' : 'translate-x-0.5'
                                                                        }`}
                                                                >
                                                                    {isBestSeller && <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />}
                                                                </span>
                                                            )}
                                                        </button>

                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                                                        {badge.text}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            href={`/dashboard/products/edit/${product.slug || product.product_id}`}
                                                            className="rounded-lg p-2 text-text-muted hover:text-gold hover:bg-gold/[0.08] transition-all duration-300"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(product.product_id, product.product_name)}
                                                            className="rounded-lg p-2 text-text-muted hover:text-danger hover:bg-danger/[0.08] transition-all duration-300"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedIds.has(product.product_id) && (
                                                <tr className="bg-card-bg-elevated/40 border-b border-border/50">
                                                    <td colSpan={7} className="px-4 py-3 pl-12">
                                                        {loadingVariants.has(product.product_id) ? (
                                                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                                                <Loader2 className="h-4 w-4 animate-spin" /> Fetching variants...
                                                            </div>
                                                        ) : productVariants[product.product_id]?.length > 0 ? (
                                                            <div className="rounded-lg border border-border/50 overflow-hidden bg-card-bg">
                                                                <table className="w-full text-left text-sm">
                                                                    <thead className="bg-page-bg/50 border-b border-border-subtle">
                                                                        <tr>
                                                                            <th className="px-4 py-2 font-medium text-text-secondary text-xs uppercase tracking-wider">Image</th>
                                                                            <th className="px-4 py-2 font-medium text-text-secondary text-xs uppercase tracking-wider">Name</th>
                                                                            <th className="px-4 py-2 font-medium text-text-secondary text-xs uppercase tracking-wider">SKU</th>
                                                                            <th className="px-4 py-2 font-medium text-text-secondary text-xs uppercase tracking-wider">Specification</th>
                                                                            <th className="px-4 py-2 font-medium text-text-secondary text-xs uppercase tracking-wider">Price</th>
                                                                            <th className="px-4 py-2 font-medium text-text-secondary text-xs uppercase tracking-wider">Stock</th>
                                                                            <th className="px-4 py-2 font-medium text-text-secondary text-xs uppercase tracking-wider text-right">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border-subtle">
                                                                        {productVariants[product.product_id].map((v: any) => {
                                                                            const vBadge = getStockBadge(v.stock_quantity ?? 0);
                                                                            const targetId = v.variant_id || v.sku;
                                                                            return (
                                                                                <tr key={targetId} className={`hover:bg-gold/[0.02] ${v.is_active === false ? 'opacity-60' : ''}`}>
                                                                                    <td className="px-4 py-2">
                                                                                        <div className="h-8 w-8 rounded bg-primary/10 border border-primary/5 flex items-center justify-center overflow-hidden">
                                                                                            {v.thumbnail_url || product.images?.[0] ? (
                                                                                                <img src={v.thumbnail_url || product.images?.[0]} className="h-8 w-8 object-cover" alt="Variant" />
                                                                                            ) : (
                                                                                                <Package className="h-4 w-4 text-text-muted" />
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-text-primary font-medium">{v.variant_name || 'Default Variant'}</td>
                                                                                    <td className="px-4 py-2 font-mono text-xs text-text-secondary">{v.variant_sku || v.sku}</td>
                                                                                    <td className="px-4 py-2 text-xs text-text-secondary whitespace-nowrap">
                                                                                        {[
                                                                                            v.size_label && v.size_label !== 'Standard' ? v.size_label : '',
                                                                                            v.pack_quantity > 1 ? `Pack of ${v.pack_quantity}` : ''
                                                                                        ].filter(Boolean).join(' - ') || 'Standard'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 font-medium text-gold">₹{(parseFloat(v.price) || 0).toLocaleString('en-IN')}</td>
                                                                                    <td className="px-4 py-2">
                                                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${vBadge.className}`}>
                                                                                            {vBadge.text}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-right">
                                                                                        <div className="flex items-center justify-end gap-3">
                                                                                            <button
                                                                                                onClick={() => handleSetDefaultVariant(product.product_id, targetId, !!v.effectivelyDefault, v.is_active !== false)}
                                                                                                className={`focus:outline-none transition-all duration-300 
                                                                                                    ${v.effectivelyDefault ? 'text-amber-500 cursor-default' : 'text-text-muted hover:text-amber-500/50 cursor-pointer'}
                                                                                                    ${v.is_active === false ? 'opacity-30 cursor-not-allowed hover:text-text-muted' : ''}
                                                                                                `}
                                                                                                title={v.effectivelyDefault ? "Default Variant" : (v.is_active === false ? "Cannot set inactive variant as default" : "Set as Default")}
                                                                                            >
                                                                                                <Star className={`h-4 w-4 transition-all duration-300 ${v.effectivelyDefault ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : ''}`} />
                                                                                            </button>

                                                                                            <button
                                                                                                onClick={() => handleToggleVariantStatus(product.product_id, targetId, v.is_active !== false, v.is_default)}
                                                                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-card-bg 
                                                                                                    ${v.is_active !== false ? 'bg-green-500 focus:ring-green-500/30' : 'bg-gray-400 focus:ring-gray-400/30'}
                                                                                                    ${v.is_default ? 'opacity-60 cursor-not-allowed' : ''}
                                                                                                `}
                                                                                                title={v.is_default ? "Cannot deactivate default variant" : (v.is_active !== false ? "Deactivate Variant" : "Activate Variant")}
                                                                                            >
                                                                                                <span
                                                                                                    className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${v.is_active !== false ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                                                                                                />
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-text-muted italic">No variants available for this product.</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody >
                    </table >
                </div >
            </div >
        </div >
    );
}
