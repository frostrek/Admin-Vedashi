'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { loginUser as apiLogin, deactivateAccount as apiDeactivate, LoginResult } from '@/lib/api';
import { setToken, getToken, setStoredUser, clearAuth, setRefreshToken } from '@/lib/auth';

interface AdminUser {
    email: string;
    name: string;
    role: 'admin' | 'owner';
    customer_id?: string;
}

interface LoginResponse {
    success: boolean;
    error?: string;
    /** True when the account exists            but is deactivated */
    deactivated?: boolean;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
    deactivate: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
const ADMIN_KEY = 'ksp_admin_user';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(ADMIN_KEY);
            if (stored) setUser(JSON.parse(stored));
        }
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
        // Try real backend login first
        const result: LoginResult = await apiLogin(email, password);

        // If the account is deactivated, bubble that up so the login page can show the reactivation modal
        if (!result.success && result.deactivated) {
            return { success: false, deactivated: true, error: result.error };
        }

        if (result.success && result.customer) {
            // Real backend login succeeded
            const adminUser: AdminUser = {
                email: result.customer.email,
                name: result.customer.full_name || email.split('@')[0],
                role: 'admin',
                customer_id: result.customer.customer_id,
            };
            setUser(adminUser);
            localStorage.setItem(ADMIN_KEY, JSON.stringify(adminUser));
            if (result.access_token) setToken(result.access_token);
            if (result.refresh_token) setRefreshToken(result.refresh_token);
            if (result.customer) setStoredUser(result.customer);
            return { success: true };
        }

        // Fallback: simple admin auth for development (when backend is unreachable)
        if (!result.success && result.error?.includes('Network error')) {
            if (email && password.length >= 3) {
                const adminUser: AdminUser = {
                    email,
                    name: email.split('@')[0],
                    role: 'admin',
                };
                setUser(adminUser);
                localStorage.setItem(ADMIN_KEY, JSON.stringify(adminUser));
                return { success: true };
            }
        }

        return { success: false, error: result.error || 'Invalid credentials' };
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(ADMIN_KEY);
        clearAuth();
    }, []);

    const deactivate = useCallback(async (password: string) => {
        const token = getToken() || undefined;
        const result = await apiDeactivate(password, token);
        if (result.success) {
            // Clear everything — user is now deactivated
            setUser(null);
            localStorage.removeItem(ADMIN_KEY);
            clearAuth();
        }
        return result;
    }, []);

    return (
        <AdminAuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, deactivate }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
    return context;
}
