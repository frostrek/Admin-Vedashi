'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api/category';
import { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/category';
import CategoryCard from '@/components/admin/CategoryCard';
import CategoryModal from '@/components/admin/CategoryModal';
import { Plus, AlertTriangle, FolderTree } from 'lucide-react';
import toast from 'react-hot-toast';

type FilterMode = 'all' | 'parents' | 'subcategories';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterMode>('all');

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
        switch (filter) {
            case 'parents':
                return categories.filter((c) => !c.parent_id);
            case 'subcategories':
                return categories.filter((c) => !!c.parent_id);
            default:
                return categories;
        }
    }, [categories, filter]);

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
                    <p className="text-sm text-text-secondary">{categories.length} categories</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"

                >
                    <Plus className="h-4 w-4" /> Add Category
                </button>
            </div>

            {/* Filter Tabs */}
            {!loading && categories.length > 0 && (
                <div className="flex gap-1 mb-5 p-1 bg-page-bg rounded-lg w-fit">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === tab.key
                                ? 'bg-white text-text-primary shadow-sm'
                                : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            {tab.label}
                            <span className="ml-1.5 text-text-muted">({tab.count})</span>
                        </button>
                    ))}
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
                        <Plus className="h-4 w-4" /> Add Category
                    </button>
                </div>
            )}

            {/* Category Grid */}
            {!loading && filteredCategories.length > 0 && (
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
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card-bg p-6 shadow-xl mx-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
                                <AlertTriangle className="h-6 w-6 text-danger" />
                            </div>
                            <h3 className="font-serif text-lg font-semibold text-text-primary mb-1">
                                Delete Category
                            </h3>
                            <p className="text-sm text-text-secondary mb-5">
                                Are you sure you want to delete <strong>&quot;{deleteTarget.name}&quot;</strong>? This action cannot be undone.
                            </p>
                            <div className="flex items-center gap-2 w-full">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-page-bg transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={deleting}
                                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
