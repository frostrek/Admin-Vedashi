import { authFetch } from '@/lib/api';
/**
 * SEO API Client — Admin
 * Handles CRUD operations for SEO metadata.
 */

import { getToken } from '@/lib/auth';
import { env } from '@/lib/env';

const API_URL = env.NEXT_PUBLIC_API_URL;

function authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

export interface SeoData {
    seo_id?: string;
    entity_type?: string;
    entity_id?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    canonical_url?: string;
    og_title?: string;
    og_description?: string;
    og_image?: string;
    twitter_title?: string;
    twitter_description?: string;
    twitter_image?: string;
    robots?: string;
    slug?: string;
}

/** GET /api/seo/:entityType/:entityId */
export async function getSeo(entityType: string, entityId: string): Promise<SeoData | null> {
    try {
        const res = await authFetch(`${API_URL}/api/seo/${entityType}/${entityId}`);
        const json = await res.json();
        if (json.success && json.data) return json.data;
        return null;
    } catch {
        return null;
    }
}

/** PUT /api/seo/:entityType/:entityId */
export async function saveSeo(
    entityType: string,
    entityId: string,
    data: Partial<SeoData>
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/seo/${entityType}/${entityId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        return { success: json.success };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

/** GET /api/seo/export/:entityType */
export async function exportSeo(entityType: string): Promise<SeoData[]> {
    try {
        const res = await authFetch(`${API_URL}/api/seo/export/${entityType}`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        return json.success && Array.isArray(json.data) ? json.data : [];
    } catch {
        return [];
    }
}

/** POST /api/seo/bulk */
export async function bulkImportSeo(records: Array<SeoData & { entity_type: string; entity_id: string }>): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/seo/bulk`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ records }),
        });
        const json = await res.json();
        return { success: json.success, count: json.data?.length };
    } catch {
        return { success: false, error: 'Network error' };
    }
}
