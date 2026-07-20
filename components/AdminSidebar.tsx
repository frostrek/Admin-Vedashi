'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
    LayoutDashboard, Package, ShoppingCart, Tag, LogOut, Leaf,
    ChevronLeft, Menu, Truck, Megaphone, BarChart, Settings, Users, X, Shield, Search, Ticket,
    FileText, MessageSquare, Star, ShieldAlert, LayoutTemplate, Images, HelpCircle, Send, MonitorSmartphone, Activity, Layers, DollarSign, Gift, FileBarChart2, RotateCcw, SlidersHorizontal, Key, Map
} from 'lucide-react';
const useState = require('react').useState;
const useEffect = require('react').useEffect;

const overviewNav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const catalogNav = [
    { href: '/dashboard/products', label: 'Inventory', icon: Package },
    { href: '/dashboard/categories', label: 'Categories', icon: Tag },
    { href: '/dashboard/collections', label: 'Collections', icon: Layers },
    { href: '/dashboard/reels-management', label: 'Reels Management', icon: Layers },
];

const engagementNav = [
    { href: '/dashboard/reviews', label: 'Product Reviews', icon: Star },
    { href: '/dashboard/blog', label: 'Blog', icon: FileText },
    { href: '/dashboard/blog/comments', label: 'Blog Comments', icon: MessageSquare, isSubItem: true },
];

const salesNav = [
    { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/dashboard/shipments', label: 'Shipments', icon: Truck },
    { href: '/dashboard/returns', label: 'Returns', icon: RotateCcw },
    { href: '/dashboard/refunds', label: 'Refunds', icon: DollarSign },
    { href: '/dashboard/financial-report', label: 'Financial Report', icon: FileBarChart2 },
    { href: '/dashboard/payments/logs', label: 'Payment Logs', icon: DollarSign },
];

const usersNav = [
    { href: '/dashboard/customers', label: 'Customers', icon: Users },
    { href: '/dashboard/support/customer-enquiry', label: 'Customer Enquiry', icon: Send },
];

const marketingNav = [
    { href: '/dashboard/coupons', label: 'Coupons', icon: Ticket },
    { href: '/dashboard/notifications', label: 'Promotions', icon: Megaphone },
    { href: '/dashboard/loyalty', label: 'Loyalty & Rewards', icon: Gift },
];

const siteContentNav = [
    { href: '/dashboard/promo-banners', label: 'Promotion Banners', icon: Images },
    { href: '/dashboard/need-help', label: 'Need Help Guide', icon: Map },
    { href: '/dashboard/media', label: 'Visual Repository', icon: Images },
    { href: '/dashboard/header', label: 'Header Canvas', icon: MonitorSmartphone },
    { href: '/dashboard/footer', label: 'Footer Stratum', icon: LayoutTemplate },
    { href: '/dashboard/shop-filters', label: 'Shop Filters', icon: SlidersHorizontal },
    { href: '/dashboard/legal', label: 'Legal Chronicles', icon: Shield },
];

const optimizationNav = [
    { href: '/dashboard/search/analytics', label: 'Search Analytics', icon: Search },
    { href: '/dashboard/seo-health', label: 'SEO Health', icon: ShieldAlert },
    { href: '/dashboard/analytics/products', label: 'Product Analytics', icon: BarChart },
    { href: '/dashboard/activity-logs', label: 'Interaction Chronicles', icon: Activity },
];

const supportNav = [
    { href: '/dashboard/support/faqs', label: 'FAQ', icon: HelpCircle },
    { href: '/dashboard/support/tickets', label: 'Support Tickets', icon: MessageSquare },
    { href: '/dashboard/support/knowledge-base', label: 'Knowledge Base', icon: FileText },
];

const systemNav = [
    { href: '/dashboard/security', label: 'Security & Ops', icon: Shield },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/gdpr', label: 'GDPR', icon: Shield },
    { href: '/dashboard/partner-keys', label: 'API & Integrations', icon: Key },
];

const allNavItems = [
    ...overviewNav, ...catalogNav, ...engagementNav, ...salesNav,
    ...usersNav, ...marketingNav, ...siteContentNav, ...optimizationNav,
    ...supportNav, ...systemNav
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

    const renderNavItem = (item: { href: string; label: string; icon: any; isSubItem?: boolean }, isCollapsed: boolean) => {
        let isActive = false;
        let isParentWithActiveChild = false;

        if (item.href === '/dashboard' || item.href === '#') {
            isActive = pathname === item.href;
        } else {
            const isMatch = pathname === item.href || pathname.startsWith(item.href + '/');
            if (isMatch) {
                const hasLongerMatch = allNavItems.some(other =>
                    other.href !== item.href &&
                    other.href !== '#' &&
                    (pathname === other.href || pathname.startsWith(other.href + '/')) &&
                    other.href.length > item.href.length
                );
                isActive = !hasLongerMatch;
                isParentWithActiveChild = hasLongerMatch;
            }
        }

        const Icon = item.icon;

        return (
            <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[60%] before:rounded-r-full before:transition-all before:duration-150 ${isActive
                    ? "text-white bg-[#4a5238] before:bg-[#9aab6f]"
                    : isParentWithActiveChild
                        ? "text-[#c8d0b8] bg-white/[0.04] before:bg-transparent"
                        : "text-[#7a8070] hover:text-[#d4d9c8] hover:bg-white/5 before:bg-transparent"
                    } ${isCollapsed ? 'justify-center' : ''} ${item.isSubItem && !isCollapsed
                        ? `ml-6 pl-4 text-xs`
                        : ''
                    }`}
                title={isCollapsed ? item.label : undefined}
            >
                <Icon className={`${item.isSubItem && !isCollapsed ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} flex-shrink-0 ${(isActive || isParentWithActiveChild) ? 'text-white' : ''}`} />
                {!isCollapsed && <span>{item.label}</span>}
            </Link>
        );
    };

    const sidebarContent = (isCollapsed: boolean) => (
        <>
            {/* Logo */}
            <div className="flex items-center justify-center px-4 pt-2 pb-0 border-b border-border-subtle">
                {!isCollapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <img
                            src="/vedashi-logo.png"
                            alt="Vedashi"
                            className="h-12 w-auto object-contain filter brightness-0 invert transition-all duration-300"
                        />
                    </Link>
                )}
                {isCollapsed && (
                    <Link href="/dashboard" className="flex h-12 w-12 items-center justify-center transition-colors overflow-hidden">
                        <img
                            src="/Small-Logo.png"
                            alt="Vedashi"
                            className="h-9 w-9 object-contain filter brightness-0 invert"
                        />
                    </Link>
                )}
            </div>

            {/* Dashboard Link (Optional but kept for functionality if not in reference) */}
            <nav className="flex-1 min-h-0 px-3 py-4 pb-12 space-y-5 overflow-y-auto">
                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Overview</p>}
                    {overviewNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Catalog</p>}
                    {catalogNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Engagement</p>}
                    {engagementNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Sales</p>}
                    {salesNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Users</p>}
                    {usersNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Marketing</p>}
                    {marketingNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Site Content</p>}
                    {siteContentNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Optimization</p>}
                    {optimizationNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">Support</p>}
                    {supportNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase text-white/30">System</p>}
                    {systemNav.map(item => renderNavItem(item, isCollapsed))}
                </div>
            </nav>

            {/* Footer */}
            <div className="border-t border-white/10 px-4 py-6">
                {!isCollapsed && user && (
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-[#828B5C] flex items-center justify-center text-white font-bold border border-white/20">
                                {user.name?.[0]?.toUpperCase()}
                            </div>
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-[#1D351D]"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user.name}</p>
                            <p className="text-[11px] text-white/50 truncate">Administrator</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}
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
                className="fixed top-3.5 left-4 z-50 rounded-xl bg-[#1D351D] p-2 text-white shadow-lg md:hidden border border-white/10"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-64 flex flex-col bg-[#1D351D] animate-slideInLeft z-50 border-r border-white/5">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 rounded-lg p-1 text-white/50 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        {sidebarContent(false)}
                    </aside>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside
                className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-[#1D351D] transition-all duration-300 ease-in-out border-r border-white/5 ${collapsed ? 'w-[68px]' : 'w-72'
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
