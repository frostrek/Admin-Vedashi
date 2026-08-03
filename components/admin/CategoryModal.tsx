'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, UploadCloud, ImageIcon, Tag, Check, Pencil } from 'lucide-react';
import { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/category';
import { transliterateToSlug } from '@/lib/transliterate';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateCategoryPayload | UpdateCategoryPayload, imageFile: File | null) => Promise<void>;
    /** Pass null for "create" mode, pass a Category objects for "edit" mode */
    editCategory: Category | null;
    /** Initial parent ID when creating a subcategory from the tree */
    initialParentId?: string | null;
    /** All categories (used to populate the parent dropdown) */
    categories: Category[];
}

export default function CategoryModal({ isOpen, onClose, onSubmit, editCategory, initialParentId, categories }: CategoryModalProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState('');
    const [sortOrder, setSortOrder] = useState<number | string>(0);
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const isEdit = !!editCategory;

    // Lock background scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Populate form when editing
    useEffect(() => {
        if (editCategory) {
            setName(editCategory.name);
            setSlug(editCategory.slug);
            setDescription(editCategory.description || '');
            setParentId(editCategory.parent_id || '');
            setSortOrder(editCategory.sort_order ?? 0);
            setIsActive(editCategory.is_active ?? true);
            // If the existing slug already matches the auto-generated slug of the current name,
            // we treat it as "not manually edited" so it can continue to follow name changes.
            const autoSlug = transliterateToSlug(editCategory.name);
            setSlugManuallyEdited(editCategory.slug !== autoSlug);
            setImagePreview(editCategory.image_url || null);
            setImageFile(null);
        } else {
            setName('');
            setSlug('');
            setDescription('');
            setParentId(initialParentId || '');
            setSortOrder(0);
            setIsActive(true);
            setSlugManuallyEdited(false);
            setImagePreview(null);
            setImageFile(null);
        }
    }, [editCategory, initialParentId, isOpen]);

    // Auto-generate slug from name (unless manually edited)
    const handleNameChange = (value: string) => {
        setName(value);
        if (!slugManuallyEdited) {
            setSlug(transliterateToSlug(value));
        }
    };

    const handleSlugChange = (value: string) => {
        setSlug(value);
        setSlugManuallyEdited(true);
    };

    const getDescendantIds = (catId: string, allCats: Category[]): string[] => {
        let ids: string[] = [];
        const children = allCats.filter(c => c.parent_id === catId);
        children.forEach(child => {
            ids.push(child.category_id);
            ids = [...ids, ...getDescendantIds(child.category_id, allCats)];
        });
        return ids;
    };

    // Flatten tree for dropdown with indentation
    const getFlattenedOptions = (nodes: Category[], level: number = 0): { id: string, name: string, level: number }[] => {
        let options: { id: string, name: string, level: number }[] = [];
        nodes.forEach(node => {
            options.push({ id: node.category_id, name: node.name, level });
            if (node.children) {
                options = [...options, ...getFlattenedOptions(node.children, level + 1)];
            }
        });
        return options;
    };

    const descendantIds = editCategory ? getDescendantIds(editCategory.category_id, categories) : [];
    const flattenedOptions = getFlattenedOptions(categories.filter(c => !c.parent_id));

    // Filter out self and descendants to prevent circular references
    const validParentOptions = flattenedOptions.filter(
        opt => opt.id !== editCategory?.category_id && !descendantIds.includes(opt.id)
    );

    // Get current path for breadcrumbs
    const getCategoryPath = (catId: string | null, allCats: Category[]): string[] => {
        if (!catId) return [];
        const cat = allCats.find(c => c.category_id === catId);
        if (!cat) return [];
        return [...getCategoryPath(cat.parent_id, allCats), cat.name];
    };

    const currentPath = getCategoryPath(parentId, categories);

    const getCategorySlugPath = (catId: string | null, allCats: Category[]): string[] => {
        if (!catId) return [];
        const cat = allCats.find(c => c.category_id === catId);
        if (!cat) return [];
        return [...getCategorySlugPath(cat.parent_id, allCats), cat.slug];
    };
    
    const currentSlugPath = getCategorySlugPath(parentId, categories);
    const storeUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://vedashi.com';
    const previewUrl = `${storeUrl}/katalog${currentSlugPath.length > 0 ? '/' + currentSlugPath.join('/') : ''}/${slug || '{slug}'}`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                slug: slug.trim() || transliterateToSlug(name),
                description: description.trim() || undefined,
                parent_id: parentId || null,
                sort_order: Number(sortOrder) || 0,
                is_active: isActive
            };
            await onSubmit(payload, imageFile);
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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <h4 className="font-serif text-lg font-bold text-text-primary">
                            {isEdit ? 'Edit Category' : 'Create New Category'}
                        </h4>
                        {currentPath.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-text-muted">
                                <Tag className="h-3 w-3" />
                                {currentPath.map((name, i) => (
                                    <span key={i} className="flex items-center gap-1.5">
                                        {name}
                                        {i < currentPath.length - 1 && <X className="h-2 w-2 rotate-45 opacity-40" />}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-page-bg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Image Upload (Parent Categories Only) */}
                    {!parentId && (
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">
                                Category Image (Optional)
                            </label>
                            <div className="mt-1 flex items-center gap-4">
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-page-bg flex items-center justify-center">
                                    {(imagePreview || imageFile) ? (
                                        <img
                                            src={imageFile ? URL.createObjectURL(imageFile) : (imagePreview || '')}
                                            alt="Category preview"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-text-muted opacity-50" />
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm hover:bg-page-bg transition-colors">
                                        <UploadCloud className="h-4 w-4 text-text-muted" />
                                        <span>{imageFile ? 'Change File' : 'Upload Image'}</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/png, image/jpeg, image/webp"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setImageFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                    <span className="text-[11px] text-text-muted">
                                        PNG, JPG or WEBP (max 5MB)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

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
                            placeholder="e.g. Herbal Remedies"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-text-primary">
                                Slug
                            </label>
                            {slug && (
                                <span className={`text-[11px] flex items-center gap-1 ${slugManuallyEdited ? 'text-amber-500' : 'text-green-500 dark:text-green-400'}`}>
                                    {slugManuallyEdited ? <Pencil className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                    {slugManuallyEdited ? 'Manually edited' : 'Auto-generated'}
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary focus:border-primary focus:outline-none font-mono"
                            placeholder="auto-generated-from-name"
                        />
                        <div className="mt-2 bg-page-bg border border-border/50 rounded-lg p-3">
                            <p className="text-xs text-text-muted mb-1 font-medium">Storefront URL Preview:</p>
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">
                                {previewUrl}
                            </a>
                        </div>
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
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none bg-white font-medium"
                        >
                            <option value="">None (Top-level category)</option>
                            {validParentOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {'\u00A0'.repeat(opt.level * 3)}
                                    {opt.level > 0 ? '↳ ' : ''}
                                    {opt.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-text-muted">
                            Leave empty to create a top-level category, or select a parent to create a subcategory.
                        </p>
                    </div>

                    {/* Sort Order */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                            Sort Order
                        </label>
                        <input
                            type="number"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                            placeholder="0"
                        />
                        <p className="mt-1 text-xs text-text-muted">
                            Lower numbers appear first. Default is 0.
                        </p>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center justify-between py-2 border-t border-border mt-2">
                        <div>
                            <label className="block text-sm font-medium text-text-primary">
                                Active Status
                            </label>
                            <p className="text-xs text-text-muted">
                                If inactive, this category will be hidden from the storefront
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => setIsActive(!isActive)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isActive ? 'bg-primary' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
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
