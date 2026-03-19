'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    getAdminLoyaltyDashboard,
    getAdminLoyaltyTiers,
    getAdminLoyaltyRules,
    getAdminLoyaltyPromotions,
    getAdminLoyaltyWallets,
    adjustAdminLoyaltyPoints,
    updateAdminLoyaltyTier,
    createAdminLoyaltyTier,
    deleteAdminLoyaltyTier,
    updateAdminLoyaltyRule,
    createAdminLoyaltyRule,
    deleteAdminLoyaltyRule,
    updateAdminLoyaltyPromotion,
    createAdminLoyaltyPromotion,
    deleteAdminLoyaltyPromotion
} from '@/lib/api';
import {
    Gift, Star, Award, TrendingUp, TrendingDown,
    Activity, Server, Database, Percent, Plus, Settings,
    Edit, Trash2, MoreVertical
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoyaltyAdminPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'tiers' | 'rules' | 'promotions' | 'wallets'>('overview');
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState<any>(null);
    const [tiers, setTiers] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [promotions, setPromotions] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    
    // Modal states
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [modalType, setModalType] = useState<'adjust' | 'tier' | 'rule' | 'promo' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Adjustment form state
    const [adjPoints, setAdjPoints] = useState<number>(0);
    const [adjReason, setAdjReason] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [dash, tData, rData, pData] = await Promise.all([
                getAdminLoyaltyDashboard(),
                getAdminLoyaltyTiers(),
                getAdminLoyaltyRules(),
                getAdminLoyaltyPromotions()
            ]);
            if (dash) setStats(dash);
            if (tData) setTiers(tData);
            if (rData) setRules(rData);
            if (pData) setPromotions(pData);
            
            const wData = await getAdminLoyaltyWallets();
            if (wData) setWallets(wData);
        } catch (error) {
            toast.error('Failed to load loyalty data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAdjustPoints = async () => {
        if (!selectedItem || adjPoints === 0) return;
        setIsProcessing(true);
        try {
            const res = await adjustAdminLoyaltyPoints(selectedItem.customer_id, adjPoints, adjReason);
            if (res.success) {
                toast.success(`Successfully adjusted points by ${adjPoints}`);
                setModalType(null);
                setSelectedItem(null);
                setAdjPoints(0);
                setAdjReason('');
                fetchData();
            } else {
                toast.error(res.message || 'Failed to adjust points');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const showAdjustModal = (wallet: any) => {
        setSelectedItem(wallet);
        setModalType('adjust');
        setAdjPoints(0);
        setAdjReason('');
    };

    const showRuleModal = (rule: any = null) => {
        setSelectedItem(rule || {
            rule_name: '',
            rule_type: 'purchase',
            points_amount: 0,
            max_points: null,
            priority: 0,
            is_active: true
        });
        setModalType('rule');
    };

    const showTierModal = (tier: any = null) => {
        setSelectedItem(tier || {
            tier_name: '',
            tier_order: 0,
            min_points: 0,
            points_multiplier: 1,
            benefits: {}
        });
        setModalType('tier');
    };

    const showPromoModal = (promo: any = null) => {
        setSelectedItem(promo || {
            promotion_name: '',
            promotion_type: 'bulk_discount',
            multiplier: 1,
            bonus_points: 0,
            starts_at: '',
            ends_at: '',
            is_active: true
        });
        setModalType('promo');
    };

    const handleDeleteTier = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tier? This may affect customers currently assigned to it.')) return;
        try {
            const res = await deleteAdminLoyaltyTier(id);
            if (res.success) {
                toast.success('Tier deleted');
                fetchData();
            } else {
                toast.error(res.message || 'Failed to delete tier');
            }
        } catch { toast.error('Error deleting tier'); }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Are you sure you want to delete this earning rule?')) return;
        try {
            const res = await deleteAdminLoyaltyRule(id);
            if (res.success) {
                toast.success('Rule deleted');
                fetchData();
            } else {
                toast.error(res.message || 'Failed to delete rule');
            }
        } catch { toast.error('Error deleting rule'); }
    };

    const handleDeletePromo = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promotion?')) return;
        try {
            const res = await deleteAdminLoyaltyPromotion(id);
            if (res.success) {
                toast.success('Promotion deleted');
                fetchData();
            } else {
                toast.error(res.message || 'Failed to delete promotion');
            }
        } catch { toast.error('Error deleting promotion'); }
    };

    const handleSaveRule = async () => {
        if (!selectedItem) return;
        setIsProcessing(true);
        try {
            const isEdit = !!selectedItem.rule_id;
            const res = isEdit 
                ? await updateAdminLoyaltyRule(selectedItem.rule_id, selectedItem)
                : await createAdminLoyaltyRule(selectedItem);
            
            if (res.success) {
                toast.success(isEdit ? 'Rule updated' : 'Rule created');
                setModalType(null);
                fetchData();
            } else {
                toast.error(res.message || 'Failed to save rule');
            }
        } catch { toast.error('Error saving rule'); }
        finally { setIsProcessing(false); }
    };

    const handleSaveTier = async () => {
        if (!selectedItem) return;
        setIsProcessing(true);
        try {
            const isEdit = !!selectedItem.tier_id;
            const res = isEdit 
                ? await updateAdminLoyaltyTier(selectedItem.tier_id, selectedItem)
                : await createAdminLoyaltyTier(selectedItem);

            if (res.success) {
                toast.success(isEdit ? 'Tier updated' : 'Tier created');
                setModalType(null);
                fetchData();
            } else {
                toast.error(res.message || 'Failed to save tier');
            }
        } catch { toast.error('Error saving tier'); }
        finally { setIsProcessing(false); }
    };

    const handleSavePromo = async () => {
        if (!selectedItem) return;
        setIsProcessing(true);
        try {
            const isEdit = !!selectedItem.promo_id;
            const res = isEdit 
                ? await updateAdminLoyaltyPromotion(selectedItem.promo_id, selectedItem)
                : await createAdminLoyaltyPromotion(selectedItem);

            if (res.success) {
                toast.success(isEdit ? 'Promotion updated' : 'Promotion created');
                setModalType(null);
                fetchData();
            } else {
                toast.error(res.message || 'Failed to save promotion');
            }
        } catch { toast.error('Error saving promotion'); }
        finally { setIsProcessing(false); }
    };

    const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num || 0);

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            {/* Header & Navigation Card */}
            <div className="bg-card-bg/60 backdrop-blur-md rounded-2xl p-6 border border-border/40 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-serif text-2xl font-bold text-gold flex items-center gap-2">
                            <Gift className="h-6 w-6" /> Loyalty & Rewards
                        </h1>
                        <p className="text-sm text-text-primary mt-1 max-w-xl font-medium">Manage tiers, points rules, and exclusive promotions with ease.</p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-border/30 gap-6 mt-6">
                    {(['overview', 'tiers', 'rules', 'promotions', 'wallets'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium transition-all relative ${activeTab === tab
                                ? 'text-gold'
                                : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gold rounded-t-full shadow-[0_0_8px_rgba(212,168,71,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                </div>
            ) : (
                <div className="mt-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && stats && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-card-bg border border-border rounded-xl p-5 hover:border-gold/30 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-text-secondary font-bold">Total Issued</p>
                                        <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-emerald-800 dark:text-text-primary mb-1 font-mono">{formatNumber(stats.stats?.total_points_issued || stats.total_points_issued)}</h3>
                                    <p className="text-xs text-text-secondary font-medium">Lifetime points credited</p>
                                </div>
                                
                                <div className="bg-card-bg border border-border rounded-xl p-5 hover:border-gold/30 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-text-secondary font-bold">Total Redeemed</p>
                                        <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-blue-800 dark:text-text-primary mb-1 font-mono">{formatNumber(stats.stats?.total_points_redeemed || stats.total_points_redeemed)}</h3>
                                    <p className="text-xs text-text-secondary font-medium">Lifetime points burnt</p>
                                </div>
                                
                                <div 
                                    onClick={() => setActiveTab('wallets')}
                                    className="bg-card-bg border border-border rounded-xl p-5 hover:border-gold/30 transition-all cursor-pointer group active:scale-[0.98]"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-text-muted font-medium group-hover:text-gold transition-colors">Active Wallets</p>
                                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20"><Database className="h-4 w-4 text-purple-400" /></div>
                                    </div>
                                    <h3 className="font-serif text-2xl font-bold text-text-primary mb-1 font-mono">{formatNumber(stats.stats?.total_wallets || stats.total_wallets)}</h3>
                                    <p className="text-xs text-text-muted">Customers with point balances</p>
                                </div>

                                <div className="bg-card-bg border border-border rounded-xl p-5 hover:border-gold/30 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-text-muted font-medium">Live Promotions</p>
                                        <div className="p-2 bg-gold/10 rounded-lg"><Percent className="h-4 w-4 text-gold" /></div>
                                    </div>
                                    <h3 className="font-serif text-2xl font-bold text-text-primary mb-1 font-mono">{stats.active_promotions}</h3>
                                    <p className="text-xs text-text-muted">Currently active campaigns</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TIERS TAB */}
                    {activeTab === 'tiers' && (
                        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-primary/10">
                                <h3 className="font-serif font-bold text-text-primary">Loyalty Tiers</h3>
                                <button 
                                    onClick={() => showTierModal()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-text-primary text-xs font-semibold rounded-lg border border-border transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> New Tier
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-text-primary bg-primary/10">
                                            <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Tier Name</th>
                                            <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Min Lifetime Pts</th>
                                            <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Multiplier</th>
                                            <th className="text-left px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Benefits</th>
                                            <th className="text-right px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tiers.map(t => (
                                            <tr key={t.tier_id} className="border-b border-border/50 hover:bg-white/5 group">
                                                <td className="px-5 py-4 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-gold/10 flex items-center justify-center border border-gold/20">
                                                        <Star className="h-4 w-4 text-gold fill-gold/20" />
                                                    </div>
                                                    <span className="font-bold text-text-primary">{t.tier_name || t.name}</span>
                                                </td>
                                                <td className="px-5 py-4 text-text-primary font-mono">{t.min_points}</td>
                                                <td className="px-5 py-4 text-emerald-400 font-bold">{t.points_multiplier || t.point_multiplier}x</td>
                                                <td className="px-5 py-4 text-text-muted text-xs truncate max-w-[200px]">
                                                    {t.benefits ? (typeof t.benefits === 'string' ? t.benefits : JSON.stringify(t.benefits)) : 'None'}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-2 transition-opacity">
                                                        <button 
                                                            onClick={() => showTierModal(t)}
                                                            className="p-1.5 hover:bg-gold/10 text-gold rounded-lg transition-colors" 
                                                            title="Edit Tier"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteTier(t.tier_id)}
                                                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" 
                                                            title="Delete Tier"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* RULES TAB */}
                    {activeTab === 'rules' && (
                        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-primary/10">
                                <h3 className="font-serif font-bold text-text-primary">Earning Rules</h3>
                                <button 
                                    onClick={() => showRuleModal()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-text-primary text-xs font-semibold rounded-lg border border-border transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> New Rule
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-text-secondary bg-primary/5">
                                            <th className="text-left px-5 py-3 font-medium">Action Type</th>
                                            <th className="text-left px-5 py-3 font-medium">Points</th>
                                            <th className="text-left px-5 py-3 font-medium">Validity Limit</th>
                                            <th className="text-left px-5 py-3 font-medium">Status</th>
                                            <th className="text-right px-5 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rules.map(r => (
                                            <tr key={r.rule_id} className="border-b border-border/50 hover:bg-white/5 group">
                                                <td className="px-5 py-4">
                                                    <span className="font-semibold text-text-primary capitalize">{((r.rule_name || r.rule_type || r.action_type || '')).replace(/_/g, ' ')}</span>
                                                </td>
                                                <td className="px-5 py-4 text-emerald-400 font-bold">
                                                    +{r.points_amount || r.points_awarded} {r.points_type === 'percentage' ? '% order value' : 'pts fixed'}
                                                </td>
                                                <td className="px-5 py-4 text-text-muted">
                                                    {r.max_points ? `Max ${r.max_points}/day` : (r.max_points_per_day ? `Max ${r.max_points_per_day}/day` : 'No daily limit')}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {r.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-2 transition-opacity">
                                                        <button 
                                                            onClick={() => showRuleModal(r)}
                                                            className="p-1.5 hover:bg-gold/10 text-gold rounded-lg transition-colors" 
                                                            title="Edit Rule"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteRule(r.rule_id)}
                                                            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" 
                                                            title="Delete Rule"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PROMOTIONS TAB */}
                    {activeTab === 'promotions' && (
                        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-primary/10">
                                <h3 className="font-serif font-bold text-text-primary">Promotional Multipliers</h3>
                                <button 
                                    onClick={() => showPromoModal()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-text-primary text-xs font-semibold rounded-lg border border-border transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> New Campaign
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-text-secondary bg-primary/5">
                                            <th className="text-left px-5 py-3 font-medium">Campaign Name</th>
                                            <th className="text-left px-5 py-3 font-medium">Multiplier / Bonus</th>
                                            <th className="text-left px-5 py-3 font-medium">Dates</th>
                                            <th className="text-left px-5 py-3 font-medium">Status</th>
                                            <th className="text-right px-5 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {promotions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-8 text-center text-text-muted">No promotions configured</td>
                                            </tr>
                                        ) : promotions.map(p => {
                                            const isActive = p.is_active && (!p.starts_at || new Date(p.starts_at) <= new Date()) && (!p.ends_at || new Date(p.ends_at) > new Date());
                                            return (
                                                <tr key={p.promo_id} className="border-b border-border/50 hover:bg-white/5 group">
                                                    <td className="px-5 py-4">
                                                        <span className="font-semibold text-text-primary">{p.promotion_name || p.name}</span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {(p.multiplier > 1) && <span className="text-emerald-400 font-bold mr-2">{p.multiplier}x Points</span>}
                                                        {p.bonus_points > 0 && <span className="text-gold font-bold">+{p.bonus_points} Bonus</span>}
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-text-muted">
                                                        <div>{p.starts_at ? new Date(p.starts_at).toLocaleDateString() : '—'} to</div>
                                                        <div>{p.ends_at ? new Date(p.ends_at).toLocaleDateString() : '—'}</div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                                            }`}>
                                                            {isActive ? 'Live' : 'Inactive/Expired'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex justify-end gap-2 transition-opacity">
                                                            <button 
                                                                onClick={() => showPromoModal(p)}
                                                                className="p-1.5 hover:bg-gold/10 text-gold rounded-lg transition-colors" 
                                                                title="Edit Campaign"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeletePromo(p.promo_id)}
                                                                className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" 
                                                                title="Delete Campaign"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* WALLETS TAB */}
                    {activeTab === 'wallets' && (
                        <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-primary/10">
                                <h3 className="font-serif font-bold text-text-primary">Customer Wallets</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-text-secondary bg-primary/5">
                                            <th className="text-left px-5 py-3 font-medium">Customer</th>
                                            <th className="text-left px-5 py-3 font-medium">Balance</th>
                                            <th className="text-left px-5 py-3 font-medium">Tier Status</th>
                                            <th className="text-left px-5 py-3 font-medium">Last Activity</th>
                                            <th className="text-right px-5 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!wallets || wallets.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-10 text-center text-text-primary font-medium">No customer wallets found</td>
                                            </tr>
                                        ) : wallets.map((w: any) => (
                                            <tr key={w.wallet_id} className="border-b border-border/50 hover:bg-gold/5 group">
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-text-primary">{w.full_name || 'Anonymous User'}</span>
                                                        <span className="text-xs text-text-primary font-medium opacity-70">{w.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-lg">
                                                        {formatNumber(w.balance)}
                                                        <span className="text-[10px] uppercase font-black tracking-tighter text-text-secondary">pts</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm" style={{ borderColor: `${w.badge_color || '#D4A847'}`, backgroundColor: `${w.badge_color || '#D4A847'}11`, color: w.badge_color || '#D4A847' }}>
                                                        {w.tier_name || 'Bronze'} Ritualist
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-text-secondary font-bold text-xs">
                                                    {w.updated_at ? new Date(w.updated_at).toLocaleDateString() : 'Never'}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button 
                                                        onClick={() => showAdjustModal(w)}
                                                        className="bg-gold/10 hover:bg-gold text-gold hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-gold/30"
                                                    >
                                                        Adjust
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ADJUST POINTS MODAL */}
            {modalType === 'adjust' && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalType(null)} />
                    <div className="relative bg-card-bg-elevated border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">
                        <div className="p-6 border-b border-border bg-primary/5">
                            <h3 className="font-serif text-xl font-bold text-gold">Manual Point Adjustment</h3>
                            <p className="text-xs text-text-muted mt-1">Adjusting balance for <span className="text-gold-soft font-bold">{selectedItem.full_name || selectedItem.email}</span></p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Point Delta (±)</label>
                                <input 
                                    type="number"
                                    value={adjPoints || 0}
                                    onChange={(e) => setAdjPoints(parseInt(e.target.value) || 0)}
                                    placeholder="Use negative for debit"
                                    className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                />
                                <p className="text-[10px] text-text-muted mt-2 italic">Current Balance: {formatNumber(selectedItem.balance)} pts</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Adjustment Reason</label>
                                <textarea 
                                    value={adjReason || ''}
                                    onChange={(e) => setAdjReason(e.target.value)}
                                    placeholder="Admin manual correction, customer service credit, etc."
                                    rows={3}
                                    className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 border-t border-border flex gap-3">
                            <button 
                                onClick={() => setModalType(null)}
                                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAdjustPoints}
                                disabled={isProcessing || adjPoints === 0}
                                className="flex-1 bg-gold hover:bg-gold-muted disabled:opacity-50 text-primary py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-gold/20 flex justify-center items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Adjustment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RULE MODAL */}
            {modalType === 'rule' && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalType(null)} />
                    <div className="relative bg-card-bg-elevated border border-gold/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">
                        <div className="p-6 border-b border-gold/10 bg-gold/5">
                            <h3 className="font-serif text-xl font-bold text-gold">{selectedItem.rule_id ? 'Edit Earning Rule' : 'Create New Rule'}</h3>
                            <p className="text-xs text-text-muted mt-1">Configure how customers earn ritual points</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Rule Name / Display Title</label>
                                    <input 
                                        type="text"
                                        value={selectedItem.rule_name || ''}
                                        onChange={(e) => setSelectedItem({...selectedItem, rule_name: e.target.value})}
                                        placeholder="e.g. Purchase Reward"
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Action Type</label>
                                    <select 
                                        value={selectedItem.rule_type || 'purchase'}
                                        onChange={(e) => setSelectedItem({...selectedItem, rule_type: e.target.value})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all"
                                    >
                                        <option value="purchase">Purchase</option>
                                        <option value="review">Review</option>
                                        <option value="signup">Signup</option>
                                        <option value="referral">Referral</option>
                                        <option value="social_share">Social Share</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Points Awarded</label>
                                    <input 
                                        type="number"
                                        value={selectedItem.points_amount || 0}
                                        onChange={(e) => setSelectedItem({...selectedItem, points_amount: parseInt(e.target.value) || 0})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Priority</label>
                                    <input 
                                        type="number"
                                        value={selectedItem.priority || 0}
                                        onChange={(e) => setSelectedItem({...selectedItem, priority: parseInt(e.target.value) || 0})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Daily Limit (Max Points)</label>
                                <input 
                                    type="number"
                                    value={selectedItem.max_points || ''}
                                    onChange={(e) => setSelectedItem({...selectedItem, max_points: parseInt(e.target.value) || null})}
                                    placeholder="No limit"
                                    className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input 
                                    type="checkbox"
                                    id="rule-active"
                                    checked={!!selectedItem.is_active}
                                    onChange={(e) => setSelectedItem({...selectedItem, is_active: e.target.checked})}
                                    className="w-4 h-4 accent-gold"
                                />
                                <label htmlFor="rule-active" className="text-sm text-text-secondary font-medium">Rule is active and currently awarding points</label>
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 border-t border-border flex gap-3">
                            <button 
                                onClick={() => setModalType(null)}
                                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveRule}
                                disabled={isProcessing}
                                className="flex-1 bg-gold hover:bg-gold-muted disabled:opacity-50 text-primary py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-gold/20 flex justify-center items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Rule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TIER MODAL */}
            {modalType === 'tier' && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalType(null)} />
                    <div className="relative bg-card-bg-elevated border border-gold/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">
                        <div className="p-6 border-b border-gold/10 bg-gold/5">
                            <h3 className="font-serif text-xl font-bold text-gold">{selectedItem.tier_id ? 'Edit Tier' : 'Create New Tier'}</h3>
                            <p className="text-xs text-text-muted mt-1">Configure status levels and point multipliers</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Tier Name</label>
                                <input 
                                    type="text"
                                    value={selectedItem.tier_name || ''}
                                    onChange={(e) => setSelectedItem({...selectedItem, tier_name: e.target.value})}
                                    placeholder="e.g. Gold Resident"
                                    className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Min Lifetime Points</label>
                                    <input 
                                        type="number"
                                        value={selectedItem.min_points || 0}
                                        onChange={(e) => setSelectedItem({...selectedItem, min_points: parseInt(e.target.value) || 0})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Point Multiplier</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={selectedItem.points_multiplier || 1}
                                        onChange={(e) => setSelectedItem({...selectedItem, points_multiplier: parseFloat(e.target.value) || 1})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Benefits (Key-Value JSON)</label>
                                <textarea 
                                    value={typeof selectedItem.benefits === 'object' ? JSON.stringify(selectedItem.benefits, null, 2) : (selectedItem.benefits || '')}
                                    onChange={(e) => {
                                        try {
                                            const val = JSON.parse(e.target.value);
                                            setSelectedItem({...selectedItem, benefits: val});
                                        } catch {
                                            setSelectedItem({...selectedItem, benefits: e.target.value});
                                        }
                                    }}
                                    rows={4}
                                    placeholder='{"free_shipping": true, "early_access": true}'
                                    className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all text-xs font-mono resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 border-t border-border flex gap-3">
                            <button 
                                onClick={() => setModalType(null)}
                                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveTier}
                                disabled={isProcessing}
                                className="flex-1 bg-gold hover:bg-gold-muted disabled:opacity-50 text-primary py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-gold/20 flex justify-center items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Tier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROMOTION MODAL */}
            {modalType === 'promo' && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalType(null)} />
                    <div className="relative bg-card-bg-elevated border border-gold/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">
                        <div className="p-6 border-b border-gold/10 bg-gold/5">
                            <h3 className="font-serif text-xl font-bold text-gold">{selectedItem.promo_id ? 'Edit Promotion' : 'Create New Promotion'}</h3>
                            <p className="text-xs text-text-muted mt-1">Setup limited-time point boosts</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Campaign Name</label>
                                <input 
                                    type="text"
                                    value={selectedItem.promotion_name || ''}
                                    onChange={(e) => setSelectedItem({...selectedItem, promotion_name: e.target.value})}
                                    placeholder="e.g. Festival Season Boost"
                                    className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Multiplier</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={selectedItem.multiplier || 1}
                                        onChange={(e) => setSelectedItem({...selectedItem, multiplier: parseFloat(e.target.value) || 1})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Bonus Points</label>
                                    <input 
                                        type="number"
                                        value={selectedItem.bonus_points || 0}
                                        onChange={(e) => setSelectedItem({...selectedItem, bonus_points: parseInt(e.target.value) || 0})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Starts At</label>
                                    <input 
                                        type="date"
                                        value={selectedItem.starts_at ? new Date(selectedItem.starts_at).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setSelectedItem({...selectedItem, starts_at: e.target.value})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">Ends At</label>
                                    <input 
                                        type="date"
                                        value={selectedItem.ends_at ? new Date(selectedItem.ends_at).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setSelectedItem({...selectedItem, ends_at: e.target.value})}
                                        className="w-full bg-primary/5 border border-border rounded-xl px-4 py-3 text-text-primary focus:border-gold outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <input 
                                    type="checkbox"
                                    id="promo-active"
                                    checked={!!selectedItem.is_active}
                                    onChange={(e) => setSelectedItem({...selectedItem, is_active: e.target.checked})}
                                    className="w-4 h-4 accent-gold"
                                />
                                <label htmlFor="promo-active" className="text-sm text-text-primary font-medium">Promotion is enabled</label>
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 border-t border-border flex gap-3">
                            <button 
                                onClick={() => setModalType(null)}
                                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSavePromo}
                                disabled={isProcessing}
                                className="flex-1 bg-gold hover:bg-gold-muted disabled:opacity-50 text-primary py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-gold/20 flex justify-center items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Promotion'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
