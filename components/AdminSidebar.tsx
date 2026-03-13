'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import {
    LayoutDashboard, Package, ShoppingCart, Tag, LogOut, Leaf,
    ChevronLeft, Menu, Truck, Megaphone, BarChart, Settings, Users, X, Shield, Search, Ticket,
    FileText, MessageSquare, Star, ShieldAlert, LayoutTemplate, Images, HelpCircle, BookOpen, Send, MonitorSmartphone, Activity, Layers, DollarSign, Gift
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
];

const engagementNav = [
    { href: '/dashboard/reviews', label: 'Product Reviews', icon: Star },
    { href: '/dashboard/blog', label: 'Blog', icon: FileText },
    { href: '/dashboard/blog/comments', label: 'Blog Comments', icon: MessageSquare, isSubItem: true },
];

const salesNav = [
    { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/dashboard/payments/logs', label: 'Payment Stratum', icon: DollarSign },
    { href: '#', label: 'Delivery', icon: Truck },
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
    { href: '/dashboard/promo-banners', label: 'Aura Announcements', icon: Images },
    { href: '/dashboard/media', label: 'Visual Repository', icon: Images },
    { href: '/dashboard/header', label: 'Header Canvas', icon: MonitorSmartphone },
    { href: '/dashboard/footer', label: 'Footer Stratum', icon: LayoutTemplate },
];

const optimizationNav = [
    { href: '/dashboard/search/analytics', label: 'Search Analytics', icon: Search },
    { href: '/dashboard/seo-health', label: 'SEO Health', icon: ShieldAlert },
    { href: '/dashboard/analytics/products', label: 'Product Analytics', icon: BarChart },
    { href: '/dashboard/activity-logs', label: 'Interaction Chronicles', icon: Activity },
];

const supportNav = [
    { href: '/dashboard/support/faqs', label: 'FAQ', icon: HelpCircle },
    { href: '/dashboard/support/help-articles', label: 'Help Articles', icon: BookOpen },
    { href: '/dashboard/support/tickets', label: 'Support Tickets', icon: MessageSquare },
    { href: '/dashboard/support/knowledge-base', label: 'Knowledge Base', icon: FileText },
];

const systemNav = [
    { href: '/dashboard/security', label: 'Security & Ops', icon: Shield },
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

    const renderNavItem = (item: { href: string; label: string; icon: any; isSubItem?: boolean }, isCollapsed: boolean) => {
        const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href) && item.href !== '#';
        const Icon = item.icon;

        return (
            <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 relative ${isActive
                    ? 'text-white bg-[#828B5C]'
                    : 'text-[#A0A691] hover:text-white hover:bg-white/5'
                    } ${isCollapsed ? 'justify-center' : ''} ${item.isSubItem ? 'ml-6 border-l border-white/10 rounded-l-none pl-4 py-2 text-xs' : ''}`}
                title={isCollapsed ? item.label : undefined}
            >
                <Icon className={`${item.isSubItem ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'} flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                {!isCollapsed && <span>{item.label}</span>}
            </Link>
        );
    };

    const sidebarContent = (isCollapsed: boolean) => (
        <>
            {/* Logo */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-2 border-b border-border-subtle`}>
                {!isCollapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div>
                            <span className="font-serif text-xl font-bold text-gold-soft tracking-wide">VEDASHI</span>
                        </div>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/15">
                        <span className="text-gold font-bold text-lg">V</span>
                    </div>
                )}
            </div>

            {/* Dashboard Link (Optional but kept for functionality if not in reference) */}
            <nav className="flex-1 min-h-0 px-3 py-4 pb-12 space-y-5 overflow-y-auto">
                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Overview</p>}
                    {overviewNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Catalog</p>}
                    {catalogNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Engagement</p>}
                    {engagementNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Sales</p>}
                    {salesNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Users</p>}
                    {usersNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Marketing</p>}
                    {marketingNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Site Content</p>}
                    {siteContentNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Optimization</p>}
                    {optimizationNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">Support</p>}
                    {supportNav.map(item => renderNavItem(item, isCollapsed))}
                </div>

                <div>
                    {!isCollapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">System</p>}
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
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-[#313622]"></span>
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
                className="fixed top-3.5 left-4 z-50 rounded-xl bg-[#313622] p-2 text-white shadow-lg md:hidden border border-white/10"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-64 flex flex-col bg-[#313622] animate-slideInLeft z-50 border-r border-white/5">
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
                className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-[#313622] transition-all duration-300 ease-in-out border-r border-white/5 ${collapsed ? 'w-[68px]' : 'w-72'
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
