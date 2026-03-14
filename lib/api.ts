/**
 * Admin API Client
 * Backend: https://ecommerce-backend-h23p.onrender.com
 * Response format: { success: boolean, message: string, data: T }
 */

import { getToken, setToken, getRefreshToken, setRefreshToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let cachedCsrfToken: string | null = null;

/** Read the CSRF token from cache or cookie */
function getCsrfToken(): string | null {
    if (cachedCsrfToken) return cachedCsrfToken;
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

/** Ensure a CSRF token exists (lazy-loaded by authFetch) */
export async function initCsrf(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (cachedCsrfToken) return;
    try {
        const res = await fetch(`${API_URL}/api/csrf-token`, { credentials: 'include' });
        const json = await res.json();
        if (json.success && json.data?.csrfToken) {
            cachedCsrfToken = json.data.csrfToken;
        }
    } catch {
        // Non-critical
    }
}

/** Build headers object that includes JWT Bearer token + CSRF token */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    return headers;
}

/**
 * Perform backend logout - clears HttpOnly cookies
 */
export async function logoutUser(): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const json = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] Failed to logout:', error);
        return false;
    }
}

/* ─── Token Refresh ─── */

let _refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Uses a singleton promise to prevent multiple concurrent refresh calls.
 */
async function tryRefreshToken(): Promise<boolean> {
    if (_refreshPromise) return _refreshPromise;
    _refreshPromise = (async () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;
        try {
            const res = await authFetch(`${API_URL}/api/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            const json = await res.json();
            if (json.success && json.data?.access_token) {
                setToken(json.data.access_token);
                if (json.data.refresh_token) setRefreshToken(json.data.refresh_token);
                return true;
            }
        } catch {
            // silent
        }
        return false;
    })();
    const result = await _refreshPromise;
    _refreshPromise = null;
    return result;
}

/**
 * fetch() wrapper that automatically retries once on 401 after refreshing the token.
 * Also globally ensures credentials: 'include' is sent for CSRF cookie transmission,
 * and lazy-loads the CSRF token into memory for cross-origin POST requests.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const fetchInit = { ...init, credentials: 'include' as RequestCredentials };

    // Auto-fetch CSRF token if missing on a state-changing browser request
    const isStateChanging = fetchInit.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchInit.method.toUpperCase());
    if (isStateChanging && typeof window !== 'undefined' && !cachedCsrfToken) {
        await initCsrf();
    }

    // Inject token directly into headers (overrides authHeaders if it was called before token existed)
    if (cachedCsrfToken) {
        fetchInit.headers = { ...fetchInit.headers, 'X-CSRF-Token': cachedCsrfToken };
    }

    let res = await fetch(input, fetchInit);
    if (res.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Rebuild init with the new token
            const newHeaders = authHeaders(
                fetchInit?.headers ? Object.fromEntries(
                    Object.entries(fetchInit.headers as Record<string, string>).filter(([k]) => k.toLowerCase() !== 'authorization')
                ) : undefined
            );
            if (cachedCsrfToken) newHeaders['X-CSRF-Token'] = cachedCsrfToken;
            res = await fetch(input, { ...fetchInit, headers: newHeaders });
        }
    }
    return res;
}

export function formatINR(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
}

/* ─── Profile Management ─── */

export async function updateAdminProfile(id: string, updates: any): Promise<ApiResponse<any>> {
    try {
        const res = await authFetch(`${API_URL}/api/customers/${id}`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(updates),
        });
        return await res.json();
    } catch (error) {
        console.error('[Admin API] Failed to update profile:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
        const res = await authFetch(`${API_URL}/api/auth/change-password`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
        });
        return await res.json();
    } catch (error) {
        console.error('[Admin API] Failed to change password:', error);
        return { success: false, message: 'Network error' };
    }
}

export async function updateAdminProfileImage(id: string, file: File): Promise<ApiResponse<any>> {
    try {
        const formData = new FormData();
        formData.append('profileImage', file);

        const res = await authFetch(`${API_URL}/api/customers/${id}/profile-image`, {
            method: 'PUT',
            headers: authHeaders(), // Don't set Content-Type for FormData
            body: formData,
        });
        return await res.json();
    } catch (error) {
        console.error('[Admin API] Failed to upload profile image:', error);
        return { success: false, message: 'Network error' };
    }
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface Product {
    product_id: string;
    slug?: string;
    sku: string;
    product_name: string;
    brand?: string;
    category?: string;
    sub_category?: string;
    category_id?: string;
    sub_category_id?: string;
    description?: string;
    unit_of_measure?: string;
    intended_use?: string;
    price?: number;
    quantity?: number; // request-only: sets default variant stock (not returned in responses)

    stock_quantity?: number;
    country_of_origin?: string;
    images?: string[];
    specifications?: any;
    status?: string;
    sale_price?: number;
    sale_start?: string;
    sale_end?: string;
    is_featured?: boolean;
    featured_priority?: number;
    featured_start_date?: string;
    featured_end_date?: string;
    created_at?: string;
    updated_at?: string;
    variants?: any[];
    assets?: any[];
}

/* ─── Customers ─── */

export interface Customer {
    customer_id: string;
    full_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    role: string;
    is_email_verified: boolean;
    is_mobile_verified: boolean;
    is_age_verified: boolean;
    is_active: boolean;
    is_suspended: boolean;
    is_banned: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at?: string;
    last_login_at?: string;
}

export async function getCustomers(): Promise<Customer[]> {
    try {
        const res = await fetch(`${API_URL}/api/admin/customers`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<any> = await res.json();
        if (json.success && json.data?.customers) {
            return json.data.customers;
        }
        return [];
    } catch (error) {
        console.error('[Admin API] Failed to fetch customers:', error);
        return [];
    }
}

export async function getCustomerDetail(id: string): Promise<Customer | null> {
    try {
        // Try direct endpoint first
        const res = await fetch(`${API_URL}/api/admin/customers/${id}`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<any> = await res.json();
        if (json.success && json.data?.profile) return json.data.profile;
        if (json.success && json.data?.customer) return json.data.customer;

        // Fallback: Fetch all and filter (since direct ID endpoint might 404)
        console.warn(`[Admin API] Direct fetch for ${id} failed or returned null, trying fallback...`);
        const all = await getCustomers();
        return all.find(c => c.customer_id === id || (c as any).id === id || (c as any)._id === id) || null;
    } catch (error) {
        console.error('[Admin API] Failed to fetch customer detail, trying fallback...', error);
        const all = await getCustomers();
        return all.find(c => c.customer_id === id || (c as any).id === id || (c as any)._id === id) || null;
    }
}

export async function getCustomer360(id: string): Promise<{ profile: Customer; addresses: any[]; orders: any[]; dosha?: any } | null> {
    try {
        console.log(`[Admin API] getCustomer360 fetching for ID: ${id}`);
        const res = await fetch(`${API_URL}/api/admin/customers/${id}`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        console.log(`[Admin API] getCustomer360 response status: ${res.status}`);
        const json: ApiResponse<any> = await res.json();
        console.log(`[Admin API] getCustomer360 response body:`, json);
        if (json.success && json.data) {
            const data = json.data;
            if (Array.isArray(data.orders)) {
                data.orders = data.orders.map((o: any) => ({
                    ...o,
                    final_total: parseFloat(o.final_total ?? o.total ?? 0)
                }));
            }
            return data;
        }
        return null;
    } catch (error) {
        console.error('[Admin API] Failed to fetch customer 360:', error);
        return null;
    }
}

export async function updateCustomerStatus(id: string, updates: Partial<Pick<Customer, 'is_suspended' | 'is_banned'>>): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/customers/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const json: ApiResponse<any> = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] Failed to update customer status:', error);
        return false;
    }
}

/* ─── Products ─── */

export async function getProducts(status = 'active'): Promise<Product[]> {
    try {
        const res = await fetch(`${API_URL}/api/products?status=${encodeURIComponent(status)}`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<any> = await res.json();

        // Backend returns { data: { products: [...], meta: {...} } }
        let products: Product[] = [];
        if (json.success && json.data) {
            if (Array.isArray(json.data)) {
                products = json.data;
            } else if (Array.isArray(json.data.products)) {
                products = json.data.products;
            }
        }

        // Map stock_quantity (from variant aggregation) to quantity (used by frontend)
        return products.map((p: any) => ({
            ...p,
            quantity: p.stock_quantity ?? p.quantity ?? 0,

            images: p.thumbnail_url ? [p.thumbnail_url] : (p.thumbnail_base64 ? [p.thumbnail_base64] : [])
        }));
    } catch (error) {
        console.error('[Admin API] Failed to fetch products:', error);
        return [];
    }
}

/** Fetch only draft products (status = 'draft') */
export async function getDraftProducts(): Promise<Product[]> {
    try {
        const res = await fetch(`${API_URL}/api/products?status=draft&limit=200`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<any> = await res.json();
        let products: Product[] = [];
        if (json.success && json.data) {
            if (Array.isArray(json.data)) {
                products = json.data;
            } else if (Array.isArray(json.data.products)) {
                products = json.data.products;
            }
        }
        return products.map((p: any) => ({
            ...p,
            quantity: p.stock_quantity ?? p.quantity ?? 0,

            images: p.thumbnail_url ? [p.thumbnail_url] : (p.thumbnail_base64 ? [p.thumbnail_base64] : [])
        }));
    } catch (error) {
        console.error('[Admin API] Failed to fetch draft products:', error);
        return [];
    }
}

export async function searchProductsAdmin(query: string): Promise<Product[]> {
    try {
        const response = await fetch(`${API_URL}/api/products/search?q=${encodeURIComponent(query)}&limit=100`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const data = await response.json();
        // The backend returns an array of products mapped differently than getProducts, 
        // but since search returns p.* it will have what we need, just map quantity/images
        const products = data.success ? data.data : [];
        return products.map((p: any) => ({
            ...p,
            quantity: p.stock_quantity ?? p.quantity ?? 0,

            images: p.thumbnail_url ? [p.thumbnail_url] : (p.thumbnail_base64 ? [p.thumbnail_base64] : [])
        }));
    } catch (e) {
        console.error('searchProductsAdmin error:', e);
        return [];
    }
}

export async function getProduct(id: string, skipCache: boolean = false): Promise<Product | null> {
    try {
        const queryParams = skipCache ? `?t=${Date.now()}` : '';
        // Use details endpoint to get product + variants (for stock quantity)
        const res = await fetch(`${API_URL}/api/products/${id}/details${queryParams}`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<any> = await res.json();
        if (json.success && json.data) {
            const product = json.data;
            // Compute total stock from variants (source of truth)
            const variantStock = product.variants?.reduce(
                (sum: number, v: any) => sum + (v.stock_quantity ?? 0), 0
            ) ?? 0;
            const stockQty = variantStock > 0 ? variantStock
                : (product.stock_quantity != null ? product.stock_quantity : 0);
            // Price lives on variants — prefer default variant, fallback to first active
            const defaultVariant = product.variants?.find((v: any) => v.is_default)
                ?? product.variants?.find((v: any) => v.is_active !== false)
                ?? product.variants?.[0];
            const price = defaultVariant?.price ?? product.price ?? null;
            const sale_price = defaultVariant?.sale_price ?? null;
            const sale_start = defaultVariant?.sale_start ?? null;
            const sale_end = defaultVariant?.sale_end ?? null;

            // alcohol_percentage lives on the products table only
            const abv = product.alcohol_percentage ?? null;
            const images = product.assets
                ?.map((a: any) => a.base64_data || a.asset_url)
                .filter(Boolean) || [];
            return {
                ...product,
                price,
                sale_price,
                sale_start,
                sale_end,
                quantity: stockQty,
                stock_quantity: stockQty,

                images
            };
        }
        return null;
    } catch (error) {
        console.error('[Admin API] Failed to fetch product:', error);
        return null;
    }
}

export async function createProduct(product: Partial<Product>): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(product),
        });
        const json: ApiResponse<Product> = await res.json();
        if (json.success && json.data) {
            return { success: true, product: json.data };
        }
        return { success: false, error: json.message || 'Failed to create product' };
    } catch (error) {
        console.error('[Admin API] Failed to create product:', error);
        return { success: false, error: 'Network error - is backend running?' };
    }
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${id}`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(product),
        });
        const json: ApiResponse = await res.json();
        return { success: json.success, error: json.message };
    } catch (error) {
        console.error('[Admin API] Failed to update product:', error);
        return { success: false, error: 'Network error' };
    }
}

export async function deleteProduct(id: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        console.log('[Admin API] DELETE /api/products/', id, '→ status:', res.status, 'ok:', res.ok);
        const json: ApiResponse = await res.json();
        console.log('[Admin API] DELETE response body:', JSON.stringify(json));
        return json.success;
    } catch (error) {
        console.error('[Admin API] Failed to delete product:', error);
        return false;
    }
}

export async function checkApiHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/api/products?limit=1`, { credentials: 'include' });
        return res.ok;
    } catch {
        return false;
    }
}

/* ─── Orders ─── */

export interface OrderItem {
    product_name?: string;
    quantity: number;
    price: number;
}

export interface Order {
    id: string;
    order_id?: string;
    customer_name: string;
    customer_email: string;
    shipping_address?: {
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
        phone?: string;
    };
    items: OrderItem[];
    total: number;
    subtotal?: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    payment_status?: string;
    payment_method?: string;
    created_at: string;
}

/** Fetches orders from the real API. Returns [] on failure. */
export async function getOrders(params?: { dateFrom?: string; dateTo?: string }): Promise<Order[]> {
    try {
        let url = `${API_URL}/api/orders`;
        const queryParams = [];
        if (params?.dateFrom) queryParams.push(`date_from=${encodeURIComponent(params.dateFrom)}`);
        if (params?.dateTo) queryParams.push(`date_to=${encodeURIComponent(params.dateTo)}`);
        if (queryParams.length > 0) url += `?${queryParams.join('&')}`;

        const res = await authFetch(url, {
            headers: authHeaders(),
            credentials: 'include',
        });
        if (!res.ok) {
            console.error(`[Admin API] getOrders failed with status: ${res.status}`);
            return [];
        }

        const json: ApiResponse<any> = await res.json();
        if (!json.success) {
            console.warn('[Admin API] getOrders returned unsuccessful:', json);
            return [];
        }

        // Backend returns   { data: { orders: [...], meta: {...} } }
        let rawOrders: any[] = [];
        if (json.data) {
            if (Array.isArray(json.data)) {
                rawOrders = json.data;
            } else if (Array.isArray(json.data.orders)) {
                rawOrders = json.data.orders;
            }
        }

        return rawOrders.map((row: any) => {
            // The backend's index route (findAllOrders) returns item_count instead of an items array
            const itemCount = parseInt(row.item_count || row.items?.length || 0);

            // Create a dummy items array so items.length works in the frontend
            const dummyItems: OrderItem[] = Array.from({ length: itemCount }).map(() => ({
                product_name: 'Item',
                quantity: 1,
                price: 0
            }));

            return {
                id: row.order_id ?? row.id ?? '',
                order_id: row.order_id,
                customer_name: row.customer_name ?? 'Unknown',
                customer_email: row.customer_email || '',
                shipping_address: row.shipping_address ? (typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : row.shipping_address) : undefined,
                items: Array.isArray(row.items) && row.items.length > 0
                    ? row.items.map((item: any) => ({
                        product_name: item.product_name ?? 'Unknown Product',
                        quantity: item.quantity ?? 1,
                        price: parseFloat(item.unit_price ?? item.price ?? 0),
                    }))
                    : dummyItems,
                total: parseFloat(row.final_total ?? row.grand_total ?? row.total_amount ?? row.total ?? 0),
                subtotal: parseFloat(row.subtotal ?? row.total_amount ?? 0),
                status: (row.order_status ?? row.status ?? 'pending').toLowerCase() as Order['status'],
                payment_status: row.payment_status,
                payment_method: row.payment_method || 'cod',
                created_at: row.created_at ?? new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error('[Admin API] Failed to fetch orders:', error);
        return [];
    }
}

export async function getOrderById(id: string): Promise<Order | null> {
    try {
        const res = await fetch(`${API_URL}/api/orders/${id}`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<any> = await res.json();
        if (json.success && json.data) {
            const row = json.data;
            return {
                id: row.order_id ?? row.id ?? '',
                order_id: row.order_id,
                // customer info may not be on the single-order row — caller merges from list
                customer_name: row.customer_name ?? '',
                customer_email: row.customer_email ?? '',
                // Preserve full nested item structure (product, variant objects)
                items: Array.isArray(row.items) ? row.items.map((item: any) => ({
                    ...item,
                    // Flat aliases so both the old and new modal paths work
                    product_name: item.product?.product_name ?? item.product_name ?? '',
                    price: parseFloat(item.unit_price ?? item.price ?? 0),
                })) : [],
                total: parseFloat(row.final_total ?? row.grand_total ?? row.total_amount ?? row.total ?? 0),
                subtotal: parseFloat(row.subtotal ?? row.total_amount ?? 0),
                status: (row.order_status ?? row.status ?? 'pending').toLowerCase() as Order['status'],
                payment_status: row.payment_status,
                created_at: row.created_at ?? new Date().toISOString(),
                // Extra fields the detail modal needs
                ...(row.total_tax != null ? { total_tax: parseFloat(row.total_tax) } : {}),
                ...(row.grand_total != null ? { grand_total: parseFloat(row.grand_total) } : {}),
                ...(row.order_notes ? { order_notes: row.order_notes } : {}),
                ...(row.shipping_address ? { shipping_address: row.shipping_address } : {}),
                payment_method: row.payment_method || 'cod',
            } as any;
        }
        return null;
    } catch {
        return null;
    }
}

export async function updateOrderStatus(id: string, status: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ order_status: status.toUpperCase() }),
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch {
        return false;
    }
}

export async function updatePaymentStatus(id: string, paymentStatus: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/orders/${id}/payment`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ payment_status: paymentStatus }),
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch {
        return false;
    }
}

export interface BulkActionResult {
    updated: number;
    failed: number;
    errors: { order_id: string; reason: string }[];
    updated_orders: { order_id: string; order_status?: string; payment_status?: string }[];
}

/** Bulk update order status (Admin). */
export async function bulkUpdateOrderStatus(orderIds: string[], orderStatus: string): Promise<BulkActionResult | null> {
    try {
        const res = await authFetch(`${API_URL}/api/orders/bulk-status`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ order_ids: orderIds, order_status: orderStatus }),
        });
        const json: ApiResponse<BulkActionResult> = await res.json();
        return json.success && json.data ? json.data : null;
    } catch (error) {
        console.error('[Admin API] bulkUpdateOrderStatus failed:', error);
        return null;
    }
}

/** Bulk update payment status (Admin). */
export async function bulkUpdateOrderPaymentStatus(orderIds: string[], paymentStatus: string): Promise<BulkActionResult | null> {
    try {
        const res = await authFetch(`${API_URL}/api/orders/bulk-payment`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            credentials: 'include',
            body: JSON.stringify({ order_ids: orderIds, payment_status: paymentStatus }),
        });
        const json: ApiResponse<BulkActionResult> = await res.json();
        return json.success && json.data ? json.data : null;
    } catch (error) {
        console.error('[Admin API] bulkUpdateOrderPaymentStatus failed:', error);
        return null;
    }
}

export async function downloadInvoiceAdmin(orderId: string): Promise<{ success: boolean; message?: string }> {
    try {
        const url = `${API_URL}/api/invoices/${orderId}/download`;
        const res = await fetch(url, { headers: authHeaders(), credentials: 'include' });
        if (!res.ok) {
            const data = await res.json().catch(() => null);
            return { success: false, message: data?.message || 'Failed to download invoice' };
        }

        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') || '';
        const nameMatch = disposition.match(/filename="?([^"]+)"?/);
        const filename = nameMatch ? nameMatch[1] : `invoice_${orderId}.pdf`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        return { success: true };
    } catch (error) {
        console.error('[Admin API] Failed to download invoice:', error);
        return { success: false, message: 'Network error' };
    }
}

/* ─── Payments & Refunds (Admin) ─── */

export interface RefundRecord {
    refund_id: string;
    payment_id: string;
    order_id: string;
    razorpay_refund_id?: string;
    razorpay_payment_id?: string;
    amount: number;
    currency: string;
    reason: string;
    status: string;
    initiated_by: string;
    created_at: string;
    processed_at?: string;
}

export interface PaymentInfo {
    order_id: string;
    payment_id?: string;
    payment_status: string;
    payment_method: string;
    payment_gateway?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    amount?: number;
    currency?: string;
    verified_at?: string;
    created_at?: string;
    has_payment_record: boolean;
}

/** Get payment info for an order (admin route). */
export async function getPaymentInfo(orderId: string): Promise<PaymentInfo | null> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/payments/${orderId}`, {
            headers: authHeaders(),
        });
        const json: ApiResponse<PaymentInfo> = await res.json();
        return json.success && json.data ? json.data : null;
    } catch {
        return null;
    }
}

/** Initiate a refund for an order (admin). */
export async function initiateRefund(orderId: string, amount?: number, reason?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const body: Record<string, any> = {};
        if (amount != null) body.amount = amount;
        if (reason) body.reason = reason;

        const res = await authFetch(`${API_URL}/api/admin/payments/${orderId}/refund`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(body),
        });
        const json = await res.json();
        return { success: json.success, data: json.data, error: json.message };
    } catch (error) {
        console.error('[Admin API] Failed to initiate refund:', error);
        return { success: false, error: 'Network error' };
    }
}

/** Get all refunds for an order (admin). */
export async function getRefunds(orderId: string): Promise<{ refunds: RefundRecord[]; total_refunded: number }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/payments/${orderId}/refunds`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (json.success && json.data) {
            return {
                refunds: json.data.refunds || [],
                total_refunded: json.data.total_refunded || 0,
            };
        }
        return { refunds: [], total_refunded: 0 };
    } catch {
        return { refunds: [], total_refunded: 0 };
    }
}

/* ─── Products (Advanced) ─── */

export async function getEnums(): Promise<Record<string, string[]>> {
    try {
        const res = await fetch(`${API_URL}/api/products/enums`, { credentials: 'include' });
        const json: ApiResponse<Record<string, string[]>> = await res.json();
        return json.success && json.data ? json.data : {};
    } catch {
        return {};
    }
}

export async function duplicateProduct(id: string, newSku: string, newName: string): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${id}/duplicate`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ newSku, newName }),
        });
        const json: ApiResponse<Product> = await res.json();
        if (json.success && json.data) {
            return { success: true, product: json.data };
        }
        return { success: false, error: json.message || 'Failed to duplicate product' };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function toggleFeatured(id: string, data: { is_featured: boolean; featured_priority?: number; featured_start_date?: string; featured_end_date?: string }): Promise<{ success: boolean; product?: Product; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/products/${id}/featured`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json: ApiResponse<Product> = await res.json();
        if (json.success && json.data) {
            return { success: true, product: json.data };
        }
        return { success: false, error: json.message || 'Failed to toggle featured status' };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function updateStock(productId: string, quantity: number): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${productId}/stock`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ quantity }),
        });
        const json: ApiResponse = await res.json();
        if (!json.success) {
            console.error('[Admin API] Stock update failed:', json.message);
        }
        return json.success;
    } catch (error) {
        console.error('[Admin API] Failed to update stock:', error);
        return false;
    }
}

export async function updateVariantStatus(productId: string, variantId: string, isActive: boolean): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${productId}/variants/${variantId}/status`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ is_active: isActive }),
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] Failed to update variant status:', error);
        return false;
    }
}

export async function updateDefaultVariant(productId: string, variantId: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${productId}/variants/${variantId}/default`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' })
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] Failed to update default variant:', error);
        return false;
    }
}

export async function getLowStockProducts(): Promise<Product[]> {
    try {
        const res = await fetch(`${API_URL}/api/products/low-stock-alerts`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<Product[]> = await res.json();
        return json.success && json.data ? json.data : [];
    } catch {
        return [];
    }
}


/* ─── Inventory ─── */

export async function adjustInventory(data: { product_id: string; quantity_change: number; reason: string }): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/inventory/adjust`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch {
        return false;
    }
}

export async function getStockHistory(productId: string) {
    try {
        const res = await fetch(`${API_URL}/api/inventory/history/${productId}`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse = await res.json();
        return json.success && json.data ? json.data : [];
    } catch {
        return [];
    }
}

/* ─── Categories ───
 * Category CRUD has been moved to lib/api/category.ts
 * Import from '@/lib/api/category' instead.
 */

/* ─── Product Images ─── */

export async function uploadProductImage(productId: string, base64Data: string, options?: { file_name?: string; is_primary?: boolean; sort_order?: number; media_type?: 'image' | 'video'; variant_id?: string; alt_text?: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${productId}/images`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ image: base64Data, ...options }),
        });
        const json: ApiResponse = await res.json();
        return { success: json.success, error: json.message };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function updateProductImage(productId: string, assetId: string, options: { alt_text?: string; is_primary?: boolean; sort_order?: number; variant_id?: string; image_type?: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/products/${productId}/images/${assetId}`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(options),
        });
        const json: ApiResponse = await res.json();
        return { success: json.success, error: json.message };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function getProductImages(productId: string) {
    try {
        const res = await fetch(`${API_URL}/api/products/${productId}/images`, { credentials: 'include' });
        const json: ApiResponse = await res.json();
        return json.success && json.data ? json.data : [];
    } catch {
        return [];
    }
}

export async function deleteProductImage(productId: string, assetId: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${productId}/images/${assetId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch {
        return false;
    }
}

export async function setPrimaryImage(productId: string, assetId: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/products/${productId}/images/${assetId}/primary`, {
            method: 'PATCH',
            headers: authHeaders(),
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch {
        return false;
    }
}

/* ─── Ranking Overrides (Best Seller Admin) ─── */

export interface RankingOverride {
    override_id: string;
    product_id: string;
    priority: number;
    reason: string;
    expires_at: string | null;
    created_at: string;
    product_name?: string;
    sku?: string;
    brand?: string;
    category?: string;
    thumbnail_url?: string;
    price?: number;
}

export async function getRankingOverrides(): Promise<RankingOverride[]> {
    try {
        const res = await fetch(`${API_URL}/api/products/ranking-overrides`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<RankingOverride[]> = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
        return [];
    } catch (error) {
        console.error('[Admin API] Failed to fetch ranking overrides:', error);
        return [];
    }
}

export async function setRankingOverride(
    productId: string,
    priority: number = 100,
    reason: string = 'Admin promoted'
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/products/ranking-overrides`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ product_id: productId, priority, reason }),
        });
        const json: ApiResponse = await res.json();
        return { success: json.success, error: json.message };
    } catch (error) {
        console.error('[Admin API] Failed to set ranking override:', error);
        return { success: false, error: 'Network error' };
    }
}

export async function removeRankingOverride(productId: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/products/ranking-overrides/${productId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json: ApiResponse = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] Failed to remove ranking override:', error);
        return false;
    }
}

/* ─── Order Exports (Admin) ─── */

export interface ExportJob {
    job_id: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    format: 'csv' | 'xlsx';
    filters: Record<string, unknown>;
    total_rows?: number;
    file_size_bytes?: number;
    error_message?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    expires_at?: string;
}

export async function createOrderExport(
    format: 'csv' | 'xlsx',
    filters: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: ExportJob; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/orders/export`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ format, filters }),
        });
        const json = await res.json();
        if (json.success) return { success: true, data: json.data };
        return { success: false, error: json.message || 'Failed to create export' };
    } catch (error) {
        console.error('[Admin API] Failed to create export:', error);
        return { success: false, error: 'Network error' };
    }
}

export async function getExportJobStatus(jobId: string): Promise<ExportJob | null> {
    try {
        const res = await fetch(`${API_URL}/api/admin/orders/export/${jobId}/status`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json = await res.json();
        return json.success && json.data ? json.data : null;
    } catch {
        return null;
    }
}

export function getExportDownloadUrl(jobId: string): string {
    return `${API_URL}/api/admin/orders/export/${jobId}/download`;
}

export async function downloadExportFile(jobId: string): Promise<boolean> {
    try {
        const url = getExportDownloadUrl(jobId);
        const res = await fetch(url, { headers: authHeaders(), credentials: 'include' });
        if (!res.ok) return false;

        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') || '';
        const nameMatch = disposition.match(/filename="?([^"]+)"?/);
        const filename = nameMatch ? nameMatch[1] : `export_${jobId}`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        return true;
    } catch {
        return false;
    }
}

export async function getExportHistory(limit = 20): Promise<ExportJob[]> {
    try {
        const res = await fetch(`${API_URL}/api/admin/orders/export/history?limit=${limit}`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json = await res.json();
        return json.success && Array.isArray(json.data) ? json.data : [];
    } catch {
        return [];
    }
}

/* ─── Search Synonyms (Admin) ─── */

export interface SearchSynonym {
    synonym_id: string;
    keyword: string;
    synonyms: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export async function getSynonyms(): Promise<SearchSynonym[]> {
    try {
        const res = await fetch(`${API_URL}/api/admin/search-synonyms`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success && Array.isArray(json.data) ? json.data : [];
    } catch {
        return [];
    }
}

export async function createSynonym(data: { keyword: string; synonyms: string[]; is_active: boolean }): Promise<{ success: boolean; data?: SearchSynonym; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/search-synonyms`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (json.success) return { success: true, data: json.data };
        return { success: false, error: json.message || 'Failed to create synonym' };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function updateSynonym(id: string, data: { keyword?: string; synonyms?: string[]; is_active?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/search-synonyms/${id}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        return { success: json.success, error: json.message };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

export async function deleteSynonym(id: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/search-synonyms/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json = await res.json();
        return json.success;
    } catch {
        return false;
    }
}

/* ─── Search Analytics (Admin) ─── */

export interface SearchDashboardStats {
    period_days: number;
    total_searches: number;
    top_searches: { query: string; count: number; avgResults: number }[];
    zero_results: { query: string; count: number }[];
    daily_volume: { date: string; count: number }[];
}

export async function getSearchAnalytics(days: number = 30): Promise<SearchDashboardStats | null> {
    try {
        const res = await fetch(`${API_URL}/api/admin/analytics/search-stats?days=${days}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : null;
    } catch {
        return null;
    }
}

// ─── Auth / Account Management ────────────────────────────────────

export interface LoginResult {
    success: boolean;
    error?: string;
    deactivated?: boolean;
    customer?: { customer_id: string; full_name: string; email: string; role?: string; phone?: string };
    access_token?: string;
    refresh_token?: string;
}

/**
 * Login via the real backend.
 * Returns { deactivated: true } when the account is inactive,
 * so the UI can display the reactivation modal.
 */
export async function loginUser(email: string, password: string): Promise<LoginResult> {
    try {
        const res = await authFetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        const json = await res.json();

        // Detect deactivated account — backend may return 403 or specific message
        if (!json.success) {
            const msg = (json.message || '').toLowerCase();
            const isDeactivated =
                msg.includes('deactivat') ||
                msg.includes('inactive') ||
                msg.includes('account_deactivated') ||
                res.status === 451;
            return {
                success: false,
                error: json.message || 'Login failed',
                deactivated: isDeactivated,
            };
        }

        return {
            success: true,
            customer: json.data?.customer,
            access_token: json.data?.access_token,
            refresh_token: json.data?.refresh_token,
        };
    } catch (error) {
        console.error('[Admin API] Login failed:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Deactivate the current user's account.
 * Requires the user's password for verification.
 */
export async function deactivateAccount(password: string, token?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await authFetch(`${API_URL}/api/auth/deactivate`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ password }),
        });
        const json = await res.json();
        return { success: json.success, error: json.message };
    } catch (error) {
        console.error('[Admin API] Deactivation failed:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Reactivate a deactivated account, then re-login.
 * Calls POST /api/auth/reactivate, then POST /api/auth/login.
 */
export async function reactivateAccount(email: string, password: string): Promise<LoginResult> {
    try {
        // Step 1: Call reactivation endpoint
        const reactivateRes = await authFetch(`${API_URL}/api/auth/reactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        const reactivateJson = await reactivateRes.json();

        if (!reactivateJson.success) {
            return {
                success: false,
                error: reactivateJson.message || 'Failed to reactivate account',
            };
        }

        // Step 2: Login normally after reactivation
        return await loginUser(email, password);
    } catch (error) {
        console.error('[Admin API] Reactivation failed:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/* ─── Related Products ─── */

export interface ProductRelation {
    relation_id: string;
    relation_type: string;
    priority: number;
    is_pinned: boolean;
    is_bidirectional: boolean;
    relation_created_at: string;
    product_id: string; // The related product
    sku: string;
    product_name: string;
    brand?: string;
    category?: string;
    thumbnail_url?: string;
}

export async function getAdminProductRelations(productId: string): Promise<ProductRelation[]> {
    try {
        const res = await fetch(`${API_URL}/api/admin/products/${productId}/relations`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<ProductRelation[]> = await res.json();
        return json.success && json.data ? json.data : [];
    } catch (error) {
        console.error('[Admin API] Fetched relations failed:', error);
        return [];
    }
}

export async function addAdminProductRelation(sourceProductId: string, data: {
    target_product_id: string;
    relation_type: string;
    is_bidirectional?: boolean;
}): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/products/${sourceProductId}/relations`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        return { success: json.success, message: json.message };
    } catch (error) {
        console.error('[Admin API] Add relation failed:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

export async function removeAdminProductRelation(relationId: string): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/relations/${relationId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json = await res.json();
        return { success: json.success, message: json.message };
    } catch (error) {
        console.error('[Admin API] Remove relation failed:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

/* ─── Product Analytics ─── */

export const productAnalyticsApi = {
    getOverview: async (queryStr = '') => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/analytics/products/overview${queryStr}`, { headers: authHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    },
    getTopSelling: async (queryStr = '') => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/analytics/products/top-selling${queryStr}`, { headers: authHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    },
    getLowPerforming: async (queryStr = '') => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/analytics/products/low-performing${queryStr}`, { headers: authHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    },
    getConversion: async (queryStr = '') => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/analytics/products/conversion${queryStr}`, { headers: authHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    },
    getRevenue: async (queryStr = '') => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/analytics/products/revenue${queryStr}`, { headers: authHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    },
    getInventory: async (queryStr = '') => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/analytics/products/inventory${queryStr}`, { headers: authHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    },
    getProductDetail: async (productId: string, queryStr = '') => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/analytics/products/${productId}${queryStr}`, { headers: authHeaders() });
            return await res.json();
        } catch (e) {
            return { success: false };
        }
    }
};

/* ─── Blog Admin ─── */

export interface BlogPost {
    post_id: string;
    title: string;
    slug: string;
    excerpt?: string;
    body: string;
    status: 'draft' | 'published' | 'archived';
    blog_type?: string;
    cover_image?: string;
    reading_time?: number;
    view_count?: number;
    comment_count?: number;
    share_count?: number;
    is_featured?: boolean;
    published_at?: string;
    created_at: string;
    author_name?: string;
    category_name?: string;
    category_id?: string;
    author_id?: string;
    tags?: { tag_id: string; name: string; slug: string }[];
    featured_image?: string;
    display_order?: number;
    is_trending?: boolean;
    is_editor_pick?: boolean;
    content_type?: string;
    difficulty_level?: string;
    compliance_checked?: boolean;
    meta_title?: string;
    meta_description?: string;
}
export interface BlogCategory {
    category_id: string;
    name: string;
    slug: string;
    description?: string;
    parent_id?: string;
    post_count?: number;
}

export interface BlogTag {
    tag_id: string;
    name: string;
    slug: string;
}

export interface BlogComment {
    comment_id: string;
    post_id: string;
    body: string;
    commenter_name: string;
    commenter_email?: string;
    status: string;
    created_at: string;
    post_title?: string;
}

// Blog Posts
export async function getAdminBlogPosts(params?: { status?: string; cursor?: string; limit?: number }): Promise<{ posts: BlogPost[]; nextCursor: string | null; hasMore: boolean }> {
    try {
        const sp = new URLSearchParams();
        if (params?.status) sp.set('status', params.status);
        if (params?.cursor) sp.set('cursor', params.cursor);
        if (params?.limit) sp.set('limit', String(params.limit));
        const res = await fetch(`${API_URL}/api/blog/admin/posts?${sp.toString()}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        if (json.success) return json.data;
        console.warn('[Admin API] getAdminBlogPosts failed:', json.message);
        return { posts: [], nextCursor: null, hasMore: false };
    } catch (err) {
        console.error('[Admin API] getAdminBlogPosts error:', err);
        return { posts: [], nextCursor: null, hasMore: false };
    }
}

export async function getAdminBlogPost(id: string): Promise<BlogPost | null> {
    try {
        const res = await fetch(`${API_URL}/api/blog/admin/posts/${id}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : null;
    } catch { return null; }
}

export async function createBlogPost(data: Partial<BlogPost> & { tags?: string[] }): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/posts`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (json.success) return { success: true, data: json.data };
        return { success: false, error: json.message };
    } catch { return { success: false, error: 'Network error' }; }
}

export async function updateBlogPost(id: string, data: Partial<BlogPost> & { tags?: string[] }): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/posts/${id}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (json.success) return { success: true, data: json.data };
        return { success: false, error: json.message };
    } catch { return { success: false, error: 'Network error' }; }
}

export async function publishBlogPost(id: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/posts/${id}/publish`, { method: 'PATCH', headers: authHeaders() });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

export async function archiveBlogPost(id: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/posts/${id}/archive`, { method: 'PATCH', headers: authHeaders() });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

export async function deleteBlogPost(id: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/posts/${id}`, { method: 'DELETE', headers: authHeaders() });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

// Blog Categories
export async function getAdminBlogCategories(): Promise<BlogCategory[]> {
    try {
        const res = await fetch(`${API_URL}/api/blog/categories`, { credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data || [] : [];
    } catch { return []; }
}

export async function createBlogCategory(data: { name: string; description?: string; parent_id?: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/categories`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        return { success: json.success, error: json.message };
    } catch { return { success: false, error: 'Network error' }; }
}

// Blog Tags
export async function getAdminBlogTags(): Promise<BlogTag[]> {
    try {
        const res = await fetch(`${API_URL}/api/blog/tags`, { credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data?.tags || json.data || [] : [];
    } catch { return []; }
}

// Comments Moderation
export async function getPendingBlogComments(): Promise<BlogComment[]> {
    try {
        const res = await fetch(`${API_URL}/api/blog/admin/comments/moderation`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data?.comments || json.data || [] : [];
    } catch { return []; }
}

export async function getAdminAllComments(params?: { status?: string, cursor?: string, limit?: number }): Promise<{ comments: BlogComment[]; nextCursor: string | null; hasMore: boolean }> {
    try {
        const q = new URLSearchParams();
        if (params?.status) q.append('status', params.status);
        if (params?.cursor) q.append('cursor', params.cursor);
        if (params?.limit) q.append('limit', params.limit.toString());
        
        const res = await authFetch(`${API_URL}/api/blog/admin/comments?${q.toString()}`, { headers: authHeaders() });
        const json = await res.json();
        return json.success ? json.data : { comments: [], nextCursor: null, hasMore: false };
    } catch {
        return { comments: [], nextCursor: null, hasMore: false };
    }
}

export async function moderateBlogComment(commentId: string, action: 'approved' | 'rejected'): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/comments/${commentId}/moderate`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status: action }),
        });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

export async function deleteBlogComment(commentId: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/blog/admin/comments/${commentId}`, { method: 'DELETE', headers: authHeaders() });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

// Blog Analytics
export async function getBlogAnalyticsDashboard(): Promise<any> {
    try {
        const res = await fetch(`${API_URL}/api/blog/admin/analytics/dashboard`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : null;
    } catch { return null; }
}

/* ─── Reviews ─── */
export interface ReviewReport {
    report_id: string;
    review_id: string;
    customer_id: string;
    reason: string;
    status: 'pending' | 'resolved' | 'dismissed';
    created_at: string;
    resolved_at?: string;
    review_title?: string;
    review_body?: string;
    reporter_name: string;
}

export interface AdminReview {
    review_id: string;
    rating: number;
    title?: string;
    body?: string;
    is_verified_purchase: boolean;
    helpful_count: number;
    admin_reply?: string;
    admin_reply_at?: string;
    created_at: string;
    updated_at: string;
    reviewer_name: string;
    product_name: string;
    product_id: string;
}

export async function getAdminReviews(page = 1, limit = 50): Promise<AdminReview[]> {
    try {
        const offset = (page - 1) * limit;
        const res = await fetch(`${API_URL}/api/reviews/admin?limit=${limit}&offset=${offset}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data || [] : [];
    } catch { return []; }
}

export async function getReviewReports(status = 'pending'): Promise<ReviewReport[]> {
    try {
        const res = await fetch(`${API_URL}/api/reviews/admin/reports?status=${status}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data || [] : [];
    } catch { return []; }
}

export async function adminReplyToReview(reviewId: string, replyText: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/reviews/admin/${reviewId}/reply`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ replyText }),
        });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

export async function resolveReviewReport(reportId: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/reviews/admin/reports/${reportId}/resolve`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status }),
        });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}


/* ─── Support & Help System (Admin) ─── */

// Support Tickets
export async function getAdminTickets(params?: { status?: string; priority?: string; category?: string; search?: string; limit?: number; offset?: number }) {
    try {
        const sp = new URLSearchParams();
        if (params?.status) sp.set('status', params.status);
        if (params?.priority) sp.set('priority', params.priority);
        if (params?.category) sp.set('category', params.category);
        if (params?.search) sp.set('search', params.search);
        if (params?.limit) sp.set('limit', String(params.limit));
        if (params?.offset) sp.set('offset', String(params.offset));
        const res = await fetch(`${API_URL}/api/support/admin?${sp.toString()}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : { tickets: [], total: 0 };
    } catch { return { tickets: [], total: 0 }; }
}

export async function getAdminTicketStats() {
    try {
        const res = await fetch(`${API_URL}/api/support/admin/stats`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : null;
    } catch { return null; }
}

export async function getAdminTicketDetail(ticketId: string) {
    try {
        const res = await fetch(`${API_URL}/api/support/admin/${ticketId}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : null;
    } catch { return null; }
}

export async function adminReplyToTicket(ticketId: string, body: string) {
    try {
        const res = await authFetch(`${API_URL}/api/support/admin/${ticketId}/reply`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ body }),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function updateAdminTicket(ticketId: string, data: { status?: string; priority?: string; assigned_to?: string | null }) {
    try {
        const res = await authFetch(`${API_URL}/api/support/admin/${ticketId}`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

// FAQs
export async function getAdminFaqs() {
    try {
        const res = await fetch(`${API_URL}/api/faqs/admin`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function createAdminFaq(data: { category: string; question: string; answer: string; sort_order?: number; is_visible?: boolean }) {
    try {
        const res = await authFetch(`${API_URL}/api/faqs/admin`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function updateAdminFaq(id: string, data: any) {
    try {
        const res = await authFetch(`${API_URL}/api/faqs/admin/${id}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function deleteAdminFaq(id: string) {
    try {
        const res = await authFetch(`${API_URL}/api/faqs/admin/${id}`, { method: 'DELETE', headers: authHeaders() });
        return (await res.json());
    } catch { return { success: false }; }
}

export async function toggleFaqVisibility(id: string) {
    try {
        const res = await authFetch(`${API_URL}/api/faqs/admin/${id}/visibility`, { method: 'PATCH', headers: authHeaders() });
        return (await res.json());
    } catch { return { success: false }; }
}

// Help Center
export async function getAdminHelpArticles() {
    try {
        const res = await fetch(`${API_URL}/api/help-center/admin`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function createAdminHelpArticle(data: { section: string; title: string; slug: string; content: string; is_published?: boolean }) {
    try {
        const res = await authFetch(`${API_URL}/api/help-center/admin`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function updateAdminHelpArticle(id: string, data: any) {
    try {
        const res = await authFetch(`${API_URL}/api/help-center/admin/${id}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function deleteAdminHelpArticle(id: string) {
    try {
        const res = await authFetch(`${API_URL}/api/help-center/admin/${id}`, { method: 'DELETE', headers: authHeaders() });
        return (await res.json());
    } catch { return { success: false }; }
}

// Knowledge Base
export async function getAdminKBArticles() {
    try {
        const res = await fetch(`${API_URL}/api/knowledge-base/admin`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function getAdminKBCategories() {
    try {
        const res = await fetch(`${API_URL}/api/knowledge-base/categories`, { credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function createAdminKBCategory(data: { name: string; slug: string; description?: string; parent_id?: string; sort_order?: number }) {
    try {
        const res = await authFetch(`${API_URL}/api/knowledge-base/admin/categories`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function deleteAdminKBCategory(id: string) {
    try {
        const res = await authFetch(`${API_URL}/api/knowledge-base/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
        return (await res.json());
    } catch { return { success: false }; }
}

export async function createAdminKBArticle(data: { category_id?: string; title: string; slug: string; content: string; excerpt?: string; status?: string }) {
    try {
        const res = await authFetch(`${API_URL}/api/knowledge-base/admin/articles`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function updateAdminKBArticle(id: string, data: any) {
    try {
        const res = await authFetch(`${API_URL}/api/knowledge-base/admin/articles/${id}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function deleteAdminKBArticle(id: string) {
    try {
        const res = await authFetch(`${API_URL}/api/knowledge-base/admin/articles/${id}`, { method: 'DELETE', headers: authHeaders() });
        return (await res.json());
    } catch { return { success: false }; }
}

// Feedback
export async function getAdminFeedback(params?: { type?: string; status?: string; search?: string; limit?: number; offset?: number }) {
    try {
        const sp = new URLSearchParams();
        if (params?.type) sp.set('type', params.type);
        if (params?.status) sp.set('status', params.status);
        if (params?.search) sp.set('search', params.search);
        if (params?.limit) sp.set('limit', String(params.limit));
        if (params?.offset) sp.set('offset', String(params.offset));
        const res = await fetch(`${API_URL}/api/customer-enquiry/admin?${sp.toString()}`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : { feedback: [], total: 0 };
    } catch { return { feedback: [], total: 0 }; }
}

export async function updateFeedbackStatus(id: string, status: string) {
    try {
        const res = await authFetch(`${API_URL}/api/customer-enquiry/admin/${id}`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status }),
        });
        return (await res.json());
    } catch { return { success: false }; }
}

export async function replyToFeedback(id: string, body: string, type: 'reply' | 'note' = 'reply') {
    try {
        const res = await authFetch(`${API_URL}/api/customer-enquiry/admin/${id}/reply`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ body, type }),
        });
        return (await res.json());
    } catch { return { success: false, message: 'Network error' }; }
}

export async function getFeedbackAnalytics() {
    try {
        const res = await fetch(`${API_URL}/api/feedback/admin/analytics`, { headers: authHeaders(), credentials: 'include' });
        const json = await res.json();
        return json.success ? json.data : null;
    } catch { return null; }
}

/* ─── Security & Disaster Recovery ─── */

export interface BackupData {
    filename: string;
    size: number;
    created_at: string;
}

export async function getBackups(): Promise<BackupData[]> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/backups`, {
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) return json.data || [];
        return [];
    } catch { return []; }
}

export async function createBackup(): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/backups`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

export async function deleteBackup(filename: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/backups/${filename}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

export interface DecryptedBackup {
    filename: string;
    metadata: {
        version: string;
        created_at: string;
        tables: Record<string, number>;
        total_records: number;
    };
    tables: Record<string, { row_count: number; sample: string[] }>;
    full_data: Record<string, any[]>;
}

export async function decryptBackup(filename: string, encryptionKey: string): Promise<{ success: boolean; data?: DecryptedBackup; message?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/backups/${filename}/decrypt`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ encryption_key: encryptionKey }),
        });
        return await res.json();
    } catch {
        return { success: false, message: 'Network error' };
    }
}

export interface MaintenanceStatus {
    enabled: boolean;
    message?: string | null;
}

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/backups/maintenance/status`, {
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) return json.data;
        return { enabled: false };
    } catch { return { enabled: false }; }
}

export async function toggleMaintenanceMode(enable: boolean, message?: string): Promise<boolean> {
    try {
        const endpoint = enable ? 'enable' : 'disable';
        const res = await authFetch(`${API_URL}/api/admin/backups/maintenance/${endpoint}`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: enable && message ? JSON.stringify({ message }) : undefined,
        });
        const json = await res.json();
        return json.success;
    } catch { return false; }
}

/* ─── Payment Logs (Admin) ─── */

export async function getPaymentLogs(params: { limit?: number; offset?: number; search?: string; status?: string; gateway?: string } = {}) {
    try {
        const sp = new URLSearchParams();
        if (params.limit) sp.set('limit', String(params.limit));
        if (params.offset) sp.set('offset', String(params.offset));
        if (params.search) sp.set('search', params.search);
        if (params.status) sp.set('status', params.status);
        if (params.gateway) sp.set('gateway', params.gateway);

        const res = await authFetch(`${API_URL}/api/admin/payments/logs?${sp.toString()}`, { headers: authHeaders() });
        const json = await res.json();
        return json.success ? json.data : { logs: [], total: 0 };
    } catch (error) {
        console.error('[Admin API] getPaymentLogs failed:', error);
        return { logs: [], total: 0 };
    }
}

/* ─── Seasonal Collections ─── */

export interface SeasonalCollection {
    collection_id: string;
    name: string;
    slug: string;
    description?: string;
    image_url?: string;
    icon?: string;
    color_gradient?: string;
    status: 'draft' | 'active' | 'archived';
    is_featured: boolean;
    sort_order: number;
    start_date?: string;
    end_date?: string;
    product_count?: number;
    products?: Product[];
    created_at: string;
    updated_at?: string;
}

export interface CollectionProduct {
    product_id: string;
    sku: string;
    product_name: string;
    brand?: string;
    category?: string;
    status?: string;
    price?: number;
    stock_quantity?: number;
    sort_order: number;
    added_at: string;
    thumbnail_url?: string;
}

/** List all collections (admin). */
export async function getAdminCollections(params: { limit?: number; offset?: number; status?: string } = {}): Promise<{ rows: SeasonalCollection[]; total: number }> {
    try {
        const sp = new URLSearchParams();
        if (params.limit) sp.set('limit', String(params.limit));
        if (params.offset) sp.set('offset', String(params.offset));
        if (params.status) sp.set('status', params.status);

        const res = await authFetch(`${API_URL}/api/admin/collections?${sp.toString()}`, { headers: authHeaders() });
        const json = await res.json();
        console.log('[Admin API] getAdminCollections response:', json);

        if (json.success && json.data) {
            return { rows: json.data, total: json.meta?.total ?? json.data.length };
        }
        return { rows: [], total: 0 };
    } catch (error) {
        console.error('[Admin API] getAdminCollections failed:', error);
        return { rows: [], total: 0 };
    }
}

/** Get a single collection by ID (admin). */
export async function getAdminCollection(id: string): Promise<SeasonalCollection | null> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/collections/${id}`, { headers: authHeaders() });
        const json = await res.json();
        return json.success && json.data ? json.data : null;
    } catch (error) {
        console.error('[Admin API] getAdminCollection failed:', error);
        return null;
    }
}

/** Create a new collection. */
export async function createCollection(data: Partial<SeasonalCollection>): Promise<{ success: boolean; data?: SeasonalCollection; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/collections`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        return { success: json.success, data: json.data, error: json.message };
    } catch (error) {
        console.error('[Admin API] createCollection failed:', error);
        return { success: false, error: 'Network error' };
    }
}

/** Update a collection. */
export async function updateCollection(id: string, data: Partial<SeasonalCollection>): Promise<{ success: boolean; data?: SeasonalCollection; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/collections/${id}`, {
            method: 'PATCH',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        const json = await res.json();
        return { success: json.success, data: json.data, error: json.message };
    } catch (error) {
        console.error('[Admin API] updateCollection failed:', error);
        return { success: false, error: 'Network error' };
    }
}

/** Delete (archive) a collection. */
export async function deleteCollection(id: string): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/collections/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] deleteCollection failed:', error);
        return false;
    }
}

/** Add products to a collection. */
export async function addCollectionProducts(collectionId: string, productIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/collections/${collectionId}/products`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ product_ids: productIds }),
        });
        const json = await res.json();
        return { success: json.success, error: json.message };
    } catch (error) {
        console.error('[Admin API] addCollectionProducts failed:', error);
        return { success: false, error: 'Network error' };
    }
}

/** Remove products from a collection. */
export async function removeCollectionProducts(collectionId: string, productIds: string[]): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/collections/${collectionId}/products`, {
            method: 'DELETE',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ product_ids: productIds }),
        });
        const json = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] removeCollectionProducts failed:', error);
        return false;
    }
}

/** Reorder products within a collection. */
export async function reorderCollectionProducts(collectionId: string, productIds: string[]): Promise<boolean> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/collections/${collectionId}/products/reorder`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ product_ids: productIds }),
        });
        const json = await res.json();
        return json.success;
    } catch (error) {
        console.error('[Admin API] reorderCollectionProducts failed:', error);
        return false;
    }
}


/** Fetch administrative activity logs (Interaction Chronicles). */
export async function getActivityLogs(params?: Record<string, string>): Promise<{ logs: any[]; pagination: any }> {
    try {
        const queryParams = params ? new URLSearchParams(params).toString() : '';
        const res = await authFetch(`${API_URL}/api/admin/activity-logs?${queryParams}`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (json.success && json.data) {
            return {
                logs: json.data.logs || [],
                pagination: json.data.pagination || {}
            };
        }
        return { logs: [], pagination: {} };
    } catch (error) {
        console.error('[Admin API] getActivityLogs failed:', error);
        return { logs: [], pagination: {} };
    }
}

/* ─── Loyalty & Rewards (Admin) ─── */

export async function getAdminLoyaltyDashboard() {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/dashboard`, { headers: authHeaders() });
        const json = await res.json();
        return json.success ? json.data : null;
    } catch { return null; }
}

export async function getAdminLoyaltyTiers() {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/tiers`, { headers: authHeaders() });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function getAdminLoyaltyRules() {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/rules`, { headers: authHeaders() });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function getAdminLoyaltyPromotions() {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/promotions`, { headers: authHeaders() });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function getAdminLoyaltyWallets() {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/wallets`, { headers: authHeaders() });
        const json = await res.json();
        return json.success ? json.data : [];
    } catch { return []; }
}

export async function adjustAdminLoyaltyPoints(customerId: string, points: number, description: string) {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/customers/${customerId}/adjust`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ points, description }),
        });
        const json = await res.json();
        return json;
    } catch (error) {
        return { success: false, message: 'Network error' };
    }
}

export async function updateAdminLoyaltyTier(tierId: string, data: any) {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/tiers/${tierId}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return await res.json();
    } catch { return { success: false }; }
}

export async function deleteAdminLoyaltyTier(tierId: string) {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/tiers/${tierId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        return await res.json();
    } catch { return { success: false }; }
}

export async function updateAdminLoyaltyRule(ruleId: string, data: any) {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/rules/${ruleId}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return await res.json();
    } catch { return { success: false }; }
}

export async function deleteAdminLoyaltyRule(ruleId: string) {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/rules/${ruleId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        return await res.json();
    } catch { return { success: false }; }
}

export async function updateAdminLoyaltyPromotion(promoId: string, data: any) {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/promotions/${promoId}`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        });
        return await res.json();
    } catch { return { success: false }; }
}

export async function deleteAdminLoyaltyPromotion(promoId: string) {
    try {
        const res = await authFetch(`${API_URL}/api/admin/loyalty/promotions/${promoId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        return await res.json();
    } catch { return { success: false }; }
}
