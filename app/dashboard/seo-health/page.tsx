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
            const h = headers();
            console.log('[SEO Health] Fetching with token:', h['Authorization'] ? 'present' : 'MISSING');
            const res = await fetch(`${API_URL}/api/seo/health-check`, { headers: h });
            console.log('[SEO Health] Response status:', res.status);
            const data = await res.json();
            console.log('[SEO Health] Response data:', data);

            if (!res.ok || data.success === false) {
                setError(data.message || `HTTP ${res.status}`);
            } else {
                setProducts(data.products || data.data?.products || []);
            }
        } catch (err: any) {
            console.error('[SEO Health] Fetch error:', err);
            setError(err.message || 'Failed to connect to SEO health API');
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
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <ShieldAlert className="text-burgundy" />
                    SEO Health Check
                </h1>
                <p className="text-gray-500 mt-2">Audit your product catalog for missing or suboptimal SEO metadata.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold text-gray-800">{products.length}</span>
                    <span className="text-sm text-gray-500 mt-1">Total Products Scanned</span>
                </div>
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold text-emerald-600 flex items-center gap-2">
                        <CheckCircle2 size={32} /> {healthyCount}
                    </span>
                    <span className="text-sm text-emerald-700 mt-1">Healthy Products</span>
                </div>
                <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold text-amber-600 flex items-center gap-2">
                        <AlertTriangle size={32} /> {warningProducts.length}
                    </span>
                    <span className="text-sm text-amber-700 mt-1">Needs Attention</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-semibold text-gray-800">Products Requiring SEO Updates</h2>
                </div>

                {warningProducts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900">All products are fully optimized!</p>
                        <p>No SEO warnings found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Product</th>
                                    <th className="px-6 py-4 font-medium">Warnings</th>
                                    <th className="px-6 py-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {warningProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{p.name}</div>
                                            <div className="text-gray-400 text-xs mt-1 font-mono">{p.slug || 'No slug'}</div>
                                        </td>
                                        <td className="px-6 py-4 h-full align-middle">
                                            <div className="flex flex-wrap gap-2">
                                                {p.warnings.map((w, i) => (
                                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                        {w}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/dashboard/products/edit/${p.slug || p.id}?step=4`}
                                                className="inline-flex items-center gap-1 text-burgundy hover:text-burgundy/80 font-medium bg-burgundy/5 px-3 py-1.5 rounded-lg transition-colors"
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
