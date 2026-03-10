'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createOrderExport, getExportJobStatus, downloadExportFile, getExportHistory, ExportJob } from '@/lib/api';
import { X, Download, FileSpreadsheet, FileText, Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExportModalProps {
    open: boolean;
    onClose: () => void;
}

type ExportFormat = 'csv' | 'xlsx';

export default function ExportModal({ open, onClose }: ExportModalProps) {
    const [format, setFormat] = useState<ExportFormat>('csv');
    const [submitting, setSubmitting] = useState(false);
    const [activeJob, setActiveJob] = useState<ExportJob | null>(null);
    const [history, setHistory] = useState<ExportJob[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Filters
    const [orderStatus, setOrderStatus] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [country, setCountry] = useState('');

    // Load history on open
    useEffect(() => {
        if (open) {
            setHistoryLoading(true);
            getExportHistory(10).then(h => {
                setHistory(h);
                setHistoryLoading(false);
                // If there's an active job, resume polling
                const active = h.find(j => j.status === 'PENDING' || j.status === 'PROCESSING');
                if (active) setActiveJob(active);
            });
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [open]);

    // Poll active job
    useEffect(() => {
        if (!activeJob || (activeJob.status !== 'PENDING' && activeJob.status !== 'PROCESSING')) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
        }

        pollRef.current = setInterval(async () => {
            const status = await getExportJobStatus(activeJob.job_id);
            if (status) {
                setActiveJob(status);
                if (status.status === 'COMPLETED') {
                    toast.success(`Export completed — ${status.total_rows} rows`);
                    if (pollRef.current) clearInterval(pollRef.current);
                    // Refresh history
                    getExportHistory(10).then(setHistory);
                } else if (status.status === 'FAILED') {
                    toast.error(`Export failed: ${status.error_message}`);
                    if (pollRef.current) clearInterval(pollRef.current);
                    getExportHistory(10).then(setHistory);
                }
            }
        }, 2000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [activeJob?.job_id, activeJob?.status]);

    const buildFilters = () => {
        const filters: Record<string, unknown> = {};
        if (orderStatus) filters.order_status = orderStatus;
        if (paymentStatus) filters.payment_status = paymentStatus;
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo) filters.date_to = dateTo;
        if (minAmount) filters.min_amount = parseFloat(minAmount);
        if (maxAmount) filters.max_amount = parseFloat(maxAmount);
        if (customerEmail) filters.customer_email = customerEmail;
        if (country) filters.country = country;
        return filters;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const result = await createOrderExport(format, buildFilters());
        setSubmitting(false);

        if (result.success && result.data) {
            toast.success('Export job started');
            setActiveJob(result.data);
        } else {
            toast.error(result.error || 'Failed to create export');
        }
    };

    const handleDownload = async (jobId: string) => {
        const ok = await downloadExportFile(jobId);
        if (!ok) toast.error('Download failed');
    };

    const statusBadge = (status: ExportJob['status']) => {
        switch (status) {
            case 'PENDING': return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400"><Clock className="h-3 w-3" /> Pending</span>;
            case 'PROCESSING': return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400"><Loader2 className="h-3 w-3 animate-spin" /> Processing</span>;
            case 'COMPLETED': return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Completed</span>;
            case 'FAILED': return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400"><XCircle className="h-3 w-3" /> Failed</span>;
        }
    };

    const isJobActive = activeJob && (activeJob.status === 'PENDING' || activeJob.status === 'PROCESSING');

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card-bg shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card-bg px-6 py-4">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-gold-soft">Export Orders</h2>
                        <p className="text-xs text-text-muted mt-0.5">Download orders as CSV or Excel</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-gold/[0.08] transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Active Job Banner */}
                    {activeJob && (
                        <div className={`rounded-xl border p-4 ${activeJob.status === 'COMPLETED' ? 'border-emerald-500/20 bg-emerald-500/10' :
                            activeJob.status === 'FAILED' ? 'border-red-500/20 bg-red-500/10' :
                                'border-blue-500/20 bg-blue-500/10'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {statusBadge(activeJob.status)}
                                    <span className={`text-sm ${activeJob.status === 'COMPLETED' ? 'text-emerald-200/90' :
                                            activeJob.status === 'FAILED' ? 'text-red-200/90' :
                                                'text-blue-200/90'
                                        }`}>
                                        {activeJob.format.toUpperCase()} export
                                        {activeJob.total_rows != null && ` — ${activeJob.total_rows.toLocaleString()} rows`}
                                        {activeJob.file_size_bytes != null && ` (${(activeJob.file_size_bytes / 1024).toFixed(1)} KB)`}
                                    </span>
                                </div>
                                {activeJob.status === 'COMPLETED' && (
                                    <button
                                        onClick={() => handleDownload(activeJob.job_id)}
                                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Download
                                    </button>
                                )}
                            </div>
                            {activeJob.error_message && (
                                <p className="mt-2 text-xs text-red-600">{activeJob.error_message}</p>
                            )}
                        </div>
                    )}

                    {/* Format Selection */}
                    <div>
                        <label className="text-xs font-semibold text-gold-muted uppercase tracking-wider block mb-2">Format</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFormat('csv')}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${format === 'csv'
                                    ? 'border-gold bg-gold/10 text-gold-soft'
                                    : 'border-border bg-page-bg text-text-muted hover:border-gold/30'
                                    }`}
                            >
                                <FileText className="h-5 w-5" /> CSV
                            </button>
                            <button
                                onClick={() => setFormat('xlsx')}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${format === 'xlsx'
                                    ? 'border-gold bg-gold/10 text-gold-soft'
                                    : 'border-border bg-page-bg text-text-muted hover:border-gold/30'
                                    }`}
                            >
                                <FileSpreadsheet className="h-5 w-5" /> Excel
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div>
                        <label className="text-xs font-semibold text-gold-muted uppercase tracking-wider block mb-3">Filters (optional)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Order Status</label>
                                <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                >
                                    <option value="">All</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="SHIPPED">Shipped</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Payment Status</label>
                                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                >
                                    <option value="">All</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="PAID">Paid</option>
                                    <option value="REFUNDED">Refunded</option>
                                    <option value="FAILED">Failed</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Date From</label>
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Date To</label>
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Min Amount</label>
                                <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="0"
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Max Amount</label>
                                <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="10000"
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Customer Email</label>
                                <input type="text" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="user@example.com"
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-text-muted mb-1 block">Country</label>
                                <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="India"
                                    className="w-full rounded-lg border border-border bg-page-bg px-3 py-2 text-sm focus:border-gold/40 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !!isJobActive}
                        className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${submitting || isJobActive
                            ? 'bg-primary/50 text-text-muted cursor-not-allowed'
                            : 'bg-primary text-[#E8D8B9] hover:bg-primary-light border border-gold/10'
                            }`}
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating export...</span>
                        ) : isJobActive ? (
                            <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Export in progress...</span>
                        ) : (
                            <span className="flex items-center justify-center gap-2"><Download className="h-4 w-4" /> Export Orders</span>
                        )}
                    </button>

                    {/* Export History */}
                    {history.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-semibold text-gold-muted uppercase tracking-wider">Recent Exports</label>
                                <button
                                    onClick={() => { setHistoryLoading(true); getExportHistory(10).then(h => { setHistory(h); setHistoryLoading(false); }); }}
                                    className="text-text-muted hover:text-gold transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="rounded-xl border border-border overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-page-bg">
                                            <th className="px-3 py-2 text-[10px] font-semibold text-gold-muted uppercase">Date</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-gold-muted uppercase">Format</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-gold-muted uppercase">Status</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-gold-muted uppercase">Rows</th>
                                            <th className="px-3 py-2 text-[10px] font-semibold text-gold-muted uppercase text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle">
                                        {history.map(job => (
                                            <tr key={job.job_id} className="hover:bg-gold/[0.03]">
                                                <td className="px-3 py-2 text-xs text-text-secondary">
                                                    {new Date(job.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                                                        {job.format === 'xlsx' ? <FileSpreadsheet className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                                        {job.format.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">{statusBadge(job.status)}</td>
                                                <td className="px-3 py-2 text-xs font-mono text-text-secondary">
                                                    {job.total_rows?.toLocaleString() ?? '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {job.status === 'COMPLETED' && (
                                                        <button
                                                            onClick={() => handleDownload(job.job_id)}
                                                            className="text-gold hover:text-gold-soft transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
