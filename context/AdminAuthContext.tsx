'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { loginUser as apiLogin, deactivateAccount as apiDeactivate, logoutUser as apiLogout, LoginResult } from '@/lib/api';
import { setToken, getToken, setStoredUser, clearAuth, setRefreshToken } from '@/lib/auth';

interface AdminUser {
    email: string;
    name: string;
    role: 'admin' | 'owner';
    customer_id?: string;
    phone?: string;
}

interface LoginResponse {
    success: boolean;
    error?: string;
    /** True when the account exists            but is deactivated */
    deactivated?: boolean;
    requireCaptcha?: boolean;
}

interface AdminAuthContextType {
    user: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, turnstileToken?: string) => Promise<LoginResponse>;
    logout: () => void;
    deactivate: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
const ADMIN_KEY = 'ksp_admin_user';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const login = useCallback(async (email: string, password: string, turnstileToken?: string): Promise<LoginResponse> => {
        setIsLoading(true);
        try {
            // Try real backend login first
            const result: LoginResult = await apiLogin(email, password, turnstileToken);

            // If the account is deactivated, bubble that up so the login page can show the reactivation modal
            if (!result.success && result.deactivated) {
                setIsLoading(false);
                return { success: false, deactivated: true, error: result.error, requireCaptcha: result.requireCaptcha };
            }

            if (result.success && result.customer) {
                // Real backend login succeeded
                const adminUser: AdminUser = {
                    email: result.customer.email,
                    name: result.customer.full_name || email.split('@')[0],
                    role: 'admin',
                    customer_id: result.customer.customer_id,
                    phone: result.customer.phone,
                };
                setUser(adminUser);
                localStorage.setItem(ADMIN_KEY, JSON.stringify(adminUser));
                if (result.access_token) setToken(result.access_token);
                if (result.refresh_token) setRefreshToken(result.refresh_token);
                if (result.customer) setStoredUser(result.customer);
                setIsLoading(false);
                return { success: true };
            }

            // Removed fallback: users must be able to reach real backend to login
            // SILENT_DEV_FALLBACK_REMOVED: Users were getting 401s after silent fallback
            if (!result.success && result.error?.includes('Network error')) {
                setIsLoading(false);
                return {
                    success: false,
                    error: 'Backend unreachable. Please ensure the server is running on port 5000.',
                    requireCaptcha: result.requireCaptcha,
                };
            }

            setIsLoading(false);
            return { success: false, error: result.error || 'Invalid credentials', requireCaptcha: result.requireCaptcha };
        } catch (err) {
            console.error('[AdminAuth] Login process error:', err);
            setIsLoading(false);
            return { success: false, error: 'Login process failed. Please try again.' };
        }
    }, []);

    const logout = useCallback(async () => {
        // Clear UI state immediately
        setUser(null);
        localStorage.removeItem(ADMIN_KEY);
        clearAuth();

        try {
            await apiLogout();
        } catch (error) {
            console.error('Logout API failed:', error);
        }
        
        // Redirect to storefront login
        window.location.href = 'http://localhost:3000/in/login';
    }, []);

    const deactivate = useCallback(async (password: string) => {
        const token = getToken() || undefined;
        const result = await apiDeactivate(password, token);
        if (result.success) {
            // Clear everything — user is now deactivate
            setUser(null);
            localStorage.removeItem(ADMIN_KEY);
            clearAuth();
        }
        return result;
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(ADMIN_KEY);
            if (stored) {
                setUser(JSON.parse(stored));
            }
        }
        setIsLoading(false);

        // Listen for global auth failures (e.g., failed refresh token)
        const handleAuthFailure = () => {
            console.warn('[AdminAuthContext] Auth failure detected, logging out...');
            logout();
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('admin-auth-failure', handleAuthFailure);
            return () => window.removeEventListener('admin-auth-failure', handleAuthFailure);
        }
    }, [logout]);

    const isAuthenticatedState = !!user;

    return (
        <AdminAuthContext.Provider value={{ user, isAuthenticated: isAuthenticatedState, isLoading, login, logout, deactivate }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
    return context;
}
