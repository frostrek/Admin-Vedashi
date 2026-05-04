'use client';

/**
 * SeoEditor — Reusable SEO management section for Admin entity editors.
 * Features:
 *  - Meta Title with character counter (50–60 recommended)
 *  - Meta Description with character counter (150–160 max)
 *  - Open Graph fields (title, description, image)
 *  - Twitter Card fields
 *  - Robots meta tag dropdown
 *  - Live Google Search Preview
 *  - Auto-generate from entity data
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Wand2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { getSeo, type SeoData } from '@/lib/api/seo';

interface SeoEditorProps {
    entityType: 'product' | 'category' | 'page';
    entityId: string;
    /** Used for auto-generating fallback values */
    entityName: string;
    entitySlug?: string;
    entityDescription?: string;
    entityBrand?: string;
    entityCategory?: string;
    entityThumbnail?: string;
    /** Current SEO state — controlled from parent */
    value: SeoData;
    onChange: (data: SeoData) => void;
}

const ROBOTS_OPTIONS = [
    { value: 'index, follow', label: 'Index, Follow (default)' },
    { value: 'noindex, follow', label: 'No Index, Follow' },
    { value: 'index, nofollow', label: 'Index, No Follow' },
    { value: 'noindex, nofollow', label: 'No Index, No Follow' },
];

function CharCounter({ current, min, max }: { current: number; min: number; max: number }) {
    const isGood = current >= min && current <= max;
    const isWarn = current > max;
    const color = isWarn ? 'text-red-500' : isGood ? 'text-green-600 dark:text-green-400' : 'text-text-muted';

    return (
        <span className={`text-xs font-mono ${color}`}>
            {current}/{max}
            {isWarn && <AlertCircle className="inline ml-1 w-3 h-3" />}
        </span>
    );
}

export default function SeoEditor({
    entityType,
    entityId,
    entityName,
    entitySlug,
    entityDescription,
    entityBrand,
    entityCategory,
    entityThumbnail,
    value,
    onChange,
}: SeoEditorProps) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load existing SEO data on mount
    useEffect(() => {
        if (!entityId) return;
        let cancelled = false;
        setLoading(true);
        getSeo(entityType, entityId).then((data) => {
            if (!cancelled && data) {
                onChange({
                    meta_title: data.meta_title || '',
                    meta_description: data.meta_description || '',
                    meta_keywords: data.meta_keywords || '',
                    canonical_url: data.canonical_url || '',
                    og_title: data.og_title || '',
                    og_description: data.og_description || '',
                    og_image: data.og_image || '',
                    twitter_title: data.twitter_title || '',
                    twitter_description: data.twitter_description || '',
                    twitter_image: data.twitter_image || '',
                    robots: data.robots || 'index, follow',
                    slug: data.slug || '',
                });
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityId, entityType]);

    const update = useCallback((field: keyof SeoData, val: string) => {
        onChange({ ...value, [field]: val });
    }, [value, onChange]);

    /** Auto-generate fallback values from entity data */
    const autoGenerate = () => {
        const title = entityType === 'product'
            ? `${entityName}${entityBrand ? ` | ${entityBrand}` : ''} | Buy Online`
            : `Buy ${entityName} Online | Premium Ayurvedic Wellness`;

        const desc = entityType === 'product'
            ? `Buy ${entityName}${entityBrand ? ` by ${entityBrand}` : ''}.${entityCategory ? ` Premium ${entityCategory}.` : ''} Fast delivery and secure checkout.`
            : entityDescription || `Explore our collection of premium ${entityName}. Discover authentic ayurvedic and herbal wellness products with competitive pricing.`;

        onChange({
            ...value,
            meta_title: title.slice(0, 60),
            meta_description: desc.slice(0, 160),
            og_title: title.slice(0, 60),
            og_description: desc.slice(0, 160),
            og_image: value.og_image || entityThumbnail || '',
            twitter_title: title.slice(0, 60),
            twitter_description: desc.slice(0, 160),
            twitter_image: value.twitter_image || entityThumbnail || '',
            robots: value.robots || 'index, follow',
        });
    };

    // Google Search Preview values
    const previewTitle = value.meta_title || entityName || 'Page Title';
    const previewDesc = value.meta_description || entityDescription || 'Page description will appear here...';
    const previewUrl = value.canonical_url || `vedashi.com/${entityType}s/${value.slug || entitySlug || entityId}`;

    if (loading) {
        return (
            <div className="bg-card-bg border border-border rounded-xl p-6">
                <div className="animate-shimmer h-6 w-48 rounded mb-4" />
                <div className="space-y-3">
                    <div className="animate-shimmer h-10 w-full rounded" />
                    <div className="animate-shimmer h-20 w-full rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
            {/* ─── Header ─── */}
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-gold" />
                    <h3 className="font-serif text-lg text-text-primary font-semibold">SEO Settings</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={autoGenerate}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                    >
                        <Wand2 className="w-3.5 h-3.5" />
                        Auto-Generate
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* ─── Google Search Preview ─── */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
                        <Eye className="w-4 h-4 text-gold" />
                        Google Search Preview
                    </label>
                    <div className="bg-white dark:bg-[#1e1a1a] border border-border rounded-lg p-4 space-y-1">
                        <p className="text-sm text-green-700 dark:text-green-400 truncate font-sans">
                            {previewUrl}
                        </p>
                        <p className="text-lg text-blue-700 dark:text-blue-400 font-medium truncate cursor-pointer hover:underline">
                            {previewTitle}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {previewDesc}
                        </p>
                    </div>
                </div>

                {/* ─── Meta Title ─── */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-text-primary">Meta Title</label>
                        <CharCounter current={value.meta_title?.length ?? 0} min={30} max={60} />
                    </div>
                    <input
                        type="text"
                        value={value.meta_title || ''}
                        onChange={e => update('meta_title', e.target.value)}
                        placeholder={entityName || 'Enter meta title...'}
                        maxLength={70}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                    />
                    <p className="text-xs text-text-muted mt-1">Recommended: 50–60 characters for optimal display in search results.</p>
                </div>

                {/* ─── Meta Description ─── */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-text-primary">Meta Description</label>
                        <CharCounter current={value.meta_description?.length ?? 0} min={120} max={160} />
                    </div>
                    <textarea
                        rows={3}
                        value={value.meta_description || ''}
                        onChange={e => update('meta_description', e.target.value)}
                        placeholder="Enter meta description..."
                        maxLength={170}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors resize-none"
                    />
                    <p className="text-xs text-text-muted mt-1">Recommended: 150–160 characters. Describe the page content compellingly.</p>
                </div>

                {/* ─── Meta Keywords ─── */}
                <div>
                    <label className="text-sm font-medium text-text-primary block mb-1.5">Meta Keywords <span className="text-text-muted">(optional)</span></label>
                    <input
                        type="text"
                        value={value.meta_keywords || ''}
                        onChange={e => update('meta_keywords', e.target.value)}
                        placeholder="ayurvedic, herbal, wellness, Vedashi..."
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                    />
                </div>

                {/* ─── Robots ─── */}
                <div>
                    <label className="text-sm font-medium text-text-primary block mb-1.5">Robots Meta Tag</label>
                    <select
                        value={value.robots || 'index, follow'}
                        onChange={e => update('robots', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card-bg text-text-primary text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                    >
                        {ROBOTS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* ─── Canonical URL ─── */}
                <div>
                    <label className="text-sm font-medium text-text-primary block mb-1.5">Canonical URL <span className="text-text-muted">(optional)</span></label>
                    <input
                        type="url"
                        value={value.canonical_url || ''}
                        onChange={e => update('canonical_url', e.target.value)}
                        placeholder="https://vedashi.com/products/..."
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                    />
                </div>

                {/* ─── Expandable: OG + Twitter ─── */}
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-sm font-medium text-gold hover:text-gold-muted transition-colors"
                >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Open Graph & Twitter Card Settings
                </button>

                {expanded && (
                    <div className="space-y-5 pl-4 border-l-2 border-gold/20 animate-fadeIn">
                        {/* OG */}
                        <h4 className="font-serif text-sm font-semibold text-text-primary">Open Graph</h4>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-text-secondary">OG Title</label>
                                <CharCounter current={value.og_title?.length ?? 0} min={30} max={60} />
                            </div>
                            <input
                                type="text"
                                value={value.og_title || ''}
                                onChange={e => update('og_title', e.target.value)}
                                placeholder="Defaults to Meta Title"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-text-secondary">OG Description</label>
                                <CharCounter current={value.og_description?.length ?? 0} min={50} max={160} />
                            </div>
                            <textarea
                                rows={2}
                                value={value.og_description || ''}
                                onChange={e => update('og_description', e.target.value)}
                                placeholder="Defaults to Meta Description"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1.5">OG Image URL</label>
                            <input
                                type="url"
                                value={value.og_image || ''}
                                onChange={e => update('og_image', e.target.value)}
                                placeholder="https://..."
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                            />
                        </div>

                        {/* Twitter */}
                        <h4 className="font-serif text-sm font-semibold text-text-primary pt-2">Twitter Card</h4>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-text-secondary">Twitter Title</label>
                                <CharCounter current={value.twitter_title?.length ?? 0} min={30} max={60} />
                            </div>
                            <input
                                type="text"
                                value={value.twitter_title || ''}
                                onChange={e => update('twitter_title', e.target.value)}
                                placeholder="Defaults to Meta Title"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-text-secondary">Twitter Description</label>
                                <CharCounter current={value.twitter_description?.length ?? 0} min={50} max={160} />
                            </div>
                            <textarea
                                rows={2}
                                value={value.twitter_description || ''}
                                onChange={e => update('twitter_description', e.target.value)}
                                placeholder="Defaults to Meta Description"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-secondary block mb-1.5">Twitter Image URL</label>
                            <input
                                type="url"
                                value={value.twitter_image || ''}
                                onChange={e => update('twitter_image', e.target.value)}
                                placeholder="https://..."
                                className="w-full px-3 py-2 rounded-lg border border-border bg-card-bg text-text-primary text-sm placeholder:text-text-muted focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
