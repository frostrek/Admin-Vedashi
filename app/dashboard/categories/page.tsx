'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, bulkDeleteCategories, bulkUpdateCategories, uploadCategoryImage } from '@/lib/api/category';
import { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/category';
import CategoryCard from '@/components/admin/CategoryCard';
import CategoryModal from '@/components/admin/CategoryModal';
import BulkAssignModal from '@/components/admin/BulkAssignModal';
import CategoryTreeNode from '@/components/admin/CategoryTreeNode';
import { Plus, AlertTriangle, FolderTree, Tag, Search, ChevronDown, Trash2, CheckSquare, Square, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

type FilterMode = 'all' | 'parents' | 'subcategories' | 'needsAction';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterMode>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [initialParentId, setInitialParentId] = useState<string | null>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!bulkDropdownOpen) return;
        const handleClickOutside = () => setBulkDropdownOpen(false);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [bulkDropdownOpen]);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const [bulkDeleteTarget, setBulkDeleteTarget] = useState(false);
    const [deleting, setDeleting] = useState(false);

    /* ─── Load  categories ─── */
    const loadCategories = async () => {
        setLoading(true);
        const data = await getCategories(true); // Fetch as tree
        setCategories(data);
        setLoading(false);
    };

    useEffect(() => {
        loadCategories();
    }, []);


    /* ─── Derived data ─── */
    const parentCategories = useMemo(
        () => categories.filter((c) => !c.parent_id),
        [categories]
    );

    const subcategoryCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        categories.forEach((c) => {
            if (c.parent_id) {
                map[c.parent_id] = (map[c.parent_id] || 0) + 1;
            }
        });
        return map;
    }, [categories]);

    const parentNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach((c) => {
            map[c.category_id] = c.name;
        });
        return map;
    }, [categories]);

    // Shared styles matching other pages (e.g., Returns, Shipments)
    const cardClass = "rounded-2xl border border-border bg-card-bg";
    const inputClass = "appearance-none rounded-xl border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary focus:border-gold/50 focus:outline-none transition-colors";
    const primaryBtnClass = "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-semibold text-[#E8D8B9] hover:opacity-90 transition-all shadow-sm";
    const secondaryBtnClass = "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card-bg px-4 py-2 text-sm font-medium text-text-primary hover:bg-gold/[0.05] transition-all";
    const iconBtnClass = "rounded-xl p-2 text-text-muted hover:text-gold hover:bg-gold/10 transition-all duration-200";

    const filteredCategories = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        const filterTree = (nodes: Category[]): Category[] => {
            return nodes
                .map(node => {
                    const matchesSearch = !query || 
                        node.name.toLowerCase().includes(query) || 
                        (node.description || '').toLowerCase().includes(query);
                    
                    const matchesStatus = statusFilter === 'all' ||
                        (statusFilter === 'active' && node.is_active) ||
                        (statusFilter === 'inactive' && !node.is_active);

                    const filteredChildren = node.children ? filterTree(node.children) : [];
                    
                    if (matchesSearch && matchesStatus) return node;
                    if (filteredChildren.length > 0) return { ...node, children: filteredChildren };
                    return null;
                })
                .filter((n): n is Category => n !== null);
        };

        return filterTree(categories);
    }, [categories, searchQuery, statusFilter]);

    const needsActionCategories = useMemo(() => {
        const orphans: Category[] = [];
        const findOrphans = (nodes: Category[]) => {
            nodes.forEach(n => {
                if (n.needs_action) orphans.push(n);
                if (n.children) findOrphans(n.children);
            });
        };
        findOrphans(categories);
        return orphans;
    }, [categories]);

    const totalCount = useMemo(() => {
        let count = 0;
        const countAll = (nodes: Category[]) => {
            count += nodes.length;
            nodes.forEach(n => n.children && countAll(n.children));
        };
        countAll(categories);
        return count;
    }, [categories]);

    /* ─── Selection handlers ─── */
    const handleToggleSelect = (id: string, selected: boolean) => {
        setSelectedIds(prev =>
            selected ? [...prev, id] : prev.filter(i => i !== id)
        );
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.length === filteredCategories.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCategories.map(c => c.category_id));
        }
    };

    /* ─── CRUD handlers ─── */
    const handleCreate = (parentId?: string) => {
        setEditCategory(null);
        setInitialParentId(parentId || null);
        setModalOpen(true);
    };

    const handleAddChild = (parent: Category) => {
        handleCreate(parent.category_id);
    };

    const handleEdit = (cat: Category) => {
        setEditCategory(cat);
        setInitialParentId(null);
        setModalOpen(true);
    };

    const handleModalSubmit = async (payload: CreateCategoryPayload | UpdateCategoryPayload, imageFile: File | null) => {
        let resultCategoryId: string | undefined;

        if (editCategory) {
            // Update
            const result = await updateCategory(editCategory.category_id, payload as UpdateCategoryPayload);
            if (result.success) {
                resultCategoryId = editCategory.category_id;
                toast.success('Category updated');
                // Optimistic update
                setCategories((prev) =>
                    prev.map((c) =>
                        c.category_id === editCategory.category_id
                            ? { ...c, ...payload }
                            : c
                    )
                );
                setModalOpen(false);
                // Refresh to get full server state
                loadCategories();
            } else {
                toast.error(result.error || 'Failed to update category');
            }
        } else {
            // Create
            const result = await createCategory(payload as CreateCategoryPayload);
            if (result.success && result.category) {
                resultCategoryId = result.category.category_id;
                toast.success('Category created');
                setCategories((prev) => [...prev, result.category!]);
                setModalOpen(false);
            } else {
                toast.error(result.error || 'Failed to create category');
            }
        }

        // Handle Image Upload independently 
        if (resultCategoryId && imageFile) {
            const uploadRes = await uploadCategoryImage(resultCategoryId, imageFile);
            if (uploadRes.success) {
                toast.success('Image uploaded successfully');
                loadCategories(); // Reload to fetch the new image URL
            } else {
                toast.error(uploadRes.error || 'Failed to upload image');
            }
        }
    };

    const handleDeleteClick = (cat: Category) => {
        setDeleteTarget(cat);
        setBulkDeleteTarget(false);
    };

    const handleDeleteConfirm = async () => {
        if (bulkDeleteTarget) {
            if (selectedIds.length === 0) return;
            setDeleting(true);
            const result = await bulkDeleteCategories(selectedIds);
            setDeleting(false);
            if (result.success) {
                toast.success(`${selectedIds.length} categories deleted`);
                setSelectedIds([]);
                setBulkDeleteTarget(false);
                loadCategories(); // Reload to pick up needs_action changes on orphaned children
            } else {
                toast.error(result.error || 'Failed to delete categories');
            }
            return;
        }

        if (!deleteTarget) return;
        setDeleting(true);
        const result = await deleteCategory(deleteTarget.category_id);
        setDeleting(false);
        if (result.success) {
            toast.success(`"${deleteTarget.name}" deleted`);
            setDeleteTarget(null);
            loadCategories(); // Reload to pick up needs_action changes on orphaned children
        } else {
            toast.error(result.error || 'Failed to delete category');
        }
    };

    const handleBulkAssignSubmit = async (parentId: string | null) => {
        setBulkActionLoading(true);
        const result = await bulkUpdateCategories(selectedIds, { parent_id: parentId });
        setBulkActionLoading(false);
        if (result.success) {
            toast.success(`Moved ${selectedIds.length} categories`);
            setSelectedIds([]);
            loadCategories();
        } else {
            toast.error(result.error || 'Failed to move categories');
        }
    };

    const needsActionCount = needsActionCategories.length;

    return (
        <div className="pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="font-serif text-3xl md:text-4xl font-bold text-gold mb-1 tracking-tight">
                        Category Hierarchy
                    </h1>
                    <p className="text-sm font-semibold text-brown">
                        Managing {totalCount} collections across unlimited deep nesting levels.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Bulk Actions Dropdown */}
                    <div className="relative w-48">
                        <button
                            onClick={(e) => { e.stopPropagation(); setBulkDropdownOpen(!bulkDropdownOpen); }}
                            className={`${secondaryBtnClass} ${selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'} !rounded-2xl border-2 w-full justify-between`}
                            disabled={selectedIds.length === 0}
                        >
                            <span className="truncate">Bulk actions {selectedIds.length > 0 && `(${selectedIds.length})`}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${bulkDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {bulkDropdownOpen && (
                            <div
                                className="absolute left-0 right-0 mt-3 rounded-[20px] bg-white border border-border shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] py-2 z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => { setBulkAssignOpen(true); setBulkDropdownOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold text-[#2D2D2D] hover:bg-gold/5 transition-all text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
                                        <FolderTree className="h-3.5 w-3.5" />
                                    </div>
                                    Assign category
                                </button>

                                <div className="mx-4 border-t border-border/50" />

                                <button
                                    onClick={() => {
                                        setBulkDeleteTarget(true);
                                        setDeleteTarget(null);
                                        setBulkDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold text-red-600 hover:bg-red-50 transition-all text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-red-100/50 text-red-600 group-hover:bg-red-100 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </div>
                                    Delete selected
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => handleCreate()}
                        className={primaryBtnClass}
                    >
                        <Plus className="h-5 w-5" /> Add Category / Subcategory
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            {!loading && categories.length > 0 && (
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleToggleSelectAll}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all shadow-sm ${selectedIds.length > 0
                                ? 'bg-primary border-primary text-white shadow-primary/20'
                                : 'bg-card-bg border-border text-text-primary hover:bg-gold/[0.05]'
                                }`}
                        >
                            {selectedIds.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            {selectedIds.length > 0 ? `Deselect (${selectedIds.length})` : 'Select All'}
                        </button>

                        {needsActionCategories.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold animate-pulse">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {needsActionCategories.length} Ornphaned Items
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search hierarchy..."
                                className={`${inputClass} pl-8 w-full py-2`}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className={`${inputClass} min-w-[130px] pr-8 py-2`}
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card-bg p-5 space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="h-10 w-10 rounded-lg animate-shimmer" />
                                <div className="flex gap-1">
                                    <div className="h-7 w-7 rounded-lg animate-shimmer" />
                                    <div className="h-7 w-7 rounded-lg animate-shimmer" />
                                </div>
                            </div>
                            <div className="h-5 w-2/3 rounded animate-shimmer" />
                            <div className="h-3 w-full rounded animate-shimmer" />
                            <div className="h-3 w-1/3 rounded animate-shimmer" />

                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && categories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                        <FolderTree className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="font-serif text-lg font-semibold text-text-primary mb-1">No categories yet</h4>
                    <p className="text-sm text-text-secondary mb-4">
                        Create your first category to organize products.
                    </p>
                    <button
                        onClick={() => handleCreate()}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Add Category / Subcategory
                    </button>
                </div>
            )}

            {/* Category Hierarchy Tree */}
            {!loading && filteredCategories.length > 0 && (
                <div className="flex flex-col gap-1">
                    {filteredCategories.map((cat) => (
                        <CategoryTreeNode
                            key={cat.category_id}
                            category={cat}
                            level={0}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onAddChild={handleAddChild}
                            selectedIds={selectedIds}
                            onToggleSelect={handleToggleSelect}
                        />
                    ))}
                </div>
            )}

            {/* No results for current filter */}
            {!loading && categories.length > 0 && filteredCategories.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-8">
                    No categories match the current filter.
                </p>
            )}

            {/* Create / Edit Modal */}
            <CategoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleModalSubmit}
                editCategory={editCategory}
                initialParentId={initialParentId}
                categories={categories}
            />

            {/* Bulk Assign Modal */}
            <BulkAssignModal
                isOpen={bulkAssignOpen}
                onClose={() => setBulkAssignOpen(false)}
                onSubmit={handleBulkAssignSubmit}
                categories={categories}
                selectedIds={selectedIds}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={!!deleteTarget || bulkDeleteTarget}
                onClose={() => {
                    setDeleteTarget(null);
                    setBulkDeleteTarget(false);
                }}
                title={bulkDeleteTarget ? `Delete ${selectedIds.length} Categories` : (deleteTarget?.parent_id ? "Delete Subcategory" : "Delete Category")}
                confirmLabel="Delete"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={handleDeleteConfirm}
            >
                {bulkDeleteTarget ? (
                    <div className="space-y-4">
                        <p className="text-text-primary font-medium">
                            Are you sure you want to delete <strong>{selectedIds.length} items</strong>?
                        </p>
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3.5 items-start">
                            <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-sm font-bold text-red-900 uppercase tracking-tight">Destructive Action</p>
                                <p className="text-sm text-red-800/80 leading-relaxed font-medium">
                                    All selected items will be permanently removed. For subcategories, products will move to their respective parents. This cannot be undone.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : deleteTarget && (
                    <div className="space-y-4">
                        <p className="text-text-primary">
                            Are you sure you want to delete <strong>&quot;{deleteTarget.name}&quot;</strong>?
                        </p>

                        {deleteTarget.parent_id ? (
                            <div className="p-3.5 bg-yellow-50/50 rounded-xl border border-yellow-200/50 flex gap-3.5 items-start">
                                <div className="h-9 w-9 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-yellow-900">
                                        {deleteTarget.product_count || 0} items will be moved
                                    </p>
                                    <p className="text-sm text-yellow-800/80 leading-relaxed">
                                        Deleting this subcategory will move all {deleteTarget.product_count || 0} items in it to the parent category:
                                        <span className="block mt-1.5 font-bold text-yellow-950 tracking-tight text-base">
                                            {parentNameMap[deleteTarget.parent_id] || 'the parent category'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3.5 bg-red-50/50 rounded-xl border border-red-200/50 flex gap-3.5 items-start">
                                <div className="h-9 w-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div className="space-y-1 text-sm">
                                    <p className="font-medium text-red-900">{deleteTarget.product_count || 0} items affected</p>
                                    <p className="text-red-800/80 leading-relaxed">
                                        Deleting this will leave <strong>{deleteTarget.product_count || 0} products</strong> uncategorized. This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ConfirmModal>
        </div>
    );
}
