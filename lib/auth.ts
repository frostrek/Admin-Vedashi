/**
 * Admin Panel - Authentication Utilities
 * Manages JWT token storage and retrieval
 */

const TOKEN_KEY = 'admin_auth_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';
const USER_KEY = 'admin_user';

/**
 * Get the stored authentication tokens
 */
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('[Auth] Failed to get token:', error);
        return null;
    }
}

/**
 * Store the authentication token
 */
export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(TOKEN_KEY, token);
        console.log('[Auth] Token saved successfully');
    } catch (error) {
        console.error('[Auth] Failed to save token:', error);
    }
}

/**
 * Remove the stored token (logout)
 */
export function removeToken(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        console.log('[Auth] Token removed (logged out)');
    } catch (error) {
        console.error('[Auth] Failed to remove token:', error);
    }
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
    const token = getToken();
    if (!token) return false;

    // Basic JWT expiration check
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() < exp;
    } catch {
        // If we can't decode the token, assume it's invalid
        return false;
    }
}

/**
 * Get stored user data
 */
export function getStoredUser<T = Record<string, unknown>>(): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const data = localStorage.getItem(USER_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('[Auth] Failed to get user data:', error);
        return null;
    }
}

/**
 * Store user data
 */
export function setStoredUser<T = Record<string, unknown>>(user: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('[Auth] Failed to store user data:', error);
    }
}

/**
 * Get the stored refresh token
 */
export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
        return null;
    }
}

/**
 * Store the refresh token
 */
export function setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
        // silent
    }
}

/**
 * Clear all auth data (full logout)
 */
export function clearAuth(): void {
    removeToken();
    if (typeof window !== 'undefined') {
        try { localStorage.removeItem(REFRESH_TOKEN_KEY); } catch { }
    }
}
