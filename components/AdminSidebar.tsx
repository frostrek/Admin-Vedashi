'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
    LayoutDashboard, Package, ShoppingCart, Tag, LogOut, Wine,
    ChevronLeft, Menu, Truck, Megaphone, BarChart, Settings, Users, X, Shield, Search, Ticket,
    FileText, MessageSquare, Star, ShieldAlert, LayoutTemplate, Images, HelpCircle, BookOpen, Send, MonitorSmartphone, Activity, Layers
} from 'lucide-react';
const useState = require('react').useState;
const useEffect = require('react').useEffect;

const mainNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/products', label: 'Inventory', icon: Package },
    { href: '/dashboard/collections', label: 'Collections', icon: Layers },
    { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/dashboard/categories', label: 'Categories', icon: Tag },
];

const secondaryNav = [
    { href: '/dashboard/seo-health', label: 'SEO Health', icon: ShieldAlert },
    { href: '/dashboard/customers', label: 'Customers', icon: Users },
    { href: '/dashboard/coupons', label: 'Coupons', icon: Ticket },
    { href: '#', label: 'Delivery', icon: Truck },
    { href: '/dashboard/notifications', label: 'Promotions', icon: Megaphone },
    { href: '/dashboard/search/analytics', label: 'Search Analytics', icon: BarChart },
];

const contentNav = [
    { href: '/dashboard/promo-banners', label: 'Promotion Banners', icon: Megaphone },
    { href: '/dashboard/header', label: 'Header Management', icon: MonitorSmartphone },
    { href: '/dashboard/footer', label: 'Footer Management', icon: LayoutTemplate },
    { href: '/dashboard/media', label: 'Media Library', icon: Images },
    { href: '/dashboard/reviews', label: 'Product Reviews', icon: Star },
    { href: '/dashboard/blog', label: 'Blog Posts', icon: FileText },
    { href: '/dashboard/blog/comments', label: 'Blog Comments', icon: MessageSquare },
    { href: '/dashboard/support/tickets', label: 'Support Tickets', icon: MessageSquare },
    { href: '/dashboard/support/faqs', label: 'FAQ Management', icon: HelpCircle },
    { href: '/dashboard/support/help-articles', label: 'Help Articles', icon: BookOpen },
    { href: '/dashboard/support/knowledge-base', label: 'Knowledge Base', icon: FileText },
    { href: '/dashboard/support/customer-enquiry', label: 'Customer Enquiry', icon: Send },
];

const bottomNav = [
    { href: '/dashboard/security', label: 'Security & Ops', icon: ShieldAlert },
    { href: '/dashboard/analytics/products', label: 'Analytics', icon: BarChart },
    { href: '/dashboard/payments/logs', label: 'Payment Logs', icon: FileText },
    { href: '/dashboard/activity-logs', label: 'Activity Logs', icon: Activity },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/gdpr', label: 'GDPR', icon: Shield },
];

interface AdminSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAdminAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [contentOpen, setContentOpen] = useState(true);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Lock body scroll on mobile
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const renderNavItem = (item: { href: string; label: string; icon: typeof LayoutDashboard }, isCollapsed: boolean) => {
        const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href) && item.href !== '#';
        const Icon = item.icon;

        return (
            <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 relative ${isActive
                    ? 'text-gold bg-gold/[0.08]'
                    : 'text-text-muted hover:text-gold-soft hover:bg-gold/[0.04]'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
            >
                {/* Gold left border indicator for active state */}
                {isActive && !isCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold rounded-r-full" />
                )}
                <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-gold' : ''}`} />
                {!isCollapsed && <span>{item.label}</span>}
            </Link>
        );
    };

    const sidebarContent = (isCollapsed: boolean) => (
        <>
            {/* Logo */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-5 border-b border-border-subtle`}>
                {!isCollapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30">
                            <Wine className="h-4.5 w-4.5 text-[#E8D8B9]" />
                        </div>
                        <div>
                            <span className="font-serif text-lg font-bold text-[#E8D8B9] tracking-wide">KSP</span>
                            <span className="block text-[9px] uppercase tracking-[0.3em] text-text-muted font-medium -mt-0.5">Wines Admin</span>
                        </div>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30">
                        <Wine className="h-4.5 w-4.5 text-[#E8D8B9]" />
                    </div>
                )}
            </div>

            {/* Main nav */}
            <nav className="flex-1 min-h-0 px-3 py-4 pb-12 space-y-1 overflow-y-auto">
                {!isCollapsed && (
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-muted/40">
                        Main
                    </p>
                )}
                {mainNav.map(item => renderNavItem(item, isCollapsed))}

                <div className="my-3 border-t border-border-subtle" />

                {!isCollapsed && (
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-muted/40">
                        Management
                    </p>
                )}
                {secondaryNav.map(item => renderNavItem(item, isCollapsed))}

                <div className="my-3 border-t border-border-subtle" />

                {!isCollapsed && (
                    <button
                        onClick={() => setContentOpen(!contentOpen)}
                        className="w-full flex items-center justify-between px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-muted/40 cursor-pointer hover:text-gold-muted transition-colors"
                    >
                        <span>CONTENT MANAGEMENT</span>
                        <ChevronLeft className={`h-3 w-3 transition-transform duration-200 ${contentOpen ? '-rotate-90' : ''}`} />
                    </button>
                )}
                {isCollapsed && (
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-muted/40 text-center">
                        CONTENT MGT
                    </p>
                )}

                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${!isCollapsed && !contentOpen ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                    {contentNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div className="my-3 border-t border-white/[0.05]" />

                {!isCollapsed && (
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-muted/40">
                        System
                    </p>
                )}
                {bottomNav.map(item => renderNavItem(item, isCollapsed))}
            </nav>

            {/* Footer */}
            <div className="border-t border-border-subtle px-3 py-4">
                {!isCollapsed && user && (
                    <div className="mb-3 px-3">
                        <p className="text-sm font-medium text-gold-soft/80 truncate">{user.name}</p>
                        <p className="text-[11px] text-text-muted/60 truncate">{user.email}</p>
                    </div>
                )}
                <button
                    onClick={logout}
                    className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted hover:text-danger hover:bg-danger/[0.08] transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}
                    title="Sign Out"
                >
                    <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
                    {!isCollapsed && <span>Sign Out</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-3.5 left-4 z-50 rounded-xl bg-sidebar-bg p-2 text-gold-soft shadow-lg md:hidden border border-border-subtle"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-64 flex flex-col bg-sidebar-bg animate-slideInLeft z-50 border-r border-border-subtle">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 rounded-lg p-1 text-text-muted hover:text-gold-soft"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        {sidebarContent(false)}
                    </aside>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside
                className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-sidebar-bg transition-all duration-300 ease-in-out border-r border-border-subtle ${collapsed ? 'w-[68px]' : 'w-64'
                    }`}
            >
                {sidebarContent(collapsed)}

                {/* Collapse toggle */}
                <button
                    onClick={onToggle}
                    className="absolute -right-3 top-7 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card-bg text-text-muted shadow-sm hover:text-gold hover:border-gold/30 transition-all duration-300"
                >
                    <ChevronLeft className={`h-3 w-3 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                </button>
            </aside>
        </>
    );
}
