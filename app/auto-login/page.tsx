'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Leaf } from 'lucide-react';
import { API_URL } from '@/lib/api';

/**
 * Auto-Login Page
 *
 * This page receives admin session data from the Storefront via URL params,
 * sets up AdminAuthContext localStorage, and redirects to /dashboard.
 *
 * URL: /auto-login?token=<jwt>&email=<email>&name=<name>&id=<customer_id>
 */
function AutoLoginContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Authenticating...');
    const hasRun = useRef(false);

    useEffect(() => {
        // Guard: only run once to prevent infinite re-render loop
        if (hasRun.current) return;
        hasRun.current = true;

        const email = searchParams.get('email');
        const name = searchParams.get('name');
        const id = searchParams.get('id');

        if (!email) {
            setStatus('Invalid login link. Redirecting...');
            setTimeout(() => { window.location.href = '/'; }, 2000);
            return;
        }

        // Validate the session via HttpOnly cookie (set by storefront login)
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/auth/me`, {
                    credentials: 'include',
                });
                const json = await res.json();

                if (!res.ok || !json.success) {
                    setStatus('Session expired. Redirecting to login...');
                    setTimeout(() => { window.location.href = '/'; }, 2000);
                    return;
                }

                const customer = json.data;

                // Set up AdminAuthContext localStorage (key: ksp_admin_user)
                const adminUser = {
                    email: customer.email || email,
                    name: customer.full_name || name || email.split('@')[0],
                    role: 'admin' as const,
                    customer_id: customer.customer_id || id || '',
                    phone: customer.phone || '',
                };
                localStorage.setItem('ksp_admin_user', JSON.stringify(adminUser));

                // Set up lib/auth.ts localStorage (key: admin_user)
                localStorage.setItem('admin_user', JSON.stringify({
                    customer_id: customer.customer_id || id,
                    full_name: customer.full_name || name || email.split('@')[0],
                    email: customer.email || email,
                }));

                setStatus('Welcome, Admin! Redirecting to dashboard...');

                // Hard redirect to avoid Turbopack re-render loops
                setTimeout(() => {
                    window.location.href = `${window.location.origin}/dashboard`;
                }, 800);
            } catch (err) {
                console.error('Auto-login failed:', err);
                setStatus('Authentication failed. Redirecting...');
                setTimeout(() => { window.location.href = '/'; }, 2000);
            }
        })();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-page-bg flex items-center justify-center px-4">
            <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-2xl shadow-primary/30 border border-gold/15 animate-pulse">
                    <Leaf className="h-8 w-8 text-gold" />
                </div>
                <h1 className="font-serif text-xl font-bold text-gold-soft tracking-wide mb-2">
                    Admin Panel
                </h1>
                <p className="text-sm text-text-secondary">{status}</p>
                <div className="mt-4 flex justify-center">
                    <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
            </div>
        </div>
    );
}

export default function AutoLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-page-bg flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-2xl shadow-primary/30 border border-gold/15 animate-pulse">
                        <Leaf className="h-8 w-8 text-gold" />
                    </div>
                    <h1 className="font-serif text-xl font-bold text-gold-soft tracking-wide mb-2">
                        Admin Panel
                    </h1>
                    <p className="text-sm text-text-secondary">Loading...</p>
                    <div className="mt-4 flex justify-center">
                        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    </div>
                </div>
            </div>
        }>
            <AutoLoginContent />
        </Suspense>
    );
}
