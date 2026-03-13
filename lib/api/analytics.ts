/**
 * Analytics API Client
 * Fetches dashboard analytics data from the backend.
 */

import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

/* ─── Types ─── */

export interface AnalyticsSummary {
    total_sales: number;
    total_orders: number;
    total_products: number;
    total_categories: number;
    sales_growth: number;
    orders_growth: number;
}

export interface SalesDataPoint {
    label: string;
    total_sales: number;
}

export interface PaymentBreakdownItem {
    label: string;
    amount: number;
    percentage: number;
}

export interface PaymentBreakdown {
    total: number;
    items: PaymentBreakdownItem[];
}

/* ─── API Calls ─── */

export async function getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
    try {
        const res = await fetch(`${API_URL}/api/admin/analytics/summary`, {
            headers: authHeaders(),
            credentials: 'include',
        });
        const json: ApiResponse<AnalyticsSummary> = await res.json();
        if (json.success && json.data) return json.data;
        console.warn('[Analytics] Summary failed:', json.message);
        return null;
    } catch (error) {
        console.error('[Analytics] Failed to fetch summary:', error);
        return null;
    }
}

export async function getSalesOverview(
    range: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<SalesDataPoint[]> {
    try {
        const res = await fetch(
            `${API_URL}/api/admin/analytics/sales-overview?range=${range}`,
            { headers: authHeaders(), credentials: 'include' }
        );
        const json: ApiResponse<SalesDataPoint[]> = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
        console.warn('[Analytics] Sales overview failed:', json.message);
        return [];
    } catch (error) {
        console.error('[Analytics] Failed to fetch sales overview:', error);
        return [];
    }
}

export async function getPaymentBreakdown(): Promise<PaymentBreakdown | null> {
    try {
        const res = await fetch(
            `${API_URL}/api/admin/analytics/payment-breakdown`,
            { headers: authHeaders(), credentials: 'include' }
        );
        const json: ApiResponse<PaymentBreakdown> = await res.json();
        if (json.success && json.data) return json.data;
        console.warn('[Analytics] Payment breakdown failed:', json.message);
        return null;
    } catch (error) {
        console.error('[Analytics] Failed to fetch payment breakdown:', error);
        return null;
    }
}
