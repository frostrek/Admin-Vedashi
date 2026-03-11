'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminSidebar from '@/components/AdminSidebar';
import TopNavbar from '@/components/dashboard/TopNavbar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAdminAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-page-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 animate-pulse" />
                    <div className="h-4 w-32 rounded animate-shimmer" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        if (typeof window !== 'undefined') {
            window.location.href = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000/login';
        }
        return null;
    }

    return (
        <div className="flex min-h-screen bg-page-bg">
            <AdminSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-72'
                }`}>
                <TopNavbar sidebarCollapsed={sidebarCollapsed} />
                <main className="flex-1 p-4 sm:p-6 pt-16 md:pt-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
