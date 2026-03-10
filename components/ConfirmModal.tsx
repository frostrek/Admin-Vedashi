'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    confirmVariant?: 'danger' | 'primary';
    loading?: boolean;
    /** Hide the default footer buttons (for fully custom content) */
    hideFooter?: boolean;
}

export default function ConfirmModal({
    open,
    onClose,
    title,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    confirmVariant = 'primary',
    loading = false,
    hideFooter = false,
}: ConfirmModalProps) {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    const confirmClasses =
        confirmVariant === 'danger'
            ? 'bg-gradient-to-r from-[#7B2D3A] to-[#6A1F28] hover:from-[#8B3D4A] hover:to-[#7B2D3A] text-[#E8D8B9] border border-[#9B4D5A]/30'
            : 'bg-primary hover:bg-primary-light text-[#E8D8B9] border border-gold/10';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated shadow-2xl shadow-black/40 animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-1">
                    <h2 className="font-serif text-lg font-bold text-text-primary tracking-wide">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-hover transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Ornamental divider */}
                <div className="mx-6 h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent mt-2" />

                {/* Body */}
                <div className="px-6 py-5 text-sm text-text-secondary leading-relaxed">
                    {children}
                </div>

                {/* Footer */}
                {!hideFooter && (
                    <>
                        <div className="mx-6 h-[1px] bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
                        <div className="flex items-center justify-end gap-3 px-6 py-4">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-hover transition-all duration-200 disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={loading}
                                className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-50 hover:shadow-lg ${confirmClasses}`}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                        Processing…
                                    </span>
                                ) : (
                                    confirmLabel
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
