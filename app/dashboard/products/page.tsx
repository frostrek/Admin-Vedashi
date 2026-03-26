'use client';

import { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import Link from 'next/link';
import { getProducts, deleteProduct, bulkDeleteProducts, Product, getRankingOverrides, setRankingOverride, removeRankingOverride, RankingOverride, searchProductsAdmin, getProduct, updateVariantStatus, updateDefaultVariant, getDraftProducts, updateProduct } from '@/lib/api';
import { getCategories } from '@/lib/api/category';
import { Category } from '@/types/category';
import { Download, SlidersHorizontal, Filter, Package, Star, Loader2, Tag, ChevronDown, FileEdit, X, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Search, UploadCloud } from 'lucide-react';
import SortableHeader, { SortDir, compare } from '@/components/SortableHeader';
import toast from 'react-hot-toast';
import BulkDiscountModal from '@/components/BulkDiscountModal';
import BulkImportModal from '@/components/BulkImportModal';
import BulkExportModal from '@/components/BulkExportModal';
import ConfirmModal from '@/components/ConfirmModal';
import PriceRangeSlider from '@/components/PriceRangeSlider';

const LOW_STOCK_THRESHOLD = 10;

export default function ProductsListPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filtered, setFiltered] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSubCategory, setFilterSubCategory] = useState<string>('all');
    const [filterStock, setFilterStock] = useState<string>('all');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
    const [absoluteMaxPrice, setAbsoluteMaxPrice] = useState(10000);
    const [filterBestSeller, setFilterBestSeller] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [searchResults, setSearchResults] = useState<Product[] | null>(null);
    // ─── Ranking override state ───
    const [overrideMap, setOverrideMap] = useState<Map<string, RankingOverride>>(new Map());
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
    const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);
    const [bulkExportOpen, setBulkExportOpen] = useState(false);
    const [draftsOpen, setDraftsOpen] = useState(false);
    const [drafts, setDrafts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());
    const [draftsLoading, setDraftsLoading] = useState(false);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);

    // ─── Drafts filtering and selection ───
    const [draftSearchQuery, setDraftSearchQuery] = useState('');
    const [draftFilterCategory, setDraftFilterCategory] = useState('all');
    const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());

    // ─── Custom Confirm Modal state ───
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmVariant?: 'danger' | 'primary';
        confirmLabel?: string;
        loading?: boolean;
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { },
        confirmLabel: 'Confirm',
        loading: false
    });
    
    // Lock background scroll when Drafts modal is open
    useEffect(() => {
        if (draftsOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [draftsOpen]);

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
                    // Logic: Specific Variant -> Default Variant -> Product Level
                    const allAssets = details.assets || [];
                    const defaultVariantId = variants.find((v: any) => v.is_default)?.variant_id;

                    const getFilteredAssets = (vid: string | null) => allAssets.filter((a: any) => {
                        const mt = (a.media_type || a.mime_type || '').toLowerCase();
                        const isImage = !mt.startsWith('video');
                        return isImage && a.variant_id === vid;
                    });

                    let bestImages = getFilteredAssets(v.variant_id); // 1. Specific
                    if (bestImages.length === 0) {
                        bestImages = getFilteredAssets(null); // 2. Fallback to Product Level
                    }
                    if (bestImages.length === 0 && defaultVariantId && v.variant_id !== defaultVariantId) {
                        bestImages = getFilteredAssets(defaultVariantId); // 3. Fallback to Default Variant
                    }

                    // Sort bestImages to respect is_primary and sort_order if they exist
                    bestImages.sort((a: any, b: any) => {
                        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
                        return (a.sort_order || 0) - (b.sort_order || 0);
                    });

                    const thumbnail_url = bestImages.length > 0
                        ? (bestImages[0].cdn_url || bestImages[0].asset_url || bestImages[0].base64_data)
                        : null;

                    return { ...v, thumbnail_url, effectivelyDefault };
                });
                setProductVariants(prev => ({ ...prev, [productId]: fetchedVariants }));
                
                // If the product was already selected, make sure newly loaded variants are also selected
                if (selectedIds.has(productId)) {
                    setSelectedVariantIds(prev => {
                        const next = new Set(prev);
                        fetchedVariants.forEach((v: any) => {
                            next.add(v.variant_id || v.sku);
                        });
                        return next;
                    });
                }
                
                // Update the main product row image to match the default variant discovered in details
                const defaultVariant = fetchedVariants.find(v => v.effectivelyDefault);
                if (defaultVariant?.thumbnail_url) {
                    const updateList = (list: Product[]) => list.map(p => 
                        p.product_id === productId ? { ...p, images: [defaultVariant.thumbnail_url] } : p
                    );
                    setProducts(prev => updateList(prev));
                    setFiltered(prev => updateList(prev));
                }
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
            
            // Also update the main product image in the list to match the new default variant
            const newDefaultVariant = productVariants[productId]?.find(v => (v.variant_id === variantId || v.sku === variantId));
            if (newDefaultVariant?.thumbnail_url) {
                const updateProductInList = (list: Product[]) => list.map(p => 
                    p.product_id === productId 
                        ? { ...p, images: [newDefaultVariant.thumbnail_url, ...(p.images || []).slice(1)] } 
                        : p
                );
                setProducts(prev => updateProductInList(prev));
                setFiltered(prev => updateProductInList(prev));
            }
        } else {
            toast.error('Failed to update default variant');
            // We could revert optimistic update here, but it generally requires keeping track of the previous default.
            // For simplicity, we can reload or let the user try again.
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const [productsData, categoriesData] = await Promise.all([
                getProducts(),
                getCategories()
            ]);
            setProducts(productsData);
            setAllCategories(categoriesData);
        } catch (error) {
            console.error('Error loading products/categories:', error);
            const productsData = await getProducts();
            setProducts(productsData);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (products.length > 0) {
            const max = Math.max(...products.map(p => p.price ?? 0), 1000);
            setAbsoluteMaxPrice(Math.ceil(max / 100) * 100);
            setPriceRange(prev => ({ ...prev, max: Math.ceil(max / 100) * 100 }));
        }
    }, [products]);

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
                setSearchResults(null);
                return;
            }
            setLoading(true);
            const results = await searchProductsAdmin(debouncedSearch);
            setSearchResults(results);
            setLoading(false);
        };
        fetchSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    useEffect(() => {
        let base = searchResults !== null ? searchResults : products;
        
        if (filterCategory !== 'all') {
            if (filterCategory === 'none') {
                base = base.filter(p => !p.category_id);
            } else {
                const targetCat = allCategories.find(c => c.name === filterCategory);
                if (filterSubCategory !== 'all') {
                    const targetSub = allCategories.find(c => c.name === filterSubCategory && c.parent_id === targetCat?.category_id);
                    if (targetSub) {
                        base = base.filter(p => p.category_id === targetSub.category_id);
                    } else {
                        // Fallback to name match for legacy/unmapped categories
                        base = base.filter(p => p.category === filterSubCategory);
                    }
                } else {
                    if (targetCat) {
                        const idsToInclude = [targetCat.category_id];
                        const children = allCategories.filter(c => c.parent_id === targetCat.category_id);
                        children.forEach(child => idsToInclude.push(child.category_id));
                        base = base.filter(p => (p.category_id && idsToInclude.includes(p.category_id)) || p.category === filterCategory);
                    } else {
                        base = base.filter(p => p.category === filterCategory);
                    }
                }
            }
        }
        
        if (filterStock !== 'all') {
            base = base.filter(p => {
                const qty = p.stock_quantity ?? p.quantity ?? 0;
                if (filterStock === 'in_stock') return qty > LOW_STOCK_THRESHOLD;
                if (filterStock === 'low_stock') return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
                if (filterStock === 'out_of_stock') return qty <= 0;
                return true;
            });
        }
        
        if (priceRange.min > 0 || priceRange.max < absoluteMaxPrice) {
            base = base.filter(p => {
                const price = p.price ?? 0;
                return price >= priceRange.min && price <= priceRange.max;
            });
        }
        
        if (filterBestSeller === 'best_seller') {
            base = base.filter(p => overrideMap.has(p.product_id));
        }
        
        setFiltered(base);
        setCurrentPage(1); // Reset to first page when filters change
    }, [products, searchResults, filterCategory, filterSubCategory, filterStock, priceRange, absoluteMaxPrice, filterBestSeller, overrideMap, allCategories]);

    // --- Sort + Pagination helpers ---
    const handleSort = (key: string, dir: SortDir) => {
        setSortKey(dir ? key : null);
        setSortDir(dir);
    };

    const sortedFiltered = useMemo(() => {
        if (!sortKey || !sortDir) return filtered;
        return [...filtered].sort((a, b) => compare(a, b, sortKey, sortDir));
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage);
    const paginatedProducts = sortedFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmModal({
            open: true,
            title: 'Delete Product',
            message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
            confirmVariant: 'danger',
            onConfirm: async () => {
                const success = await deleteProduct(id);
                if (success) {
                    toast.success('Product deleted');
                    loadProducts();
                } else {
                    toast.error('Failed to delete product');
                }
                setConfirmModal(prev => ({ ...prev, open: false }));
            }
        });
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

    const handleDeleteDraft = (id: string, name: string) => {
        setConfirmModal({
            open: true,
            title: 'Delete Draft',
            message: `Are you sure you want to delete draft "${name}"? This cannot be undone.`,
            confirmVariant: 'danger',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                const success = await deleteProduct(id);
                if (success) {
                    toast.success('Draft deleted');
                    setDrafts(prev => prev.filter(d => d.product_id !== id));
                    setSelectedDraftIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                } else {
                    toast.error('Failed to delete draft');
                }
                setConfirmModal(prev => ({ ...prev, open: false }));
            }
        });
    };

    const filteredDrafts = useMemo(() => {
        let result = drafts;
        if (draftFilterCategory !== 'all') {
            if (draftFilterCategory === 'none') {
                result = result.filter(d => !d.category);
            } else {
                result = result.filter(d => d.category === draftFilterCategory);
            }
        }
        if (draftSearchQuery.trim()) {
            const q = draftSearchQuery.toLowerCase();
            result = result.filter(d => 
                (d.product_name && d.product_name.toLowerCase().includes(q)) || 
                (d.sku && d.sku.toLowerCase().includes(q)) ||
                (d.category && d.category.toLowerCase().includes(q)) ||
                (d.brand && d.brand.toLowerCase().includes(q))
            );
        }
        return result;
    }, [drafts, draftFilterCategory, draftSearchQuery]);

    const handleToggleSelectDraft = (id: string) => {
        setSelectedDraftIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleSelectAllDrafts = () => {
        const allSelected = filteredDrafts.length > 0 && filteredDrafts.every(d => selectedDraftIds.has(d.product_id));
        if (allSelected) {
            setSelectedDraftIds(new Set());
        } else {
            setSelectedDraftIds(new Set(filteredDrafts.map(d => d.product_id)));
        }
    };

    const handleBulkDeleteProducts = () => {
        if (selectedIds.size === 0) return;
        setConfirmModal({
            open: true,
            title: 'Delete Selected Products',
            message: `Are you sure you want to completely delete ${selectedIds.size} product(s) and all their variants? This action cannot be undone.`,
            confirmVariant: 'danger',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, loading: true }));
                const { success, successCount, failedCount, error } = await bulkDeleteProducts(Array.from(selectedIds));
                if (success) {
                    toast.success(`Successfully deleted ${successCount} product(s)`);
                    if (failedCount && failedCount > 0) {
                        toast.error(`Failed to delete ${failedCount} product(s)`);
                    }
                    setSelectedIds(new Set());
                    setSelectedVariantIds(new Set());
                    loadProducts();
                } else {
                    toast.error(error || 'Failed to bulk delete products');
                }
                setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
            }
        });
    };

    const handleBulkPublishDrafts = () => {
        if (selectedDraftIds.size === 0) return;
        setConfirmModal({
            open: true,
            title: 'Publish Selected Drafts',
            message: `Are you sure you want to publish the ${selectedDraftIds.size} selected draft(s)? They will become active and visible to customers.`,
            confirmVariant: 'primary',
            confirmLabel: 'Publish',
            onConfirm: async () => {
                setDraftsLoading(true);
                let successCount = 0;
                for (const id of Array.from(selectedDraftIds)) {
                    const { success } = await updateProduct(id, { status: 'active' });
                    if (success) successCount++;
                }
                toast.success(`Published ${successCount} product(s)`);
                setDrafts(prev => prev.filter(d => !selectedDraftIds.has(d.product_id)));
                setSelectedDraftIds(new Set());
                setConfirmModal(prev => ({ ...prev, open: false }));
                setDraftsLoading(false);
                loadProducts(); // Refresh the main listing
            }
        });
    };

    const handleBulkDeleteDrafts = () => {
        if (selectedDraftIds.size === 0) return;
        setConfirmModal({
            open: true,
            title: 'Delete Selected Drafts',
            message: `Are you sure you want to delete ${selectedDraftIds.size} draft(s)? This cannot be undone.`,
            confirmVariant: 'danger',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                setDraftsLoading(true);
                let successCount = 0;
                for (const id of Array.from(selectedDraftIds)) {
                    const success = await deleteProduct(id);
                    if (success) successCount++;
                }
                toast.success(`Deleted ${successCount} draft(s)`);
                setDrafts(prev => prev.filter(d => !selectedDraftIds.has(d.product_id)));
                setSelectedDraftIds(new Set());
                setConfirmModal(prev => ({ ...prev, open: false }));
                setDraftsLoading(false);
            }
        });
    };

    const openDrafts = async () => {
        setDraftsOpen(true);
        setDraftsLoading(true);
        setSelectedDraftIds(new Set());
        setDraftSearchQuery('');
        setDraftFilterCategory('all');
        const data = await getDraftProducts();
        setDrafts(data);
        setDraftsLoading(false);
    };

    const handleToggleSelect = (id: string) => {
        const isSelected = selectedIds.has(id);
        
        // 1. Update product selection state
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (isSelected) next.delete(id);
            else next.add(id);
            return next;
        });

        // 2. Sync variants: add/remove all current variants of this product to/from selection
        const variants = productVariants[id] || [];
        if (variants.length > 0) {
            setSelectedVariantIds(prev => {
                const next = new Set(prev);
                variants.forEach((v: any) => {
                    const vId = v.variant_id || v.sku;
                    if (isSelected) next.delete(vId);
                    else next.add(vId);
                });
                return next;
            });
        }
    };

    const handleToggleSelectAll = () => {
        const currentPageIds = paginatedProducts.map(p => p.product_id);
        const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                currentPageIds.forEach(id => next.delete(id));
            } else {
                currentPageIds.forEach(id => next.add(id));
            }
            return next;
        });

        // Sync variants for all products being toggled
        setSelectedVariantIds(prev => {
            const next = new Set(prev);
            currentPageIds.forEach(id => {
                const variants = productVariants[id] || [];
                variants.forEach((v: any) => {
                    const vId = v.variant_id || v.sku;
                    if (allSelected) next.delete(vId);
                    else next.add(vId);
                });
            });
            return next;
        });
    };

    const handleToggleVariantSelect = (productId: string, variantId: string) => {
        const isSelected = selectedVariantIds.has(variantId);
        
        setSelectedVariantIds(prev => {
            const next = new Set(prev);
            if (isSelected) next.delete(variantId);
            else next.add(variantId);
            return next;
        });

        // Sync product level: if we uncheck a variant, we should probably uncheck the product
        // because "Select All" on the product implies all variants.
        if (isSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        } else {
            // Check if all other variants for this product are also selected now
            const variants = productVariants[productId] || [];
            const allElseSelected = variants.every((v: any) => {
                const vId = v.variant_id || v.sku;
                return vId === variantId || selectedVariantIds.has(vId);
            });
            if (allElseSelected) {
                setSelectedIds(prev => {
                    const next = new Set(prev).add(productId);
                    return next;
                });
            }
        }
    };

    const handleToggleAllVariants = (productId: string) => {
        const variantIds = productVariants[productId]?.map((v: any) => v.variant_id || v.sku) || [];
        const allSelected = variantIds.length > 0 && variantIds.every((id: string) => selectedVariantIds.has(id));

        setSelectedVariantIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                variantIds.forEach((id: string) => next.delete(id));
            } else {
                variantIds.forEach((id: string) => next.add(id));
            }
            return next;
        });
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
                    <p className="text-[15px] font-semibold text-brown">{products.length} total products</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDeleteProducts}
                            className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 sm:px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger hover:text-white transition-all duration-300 shadow-sm animate-fadeIn"
                            title={`Delete ${selectedIds.size} selected products`}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete Selected ({selectedIds.size})</span>
                        </button>
                    )}
                    <button
                        onClick={openDrafts}
                        className="flex items-center gap-2 rounded-lg border border-gold/10 bg-primary px-3 sm:px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light transition-all duration-300 shadow-sm"
                    >
                        <FileEdit className="h-4 w-4" />
                        <span className="hidden sm:inline">Drafts</span>
                    </button>
                    <button
                        onClick={() => setBulkImportOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-gold/10 bg-primary px-3 sm:px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light transition-all duration-300 shadow-sm"
                    >
                        <Package className="h-4 w-4" />
                        <span className="hidden sm:inline">Bulk Import</span>
                    </button>
                    <button
                        onClick={() => setBulkDiscountOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-gold/10 bg-primary px-3 sm:px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light transition-all duration-300 shadow-sm"
                    >
                        <Tag className="h-4 w-4" />
                        <span className="hidden sm:inline">Bulk Actions</span>
                    </button>
                    <button
                        onClick={() => setBulkExportOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-gold/10 bg-primary px-3 sm:px-4 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light transition-all duration-300 shadow-sm"
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
                selectedIds={Array.from(selectedIds)}
                selectedVariantIds={Array.from(selectedVariantIds)}
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

            <ConfirmModal
                open={confirmModal.open}
                onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                title={confirmModal.title}
                confirmLabel={confirmModal.confirmLabel || "Confirm"}
                confirmVariant={confirmModal.confirmVariant}
                onConfirm={confirmModal.onConfirm}
                loading={confirmModal.loading}
            >
                {confirmModal.message}
            </ConfirmModal>

            {/* ── Drafts Modal ── */}
            {draftsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-primary/20 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setDraftsOpen(false)}
                    />

                    {/* Modal Card */}
                    <div className="relative z-10 w-full max-w-2xl bg-card-bg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-border/50 animate-fadeInUp">

                        {/* Header */}
                        <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-page-bg to-card-bg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-serif text-3xl font-bold text-primary">Draft Products</h4>
                                    <p className="text-sm text-text-secondary mt-1.5 flex items-center gap-2">
                                        <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
                                        {draftsLoading
                                            ? 'Syncing your herbal drafts...'
                                            : `${filteredDrafts.length} draft${filteredDrafts.length !== 1 ? 's' : ''} out of ${drafts.length} total.`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDraftsOpen(false)}
                                    className="rounded-full p-2 text-text-muted hover:bg-primary/5 hover:text-primary transition-all duration-300"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Filters and Bulk Actions */}
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
                                <div className="flex flex-1 gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:max-w-xs group">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted group-focus-within:text-gold transition-colors duration-200" />
                                        <input
                                            type="text"
                                            value={draftSearchQuery}
                                            onChange={e => setDraftSearchQuery(e.target.value)}
                                            placeholder="Search drafts..."
                                            className="w-full rounded-xl border border-border bg-card-bg/50 backdrop-blur-sm pl-9 pr-4 py-2 text-sm focus:border-gold/40 focus:ring-4 focus:ring-gold/5 focus:outline-none transition-all duration-300"
                                        />
                                    </div>
                                    <div className="relative w-full sm:w-auto">
                                        <select
                                            value={draftFilterCategory}
                                            onChange={e => setDraftFilterCategory(e.target.value)}
                                            className="w-full sm:w-40 appearance-none rounded-xl border border-border bg-card-bg/50 px-3 py-2 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none cursor-pointer transition-colors"
                                        >
                                            <option value="all">All Categories</option>
                                            <option value="none">Uncategorized</option>
                                            {Array.from(new Set(drafts.map(d => d.category).filter(Boolean))).map(cat => (
                                                <option key={cat!} value={cat!}>{cat}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                                    </div>
                                </div>
                                
                                {selectedDraftIds.size > 0 && (
                                    <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto animate-fadeIn justify-end mt-2 sm:mt-0">
                                        <span className="text-xs font-semibold text-text-muted mr-1">{selectedDraftIds.size} selected</span>
                                        <button
                                            onClick={handleBulkDeleteDrafts}
                                            className="flex items-center gap-1.5 rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger hover:text-white transition-all duration-300"
                                            title="Delete Selected"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Delete</span>
                                        </button>
                                        <button
                                            onClick={handleBulkPublishDrafts}
                                            className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all duration-300"
                                            title="Publish Selected"
                                        >
                                            <UploadCloud className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Publish</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 h-px bg-gradient-to-r from-border/0 via-border to-border/0" />
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-8 pb-4 custom-scrollbar">
                            {draftsLoading ? (
                                <div className="flex flex-col gap-4 py-4">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="h-20 rounded-xl bg-page-bg/50 animate-shimmer border border-border/30" />
                                    ))}
                                </div>
                            ) : drafts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                                        <FileEdit className="h-9 w-9 text-primary/60" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-text-primary">No drafts saved yet</p>
                                        <p className="text-sm text-text-muted mt-1 max-w-[280px]">
                                            Start filling a product form and click&nbsp;<strong>Save as Draft</strong>&nbsp;to continue later.
                                        </p>
                                    </div>
                                    <Link
                                        href="/dashboard/products/add"
                                        onClick={() => setDraftsOpen(false)}
                                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-dark transition-all duration-300 shadow-md hover:shadow-lg"
                                    >
                                        <Plus className="h-4 w-4" /> New Product
                                    </Link>
                                </div>
                            ) : filteredDrafts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                                        <Search className="h-7 w-7 text-primary/60" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-text-primary">No matching drafts</p>
                                        <p className="text-sm text-text-muted mt-1 max-w-[280px]">
                                            Try adjusting your search query or category filter.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col space-y-3 py-4">
                                    <div className="flex items-center gap-3 px-4 pb-2 border-b border-border/40">
                                        <input
                                            type="checkbox"
                                            checked={filteredDrafts.length > 0 && filteredDrafts.every(d => selectedDraftIds.has(d.product_id))}
                                            onChange={handleToggleSelectAllDrafts}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-text-muted uppercase">Select All</span>
                                    </div>
                                    {filteredDrafts.map(draft => (
                                        <div
                                            key={draft.product_id}
                                            className={`group flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-300 hover:shadow-sm border ${
                                                selectedDraftIds.has(draft.product_id) 
                                                    ? 'bg-primary/5 border-primary/30 dark:bg-primary/10' 
                                                    : 'bg-page-bg/30 hover:bg-white dark:hover:bg-primary/5 border-transparent hover:border-border/40'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={selectedDraftIds.has(draft.product_id)}
                                                onChange={() => handleToggleSelectDraft(draft.product_id)}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 transition-all cursor-pointer flex-shrink-0"
                                            />
                                            {/* Thumbnail */}
                                            <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-card-bg border border-border/50 flex items-center justify-center overflow-hidden shadow-inner">
                                                {draft.images && draft.images.length > 0 ? (
                                                    <img src={draft.images[0]} alt={draft.product_name} className="h-14 w-14 object-cover" />
                                                ) : (
                                                    <span className="text-2xl">🌱</span>
                                                )}
                                            </div>
 
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-text-primary truncate transition-colors group-hover:text-primary">{draft.product_name}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {draft.sku && (
                                                        <span className="font-mono text-[10px] font-bold text-gold-muted bg-gold/10 px-2 py-0.5 rounded-md border border-gold/5">
                                                            {draft.sku}
                                                        </span>
                                                    )}
                                                    {draft.category && (
                                                        <span className="text-[10px] font-medium text-text-muted bg-page-bg px-2 py-0.5 rounded-md border border-border/40">
                                                            {draft.category}
                                                        </span>
                                                    )}
                                                </div>
                                                {draft.created_at && (
                                                    <p className="text-[10px] text-text-muted/60 mt-1.5 flex items-center gap-1">
                                                        <span>Last saved</span>
                                                        <span className="h-1 w-1 rounded-full bg-border" />
                                                        <span>{new Date(draft.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </p>
                                                )}
                                            </div>
 
                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                                <Link
                                                    href={`/dashboard/products/edit/${draft.slug || draft.product_id}`}
                                                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-[#E8D8B9] hover:bg-primary-dark transition-all duration-300 shadow-sm"
                                                    title="Continue editing"
                                                >
                                                    <Pencil className="h-3 w-3" /> Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.product_id, draft.product_name)}
                                                    className="rounded-lg p-2 text-text-muted hover:text-danger hover:bg-danger/5 transition-all duration-300"
                                                    title="Delete draft"
                                                >
                                                    <Trash2 className="h-4.5 w-4.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-border/40 flex items-center justify-between bg-page-bg/50">
                            <div className="flex items-center gap-2 text-text-muted">
                                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                <p className="text-xs font-medium">Drafts are not visible to customers.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setDraftsOpen(false)}
                                    className="text-sm font-semibold text-text-muted hover:text-primary transition-colors px-2"
                                >
                                    Close
                                </button>
                                <Link
                                    href="/dashboard/products/add"
                                    onClick={() => setDraftsOpen(false)}
                                    className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-[#E8D8B9] hover:bg-primary-dark transition-all duration-300 shadow-sm"
                                >
                                    <Plus className="h-4 w-4" /> New Product
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters & Search Row */}
            <div className="mb-4 flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted group-focus-within:text-gold transition-colors duration-200" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search products by name, SKU or brand..."
                        className="w-full rounded-xl border border-border bg-card-bg/50 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm focus:border-gold/40 focus:ring-4 focus:ring-gold/5 focus:outline-none transition-all duration-300"
                    />
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 text-sm font-medium ${
                            showFilters || [filterCategory, filterStock, filterBestSeller].some(f => f !== 'all') || filterCategory === 'none' || priceRange.min > 0 || priceRange.max < absoluteMaxPrice
                                ? 'bg-gold/10 border-gold/30 text-gold-muted ring-4 ring-gold/5'
                                : 'bg-card-bg border-border text-text-secondary hover:border-gold/30 hover:text-gold-muted'
                        }`}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Filters</span>
                        {(() => {
                            const count = [
                                filterCategory !== 'all',
                                filterSubCategory !== 'all',
                                filterStock !== 'all',
                                (priceRange.min > 0 || priceRange.max < absoluteMaxPrice),
                                filterBestSeller !== 'all'
                            ].filter(Boolean).length;
                            return count > 0 ? (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] text-black font-bold animate-fadeIn">
                                    {count}
                                </span>
                            ) : null;
                        })()}
                    </button>

                    {/* Filter Overlay Popup */}
                    {showFilters && (
                        <>
                            <div 
                                className="fixed inset-0 z-[60] bg-black/5" 
                                onClick={() => setShowFilters(false)}
                            />
                            <div className="absolute right-0 mt-2 w-80 z-[70] bg-card-bg border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp flex flex-col max-h-[80vh]">
                                <div className="p-5 pb-4 border-b border-border/50 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-serif text-sm font-semibold text-text-primary flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-gold" />
                                            Refine Products
                                        </h4>
                                        <button 
                                            onClick={() => {
                                                setFilterCategory('all');
                                                setFilterSubCategory('all');
                                                setFilterStock('all');
                                                setPriceRange({ min: 0, max: absoluteMaxPrice });
                                                setFilterBestSeller('all');
                                                setShowFilters(false);
                                            }}
                                            className="text-xs text-gold-muted hover:text-gold font-medium transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 pt-4 overflow-y-auto flex-1 custom-scrollbar">
                                    <div className="space-y-5">
                                        {/* Category */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-text-muted uppercase">Main Category</label>
                                            <div className="relative">
                                                <select
                                                    value={filterCategory}
                                                    onChange={(e) => {
                                                        setFilterCategory(e.target.value);
                                                        setFilterSubCategory('all');
                                                    }}
                                                    className="w-full appearance-none rounded-xl border border-border bg-card-bg/50 px-3 py-2.5 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none cursor-pointer transition-colors"
                                                >
                                                    <option value="all">Every Category</option>
                                                    <option value="none">Uncategorized</option>
                                                    {allCategories.filter(cat => !cat.parent_id).map(cat => (
                                                        <option key={cat.category_id} value={cat.name}>{cat.name}</option>
                                                    ))}
                                                    {Array.from(new Set(products.map(p => p.category).filter(cat => cat && !allCategories.some(ac => ac.name === cat)))).map(cat => (
                                                        <option key={cat} value={cat!}>{cat}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Sub Category */}
                                        {filterCategory !== 'all' && filterCategory !== 'none' && (
                                            <div className="space-y-2 animate-fadeIn">
                                                <label className="text-[11px] font-bold text-text-muted uppercase">Sub Category</label>
                                                <div className="relative">
                                                    <select
                                                        value={filterSubCategory}
                                                        onChange={(e) => setFilterSubCategory(e.target.value)}
                                                        className="w-full appearance-none rounded-xl border border-border bg-card-bg/50 px-3 py-2.5 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none cursor-pointer transition-colors"
                                                    >
                                                        <option value="all">All Subgroups</option>
                                                        {(() => {
                                                            const parent = allCategories.find(c => c.name === filterCategory);
                                                            if (!parent) return null;
                                                            return allCategories
                                                                .filter(c => c.parent_id === parent.category_id)
                                                                .map(sub => (
                                                                    <option key={sub.category_id} value={sub.name}>{sub.name}</option>
                                                                ));
                                                        })()}
                                                    </select>
                                                    <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Stock Status */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-text-muted uppercase">Stock</label>
                                            <div className="relative">
                                                <select
                                                    value={filterStock}
                                                    onChange={(e) => setFilterStock(e.target.value)}
                                                    className="w-full appearance-none rounded-xl border border-border bg-card-bg/50 px-3 py-2.5 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none cursor-pointer"
                                                >
                                                    <option value="all">Any</option>
                                                    <option value="in_stock">Available</option>
                                                    <option value="low_stock">Running Low</option>
                                                    <option value="out_of_stock">Out</option>
                                                </select>
                                                <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-text-muted uppercase">Price Range</label>
                                            <PriceRangeSlider
                                                min={0}
                                                max={absoluteMaxPrice}
                                                initialMin={priceRange.min}
                                                initialMax={priceRange.max}
                                                onChange={(min, max) => setPriceRange({ min, max })}
                                            />
                                        </div>

                                        {/* Availability/Best Seller */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-text-muted uppercase">Highlights</label>
                                            <div className="relative">
                                                <select
                                                    value={filterBestSeller}
                                                    onChange={(e) => setFilterBestSeller(e.target.value)}
                                                    className="w-full appearance-none rounded-xl border border-border bg-card-bg/50 px-3 py-2.5 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none cursor-pointer"
                                                >
                                                    <option value="all">Show All Products</option>
                                                    <option value="best_seller">⭐ Best Sellers Only</option>
                                                </select>
                                                <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-page-bg">
                                <SortableHeader label="Product" sortKey="product_name" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase">SKU</th>
                                <SortableHeader label="Category" sortKey="category" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <SortableHeader label="Price" sortKey="price" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase text-center">Best Seller</th>
                                <SortableHeader label="Stock" sortKey="stock_quantity" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                <th className="px-4 py-3 text-sm font-semibold text-gold-muted uppercase text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <input
                                            type="checkbox"
                                            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.product_id))}
                                            onChange={handleToggleSelectAll}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 transition-all duration-300 cursor-pointer accent-primary"
                                        />
                                        <span>Actions</span>
                                    </div>
                                </th>
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
                            ) : paginatedProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Package className="mx-auto h-10 w-10 text-text-muted/40 mb-2" />
                                        <p className="text-sm text-text-muted">No products found matching filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map(product => {
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
                                                    {(() => {
                                                        const catName = product.category || allCategories.find(c => c.category_id === product.category_id)?.name;
                                                        return catName ? (
                                                            <span className="inline-block rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-muted">
                                                                {catName}
                                                            </span>
                                                        ) : null;
                                                    })()}
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
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(product.product_id)}
                                                            onChange={() => handleToggleSelect(product.product_id)}
                                                            className="h-4 w-4 mr-2 rounded border-border text-primary focus:ring-primary/30 transition-all duration-300 cursor-pointer accent-primary"
                                                        />
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
                                                                            <th className="px-4 py-2 font-semibold text-gold-muted text-sm uppercase">Image</th>
                                                                            <th className="px-4 py-2 font-semibold text-gold-muted text-sm uppercase">Name</th>
                                                                            <th className="px-4 py-2 font-semibold text-gold-muted text-sm uppercase">SKU</th>
                                                                            <th className="px-4 py-2 font-semibold text-gold-muted text-sm uppercase">Specification</th>
                                                                            <th className="px-4 py-2 font-semibold text-gold-muted text-sm uppercase">Price</th>
                                                                            <th className="px-4 py-2 font-semibold text-gold-muted text-sm uppercase">Stock</th>
                                                                            <th className="px-4 py-2 font-semibold text-gold-muted text-sm uppercase text-right">
                                                                                <div className="flex items-center justify-end gap-3">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={productVariants[product.product_id]?.length > 0 && productVariants[product.product_id].every((v: any) => selectedVariantIds.has(v.variant_id || v.sku))}
                                                                                        onChange={() => handleToggleAllVariants(product.product_id)}
                                                                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 transition-all duration-300 cursor-pointer accent-primary"
                                                                                    />
                                                                                    <span>Status</span>
                                                                                </div>
                                                                            </th>
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
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={selectedVariantIds.has(targetId)}
                                                                                                onChange={() => handleToggleVariantSelect(product.product_id, targetId)}
                                                                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 transition-all duration-300 cursor-pointer accent-primary"
                                                                                            />
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
                
                {/* Pagination Controls */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-between border-t border-border-subtle bg-page-bg/50 px-4 py-3 sm:px-6">
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-text-secondary">
                                    Showing <span className="font-semibold text-text-primary">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-semibold text-text-primary">{filtered.length}</span> products
                                </p>
                                <select 
                                    className="text-xs bg-card-bg border border-border rounded px-2 py-1 text-text-primary cursor-pointer focus:outline-none focus:border-gold/50"
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={10}>10 per page</option>
                                    <option value={20}>20 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value={100}>100 per page</option>
                                </select>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-text-muted ring-1 ring-inset ring-border hover:bg-gold/[0.05] focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                        .map((p, i, arr) => (
                                            <Fragment key={p}>
                                                {i > 0 && p - arr[i - 1] > 1 && (
                                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-text-muted ring-1 ring-inset ring-border">...</span>
                                                )}
                                                <button
                                                    onClick={() => handlePageChange(p)}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 transition-colors ${
                                                        p === currentPage ? 'z-10 bg-gold/10 text-gold ring-1 ring-inset ring-gold/50' : 'text-text-primary ring-1 ring-inset ring-border hover:bg-gold/[0.05]'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            </Fragment>
                                        ))}
                                    
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-text-muted ring-1 ring-inset ring-border hover:bg-gold/[0.05] focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                        {/* Mobile view pagination */}
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-border bg-card-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-gold/[0.05] disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-text-secondary self-center">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-gold/[0.05] disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
