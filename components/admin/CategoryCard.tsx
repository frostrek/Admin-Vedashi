'use client';

import { Tag, Pencil, Trash2, FolderTree, Check, AlertTriangle } from 'lucide-react';
import { Category } from '@/types/category';
import { useTheme } from '@/context/ThemeContext';

interface CategoryCardProps {
    category: Category;
    subcategoryCount: number;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
    parentName?: string;
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean) => void;
}

export default function CategoryCard({ 
    category, 
    subcategoryCount, 
    onEdit, 
    onDelete, 
    parentName,
    isSelected = false,
    onSelect
}: CategoryCardProps) {
    const { isDark } = useTheme();

    return (
        <div 
            onClick={() => onSelect?.(category.category_id, !isSelected)}
            className={`rounded-2xl border ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'} bg-card-bg/90 backdrop-blur-md p-6 transition-all duration-300 hover:shadow-lg hover:border-gold/40 group relative overflow-hidden flex flex-col h-full cursor-pointer`}
        >
            {/* Soft background glow */}
            <div className={`absolute -top-10 -right-10 h-32 w-32 ${isSelected ? 'bg-primary/10' : 'bg-primary/[0.03]'} rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-500`} />
            
            {/* Checkbox */}
            <div className={`absolute top-4 right-4 z-20 h-5 w-5 rounded-md border transition-all flex items-center justify-center ${
                isSelected 
                    ? 'bg-primary border-primary text-white shadow-sm' 
                    : 'bg-white/50 border-border group-hover:border-primary/50 text-transparent'
            }`}>
                <Check className={`h-3.5 w-3.5 transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`} />
            </div>

            <div className="flex items-start justify-between mb-4 mt-2 relative z-10">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-primary/10 text-primary'} shadow-sm border border-primary/10 transition-transform group-hover:scale-105 group-hover:bg-primary group-hover:text-white`}>
                    {category.parent_id ? (
                        <FolderTree className="h-5 w-5" />
                    ) : (
                        <Tag className="h-5 w-5" />
                    )}
                </div>
            </div>

            <div className="flex-1 relative z-10">
                <h4 className={`font-serif text-xl font-bold tracking-tight mb-1.5 group-hover:text-gold transition-colors ${isDark ? 'text-text-primary' : 'text-emerald-950'}`}>{category.name}</h4>
                <p className={`text-sm line-clamp-2 leading-relaxed h-10 ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>{category.description || 'No description provided.'}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold uppercase border ${
                            category.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                                : 'bg-red-50 text-red-700 border-red-200/50'
                        }`}>
                        <div className={`h-2 w-2 rounded-full ${category.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {category.is_active ? 'Active' : 'Archived'}
                    </span>

                    {category.needs_action ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200/50 px-2.5 py-1 text-xs font-bold animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> Need Action
                        </span>
                    ) : category.parent_id && parentName ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200/50">
                            <FolderTree className="h-3 w-3" /> {parentName}
                        </span>
                    ) : (
                        subcategoryCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/10">
                                {subcategoryCount} Subcategories
                            </span>
                        )
                    )}
                </div>
                
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                        className="rounded-lg p-2 text-text-muted hover:text-primary hover:bg-primary/10 transition-colors bg-page-bg/50 backdrop-blur border border-border"
                        title="Edit category"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                        className="rounded-lg p-2 text-text-muted hover:text-danger hover:bg-red-50 transition-colors bg-page-bg/50 backdrop-blur border border-border"
                        title="Delete category"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
