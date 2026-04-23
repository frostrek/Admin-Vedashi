import { useQuery } from '@tanstack/react-query';
import { getToken } from '../auth';
import { env } from '../env';

const API_URL = env.NEXT_PUBLIC_API_URL;

export interface FinancialReportParams {
    startDate: string; // ISO format (YYYY-MM-DD)
    endDate: string;   // ISO format (YYYY-MM-DD)
    period?: 'daily' | 'weekly' | 'monthly';
    currency?: string;
}

/* ─── Legacy Types (Main Dashboard) ─── */
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


export interface ReportSummary {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    refundCount: number;
    refundAmount: number;
    cancelledRevenueLost: number;
    repeatCustomerRate: number;
    cancellationRate: number;
    refundRate: number;
    revenuePerCustomer: number;
    newVsReturning: {
        new: number;
        returning: number;
    };
}

export interface TimeSeries {
    period: string;
    revenue: number;
    orders: number;
    newCustomers?: number;
    returningCustomers?: number;
}

export interface PaymentMethod {
    method: string;
    count: number;
    amount: number;
}

export interface StatusCount {
    status: string;
    count: number;
}

export interface ProductRevenue {
    rank: number;
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
}

export interface CategoryRevenue {
    category: string;
    revenue: number;
    orders: number;
}

export interface FinancialReportData {
    summary: ReportSummary;
    salesTrend: TimeSeries[];
    revenueByHour: Array<{ hour: number; revenue: number }>;
    paymentBreakdown: PaymentMethod[];
    orderStatusBreakdown: StatusCount[];
    topProducts: ProductRevenue[];
    topCategories: CategoryRevenue[];
}

/**
 * Fetcher function for the React Query hook.
 */
export async function fetchFinancialReport(params: FinancialReportParams): Promise<FinancialReportData> {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append('startDate', params.startDate);
    if (params.endDate) qs.append('endDate', params.endDate);
    if (params.period) qs.append('period', params.period);
    if (params.currency) qs.append('currency', params.currency);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/admin/analytics/financial-report?${qs.toString()}`, {
        headers,
        credentials: 'include',
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch financial report');
    }

    const json = await res.json();
    return json.data;
}

/**
 * React Query Hook for Financial Report
 */
export function useFinancialReport(params: FinancialReportParams, enabled: boolean = true) {
    return useQuery<FinancialReportData, Error>({
        queryKey: ['financialReport', params.startDate, params.endDate, params.period, params.currency],
        queryFn: () => fetchFinancialReport(params),
        enabled: enabled && !!params.startDate && !!params.endDate,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000,   // 30 minutes
    });
}

/**
 * Calculates the exact same duration backward in time for Delta comparisons.
 */
function calculatePreviousPeriod(start: string, end: string): { prevStart: string; prevEnd: string } {
    const sDate = new Date(start);
    const eDate = new Date(end);
    
    // Ensure accurate millisecond difference
    const diffMs = eDate.getTime() - sDate.getTime();
    
    // Calculate new bounds
    const prevEnd = new Date(sDate.getTime() - 86400000); // 1 day before start
    const prevStart = new Date(prevEnd.getTime() - diffMs);
    
    return {
        prevStart: prevStart.toISOString().split('T')[0],
        prevEnd: prevEnd.toISOString().split('T')[0],
    };
}

/**
 * React Query Hook to automatically fetch the previous period for Delts.
 */
export function usePreviousPeriodReport(params: FinancialReportParams, enabled: boolean = true) {
    let prevParams: FinancialReportParams | null = null;
    
    if (params.startDate && params.endDate) {
        const { prevStart, prevEnd } = calculatePreviousPeriod(params.startDate, params.endDate);
        prevParams = {
            ...params,
            startDate: prevStart,
            endDate: prevEnd
        };
    }

    return useQuery<FinancialReportData, Error>({
        queryKey: ['financialReport_prev', prevParams?.startDate, prevParams?.endDate, prevParams?.period, prevParams?.currency],
        queryFn: () => prevParams ? fetchFinancialReport(prevParams) : Promise.reject('Missing params'),
        enabled: enabled && !!prevParams && !!prevParams.startDate && !!prevParams.endDate,
        staleTime: 5 * 60 * 1000, 
        gcTime: 30 * 60 * 1000,
    });
}

/**
 * Return the URL string to trigger a CSV download.
 */
export function getFinancialReportExportUrl(
    params: { startDate: string; endDate: string; format?: 'csv' | 'xlsx' }
): string {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append('startDate', params.startDate);
    if (params.endDate) qs.append('endDate', params.endDate);
    if (params.format) qs.append('format', params.format);
    return `${API_URL}/api/admin/analytics/financial-report/export?${qs.toString()}`;
}

/* ─── Legacy API Calls (Main Dashboard) ─── */

export async function getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
    try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/api/admin/analytics/summary`, {
            headers,
            credentials: 'include',
        });
        const json = await res.json();
        if (json.success && json.data) return json.data;
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
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
            `${API_URL}/api/admin/analytics/sales-overview?range=${range}`,
            { headers, credentials: 'include' }
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
        return [];
    } catch (error) {
        console.error('[Analytics] Failed to fetch sales overview:', error);
        return [];
    }
}

export async function getPaymentBreakdown(): Promise<PaymentBreakdown | null> {
    try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
            `${API_URL}/api/admin/analytics/payment-breakdown`,
            { headers, credentials: 'include' }
        );
        const json = await res.json();
        if (json.success && json.data) return json.data;
        return null;
    } catch (error) {
        console.error('[Analytics] Failed to fetch payment breakdown:', error);
        return null;
    }
}

/* ─── NEW: Expense Breakdown ─── */

export interface ExpenseTrendPoint {
    period: string;
    shipping: number;
    discounts: number;
    gatewayFees: number;
}

export interface ExpenseBreakdown {
    totals: {
        shipping: number;
        discounts: number;
        gatewayFees: number;
        revenue: number;
        subtotal: number;
        totalExpenses: number;
        grossProfit: number;
        grossProfitMargin: number;
    };
    trend: ExpenseTrendPoint[];
}

export async function fetchExpenseBreakdown(params: FinancialReportParams): Promise<ExpenseBreakdown> {
    const qs = new URLSearchParams();
    qs.append('startDate', params.startDate);
    qs.append('endDate', params.endDate);
    if (params.period) qs.append('period', params.period);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/admin/analytics/expenses?${qs.toString()}`, {
        headers, credentials: 'include',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch expense breakdown');
    }
    const json = await res.json();
    return json.data;
}

export function useExpenseBreakdown(params: FinancialReportParams, enabled = true) {
    return useQuery<ExpenseBreakdown, Error>({
        queryKey: ['expenseBreakdown', params.startDate, params.endDate, params.period],
        queryFn: () => fetchExpenseBreakdown(params),
        enabled: enabled && !!params.startDate && !!params.endDate,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

/* ─── NEW: Orders Financial Table ─── */

export interface OrderFinancialRow {
    orderId: string;
    customer: string;
    date: string;
    subtotal: number;
    discounts: number;
    shipping: number;
    finalTotal: number;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    couponCode: string | null;
}

export interface OrdersFinancialData {
    total: number;
    page: number;
    limit: number;
    orders: OrderFinancialRow[];
}

export async function fetchOrdersFinancial(
    params: FinancialReportParams & { page?: number; limit?: number; search?: string }
): Promise<OrdersFinancialData> {
    const qs = new URLSearchParams();
    qs.append('startDate', params.startDate);
    qs.append('endDate', params.endDate);
    if (params.page) qs.append('page', params.page.toString());
    if (params.limit) qs.append('limit', params.limit.toString());
    if (params.search) qs.append('search', params.search);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/admin/analytics/orders-financial?${qs.toString()}`, {
        headers, credentials: 'include',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch orders financial data');
    }
    const json = await res.json();
    return json.data;
}

export function useOrdersFinancial(
    params: FinancialReportParams & { page?: number; limit?: number; search?: string },
    enabled = true
) {
    return useQuery<OrdersFinancialData, Error>({
        queryKey: ['ordersFinancial', params.startDate, params.endDate, params.page, params.limit, params.search],
        queryFn: () => fetchOrdersFinancial(params),
        enabled: enabled && !!params.startDate && !!params.endDate,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

/* ─── NEW: Refund Summary ─── */

export interface RefundTimelinePoint {
    date: string;
    count: number;
    amount: number;
}

export interface RefundSummary {
    refundCount: number;
    refundTotal: number;
    avgRefund: number;
    refundRate: number;
    cancelCount: number;
    cancelLostRevenue: number;
    totalOrders: number;
    timeline: RefundTimelinePoint[];
}

export async function fetchRefundSummary(params: FinancialReportParams): Promise<RefundSummary> {
    const qs = new URLSearchParams();
    qs.append('startDate', params.startDate);
    qs.append('endDate', params.endDate);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/admin/analytics/refund-summary?${qs.toString()}`, {
        headers, credentials: 'include',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch refund summary');
    }
    const json = await res.json();
    return json.data;
}

export function useRefundSummary(params: FinancialReportParams, enabled = true) {
    return useQuery<RefundSummary, Error>({
        queryKey: ['refundSummary', params.startDate, params.endDate],
        queryFn: () => fetchRefundSummary(params),
        enabled: enabled && !!params.startDate && !!params.endDate,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}
