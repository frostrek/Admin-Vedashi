'use client';

import { Tag, Pencil, Trash2, FolderTree } from 'lucide-react';
import { Category } from '@/types/category';

interface CategoryCardProps {
    category: Category;
    subcategoryCount: number;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
    parentName?: string;
}

export default function CategoryCard({ category, subcategoryCount, onEdit, onDelete, parentName }: CategoryCardProps) {
    return (
        <div className="rounded-xl border border-border bg-card-bg p-5 transition-all hover:shadow-md group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {category.parent_id ? (
                        <FolderTree className="h-5 w-5 text-primary" />
                    ) : (
                        <Tag className="h-5 w-5 text-primary" />
                    )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(category)}
                        className="rounded-lg p-1.5 text-text-muted hover:text-info hover:bg-blue-50 transition-colors"
                        title="Edit category"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => onDelete(category)}
                        className="rounded-lg p-1.5 text-text-muted hover:text-danger hover:bg-red-50 transition-colors"
                        title="Delete category"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <h3 className="font-serif text-base font-semibold text-text-primary">{category.name}</h3>
            <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{category.description || 'No description'}</p>

            <div className="mt-3 flex items-center gap-3">
                {category.parent_id && parentName && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        ↳ {parentName}
                    </span>
                )}
                {!category.parent_id && subcategoryCount > 0 && (
                    <span className="text-xs font-medium text-primary">
                        {subcategoryCount} subcategor{subcategoryCount === 1 ? 'y' : 'ies'}
                    </span>
                )}
                <span className={`ml-auto inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${category.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-600'
                    }`}>
                    {category.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
        </div>
    );
}
