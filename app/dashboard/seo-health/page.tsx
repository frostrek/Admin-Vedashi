'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface SeoWarning {
    id: string;
    name: string;
    slug: string | null;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
    json_ld: any | null;
    missing_alt_text_count: string | number;
}

export default function SeoHealthCheck() {
    const [products, setProducts] = useState<SeoWarning[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const headers = useCallback(() => {
        const h: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) h['Authorization'] = `Bearer ${token}`;
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
            if (match) h['X-CSRF-Token'] = decodeURIComponent(match[1]);
        }
        return h;
    }, []);

    useEffect(() => {
        loadHealthData();
    }, [headers]); // Added headers to dependency array

    const loadHealthData = async () => {
        try {
            setLoading(true);
            const token = getToken();
            if (!token) {
                setError('Session expired (Prasada lost)');
                return;
            }
            
            const res = await fetch(`${API_URL}/api/seo/health-check`, { 
                headers: { 'Authorization': `Bearer ${token}` }, 
                credentials: 'include' 
            });
            
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();

            if (data.success && (data.products || data.data?.products)) {
                setProducts(data.products || data.data?.products || []);
                setError(null);
            } else {
                setError(data.message || 'The cosmic alignment failed to return data.');
            }
        } catch (err: any) {
            console.error('[SEO Health] Fetch error:', err);
            setError(err.message || 'Failed to connect to SEO health repository');
        } finally {
            setLoading(false);
        }
    };

    const getWarnings = (p: SeoWarning) => {
        const warnings: string[] = [];

        if (!p.meta_title) warnings.push('Missing Meta Title');
        else if (p.meta_title.length > 60) warnings.push('Meta Title > 60 chars');

        if (!p.meta_description) warnings.push('Missing Meta Description');
        else if (p.meta_description.length > 160) warnings.push('Meta Description > 160 chars');

        if (!p.og_image) warnings.push('Missing OG Image');

        if (!p.slug) warnings.push('Missing Slug');
        else if (/[A-Z\s]/.test(p.slug)) warnings.push('Slug contains uppercase or spaces');

        if (Number(p.missing_alt_text_count) > 0) warnings.push(`${p.missing_alt_text_count} images missing alt text`);

        return warnings;
    };

    const warningProducts = products.map(p => ({
        ...p,
        warnings: getWarnings(p)
    })).filter(p => p.warnings.length > 0);

    const healthyCount = products.length - warningProducts.length;

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-8">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
                    <AlertTriangle />
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <h1 className="font-serif text-3xl font-bold flex items-center gap-3 text-gold">
                    <ShieldAlert className="h-8 w-8 text-gold" />
                    SEO Health Check
                </h1>
                <p className="text-[15px] font-semibold text-brown mt-2">Audit your product catalog for missing or suboptimal SEO metadata.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 rounded-2xl border border-border shadow-xl flex flex-col items-center justify-center text-center backdrop-blur-sm animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                    <span className="text-4xl font-bold text-gold">{products.length}</span>
                    <span className="text-sm font-semibold text-gold-muted mt-2 whitespace-nowrap">Total Products Scanned</span>
                </div>
                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 rounded-2xl border border-border shadow-xl flex flex-col items-center justify-center text-center backdrop-blur-sm animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <span className="text-4xl font-bold text-success flex items-center gap-2">
                        <CheckCircle2 size={32} /> {healthyCount}
                    </span>
                    <span className="text-sm font-semibold text-gold-muted mt-2 whitespace-nowrap">Healthy Products</span>
                </div>
                <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 rounded-2xl border border-border shadow-xl flex flex-col items-center justify-center text-center backdrop-blur-sm animate-fadeInUp" style={{ animationDelay: '300ms' }}>
                    <span className="text-4xl font-bold text-warning flex items-center gap-2">
                        <AlertTriangle size={32} /> {warningProducts.length}
                    </span>
                    <span className="text-sm font-semibold text-gold-muted mt-2 whitespace-nowrap">Needs Attention</span>
                </div>
            </div>

            <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated rounded-2xl shadow-xl border border-border overflow-hidden animate-fadeInUp backdrop-blur-sm" style={{ animationDelay: '400ms' }}>
                <div className="px-6 py-5 border-b border-border bg-primary/10">
                    <h4 className="font-serif text-base font-bold text-gold uppercase">Products Requiring SEO Updates</h4>
                </div>

                {warningProducts.length === 0 ? (
                    <div className="p-12 text-center text-text-muted">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-success opacity-50 mb-4" />
                        <p className="text-lg font-medium text-gold">All products are fully optimized!</p>
                        <p className="text-sm mt-1">No SEO warnings detected in current protocol registry.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-primary/5 text-sm font-semibold text-gold-muted uppercase">
                                <tr className="border-b border-border bg-page-bg/50">
                                    <th className="px-5 py-3 text-sm font-bold text-gold-muted uppercase text-left">Product</th>
                                    <th className="px-5 py-3 text-sm font-bold text-gold-muted uppercase text-left">Warnings</th>
                                    <th className="px-5 py-3 text-sm font-bold text-gold-muted uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {warningProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gold group-hover:text-gold-soft transition-colors">{p.name}</div>
                                            <div className="text-text-muted text-[10px] mt-1 font-mono uppercase">{p.slug || 'No slug'}</div>
                                        </td>
                                        <td className="px-6 py-4 h-full align-middle">
                                            <div className="flex flex-wrap gap-2">
                                                {p.warnings.map((w, i) => (
                                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-danger/10 text-danger border border-danger/20">
                                                        {w}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/dashboard/products/edit/${p.slug || p.id}?step=4`}
                                                className="inline-flex items-center gap-1 text-gold hover:text-gold-soft font-bold text-[11px] uppercase bg-primary/20 hover:bg-primary/40 border border-gold/10 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                Edit <ArrowRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
