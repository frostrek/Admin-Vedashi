'use client';
import { authFetch } from '@/lib/api';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as xlsx from 'xlsx';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<{
        totalRows: number;
        created: number;
        updated: number;
        errors: { row: number; sku: string; error: string }[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResults(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setResults(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('ksp_admin_token');

            // Fetch CSRF token first (required by backend CSRF middleware)
            let csrfToken = '';
            try {
                const csrfRes = await authFetch(`${API_URL}/api/csrf-token`, { credentials: 'include' });
                const csrfData = await csrfRes.json();
                csrfToken = csrfData?.data?.csrfToken ?? '';
            } catch {
                // proceed without CSRF token — server will reject if still required
            }

            const res = await fetch(`${API_URL}/api/products/import/csv`, {
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
                setResults(data.data);
                if (data.data.errors && data.data.errors.length > 0) {
                    toast.error(`Import finished with ${data.data.errors.length} errors.`);
                } else {
                    toast.success('Import completed successfully!');
                }

                // Refresh list in parent but don't close modal yet so they can see results
                onSuccess();
            } else {
                toast.error(data.message || 'Import failed');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error during upload');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
        // Template columns match the Add Product page fields exactly
        // General Info (Step 1) + Variant fields (Step 3)
        const data = [
            {
                // ── Variant identifier ──────────────────────────
                SKU: "VED-001",
                Variant_Name: "60 Capsules Single",
                // ── General / Product-level ─────────────────────
                Product_Name: "Ashwagandha Prowess",
                Brand: "Vedashi",
                Category: "Wellness",
                Sub_Category: "Capsules",
                Country_of_Origin: "India",
                Vintage_Year: "",
                Alcohol_Percentage: "0",
                Intended_Use: "Daily wellness",
                Description: "A premium ayurvedic supplement for vitality and stress relief.",
                Available_From: "",        // e.g. 2025-01-01
                Available_Until: "",       // e.g. 2025-12-31
                // ── Variant-level ───────────────────────────────
                Volume: "750 ml",          // e.g. "750 ml" or "1 L"
                Pack: "Single",            // e.g. Single / Pack of 6 / Case
                Price: "450000",
                Cost_Price: "300000",
                Stock: "50",
                Sale_Price: "",            // Leave blank for no sale
                Sale_Start_Date: "",       // e.g. 2025-06-01
                Sale_End_Date: "",         // e.g. 2025-06-30
                Shelf_Life_Months: "",     // e.g. 24
                Length_cm: "",
                Width_cm: "",
                Height_cm: "",
                Weight_kg: "",
            }
        ];

        const worksheet = xlsx.utils.json_to_sheet(data);

        if (format === 'csv') {
            const csvContent = xlsx.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "product_import_template.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Template");
            xlsx.writeFile(workbook, "product_import_template.xlsx");
        }
    };

    const resetAndClose = () => {
        setFile(null);
        setResults(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card-bg">
                    <div>
                        <h2 className="text-xl font-bold font-serif text-text-primary">Bulk Import Products</h2>
                        <p className="text-sm text-text-secondary">Upload a CSV or Excel file to create or update products in bulk.</p>
                    </div>
                    <button onClick={resetAndClose} className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-page-bg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {!results ? (
                        <div className="space-y-6">
                            {/* Upload Area */}
                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-primary/50 bg-primary/5' : 'border-border-strong hover:border-gold/50 bg-page-bg/50 hover:bg-page-bg'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <div className="h-16 w-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <FileType className="h-8 w-8" />
                                        </div>
                                        <p className="text-lg font-medium text-text-primary">{file.name}</p>
                                        <p className="text-sm text-text-muted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="mt-4 text-sm font-medium text-danger hover:underline"
                                        >
                                            Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center cursor-pointer">
                                        <div className="h-16 w-16 mb-4 rounded-full bg-page-bg border border-border flex items-center justify-center text-text-muted">
                                            <UploadCloud className="h-8 w-8" />
                                        </div>
                                        <p className="text-lg font-medium text-text-primary">Click to upload CSV or Excel file</p>
                                        <p className="text-sm text-text-muted mt-1">or drag and drop</p>
                                    </div>
                                )}
                            </div>

                            {/* Instructions */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-amber-800 mb-2">Important Instructions</h3>
                                <ul className="text-sm text-amber-900/80 space-y-1.5 list-disc pl-4">
                                    <li>The file must be a valid <strong>.csv, .xlsx, or .xls</strong> file.</li>
                                    <li><strong>SKU</strong>, <strong>Product_Name</strong>, <strong>Variant_Name</strong>, <strong>Volume</strong>, and <strong>Price</strong> are required for new products.</li>
                                    <li>If the SKU exists, the product will be <strong>updated</strong>. If not, a new product will be <strong>created</strong>.</li>
                                    <li>To add <strong>multiple variants</strong> for one product, repeat the same <strong>Product_Name</strong> on multiple rows with different SKUs, Volumes, or Packs.</li>
                                    <li>New products are imported as <strong>Drafts</strong> by default for your review.</li>
                                    <li>Volume format: <strong>750 ml</strong> or <strong>1 L</strong>. Pack example: <strong>Single</strong>, <strong>Pack of 6</strong>, <strong>Case</strong>.</li>
                                </ul>
                                <div className="mt-5 flex items-center gap-3">
                                    <button
                                        onClick={() => handleDownloadTemplate('csv')}
                                        className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Download className="h-4 w-4" /> CSV Template
                                    </button>
                                    <span className="text-amber-300">|</span>
                                    <button
                                        onClick={() => handleDownloadTemplate('xlsx')}
                                        className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Download className="h-4 w-4" /> Excel (.xlsx) Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-emerald-600 mb-1">{results.created}</div>
                                    <div className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Created</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-blue-600 mb-1">{results.updated}</div>
                                    <div className="text-xs font-medium text-blue-800 uppercase tracking-wider">Updated</div>
                                </div>
                                <div className={`border rounded-xl p-4 text-center ${results.errors.length > 0 ? 'bg-red-50 border-red-100' : 'bg-page-bg border-border'}`}>
                                    <div className={`text-3xl font-bold mb-1 ${results.errors.length > 0 ? 'text-red-600' : 'text-text-primary'}`}>{results.errors.length}</div>
                                    <div className={`text-xs font-medium uppercase tracking-wider ${results.errors.length > 0 ? 'text-red-800' : 'text-text-muted'}`}>Errors</div>
                                </div>
                            </div>

                            <p className="text-center text-sm text-text-secondary">
                                Processed a total of <strong>{results.totalRows}</strong> rows.
                            </p>

                            {/* Errors List */}
                            {results.errors.length > 0 && (
                                <div className="mt-6 border border-red-200 rounded-xl overflow-hidden">
                                    <div className="bg-red-50 px-4 py-3 flex items-center justify-between border-b border-red-100">
                                        <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                                            <AlertCircle className="h-4 w-4" /> Import Errors
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-0">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-white sticky top-0 border-b border-red-100/50 shadow-sm">
                                                <tr className="text-xs text-red-800 uppercase">
                                                    <th className="px-4 py-2 font-medium">Row</th>
                                                    <th className="px-4 py-2 font-medium">SKU</th>
                                                    <th className="px-4 py-2 font-medium">Error Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-100 bg-white">
                                                {results.errors.map((err, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/50">
                                                        <td className="px-4 py-2.5 text-red-600 font-mono text-xs">{err.row}</td>
                                                        <td className="px-4 py-2.5 text-red-900 font-mono text-xs">{err.sku}</td>
                                                        <td className="px-4 py-2.5 text-red-600">{err.error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/50 bg-page-bg flex items-center justify-end gap-3">
                    <button
                        onClick={resetAndClose}
                        className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary"
                    >
                        {results ? 'Close' : 'Cancel'}
                    </button>
                    {!results && (
                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            {isUploading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                            ) : (
                                <><UploadCloud className="h-4 w-4" /> Start Import</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
