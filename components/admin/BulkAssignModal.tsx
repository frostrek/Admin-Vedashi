'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, FolderTree, ArrowRight } from 'lucide-react';
import { Category } from '@/types/category';

interface BulkAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (parentId: string | null) => Promise<void>;
    /** All categories to pick the new parent from */
    categories: Category[];
    /** IDs of the categories that are being reassigned (to prevent circular parent selection) */
    selectedIds: string[];
}

export default function BulkAssignModal({ isOpen, onClose, onSubmit, categories, selectedIds }: BulkAssignModalProps) {
    const [parentId, setParentId] = useState('');
    const [saving, setSaving] = useState(false);

    // Lock background scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setParentId(''); // Reset selection on open
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Parent options: top-level categories that are not in the selected list
    const parentOptions = categories.filter(
        (cat) => !cat.parent_id && !selectedIds.includes(cat.category_id)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSubmit(parentId || null);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card-bg p-6 shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <FolderTree className="h-5 w-5" />
                        </div>
                        <h4 className="font-serif text-lg font-bold text-text-primary">
                            Assign to Category
                        </h4>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-page-bg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                    Move <strong>{selectedIds.length}</strong> selected items to a new parent category. Select a parent category from the list below:
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">
                            Select Parent Category
                        </label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => setParentId('')}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-sm font-medium ${
                                    parentId === ''
                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                        : 'border-border bg-page-bg/50 text-text-secondary hover:border-primary/40'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderTree className="h-4 w-4 opacity-70" />
                                    None (Make top-level)
                                </span>
                                {parentId === '' && <ArrowRight className="h-4 w-4 animate-in slide-in-from-left-2" />}
                            </button>

                            {parentOptions.map((cat) => (
                                <button
                                    key={cat.category_id}
                                    type="button"
                                    onClick={() => setParentId(cat.category_id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-sm font-medium ${
                                        parentId === cat.category_id
                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                            : 'border-border bg-page-bg/50 text-text-secondary hover:border-primary/40'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <FolderTree className="h-4 w-4 opacity-70" />
                                        {cat.name}
                                    </span>
                                    {parentId === cat.category_id && <ArrowRight className="h-4 w-4 animate-in slide-in-from-left-2" />}
                                </button>
                            ))}

                            {parentOptions.length === 0 && (
                                <p className="text-xs text-center text-text-muted py-4">
                                    No eligible parent categories found.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text-secondary hover:bg-page-bg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-dark transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {saving ? 'Processing...' : 'Confirm Move'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
