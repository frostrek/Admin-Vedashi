import { authFetch } from '@/lib/api';
import { Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/category';
import { getToken } from '@/lib/auth';
import { env } from '@/lib/env';

const API_URL = env.NEXT_PUBLIC_API_URL;

/** Build headers with auth token for admin endpoints */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

/* ─── GET all categories ─── */

export async function getCategories(tree: boolean = false): Promise<Category[]> {
    try {
        const res = await fetch(`${API_URL}/api/categories?include_inactive=true${tree ? '&tree=true' : ''}`, { credentials: 'include' });
        const json: ApiResponse<Category[]> = await res.json();
        
        const mapCategory = (cat: any): Category => ({
            category_id: cat.category_id ?? '',
            name: cat.name ?? '',
            slug: cat.slug ?? '',
            description: cat.description ?? '',
            parent_id: cat.parent_id ?? null,
            image_url: cat.image_url ?? null,
            sort_order: cat.sort_order ?? 0,
            is_active: cat.is_active ?? true,
            has_children: cat.has_children ?? false,
            product_count: cat.product_count ?? 0,
            needs_action: cat.needs_action ?? false,
            children: Array.isArray(cat.children) ? cat.children.map(mapCategory) : [],
        });

        if (json.success && Array.isArray(json.data)) {
            return json.data.map(mapCategory);
        }
        return [];
    } catch (error) {
        console.error('[Category API] Failed to fetch categories:', error);
        return [];
    }
}

/* ─── GET category subtree (all descendants) ─── */

export async function getCategorySubtree(categoryId: string): Promise<Category[]> {
    try {
        const res = await fetch(`${API_URL}/api/categories/${categoryId}/subtree`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch subtree');
        const json: ApiResponse<{ subtree: any[] }> = await res.json();
        if (json.success && json.data?.subtree && Array.isArray(json.data.subtree)) {
            return json.data.subtree.map((cat: any): Category => ({
                category_id: cat.category_id ?? '',
                name: cat.name ?? '',
                slug: cat.slug ?? '',
                description: cat.description ?? '',
                parent_id: cat.parent_id ?? null,
                image_url: cat.image_url ?? null,
                sort_order: cat.sort_order ?? 0,
                is_active: cat.is_active ?? true,
                has_children: cat.has_children ?? false,
                product_count: cat.product_count ?? 0,
                needs_action: cat.needs_action ?? false,
            }));
        }
        return [];
    } catch (error) {
        console.error('[Category API] Failed to fetch subtree:', error);
        throw error;
    }
}

/* ─── GET category breadcrumb (ancestor path root→leaf) ─── */

export async function getCategoryBreadcrumb(categoryId: string): Promise<Category[]> {
    try {
        const res = await fetch(`${API_URL}/api/categories/${categoryId}/breadcrumb`, { credentials: 'include' });
        if (!res.ok) return [];
        const json: ApiResponse<{ breadcrumb: any[] }> = await res.json();
        if (json.success && json.data?.breadcrumb && Array.isArray(json.data.breadcrumb)) {
            return json.data.breadcrumb.map((cat: any): Category => ({
                category_id: cat.category_id ?? '',
                name: cat.name ?? '',
                slug: cat.slug ?? '',
                description: cat.description ?? '',
                parent_id: cat.parent_id ?? null,
                image_url: cat.image_url ?? null,
                sort_order: cat.sort_order ?? 0,
                is_active: cat.is_active ?? true,
                has_children: cat.has_children ?? false,
                product_count: cat.product_count ?? 0,
                needs_action: cat.needs_action ?? false,
            }));
        }
        return [];
    } catch (error) {
        console.error('[Category API] Failed to fetch breadcrumb:', error);
        return [];
    }
}

/* ─── CREATE a category ─── */

export async function createCategory(
    payload: CreateCategoryPayload
): Promise<{ success: boolean; category?: Category; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/categories`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        const json: ApiResponse<Category> = await res.json();
        if (json.success && json.data) {
            return { success: true, category: json.data };
        }
        return { success: false, error: json.message || 'Failed to create category' };
    } catch (error) {
        console.error('[Category API] Failed to create category:', error);
        return { success: false, error: 'Network error — is the backend running?' };
    }
}

/* ─── UPDATE a category ─── */

export async function updateCategory(
    id: string,
    payload: UpdateCategoryPayload
): Promise<{ success: boolean; category?: Category; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/categories/${id}`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        const json: ApiResponse<Category> = await res.json();
        if (json.success) {
            return { success: true, category: json.data };
        }
        return { success: false, error: json.message || 'Failed to update category' };
    } catch (error) {
        console.error('[Category API] Failed to update category:', error);
        return { success: false, error: 'Network error' };
    }
}

/* ─── DELETE a category ─── */

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/categories/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json: ApiResponse = await res.json();
        if (json.success) {
            return { success: true };
        }
        return { success: false, error: json.message || 'Failed to delete category' };
    } catch (error) {
        console.error('[Category API] Failed to delete category:', error);
        return { success: false, error: 'Network error' };
    }
}

/* ─── BULK DELETE categories ─── */

export async function bulkDeleteCategories(ids: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/categories/bulk-delete`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ ids }),
        });
        const json: ApiResponse = await res.json();
        if (json.success) {
            return { success: true };
        }
        return { success: false, error: json.message || 'Failed to delete categories' };
    } catch (error) {
        console.error('[Category API] Failed to bulk delete categories:', error);
        return { success: false, error: 'Network error' };
    }
}

/* ─── BULK UPDATE categories ─── */

export async function bulkUpdateCategories(
    ids: string[],
    data: Partial<UpdateCategoryPayload>
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/categories/bulk-update`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ ids, data }),
        });
        const json: ApiResponse = await res.json();
        if (json.success) {
            return { success: true };
        }
        return { success: false, error: json.message || 'Failed to update categories' };
    } catch (error) {
        console.error('[Category API] Failed to bulk update categories:', error);
        return { success: false, error: 'Network error' };
    }
}

/* ─── UPLOAD Category Image ─── */

export async function uploadCategoryImage(
    categoryId: string,
    file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const headers = authHeaders();
        // Do NOT set Content-Type for FormData; browser sets it with correct boundary.
        delete headers['Content-Type'];

        const res = await authFetch(`${API_URL}/api/categories/${categoryId}/image`, {
            method: 'POST',
            headers,
            body: formData,
        });
        
        const json: ApiResponse<Category> = await res.json();
        if (json.success && json.data) {
            return { success: true, url: json.data.image_url ?? undefined };
        }
        return { success: false, error: json.message || 'Failed to upload image' };
    } catch (error) {
        console.error('[Category API] Failed to upload category image:', error);
        return { success: false, error: 'Network error' };
    }
}
