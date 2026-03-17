'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api/category';
import { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/category';
import CategoryCard from '@/components/admin/CategoryCard';
import CategoryModal from '@/components/admin/CategoryModal';
import { Plus, AlertTriangle, FolderTree, Tag, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

type FilterMode = 'all' | 'parents' | 'subcategories';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterMode>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editCategory, setEditCategory] = useState<Category | null>(null);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const [deleting, setDeleting] = useState(false);

    /* ─── Load  categories ─── */
    const loadCategories = async () => {
        setLoading(true);
        const data = await getCategories();
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

    const filteredCategories = useMemo(() => {
        return categories.filter((c) => {
            // Tab Filter
            const matchesTab =
                filter === 'all' ||
                (filter === 'parents' && !c.parent_id) ||
                (filter === 'subcategories' && !!c.parent_id);

            // Status Filter
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && c.is_active) ||
                (statusFilter === 'inactive' && !c.is_active);

            // Search Query
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !query ||
                c.name.toLowerCase().includes(query) ||
                c.slug.toLowerCase().includes(query) ||
                (c.description || '').toLowerCase().includes(query);

            return matchesTab && matchesStatus && matchesSearch;
        });
    }, [categories, filter, searchQuery, statusFilter]);

    const displayParents = useMemo(() =>
        filteredCategories.filter(c => !c.parent_id),
        [filteredCategories]);

    const displaySubcategories = useMemo(() =>
        filteredCategories.filter(c => !!c.parent_id),
        [filteredCategories]);

    /* ─── CRUD handlers ─── */
    const handleCreate = () => {
        setEditCategory(null);
        setModalOpen(true);
    };

    const handleEdit = (cat: Category) => {
        setEditCategory(cat);
        setModalOpen(true);
    };

    const handleModalSubmit = async (payload: CreateCategoryPayload | UpdateCategoryPayload) => {
        if (editCategory) {
            // Update
            const result = await updateCategory(editCategory.category_id, payload as UpdateCategoryPayload);
            if (result.success) {
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
                toast.success('Category created');
                setCategories((prev) => [...prev, result.category!]);
                setModalOpen(false);
            } else {
                toast.error(result.error || 'Failed to create category');
            }
        }
    };

    const handleDeleteClick = (cat: Category) => {
        setDeleteTarget(cat);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const result = await deleteCategory(deleteTarget.category_id);
        setDeleting(false);
        if (result.success) {
            toast.success(`"${deleteTarget.name}" deleted`);
            setCategories((prev) => prev.filter((c) => c.category_id !== deleteTarget.category_id));
            setDeleteTarget(null);
        } else {
            toast.error(result.error || 'Failed to delete category');
        }
    };

    /* ─── Filters ─── */
    const filterTabs: { key: FilterMode; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: categories.length },
        { key: 'parents', label: 'Parents', count: parentCategories.length },
        { key: 'subcategories', label: 'Subcategories', count: categories.length - parentCategories.length },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Categories</h1>
                    <p className="text-sm text-text-secondary">
                        {parentCategories.length} Categories & {categories.length - parentCategories.length} Subcategories
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"

                >
                    <Plus className="h-4 w-4" /> Add Category / Subcategory
                </button>
            </div>

            {/* Filter Bar */}
            {!loading && categories.length > 0 && (
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                    {/* Filter Tabs */}
                    <div className="flex gap-1 p-1 bg-page-bg rounded-lg w-fit">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === tab.key
                                    ? 'bg-white text-text-primary shadow-sm'
                                    : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                {tab.key === 'parents' ? 'Categories' : tab.label}
                                <span className="ml-1.5 text-text-muted">({tab.count})</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search categories..."
                                className="w-full rounded-lg border border-border bg-card-bg pl-10 pr-4 py-2 text-sm focus:border-gold/40 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="appearance-none rounded-lg border border-border bg-card-bg px-3 py-2 pr-8 text-sm text-text-primary focus:border-gold/40 focus:outline-none cursor-pointer min-w-[120px]"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
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
                    <h3 className="font-serif text-lg font-semibold text-text-primary mb-1">No categories yet</h3>
                    <p className="text-sm text-text-secondary mb-4">
                        Create your first category to organize products.
                    </p>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Add Category / Subcategory
                    </button>
                </div>
            )}

            {/* Category Grid */}
            {!loading && filteredCategories.length > 0 && (
                <div className="space-y-8">
                    {/* If filtering by 'all', show two sections */}
                    {filter === 'all' ? (
                        <>
                            {/* Parents Section */}
                            {displayParents.length > 0 && (
                                <div>
                                    <h2 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
                                        <Tag className="h-4 w-4" /> Categories ({displayParents.length})
                                    </h2>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {displayParents.map((cat) => (
                                            <CategoryCard
                                                key={cat.category_id}
                                                category={cat}
                                                subcategoryCount={subcategoryCountMap[cat.category_id] || 0}
                                                parentName={undefined}
                                                onEdit={handleEdit}
                                                onDelete={handleDeleteClick}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Subcategories Section */}
                            {displaySubcategories.length > 0 && (
                                <div>
                                    <h2 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2 pt-4">
                                        <FolderTree className="h-4 w-4" /> Subcategories ({displaySubcategories.length})
                                    </h2>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {displaySubcategories.map((cat) => (
                                            <CategoryCard
                                                key={cat.category_id}
                                                category={cat}
                                                subcategoryCount={0}
                                                parentName={parentNameMap[cat.parent_id!]}
                                                onEdit={handleEdit}
                                                onDelete={handleDeleteClick}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Single Section for specific filters */
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredCategories.map((cat) => (
                                <CategoryCard
                                    key={cat.category_id}
                                    category={cat}
                                    subcategoryCount={subcategoryCountMap[cat.category_id] || 0}
                                    parentName={cat.parent_id ? parentNameMap[cat.parent_id] : undefined}
                                    onEdit={handleEdit}
                                    onDelete={handleDeleteClick}
                                />
                            ))}
                        </div>
                    )}
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
                categories={categories}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={deleteTarget?.parent_id ? "Delete Subcategory" : "Delete Category"}
                confirmLabel="Delete"
                confirmVariant="danger"
                loading={deleting}
                onConfirm={handleDeleteConfirm}
            >
                {deleteTarget && (
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
                                        <span className="block mt-1.5 font-bold text-yellow-950 font-serif tracking-tight text-base">
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
