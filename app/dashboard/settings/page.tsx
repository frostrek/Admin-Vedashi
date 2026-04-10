'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Shield, AlertTriangle, Eye, EyeOff, Leaf, Zap, Loader2, Save, Truck, RotateCcw, Globe } from 'lucide-react';
import { 
    getAutomationSettings, 
    updateAutomationSettings, 
    AutomationSettings, 
    getBatchSiteConfigs, 
    updateSiteConfig,
    MerchantShippingConfig,
    MerchantReturnConfig
} from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { user, deactivate } = useAdminAuth();
    const router = useRouter();

    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Automations state
    const [autoSettings, setAutoSettings] = useState<AutomationSettings>({
        setting_id: 1,
        auto_pending_to_confirmed: false,
        auto_confirm_stock_threshold: 20,
        auto_create_shipment: false,
        enable_cron_watcher: true,
        enable_realtime_polling: true,
        cron_interval_minutes: 5,
        admin_refresh_interval_seconds: 30,
        auto_assign_courier: false,
        courier_selection_logic: 'lowest_price',
        enable_shipment_cron_watcher: true,
        shipment_cron_interval_minutes: 5,
        enable_shipment_realtime_polling: true,
        shipment_refresh_interval_seconds: 30,
        auto_schedule_pickup: false,
        auto_pickup_offset_days: 0,
        new_arrival_window_days: 7,
        updated_at: ''
    });
    const [autoLoading, setAutoLoading] = useState(true);
    const [autoSaving, setAutoSaving] = useState(false);

    // Merchant settings state
    const [merchantLoading, setMerchantLoading] = useState(true);
    const [merchantSaving, setMerchantSaving] = useState(false);
    const [shippingConfig, setShippingConfig] = useState<MerchantShippingConfig>({
        is_free: true,
        handling_time_days_min: 1,
        handling_time_days_max: 2,
        transit_time_days_min: 3,
        transit_time_days_max: 5,
        currency: 'INR',
        flat_rate: 0,
        description: 'Free standard shipping on all orders.'
    });
    const [returnConfig, setReturnConfig] = useState<MerchantReturnConfig>({
        policy_days: 30,
        return_fees: 'free',
        policy_url: 'https://vedashi.com/returns',
        description: '30-day hassle-free returns.'
    });

    // Initial load
    useEffect(() => {
        const fetchSettings = async () => {
            const [autoData, merchantData] = await Promise.all([
                getAutomationSettings(),
                getBatchSiteConfigs(['merchant_shipping', 'merchant_returns'])
            ]);

            if (autoData) {
                setAutoSettings(autoData);
            }
            setAutoLoading(false);

            if (merchantData.success && merchantData.data) {
                if (merchantData.data.merchant_shipping) setShippingConfig(merchantData.data.merchant_shipping);
                if (merchantData.data.merchant_returns) setReturnConfig(merchantData.data.merchant_returns);
            }
            setMerchantLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSaveAutomations = async () => {
        setAutoSaving(true);
        const res = await updateAutomationSettings({
            auto_pending_to_confirmed: autoSettings.auto_pending_to_confirmed,
            auto_confirm_stock_threshold: autoSettings.auto_confirm_stock_threshold,
            auto_create_shipment: autoSettings.auto_create_shipment,
            enable_cron_watcher: autoSettings.enable_cron_watcher,
            enable_realtime_polling: autoSettings.enable_realtime_polling,
            cron_interval_minutes: autoSettings.cron_interval_minutes,
            admin_refresh_interval_seconds: autoSettings.admin_refresh_interval_seconds,
            auto_assign_courier: autoSettings.auto_assign_courier,
            courier_selection_logic: autoSettings.courier_selection_logic,
            enable_shipment_cron_watcher: autoSettings.enable_shipment_cron_watcher,
            shipment_cron_interval_minutes: autoSettings.shipment_cron_interval_minutes,
            enable_shipment_realtime_polling: autoSettings.enable_shipment_realtime_polling,
            shipment_refresh_interval_seconds: autoSettings.shipment_refresh_interval_seconds,
            auto_schedule_pickup: autoSettings.auto_schedule_pickup,
            auto_pickup_offset_days: autoSettings.auto_pickup_offset_days,
            new_arrival_window_days: autoSettings.new_arrival_window_days,
        });
        setAutoSaving(false);
        if (res.success && res.data) {
            setAutoSettings(res.data);
            toast.success('Automation settings saved successfully');
        } else {
            toast.error(res.message || 'Failed to save automation settings');
        }
    };

    const handleSaveMerchantSettings = async () => {
        setMerchantSaving(true);
        try {
            const [shipRes, retRes] = await Promise.all([
                updateSiteConfig('merchant_shipping', shippingConfig),
                updateSiteConfig('merchant_returns', returnConfig)
            ]);

            if (shipRes.success && retRes.success) {
                toast.success('Merchant settings saved successfully');
            } else {
                toast.error('Failed to save some merchant settings');
            }
        } catch (err) {
            toast.error('Error saving merchant settings');
        } finally {
            setMerchantSaving(false);
        }
    };

    const handleDeactivate = async () => {
        if (!password.trim()) {
            setError('Password is required');
            return;
        }
        setError('');
        setLoading(true);

        const result = await deactivate(password);

        if (result.success) {
            toast.success('Your account has been successfully deactivated.');
            router.push('/');
        } else {
            setError(result.error || 'Failed to deactivate account');
        }
        setLoading(false);
    };

    const closeModal = () => {
        setShowDeactivateModal(false);
        setPassword('');
        setError('');
        setShowPassword(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="font-serif text-2xl font-bold text-gold-soft">
                    Account Settings
                </h1>
                <p className="mt-1 text-[15px] font-semibold text-brown">
                    Manage your account preferences and security
                </p>
            </div>

            {/* Account Info Card */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 shadow-lg shadow-black/10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/20 border border-gold/10">
                        <Leaf className="h-6 w-6 text-[#E8D8B9]" />
                    </div>
                    <div>
                        <h4 className="font-serif font-semibold text-text-primary">{user?.name || 'Admin'}</h4>
                        <p className="text-sm text-text-secondary">{user?.email || '—'}</p>
                    </div>
                </div>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-text-secondary uppercase">Role</p>
                        <p className="mt-0.5 text-sm font-medium text-text-primary capitalize">{user?.role || 'admin'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-text-secondary uppercase">Status</p>
                        <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                        </span>
                    </div>
                </div>
            </div>

            {/* Manage Automations Card */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 shadow-lg shadow-black/10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/20 border border-gold/10">
                        <Zap className="h-6 w-6 text-[#E8D8B9]" />
                    </div>
                    <div>
                        <h4 className="font-serif font-semibold text-text-primary">Manage Automations</h4>
                        <p className="text-sm text-text-secondary">Automate order fulfillment flows</p>
                    </div>
                </div>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent mb-6" />

                {autoLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* ====== ORDERS SECTION AUTOMATION ====== */}
                        <div>
                            <h3 className="text-md font-bold text-gold uppercase tracking-wider mb-4 border-b border-border pb-2">Orders Section Automations</h3>
                            
                            {/* Toggle 1: Auto Confirm */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Auto Confirm Orders</h5>
                                    <p className="text-sm text-text-secondary">Automatically transition orders from Pending to Confirmed if stock requirements are met.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.auto_pending_to_confirmed}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_pending_to_confirmed: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Threshold Settings */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoSettings.auto_pending_to_confirmed ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Baseline Stock Threshold</label>
                                    <p className="text-xs text-text-secondary mb-3">If any variant in the order has stock below this baseline, the order will NOT be auto-confirmed, and you will receive a low-stock alert.</p>
                                    <input
                                        type="number"
                                        min="1"
                                        value={autoSettings.auto_confirm_stock_threshold}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_confirm_stock_threshold: parseInt(e.target.value) || 0 })}
                                        className="w-32 rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20"
                                    />
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 2: Shiprocket Auto Create */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Automatic Shiprocket Order Creation</h5>
                                    <p className="text-sm text-text-secondary">Automatically generate a Shiprocket Custom Order when an order becomes Confirmed.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.auto_create_shipment}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_create_shipment: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 3: Background Automation Cron */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Background Automation Watcher</h5>
                                    <p className="text-sm text-text-secondary">Proactively scans for Pending orders and processes them automatically based on thresholds.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_cron_watcher}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_cron_watcher: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Cron Interval Settings */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoSettings.enable_cron_watcher ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Execution Interval</label>
                                            <p className="text-xs text-text-secondary">Frequency of pending order scans.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={autoSettings.cron_interval_minutes}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, cron_interval_minutes: parseInt(e.target.value) || 1 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Minutes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 4: Dashboard Polling */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Real-time Dashboard Refresh</h5>
                                    <p className="text-sm text-text-secondary">Automatically refreshes the Orders dashboard to show new entries and status changes.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_realtime_polling}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_realtime_polling: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Polling Interval Settings */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoSettings.enable_realtime_polling ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Refresh Frequency</label>
                                            <p className="text-xs text-text-secondary">How often the orders list updates.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="5"
                                                max="300"
                                                value={autoSettings.admin_refresh_interval_seconds}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, admin_refresh_interval_seconds: parseInt(e.target.value) || 30 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Seconds</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ====== SHIPMENT PAGE AUTOMATION ====== */}
                        <div className="mt-12">
                            <h3 className="text-md font-bold text-gold uppercase tracking-wider mb-4 border-b border-border pb-2">Shipment Page Automations</h3>
                            
                            {/* Toggle 5: Automatic Courier Assigning */}
                            <div className={`flex items-start justify-between transition-opacity duration-300 ${autoSettings.auto_create_shipment ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Automatic Courier Assigning</h5>
                                    <p className="text-sm text-text-secondary">Automatically generate AWB and assign a delivery partner based on your logic when an order goes to Shiprocket.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.auto_assign_courier}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_assign_courier: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Courier Logic Settings */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoSettings.auto_create_shipment && autoSettings.auto_assign_courier ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-text-primary mb-1">Courier Selection Logic</label>
                                        <p className="text-xs text-text-secondary mb-3">Determines which delivery partner is automatically chosen.</p>
                                        
                                        <select
                                            value={autoSettings.courier_selection_logic}
                                            onChange={(e) => setAutoSettings({ ...autoSettings, courier_selection_logic: e.target.value })}
                                            className="w-full sm:w-64 rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20"
                                        >
                                            <option value="lowest_price">Select lowest pricing</option>
                                            <option value="recommended">Select Recommended</option>
                                            <option value="fastest">Select Fastest estimated delivery courier</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle: Automatic Pickup Scheduling */}
                            <div className={`flex items-start justify-between transition-opacity duration-300 ${autoSettings.auto_create_shipment && autoSettings.auto_assign_courier ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Automatically Schedule Pickup</h5>
                                    <p className="text-sm text-text-secondary">Automatically schedule a pickup with the assigned courier partner immediately after AWB assignment.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.auto_schedule_pickup || false}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, auto_schedule_pickup: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Auto Pickup Offset Settings */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoSettings.auto_create_shipment && autoSettings.auto_assign_courier && autoSettings.auto_schedule_pickup ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Pick up after</label>
                                            <p className="text-xs text-text-secondary w-64">Number of days to delay the scheduled pickup. 0 means Today, 1 means Tomorrow.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={autoSettings.auto_pickup_offset_days || 0}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, auto_pickup_offset_days: parseInt(e.target.value) || 0 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 6: Background Shipment Watcher */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Background Automation Watcher</h5>
                                    <p className="text-sm text-text-secondary">Proactively scans for unassigned new order/shipment and assign them AWB automatically.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_shipment_cron_watcher}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_shipment_cron_watcher: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Shipment Cron Interval Settings */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoSettings.enable_shipment_cron_watcher ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Execution Interval</label>
                                            <p className="text-xs text-text-secondary">Frequency of unassigned shipment scans.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={autoSettings.shipment_cron_interval_minutes}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, shipment_cron_interval_minutes: parseInt(e.target.value) || 5 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Minutes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent my-6" />

                            {/* Toggle 7: Shipment Dashboard Polling */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">Real-time Dashboard Refresh</h5>
                                    <p className="text-sm text-text-secondary">Automatically refreshes the Shipment dashboard to show new entries and status changes.</p>
                                </div>
                                <label className="relative inline-flex cursor-pointer items-center ml-4 mt-1">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={autoSettings.enable_shipment_realtime_polling}
                                        onChange={(e) => setAutoSettings({ ...autoSettings, enable_shipment_realtime_polling: e.target.checked })}
                                    />
                                    <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                </label>
                            </div>

                            {/* Shipment Polling Interval Settings */}
                            <div className={`transition-all duration-300 overflow-hidden ${autoSettings.enable_shipment_realtime_polling ? 'opacity-100 max-h-40' : 'opacity-50 max-h-0 pointer-events-none'}`}>
                                <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">Refresh Frequency</label>
                                            <p className="text-xs text-text-secondary">How often the shipment list updates.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="5"
                                                max="300"
                                                value={autoSettings.shipment_refresh_interval_seconds}
                                                onChange={(e) => setAutoSettings({ ...autoSettings, shipment_refresh_interval_seconds: parseInt(e.target.value) || 30 })}
                                                className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                            />
                                            <span className="text-xs text-text-secondary font-medium">Seconds</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ====== STORE SETTINGS ====== */}
                        <div className="mt-12">
                            <h3 className="text-md font-bold text-gold uppercase tracking-wider mb-4 border-b border-border pb-2">Store Display Settings</h3>
                            
                            {/* New Arrivals Days */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h5 className="font-serif text-[15px] font-semibold text-text-primary mb-1">New Arrivals Window</h5>
                                    <p className="text-sm text-text-secondary">Products added within this many days will automatically appear in the New Arrivals filter.</p>
                                </div>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-black/20 border border-border mt-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">Timeframe Setting</label>
                                        <p className="text-xs text-text-secondary">Default is 7 days. Changes update the storefront instantly.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={autoSettings.new_arrival_window_days}
                                            onChange={(e) => setAutoSettings({ ...autoSettings, new_arrival_window_days: parseInt(e.target.value) || 7 })}
                                            className="w-20 rounded-lg border border-border bg-card-bg px-3 py-1.5 text-sm text-text-primary text-center focus:border-gold/50 focus:outline-none"
                                        />
                                        <span className="text-xs text-text-secondary font-medium">Days</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-8 flex justify-end">
                            <button
                                onClick={handleSaveAutomations}
                                disabled={autoSaving}
                                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-light px-6 py-2.5 text-sm font-semibold text-[#E8D8B9] border border-gold/20 hover:border-gold/40 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {autoSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Automation Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Merchant & SEO Settings Card */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 shadow-lg shadow-black/10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/20 border border-gold/10">
                        <Globe className="h-6 w-6 text-[#E8D8B9]" />
                    </div>
                    <div>
                        <h4 className="font-serif font-semibold text-text-primary">Merchant & SEO Settings</h4>
                        <p className="text-sm text-text-secondary">Configure shipping and return policies for Google Merchant Center</p>
                    </div>
                </div>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent mb-6" />

                {merchantLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gold" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Shipping Policy Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Truck className="h-5 w-5 text-gold" />
                                <h3 className="text-md font-bold text-gold uppercase tracking-wider border-b border-border pb-1 flex-1">Shipping Policy (JSON-LD)</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Free Shipping</label>
                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={shippingConfig.is_free}
                                            onChange={(e) => setShippingConfig({ ...shippingConfig, is_free: e.target.checked })}
                                        />
                                        <div className="peer h-6 w-11 rounded-full bg-border/50 transition-colors peer-checked:bg-gold peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                                    </label>
                                </div>
                                {!shippingConfig.is_free && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Flat Rate (INR)</label>
                                        <input
                                            type="number"
                                            value={shippingConfig.flat_rate}
                                            onChange={(e) => setShippingConfig({ ...shippingConfig, flat_rate: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Min Handling Time (Days)</label>
                                    <input
                                        type="number"
                                        value={shippingConfig.handling_time_days_min}
                                        onChange={(e) => setShippingConfig({ ...shippingConfig, handling_time_days_min: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Max Handling Time (Days)</label>
                                    <input
                                        type="number"
                                        value={shippingConfig.handling_time_days_max}
                                        onChange={(e) => setShippingConfig({ ...shippingConfig, handling_time_days_max: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Min Transit Time (Days)</label>
                                    <input
                                        type="number"
                                        value={shippingConfig.transit_time_days_min}
                                        onChange={(e) => setShippingConfig({ ...shippingConfig, transit_time_days_min: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Max Transit Time (Days)</label>
                                    <input
                                        type="number"
                                        value={shippingConfig.transit_time_days_max}
                                        onChange={(e) => setShippingConfig({ ...shippingConfig, transit_time_days_max: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1.5">Shipping Description</label>
                                <textarea
                                    value={shippingConfig.description}
                                    onChange={(e) => setShippingConfig({ ...shippingConfig, description: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    placeholder="e.g. Free standard shipping on all orders."
                                />
                            </div>
                        </div>

                        {/* Return Policy Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <RotateCcw className="h-5 w-5 text-gold" />
                                <h3 className="text-md font-bold text-gold uppercase tracking-wider border-b border-border pb-1 flex-1">Return Policy (JSON-LD)</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Return Window (Days)</label>
                                    <input
                                        type="number"
                                        value={returnConfig.policy_days}
                                        onChange={(e) => setReturnConfig({ ...returnConfig, policy_days: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1.5">Return Fees</label>
                                    <select
                                        value={returnConfig.return_fees}
                                        onChange={(e) => setReturnConfig({ ...returnConfig, return_fees: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    >
                                        <option value="free">Free Returns</option>
                                        <option value="customer_pays">Customer Pays Shipping</option>
                                        <option value="restocking_fee">Restocking Fee Applies</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-text-primary mb-1.5">Policy URL</label>
                                <input
                                    type="url"
                                    value={returnConfig.policy_url}
                                    onChange={(e) => setReturnConfig({ ...returnConfig, policy_url: e.target.value })}
                                    className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    placeholder="https://vedashi.com/returns"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1.5">Return Policy Description</label>
                                <textarea
                                    value={returnConfig.description}
                                    onChange={(e) => setReturnConfig({ ...returnConfig, description: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-lg border border-border bg-card-bg px-4 py-2 text-sm text-text-primary focus:border-gold/50 focus:outline-none"
                                    placeholder="e.g. 30-day hassle-free returns."
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSaveMerchantSettings}
                                disabled={merchantSaving}
                                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-light px-6 py-2.5 text-sm font-semibold text-[#E8D8B9] border border-gold/20 hover:border-gold/40 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {merchantSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Merchant Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-[#7B2D3A]/30 bg-gradient-to-br from-[#2A1015]/50 to-[#1A0A0D]/50 p-6 shadow-lg shadow-black/10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B2D3A]/20 border border-[#7B2D3A]/30">
                        <Shield className="h-4.5 w-4.5 text-[#D4A0A0]" />
                    </div>
                    <div>
                        <h4 className="font-serif text-lg font-bold text-[#E8C8C8]">
                            Danger Zone
                        </h4>
                    </div>
                </div>

                <div className="h-[1px] bg-gradient-to-r from-transparent via-[#7B2D3A]/30 to-transparent mb-5" />

                <div className="space-y-4">
                    <div>
                        <h4 className="font-serif text-sm font-semibold text-text-primary">Deactivate Account</h4>
                        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
                            Deactivating your account will temporarily disable access.
                            Your data will remain safe. You can reactivate anytime by logging in again.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowDeactivateModal(true)}
                        className="rounded-lg bg-gradient-to-r from-[#7B2D3A] to-[#6A1F28] px-5 py-2.5 text-sm font-semibold text-[#E8D8B9] border border-[#9B4D5A]/30 hover:from-[#8B3D4A] hover:to-[#7B2D3A] transition-all duration-200 hover:shadow-lg hover:shadow-[#7B2D3A]/20"
                    >
                        Deactivate Account
                    </button>
                </div>
            </div>

            {/* Deactivation Confirmation Modal */}
            <ConfirmModal
                open={showDeactivateModal}
                onClose={closeModal}
                title="Deactivate Your Account"
                confirmLabel="Deactivate Account"
                cancelLabel="Keep Active"
                onConfirm={handleDeactivate}
                confirmVariant="danger"
                loading={loading}
            >
                <div className="space-y-4">
                    {/* Warning */}
                    <div className="flex items-start gap-3 rounded-lg bg-[#7B2D3A]/10 border border-[#7B2D3A]/20 p-3">
                        <AlertTriangle className="h-5 w-5 text-[#D4A0A0] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-[#D4A0A0] leading-relaxed">
                            Your account will be temporarily disabled. All active sessions will be terminated.
                            You can reactivate anytime by logging in again.
                        </p>
                    </div>

                    {/* Password field */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                            Confirm your password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter') handleDeactivate(); }}
                                className="w-full rounded-lg border border-border bg-transparent px-4 py-2.5 pr-10 text-sm text-text-primary focus:border-[#7B2D3A]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2D3A]/20 transition-all duration-200"
                                placeholder="Enter your password"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {error && (
                            <p className="mt-1.5 text-xs text-red-400">{error}</p>
                        )}
                    </div>
                </div>
            </ConfirmModal>
        </div>
    );
}
