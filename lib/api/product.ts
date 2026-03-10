/**
 * Product API Client — Admin
 * Handles product CRUD operations against the backend.
 */

import { getToken } from '@/lib/auth';
import { authFetch } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface VariantPayload {
    // product_variants columns
    sku: string;                    // → variant_sku
    variant_name: string;           // → variant_name
    price: number;                  // → price
    stock: number;                  // → stock_quantity
    cost_price?: number | null;     // → cost_price
    volume?: string;                // e.g. "750 ml" → parsed to volume_ml
    pack?: string;                  // e.g. "Pack of 2" → parsed to pack_quantity (2)
    isDefault: boolean;             // → is_default
    // Sale
    sale_price?: string | null;     // → sale_price
    sale_start_date?: string;       // combined with sale_start_time → sale_start
    sale_start_time?: string;
    sale_end_date?: string;         // combined with sale_end_time → sale_end
    sale_end_time?: string;
    // Dimensions / Shelf life → product_specifications
    length_cm?: string;
    width_cm?: string;
    height_cm?: string;
    weight_kg?: string;
    shelf_life?: string;            // → shelf_life_months
}

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface CreateProductPayload {
    // Core product fields (maps directly to inventory.products)
    product_name: string;
    brand?: string;
    category?: string;
    sub_category?: string;
    description?: string;
    intended_use?: string;
    alcohol_percentage?: number | null;   // form field "abv"
    vintage_year?: number | null;         // form field "vintage_year"
    sku?: string;                         // taken from default variant

    // Nested: goes to inventory.product_specifications
    specifications?: {
        country_of_origin?: string;
    };

    // Full variant list
    variants?: VariantPayload[];

    // Legacy single-variant fields (fallback if no variants array)
    price?: number;
    quantity?: number;
}

export interface ProductRecord {
    product_id: string;
    product_name: string;
    brand?: string;
    category?: string;
    sub_category?: string;
    description?: string;
    intended_use?: string;
    alcohol_percentage?: number;
    vintage_year?: number;
    sku?: string;
    status?: string;
    created_at?: string;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createProduct(
    payload: CreateProductPayload
): Promise<{ success: boolean; product?: ProductRecord; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: ApiResponse<any> = await res.json();
        if ((res.status === 200 || res.status === 201) && json.data) {
            // Backend returns { product: {...}, variants: [...] } — unwrap
            const product = json.data.product || json.data;
            return { success: true, product };
        }
        return { success: false, error: json.message || `Request failed (${res.status})` };
    } catch (error) {
        console.error('[Product API] createProduct error:', error);
        return { success: false, error: 'Network error — is the backend running?' };
    }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateProduct(
    id: string,
    payload: Partial<CreateProductPayload>
): Promise<{ success: boolean; product?: ProductRecord; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${id}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        const json: ApiResponse<ProductRecord> = await res.json();
        if (json.success && json.data) {
            return { success: true, product: json.data };
        }
        return { success: false, error: json.message || 'Failed to update product' };
    } catch (error) {
        console.error('[Product API] updateProduct error:', error);
        return { success: false, error: 'Network error' };
    }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json: ApiResponse = await res.json();
        if (json.success) return { success: true };
        return { success: false, error: json.message || 'Failed to delete product' };
    } catch (error) {
        console.error('[Product API] deleteProduct error:', error);
        return { success: false, error: 'Network error' };
    }
}
