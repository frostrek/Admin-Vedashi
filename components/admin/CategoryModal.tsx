'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/category';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>;
    /** Pass null for "create" mode, pass a Category object for "edit" mode */
    editCategory: Category | null;
    /** All categories (used to populate the parent dropdown) */
    categories: Category[];
}

export default function CategoryModal({ isOpen, onClose, onSubmit, editCategory, categories }: CategoryModalProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');
    const [saving, setSaving] = useState(false);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    const isEdit = !!editCategory;

    // Populate form when editing
    useEffect(() => {
        if (editCategory) {
            setName(editCategory.name);
            setSlug(editCategory.slug);
            setDescription(editCategory.description || '');
            setParentId(editCategory.parent_id || '');
            setSlugManuallyEdited(true);
        } else {
            setName('');
            setSlug('');
            setDescription('');
            setParentId('');
            setSlugManuallyEdited(false);
        }
    }, [editCategory, isOpen]);

    // Auto-generate slug from name (unless manually edited)
    const handleNameChange = (value: string) => {
        setName(value);
        if (!slugManuallyEdited) {
            setSlug(
                value
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
            );
        }
    };

    const handleSlugChange = (value: string) => {
        setSlug(value);
        setSlugManuallyEdited(true);
    };

    // Only show categories that can be parents (exclude the category being edited and its children)
    const parentOptions = categories.filter(
        (cat) => !cat.parent_id && cat.category_id !== editCategory?.category_id
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                description: description.trim(),
                parent_id: parentId || null,
            };
            await onSubmit(payload);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card-bg p-6 shadow-xl mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-serif text-lg font-bold text-text-primary">
                        {isEdit ? 'Edit Category' : 'Create New Category'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-page-bg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                            Name <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                            placeholder="e.g. Red Wines"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                            Slug
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary focus:border-primary focus:outline-none font-mono"
                            placeholder="auto-generated-from-name"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none resize-none"
                            placeholder="Brief description of this category"
                        />
                    </div>

                    {/* Parent Category */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                            Parent Category
                        </label>
                        <select
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none bg-white"
                        >
                            <option value="">None (Top-level category)</option>
                            {parentOptions.map((cat) => (
                                <option key={cat.category_id} value={cat.category_id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-text-muted">
                            Leave empty to create a top-level category, or select a parent to create a subcategory.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary hover:bg-page-bg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
