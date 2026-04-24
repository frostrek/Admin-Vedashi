import { authFetch, authHeaders, API_URL, ApiResponse } from '@/lib/api';

export interface PartnerCredential {
    id: string;
    vendor_id: string;
    label: string;
    scopes: string[];
    is_active: boolean;
    rate_limit_max: number;
    created_at: string;
    expires_at: string;
    last_used_at: string | null;
    grace_expires_at: string | null;
}

export interface GeneratedKeyData {
    vendor_id: string;
    api_key: string; // ONLY RETURNED ONCE!
    label: string;
    expires_at: string;
}

export async function getPartnerKeys(): Promise<PartnerCredential[]> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/partner-keys`, {
            headers: authHeaders(),
        });
        const json: ApiResponse<{ credentials: PartnerCredential[] }> = await res.json();
        if (json.success && json.data?.credentials) {
            return json.data.credentials;
        }
        return [];
    } catch (error) {
        console.error('[Partner API] Failed to fetch partner keys:', error);
        return [];
    }
}

export async function generatePartnerKey(label: string, scopes: string[]): Promise<{ success: boolean; data?: GeneratedKeyData; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/partner-keys`, {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ label, scopes }),
        });
        const json: ApiResponse<GeneratedKeyData> = await res.json();
        if (json.success && json.data) {
            return { success: true, data: json.data };
        }
        return { success: false, error: json.message || 'Failed to generate key' };
    } catch (error) {
        console.error('[Partner API] Failed to generate key:', error);
        return { success: false, error: 'Network error' };
    }
}

export async function rotatePartnerKey(vendorId: string): Promise<{ success: boolean; data?: GeneratedKeyData; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/partner-keys/${vendorId}/rotate`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const json: ApiResponse<{ oldVendorId: string; newCredential: GeneratedKeyData }> = await res.json();
        if (json.success && json.data?.newCredential) {
            return { success: true, data: json.data.newCredential };
        }
        return { success: false, error: json.message || 'Failed to rotate key' };
    } catch (error) {
        console.error('[Partner API] Failed to rotate key:', error);
        return { success: false, error: 'Network error' };
    }
}

export async function revokePartnerKey(vendorId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await authFetch(`${API_URL}/api/admin/partner-keys/${vendorId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const json: ApiResponse = await res.json();
        if (json.success) {
            return { success: true };
        }
        return { success: false, error: json.message || 'Failed to revoke key' };
    } catch (error) {
        console.error('[Partner API] Failed to revoke key:', error);
        return { success: false, error: 'Network error' };
    }
}
