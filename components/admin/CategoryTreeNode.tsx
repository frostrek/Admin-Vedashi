'use client';

import { useState } from 'react';
import { 
    ChevronRight, 
    ChevronDown, 
    Folder, 
    FolderTree, 
    Tag, 
    Pencil, 
    Trash2, 
    Plus,
    MoreVertical,
    Check,
    AlertTriangle,
    Image as ImageIcon
} from 'lucide-react';
import { Category } from '@/types/category';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryTreeNodeProps {
    category: Category & { children?: Category[] };
    level: number;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
    onAddChild: (category: Category) => void;
    selectedIds: string[];
    onToggleSelect: (id: string, selected: boolean) => void;
}

export default function CategoryTreeNode({
    category,
    level,
    onEdit,
    onDelete,
    onAddChild,
    selectedIds,
    onToggleSelect
}: CategoryTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(level < 1); // Expand first level by default
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedIds.includes(category.category_id);

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="flex flex-col w-full">
            {/* Row Content */}
            <div 
                onClick={() => onToggleSelect(category.category_id, !isSelected)}
                className={`group flex items-center gap-2 py-1.5 px-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isSelected 
                        ? 'bg-primary/10 border-primary shadow-sm' 
                        : level === 0 
                            ? 'bg-white border-border hover:border-primary/30 hover:shadow-sm' 
                            : 'bg-transparent border-transparent hover:bg-primary/5'
                }`}
                style={{ marginLeft: `${level * 20}px` }}
            >
                {/* Expand/Collapse Toggle */}
                <div 
                    onClick={toggleExpand}
                    className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors ${
                        hasChildren ? 'hover:bg-primary/10' : 'opacity-0 cursor-default'
                    }`}
                >
                    {hasChildren && (
                        isExpanded ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />
                    )}
                </div>

                {/* Selection Checkbox */}
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                    isSelected 
                        ? 'bg-primary border-primary text-white shadow-sm' 
                        : 'border-border bg-white group-hover:border-primary/50'
                }`}>
                    <Check className={`h-3 w-3 transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`} />
                </div>

                {/* Icon & Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        category.parent_id ? 'bg-amber-50 text-amber-600' : 'bg-primary/10 text-primary'
                    }`}>
                        {category.image_url ? (
                            <img src={category.image_url} alt="" className="h-6 w-6 rounded object-cover shadow-sm" />
                        ) : (
                            category.parent_id ? <FolderTree className="h-5 w-5" /> : <Tag className="h-5 w-5" />
                        )}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`font-serif text-sm font-bold truncate ${
                                isSelected ? 'text-primary' : 'text-text-primary'
                            }`}>
                                {category.name}
                            </span>
                            {!category.is_active && (
                                <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                    Archived
                                </span>
                            )}
                            {category.needs_action && (
                                <span className="flex items-center gap-1 bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse border border-red-100">
                                    <AlertTriangle className="h-3 w-3" /> Orphaned
                                </span>
                            )}
                            <span className="bg-gray-50 text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-mono border border-gray-100" title="Sort Order">
                                #{category.sort_order ?? 0}
                            </span>
                        </div>
                        {category.description && (
                            <span className="text-xs text-text-muted truncate max-w-md">
                                {category.description}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddChild(category); }}
                        className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Add subcategory"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(category); }}
                        className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit category"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                        className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-red-50 transition-colors"
                        title="Delete category"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Recursion (Children) */}
            <AnimatePresence>
                {isExpanded && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden flex flex-col pt-0.5"
                    >
                        {category.children!.map(child => (
                            <CategoryTreeNode
                                key={child.category_id}
                                category={child}
                                level={level + 1}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onAddChild={onAddChild}
                                selectedIds={selectedIds}
                                onToggleSelect={onToggleSelect}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
