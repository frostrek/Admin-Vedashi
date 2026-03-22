'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminSidebar from '@/components/AdminSidebar';
import TopNavbar from '@/components/dashboard/TopNavbar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAdminAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            window.location.href = isLocal ? 'http://localhost:3000/in/login' : 'https://vedashi.com/in/login';
        }
    }, [isLoading, isAuthenticated]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-page-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 animate-pulse" />
                    <div className="h-4 w-32 rounded animate-shimmer" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-page-bg relative overflow-hidden">
            {/* Command Center Background */}
            <div 
                className="fixed inset-0 z-0 pointer-events-none opacity-15 mix-blend-multiply transition-opacity duration-1000"
                style={{ 
                    backgroundImage: 'url("/dashboard_bg.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            
            <AdminSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className={`flex-1 flex flex-col transition-all duration-300 relative ${sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-72'
                }`}>
                <TopNavbar sidebarCollapsed={sidebarCollapsed} />
                <main className="flex-1 p-4 sm:p-6 pt-16 md:pt-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
