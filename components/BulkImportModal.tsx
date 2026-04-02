'use client';
import { authFetch, API_URL } from '@/lib/api';

import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as xlsx from 'xlsx';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
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


    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState<{
        totalRows: number;
        created: number;
        updated: number;
        errors: { row: number; sku: string; error: string }[];
        mediaErrors?: { url: string; error: string }[];
    } | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [progressStatus, setProgressStatus] = useState<{
        status: string;
        total_rows: number;
        processed_rows: number;
        successful: number;
        failed: number;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
                if (data.data.jobId) {
                    // Large import - switch to polling mode
                    setJobId(data.data.jobId);
                    startPolling(data.data.jobId);
                    toast.success('Large file detected. Importing in background...');
                } else {
                    // Small import - results returned immediately
                    setResults(data.data);
                    if ((data.data.errors && data.data.errors.length > 0) || (data.data.mediaErrors && data.data.mediaErrors.length > 0)) {
                        toast.error(`Import finished with some issues.`);
                    } else {
                        toast.success('Import completed successfully!');
                    }
                    onSuccess();
                    setIsUploading(false);
                }
            } else {
                toast.error(data.message || 'Import failed');
                setIsUploading(false);
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error during upload');
            setIsUploading(false);
        }
    };

    const startPolling = (id: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await authFetch(`${API_URL}/api/products/import/csv/status/${id}`);
                const data = await res.json();

                if (data.success && data.data) {
                    const job = data.data;
                    setProgressStatus(job);

                    if (job.status === 'completed') {
                        clearInterval(interval);
                        setResults(job.result);
                        setJobId(null);
                        setIsUploading(false);
                        toast.success('Background import completed!');
                        onSuccess();
                    } else if (job.status === 'failed') {
                        clearInterval(interval);
                        setResults(job.result || { totalRows: job.total_rows, created: job.successful, updated: 0, errors: job.errors || [] });
                        setJobId(null);
                        setIsUploading(false);
                        toast.error('Background import failed.');
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000);
    };

    const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
        // Template columns match the new 3-variant wide format exactly
        const data = [
            {
                // ── General / Product-level ─────────────────────
                'Product Name': "Ashwagandha Prowess",
                'Brand': "Vedashi",
                'Category': "Wellness",
                'Subcategory': "Capsules",
                'Country of Origin': "India",
                'Form': "Capsules",
                'Speciality': "Ayurvedic",
                'Speciality_2': "Organic",
                'Speciality_3': "",
                'Intended Use': "Daily wellness",
                'Description': "A premium ayurvedic supplement for vitality and stress relief.",
                'Short Description': "Premium Ashwagandha capsules for daily wellness & stress relief.",
                'product_image_1': "https://example.com/product-main.jpg",
                'product_image_2': "",
                'product_image_3': "",
                'product_image_4': "",
                'product_image_5': "",
                'product_video': "",

                // ── Variant 1 ───────────────────────────────
                'Variant_name1': "60 Capsules Single",
                'SKU1': "VED-001",
                'Price 1': "450",
                'Stock 1': "50",
                'weight 1': "150",
                'weight_unit 1': "g",
                'volume 1': "",
                'volume_unit 1': "",
                'Count 1': "60",
                'Count_unit 1': "Capsules",
                'Strength 1': "500",
                'Strength_unit 1': "mg",
                'Flavor 1': "",
                'Pack_quantity 1': "1",
                'Cost_price($) 1': "300",
                'Shelf_life(months) 1': "24",
                'Length 1': "10",
                'width 1': "5",
                'height 1': "5",
                'image_1_1': "https://example.com/variant-1.jpg",
                'image_1_2': "",
                'image_1_3': "",
                'image_1_4': "",
                'image_1_5': "",
                'video_1': "",
                'russia_markup_1': "20",
                'korea_markup_1': "25",

                // ── Variant 2 ───────────────────────────────
                'Variant_name 2': "120 Capsules Twin Pack",
                'SKU 2': "VED-002",
                'Price 2': "800",
                'Stock 2': "30",
                'weight 2': "300",
                'weight_unit 2': "g",
                'volume 2': "",
                'volume_unit 2': "",
                'Count 2': "120",
                'Count_unit 2': "Capsules",
                'Strength 2': "500",
                'Strength_unit 2': "mg",
                'Flavor 2': "",
                'Pack_quantity 2': "2",
                'Cost_price($) 2': "550",
                'Shelf_life(months) 2': "24",
                'Length 2': "10",
                'width 2': "10",
                'height 2': "5",
                'image_2_1': "",
                'image_2_2': "",
                'image_2_3': "",
                'image_2_4': "",
                'image_2_5': "",
                'video_2': "",
                'russia_markup_2': "",
                'korea_markup_2': "",

                // ── Variant 3 ───────────────────────────────
                'Variant_name 3': "",
                'SKU 3': "",
                'Price 3': "",
                'Stock 3': "",
                'weight 3': "",
                'weight_unit 3': "",
                'volume 3': "",
                'volume_unit 3': "",
                'Count 3': "",
                'Count_unit 3': "",
                'Strength 3': "",
                'Strength_unit 3': "",
                'Flavor 3': "",
                'Pack_quantity 3': "",
                'Cost_price($) 3': "",
                'Shelf_life(months) 3': "",
                'Length 3': "",
                'width 3': "",
                'height 3': "",
                'image_3_1': "",
                'image_3_2': "",
                'image_3_3': "",
                'image_3_4': "",
                'image_3_5': "",
                'video_3': "",
                'russia_markup_3': "",
                'korea_markup_3': "",
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
        setJobId(null);
        setProgressStatus(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card-bg">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-text-primary">Bulk Import Products</h2>
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
                                <h3 className="font-serif text-sm font-semibold text-amber-800 mb-2">Important Instructions</h3>
                                <ul className="text-sm text-amber-900/80 space-y-1.5 list-disc pl-4">
                                    <li>The file must be a valid <strong>.csv, .xlsx, or .xls</strong> file.</li>
                                    <li><strong>SKU 1</strong>, <strong>Product Name</strong>, and <strong>Price 1</strong> are required for new products.</li>
                                    <li>If the SKU exists, the product will be <strong>updated</strong>. If not, a new product will be <strong>created</strong>.</li>
                                    <li>You can add up to <strong>3 variants</strong> per row (e.g., using SKU 1, SKU 2, SKU 3).</li>
                                    <li><strong>Short Description</strong> is optional — great for SEO and product cards.</li>
                                    <li>Supports media URLs in columns like <strong>product_image_1</strong> and <strong>image_1_1</strong>.</li>
                                    <li>Large files (&gt;100 rows) are processed in the background.</li>
                                    <li><strong>russia_markup_1/2/3</strong> and <strong>korea_markup_1/2/3</strong> are optional — set a % markup for country-specific pricing per variant.</li>
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
                    ) : jobId ? (
                        <div className="py-12 px-6 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="relative">
                                    <Loader2 className="h-16 w-16 text-primary animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-primary">
                                        {progressStatus ? Math.round((progressStatus.processed_rows / progressStatus.total_rows) * 100) : 0}%
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-text-primary">Processing Background Import</h3>
                                <p className="text-sm text-text-secondary">
                                    Job ID: <code className="bg-page-bg px-1.5 py-0.5 rounded text-xs">{jobId}</code>
                                </p>
                            </div>

                            <div className="max-w-md mx-auto space-y-4">
                                <div className="w-full bg-page-bg rounded-full h-2.5 overflow-hidden border border-border">
                                    <div
                                        className="bg-primary h-full transition-all duration-500"
                                        style={{ width: `${progressStatus ? (progressStatus.processed_rows / progressStatus.total_rows) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <div className="flex items-center justify-between text-xs font-medium text-text-muted">
                                    <span>Processed {progressStatus?.processed_rows || 0} / {progressStatus?.total_rows || 0} rows</span>
                                    <span className="text-emerald-600">{progressStatus?.successful || 0} successful</span>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-left">
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    This might take a while depending on the number of images to download and upload to S3. You can close this modal; the import will continue in the background.
                                </p>
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
                            {((results.errors && results.errors.length > 0) || (results.mediaErrors && results.mediaErrors.length > 0)) && (
                                <div className="mt-6 border border-red-200 rounded-xl overflow-hidden">
                                    <div className="bg-red-50 px-4 py-3 flex items-center justify-between border-b border-red-100">
                                        <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                                            <AlertCircle className="h-4 w-4" /> Import Issues
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-0">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-white sticky top-0 border-b border-red-100/50 shadow-sm">
                                                <tr className="text-xs text-red-800 uppercase">
                                                    <th className="px-4 py-2 font-medium">Row / Type</th>
                                                    <th className="px-4 py-2 font-medium">SKU / URL</th>
                                                    <th className="px-4 py-2 font-medium">Error Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-100 bg-white">
                                                {results.errors?.map((err, idx) => (
                                                    <tr key={`row-${idx}`} className="hover:bg-red-50/50">
                                                        <td className="px-4 py-2.5 text-red-600 font-mono text-xs">Row {err.row}</td>
                                                        <td className="px-4 py-2.5 text-red-900 font-mono text-xs">{err.sku}</td>
                                                        <td className="px-4 py-2.5 text-red-600">{err.error}</td>
                                                    </tr>
                                                ))}
                                                {results.mediaErrors?.map((err, idx) => (
                                                    <tr key={`media-${idx}`} className="hover:bg-red-50/50 italic">
                                                        <td className="px-4 py-2.5 text-amber-600 font-medium text-xs">Media</td>
                                                        <td className="px-4 py-2.5 text-text-muted font-mono text-xs truncate max-w-[150px]" title={err.url}>{err.url}</td>
                                                        <td className="px-4 py-2.5 text-amber-700">{err.error}</td>
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
