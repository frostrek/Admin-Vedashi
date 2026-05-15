'use client';
import { authFetch, API_URL } from '@/lib/api';
import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2, Download, Eye, Play } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface UpdatePreview {
    productId: string;
    sku: string;
    name: string;
    resolvedVia?: string;

    changes: {
        product_name?: { old: string; new: string };
        description?: { old: string; new: string };
        images?: { count: number; all: string[] };
    };
}

export default function BulkUpdateModal({ isOpen, onClose, onSuccess }: BulkUpdateModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<UpdatePreview[]>([]);
    const [errors, setErrors] = useState<{ row: number; sku?: string; error: string }[]>([]);
    const [results, setResults] = useState<{ updated: number; errorCount: number } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStep('upload');
        }
    };

    const handlePreview = async () => {
        if (!file) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('ved_admin_token');

            // Fetch CSRF token first
            let csrfToken = '';
            try {
                const csrfRes = await authFetch(`${API_URL}/api/csrf-token`, { credentials: 'include' });
                const csrfData = await csrfRes.json();
                csrfToken = csrfData?.data?.csrfToken ?? '';
            } catch (err) {
                console.error('CSRF fetch failed', err);
            }

            const res = await fetch(`${API_URL}/api/products/bulk-update/preview`, {
                method: 'POST',
                headers: { 
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setPreviewData(data.data.preview);
                setErrors(data.data.errors);
                setStep('preview');
                if (data.data.preview.length === 0 && data.data.errors.length > 0) {
                    toast.error('No valid updates found, but there were errors.');
                }
            } else {
                toast.error(data.message || 'Preview failed');
            }
        } catch (err) {
            toast.error('Network error during preview');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecute = async () => {
        if (previewData.length === 0) return;
        setIsLoading(true);

        try {
            const token = localStorage.getItem('ved_admin_token');

            // Fetch CSRF token first
            let csrfToken = '';
            try {
                const csrfRes = await authFetch(`${API_URL}/api/csrf-token`, { credentials: 'include' });
                const csrfData = await csrfRes.json();
                csrfToken = csrfData?.data?.csrfToken ?? '';
            } catch (err) {
                console.error('CSRF fetch failed', err);
            }

            const res = await fetch(`${API_URL}/api/products/bulk-update/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ updates: previewData }),
            });

            const data = await res.json();
            if (data.success) {
                setResults({ updated: data.data.updated, errorCount: data.data.errors.length });
                setStep('results');
                toast.success(`Successfully updated ${data.data.updated} products!`);
                onSuccess();
            } else {
                toast.error(data.message || 'Execution failed');
            }
        } catch (err) {
            toast.error('Network error during execution');
        } finally {
            setIsLoading(false);
        }
    };

    const resetAndClose = () => {
        setFile(null);
        setStep('upload');
        setPreviewData([]);
        setErrors([]);
        setResults(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />
            <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card-bg">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-text-primary">Staged Bulk Update</h2>
                        <p className="text-sm text-text-secondary">Validate changes before applying them to your inventory.</p>
                    </div>
                    <button onClick={resetAndClose} className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-page-bg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-primary/50 bg-primary/5' : 'border-border-strong hover:border-gold/50 bg-page-bg/50 hover:bg-page-bg'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <FileType className="h-12 w-12 text-primary mb-2" />
                                        <p className="text-lg font-medium text-text-primary">{file.name}</p>
                                        <p className="text-sm text-text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <UploadCloud className="h-12 w-12 text-text-muted mb-2" />
                                        <p className="text-lg font-medium text-text-primary">Click to upload Bulk Update CSV</p>
                                        <p className="text-sm text-text-muted mt-1">Supports <strong>Product_ID</strong>, <strong>SKU</strong>, or <strong>Product_Name</strong></p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                                <p className="font-semibold mb-1">How it works:</p>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Upload a CSV with at least one identifier: <strong>Product_ID</strong> (UUID), <strong>SKU</strong>, or <strong>Product_Name</strong>.</li>
                                    <li>Include the fields you want to update: Description, Product_Name, Image_1–5.</li>
                                    <li>The system matches rows to your products and shows a diff preview.</li>
                                    <li>Review and confirm before changes are saved.</li>
                                </ol>
                                <p className="mt-2 text-xs text-blue-600">💡 <strong>GMC Tip:</strong> Export your product list from Google Merchant Center — the Product ID and Name columns work directly.</p>
                            </div>

                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-text-primary">Preview Changes ({previewData.length} items)</h3>
                                {errors.length > 0 && <span className="text-sm text-danger font-medium">{errors.length} errors ignored</span>}
                            </div>
                            <div className="border border-border rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-page-bg border-b border-border">
                                        <tr>
                                            <th className="px-4 py-2 font-semibold">Product / SKU</th>
                                            <th className="px-4 py-2 font-semibold">Changes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-white">
                                        {previewData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-page-bg/30">
                                                <td className="px-4 py-3 align-top">
                                                <div className="font-medium text-text-primary">{item.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {item.sku && <span className="text-xs text-text-muted font-mono">{item.sku}</span>}
                                                        {(item as any).resolvedVia && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                                (item as any).resolvedVia === 'product_id' ? 'bg-emerald-100 text-emerald-700' :
                                                                (item as any).resolvedVia === 'sku' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                via {(item as any).resolvedVia === 'product_id' ? 'ID' : (item as any).resolvedVia === 'sku' ? 'SKU' : 'Name'}
                                                            </span>
                                                        )}
                                                    </div>

                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="space-y-2">
                                                        {item.changes.product_name && (
                                                            <div className="text-xs">
                                                                <span className="font-bold text-text-muted uppercase">Name:</span>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="line-through text-red-500">{item.changes.product_name.old}</span>
                                                                    <span className="text-emerald-600">→ {item.changes.product_name.new}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.changes.description && (
                                                            <div className="text-xs">
                                                                <span className="font-bold text-text-muted uppercase">Description:</span>
                                                                <div className="mt-0.5 text-text-secondary truncate max-w-lg">
                                                                    <span className="text-emerald-600 italic">HTML Content Updated</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.changes.images && (
                                                            <div className="text-xs">
                                                                <span className="font-bold text-text-muted uppercase">Images:</span>
                                                                <span className="ml-2 text-blue-600">{item.changes.images.count} images to be synced</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'results' && results && (
                        <div className="py-12 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                                    <CheckCircle2 className="h-12 w-12" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-text-primary">Update Complete!</h3>
                                <p className="text-text-secondary mt-2">
                                    Successfully updated <strong>{results.updated}</strong> products.
                                    {results.errorCount > 0 && <span className="text-danger ml-2">({results.errorCount} errors logged)</span>}
                                </p>
                            </div>
                            <div className="max-w-sm mx-auto p-4 bg-page-bg rounded-xl border border-border text-xs text-text-muted">
                                Activity has been recorded in the system logs for audit purposes.
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/50 bg-page-bg flex items-center justify-end gap-3">
                    <button onClick={resetAndClose} className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary">
                        {step === 'results' ? 'Close' : 'Cancel'}
                    </button>
                    {step === 'upload' && (
                        <button
                            onClick={handlePreview}
                            disabled={!file || isLoading}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-light disabled:opacity-50 rounded-lg transition-colors"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            Preview Changes
                        </button>
                    )}
                    {step === 'preview' && (
                        <button
                            onClick={handleExecute}
                            disabled={previewData.length === 0 || isLoading}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            Apply Updates
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
