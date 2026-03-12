'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Search, Bell, Moon, Sun, ChevronDown, LogOut, User, X,
    Package, ShoppingCart, BarChart, Settings, Tag, Users, Loader2,
    FileSearch, Sparkles, ArrowRight
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useTheme } from '@/context/ThemeContext';
import { searchProductsAdmin, Product, getSynonyms, SearchSynonym, formatINR, getOrders, getLowStockProducts, getAdminFeedback } from '@/lib/api';

/* ── Quick-nav pages ── */
const adminPages = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart, keywords: ['home', 'overview'] },
    { href: '/dashboard/products', label: 'Products / Inventory', icon: Package, keywords: ['inventory', 'items'] },
    { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart, keywords: ['orders', 'sales'] },
    { href: '/dashboard/categories', label: 'Categories', icon: Tag, keywords: ['category', 'tags'] },
    { href: '/dashboard/customers', label: 'Customers', icon: Users, keywords: ['users', 'accounts'] },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings, keywords: ['config', 'preferences'] },
    { href: '/dashboard/search/synonyms', label: 'Search Mappings', icon: FileSearch, keywords: ['synonym', 'mapping', 'keywords'] },
    { href: '/dashboard/search/analytics', label: 'Search Analytics', icon: Sparkles, keywords: ['analytics', 'stats', 'metrics'] },
];

interface TopNavbarProps {
    sidebarCollapsed?: boolean;
}

export default function TopNavbar({ sidebarCollapsed }: TopNavbarProps) {
    const router = useRouter();
    const { user, logout } = useAdminAuth();
    const { isDark, toggleTheme } = useTheme();
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [synonyms, setSynonyms] = useState<SearchSynonym[]>([]);
    const [allSynonyms, setAllSynonyms] = useState<SearchSynonym[]>([]);
    const [searching, setSearching] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [notifOpen, setNotifOpen] = useState(false);
    const [alertsData, setAlertsData] = useState({ orders: 0, products: 0, enquiries: 0 });

    const dropdownRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Load all synonyms once for searching
    useEffect(() => {
        getSynonyms().then(data => setAllSynonyms(data));
    }, []);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced product search
    const searchProducts = useCallback(async (term: string) => {
        if (term.trim().length < 2) {
            setProducts([]);
            return;
        }
        setSearching(true);
        try {
            const results = await searchProductsAdmin(term);
            setProducts(results.slice(0, 5));
        } catch {
            setProducts([]);
        }
        setSearching(false);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        // Filter synonyms locally (instant)
        if (query.trim().length > 0) {
            const q = query.toLowerCase();
            setSynonyms(allSynonyms.filter(s =>
                s.keyword.toLowerCase().includes(q) ||
                s.synonyms.some(syn => syn.toLowerCase().includes(q))
            ).slice(0, 3));
        } else {
            setSynonyms([]);
        }
        // Debounce product search
        debounceRef.current = setTimeout(() => searchProducts(query), 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, searchProducts, allSynonyms]);

    // Fetch dynamic alerts data
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const [ordersRes, stockRes, feedbackRes] = await Promise.all([
                    getOrders(),
                    getLowStockProducts(),
                    getAdminFeedback({ status: 'new' })
                ]);
                const pendingOrders = ordersRes.filter(o => o.status === 'pending').length;
                const lowStock = stockRes.length;
                const newEnquiries = feedbackRes.total || 0;
                setAlertsData({ orders: pendingOrders, products: lowStock, enquiries: newEnquiries });
            } catch (e) {
                console.error("Failed to fetch alerts", e);
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000);
        return () => clearInterval(interval);
    }, []);

    // Filter pages by query
    const filteredPages = query.trim().length > 0
        ? adminPages.filter(p =>
            p.label.toLowerCase().includes(query.toLowerCase()) ||
            p.keywords.some(k => k.includes(query.toLowerCase()))
        )
        : [];

    // Build combined results for keyboard nav
    const allResults: { type: string; id: string }[] = [
        ...filteredPages.map(p => ({ type: 'page', id: p.href })),
        ...synonyms.map(s => ({ type: 'synonym', id: s.synonym_id })),
        ...products.map(p => ({ type: 'product', id: p.product_id })),
    ];

    const handleSelectPage = (href: string) => {
        setSearchOpen(false);
        setQuery('');
        setActiveIndex(-1);
        router.push(href);
    };

    const handleSelectProduct = (productIdent: string) => {
        setSearchOpen(false);
        setQuery('');
        setActiveIndex(-1);
        router.push(`/dashboard/products/edit/${productIdent}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < allResults.length) {
            e.preventDefault();
            const item = allResults[activeIndex];
            if (item.type === 'page') {
                handleSelectPage(item.id);
            } else if (item.type === 'synonym') {
                handleSelectPage('/dashboard/search/synonyms');
            } else {
                handleSelectProduct(item.id);
            }
        } else if (e.key === 'Escape') {
            setSearchOpen(false);
            setQuery('');
        }
    };

    return (
        <div className="sticky top-0 z-30 bg-card-bg/90 backdrop-blur-xl border-b border-border-subtle transition-all duration-300">
            <div className="flex items-center justify-between px-4 sm:px-6 h-[56px]">
                {/* Search */}
                <div ref={searchRef} className="relative hidden sm:block w-full max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search patient records or formulations..."
                            value={query}
                            onChange={e => {
                                setQuery(e.target.value);
                                setSearchOpen(true);
                                setActiveIndex(-1);
                            }}
                            onFocus={() => setSearchOpen(true)}
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                            className="w-full rounded-xl border border-border bg-page-bg py-2 pl-10 pr-8 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all duration-300"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setProducts([]); setSynonyms([]); inputRef.current?.focus(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown results */}
                    {searchOpen && query.trim().length >= 1 && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border bg-card-bg-elevated shadow-2xl max-h-[420px] overflow-y-auto z-50 animate-slideDown">
                            {/* Page Navigation */}
                            {filteredPages.length > 0 && (
                                <div className="py-1">
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                                        Pages
                                    </p>
                                    {filteredPages.map((page) => {
                                        const idx = allResults.findIndex(r => r.type === 'page' && r.id === page.href);
                                        const Icon = page.icon;
                                        return (
                                            <button
                                                key={page.href}
                                                onClick={() => handleSelectPage(page.href)}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={`flex items-center gap-3 w-full px-4 py-2 text-left transition-colors ${activeIndex === idx
                                                    ? 'bg-gold/[0.08] text-gold'
                                                    : 'text-text-secondary hover:bg-gold/[0.04] hover:text-text-primary'
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4 flex-shrink-0" />
                                                <span className="text-sm font-medium">{page.label}</span>
                                                <ArrowRight className="h-3 w-3 ml-auto opacity-40" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Synonyms / Search Mappings */}
                            {synonyms.length > 0 && (
                                <div className="py-1 border-t border-border-subtle">
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                                        Search Mappings
                                    </p>
                                    {synonyms.map((syn) => {
                                        const idx = allResults.findIndex(r => r.type === 'synonym' && r.id === syn.synonym_id);
                                        return (
                                            <button
                                                key={syn.synonym_id}
                                                onClick={() => handleSelectPage('/dashboard/search/synonyms')}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={`flex items-center gap-3 w-full px-4 py-2 text-left transition-colors ${activeIndex === idx
                                                    ? 'bg-gold/[0.08]'
                                                    : 'hover:bg-gold/[0.04]'
                                                    }`}
                                            >
                                                <FileSearch className="h-4 w-4 flex-shrink-0 text-gold/60" />
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-sm font-semibold text-gold">{syn.keyword}</span>
                                                    <span className="text-text-muted mx-1.5">→</span>
                                                    <span className="text-xs text-text-secondary">{syn.synonyms.join(', ')}</span>
                                                </div>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${syn.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {syn.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Products */}
                            {(products.length > 0 || searching) && (
                                <div className="py-1 border-t border-border-subtle">
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                                        Products
                                    </p>
                                    {searching && products.length === 0 && (
                                        <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Searching...
                                        </div>
                                    )}
                                    {products.map((product) => {
                                        const ident = product.slug || product.product_id;
                                        const idx = allResults.findIndex(r => r.type === 'product' && r.id === product.product_id);
                                        return (
                                            <button
                                                key={product.product_id}
                                                onClick={() => handleSelectProduct(ident)}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={`flex items-center gap-3 w-full px-4 py-2 text-left transition-colors ${activeIndex === idx
                                                    ? 'bg-gold/[0.08]'
                                                    : 'hover:bg-gold/[0.04]'
                                                    }`}
                                            >
                                                <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {product.images && product.images.length > 0 ? (
                                                        <img src={product.images[0]} alt="" className="h-8 w-8 rounded-lg object-cover" />
                                                    ) : (
                                                        <Package className="h-3.5 w-3.5 text-text-muted" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-text-primary truncate">{product.product_name}</p>
                                                    <p className="text-[11px] text-text-muted truncate">
                                                        {[product.sku, product.brand, product.category].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                                {product.price != null && (
                                                    <span className="text-xs font-semibold text-gold flex-shrink-0">
                                                        {formatINR(product.price)}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Empty state */}
                            {!searching && filteredPages.length === 0 && synonyms.length === 0 && products.length === 0 && query.trim().length >= 2 && (
                                <div className="px-4 py-6 text-center text-sm text-text-muted">
                                    No results found for &ldquo;{query}&rdquo;
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right section */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:text-gold hover:bg-gold/[0.06] transition-all duration-300"
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                    </button>
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => setNotifOpen(!notifOpen)}
                            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:text-gold hover:bg-gold/[0.06] transition-all duration-300"
                        >
                            <Bell className="h-[18px] w-[18px]" />
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-card-bg" />
                        </button>

                        {/* Notifications Dropdown */}
                        {notifOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card-bg-elevated shadow-2xl py-2 animate-slideDown z-50">
                                <div className="px-4 py-2 border-b border-border flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-text-primary">Alerts</h3>
                                    {(alertsData.orders + alertsData.products + alertsData.enquiries) > 0 && (
                                        <span className="text-[10px] text-gold font-medium bg-gold/10 px-2 py-0.5 rounded-full">
                                            {alertsData.orders + alertsData.products + alertsData.enquiries} New
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-[300px] overflow-y-auto divide-y divide-border-subtle">
                                    {alertsData.orders > 0 && (
                                        <div className="px-4 py-3 hover:bg-gold/[0.03] transition-colors cursor-pointer group">
                                            <div className="flex gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                                                    <ShoppingCart className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-text-primary group-hover:text-gold transition-colors">Order Management</p>
                                                    <p className="text-[11px] text-text-secondary mt-0.5 leading-tight">You have {alertsData.orders} pending overall order(s) awaiting fulfillment.</p>
                                                    <p className="text-[9px] text-text-muted mt-1">Just now</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {alertsData.products > 0 && (
                                        <div className="px-4 py-3 hover:bg-gold/[0.03] transition-colors cursor-pointer group">
                                            <div className="flex gap-3">
                                                <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                                                    <Package className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-text-primary group-hover:text-gold transition-colors">Product Management</p>
                                                    <p className="text-[11px] text-text-secondary mt-0.5 leading-tight">You have {alertsData.products} product(s) running low on stock.</p>
                                                    <p className="text-[9px] text-text-muted mt-1">Just now</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {alertsData.enquiries > 0 && (
                                        <div className="px-4 py-3 hover:bg-gold/[0.03] transition-colors cursor-pointer group">
                                            <div className="flex gap-3">
                                                <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-text-primary group-hover:text-gold transition-colors">Customer Enquiries</p>
                                                    <p className="text-[11px] text-text-secondary mt-0.5 leading-tight">You have {alertsData.enquiries} new customer enquiry/enquiries.</p>
                                                    <p className="text-[9px] text-text-muted mt-1">Just now</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {alertsData.orders === 0 && alertsData.products === 0 && alertsData.enquiries === 0 && (
                                        <div className="px-4 py-6 text-center text-xs text-text-muted">
                                            No new alerts at this time.
                                        </div>
                                    )}
                                </div>
                                <div className="px-4 py-2 border-t border-border text-center">
                                    <Link
                                        href="/dashboard/alerts"
                                        className="text-xs text-gold hover:text-gold-soft transition-colors font-medium"
                                        onClick={() => setNotifOpen(false)}
                                    >
                                        View All Alerts
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="hidden sm:block h-8 w-px bg-border mx-1" />
                    <div ref={dropdownRef} className="relative">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gold/[0.06] transition-all duration-300"
                        >
                            <div className="h-9 w-9 rounded-full bg-[#828B5C] flex items-center justify-center text-[#E8D8B9] text-xs font-bold border border-white/20 shadow-lg">
                                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                            <ChevronDown className={`hidden sm:block h-3.5 w-3.5 text-text-muted transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {profileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card-bg-elevated shadow-2xl py-1 animate-slideDown z-50">
                                <div className="px-3 py-2 border-b border-border">
                                    <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                                </div>
                                <Link
                                    href="/dashboard/settings"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-gold hover:bg-gold/[0.06] transition-all duration-300"
                                    onClick={() => setProfileOpen(false)}
                                >
                                    <User className="h-4 w-4" /> Profile
                                </Link>
                                <button
                                    onClick={logout}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/[0.08] transition-all duration-300"
                                >
                                    <LogOut className="h-4 w-4" /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
