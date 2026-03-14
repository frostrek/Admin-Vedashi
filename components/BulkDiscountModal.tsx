import { authFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import { X, Percent, Calendar, Tag, Layers, Star, ChevronDown, Loader2, ArrowUpCircle, ArrowDownCircle, DollarSign, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getToken } from '@/lib/auth';
import { getProducts, Product } from '@/lib/api';

interface BulkDiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: () => void;
}

type TargetType = 'category' | 'sub_category' | 'brand' | 'all';
type BulkActionType = 'discount' | 'pricing';
type AdjustmentMode = 'increase' | 'decrease';
type ValueType = 'percentage' | 'amount';

interface ActiveDiscount {
    type: TargetType;
    value: string;
    variant_count: string | number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function BulkDiscountModal({ isOpen, onClose, onApply }: BulkDiscountModalProps) {
    // Lock background scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const [activeTab, setActiveTab] = useState<BulkActionType>('discount');

    // Common State
    const [targetType, setTargetType] = useState<TargetType>('category');
    const [targetValue, setTargetValue] = useState('');
    const [loading, setLoading] = useState(false);

    // Dropdown options state
    const [categories, setCategories] = useState<string[]>([]);
    const [subCategories, setSubCategories] = useState<string[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Discount State
    const [discountPercentage, setDiscountPercentage] = useState<string>('');
    const [saleStart, setSaleStart] = useState('');
    const [saleEnd, setSaleEnd] = useState('');

    // Pricing State
    const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('increase');
    const [valueType, setValueType] = useState<ValueType>('percentage');
    const [priceValue, setPriceValue] = useState<string>('');

    // Active Discounts State
    const [activeDiscounts, setActiveDiscounts] = useState<ActiveDiscount[]>([]);
    const [fetchingDiscounts, setFetchingDiscounts] = useState(false);

    const fetchActiveDiscounts = async () => {
        const token = getToken();
        if (!token) return;
        setFetchingDiscounts(true);
        try {
            const res = await authFetch(`${API_URL}/api/products/active-discounts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setActiveDiscounts(data.summary || []);
            }
        } catch (error) {
            console.error('Failed to fetch active discounts:', error);
        } finally {
            setFetchingDiscounts(false);
        }
    };

    // Fetch distinct values when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setOptionsLoading(true);
        getProducts()
            .then((products: Product[]) => {
                const cats = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
                const subs = [...new Set(products.map(p => p.sub_category).filter(Boolean))] as string[];
                const brs = [...new Set(products.map(p => p.brand).filter(Boolean))] as string[];
                setCategories(cats.sort());
                setSubCategories(subs.sort());
                setBrands(brs.sort());
            })
            .catch(() => {
                toast.error('Failed to load product options.');
            })
            .finally(() => setOptionsLoading(false));

        fetchActiveDiscounts();
    }, [isOpen]);

    // Reset targetValue when targetType changes
    useEffect(() => {
        setTargetValue('');
        setDropdownOpen(false);
    }, [targetType]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = () => setDropdownOpen(false);
        if (dropdownOpen) {
            document.addEventListener('click', handler);
            return () => document.removeEventListener('click', handler);
        }
    }, [dropdownOpen]);

    if (!isOpen) return null;

    const getOptionsForTargetType = (): string[] => {
        switch (targetType) {
            case 'category': return categories;
            case 'sub_category': return subCategories;
            case 'brand': return brands;
            default: return [];
        }
    };

    const handleDiscountSubmit = async (action: 'apply' | 'remove', overrideTargetType?: TargetType, overrideTargetValue?: string) => {
        const payloadTargetType = overrideTargetType || targetType;
        const payloadTargetValue = overrideTargetType ? overrideTargetValue : targetValue;

        let pct: number | undefined;
        if (action === 'apply') {
            pct = parseInt(discountPercentage);
            if (isNaN(pct) || pct < 1 || pct > 99) {
                toast.error('Discount percentage must be between 1 and 99.');
                return false;
            }

            if (saleStart && saleEnd && new Date(saleStart) >= new Date(saleEnd)) {
                toast.error('Sale end date must be after the start date.');
                return false;
            }
        }

        const token = getToken();
        if (!token) {
            toast.error('You are not logged in. Please re-login.');
            return false;
        }

        setLoading(true);
        try {
            const response = await authFetch(`${API_URL}/api/products/bulk-discount`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetType: payloadTargetType,
                    targetValue: payloadTargetType === 'all' ? undefined : payloadTargetValue?.trim(),
                    discountPercentage: pct,
                    saleStart: saleStart ? new Date(saleStart).toISOString() : undefined,
                    saleEnd: saleEnd ? new Date(saleEnd).toISOString() : undefined,
                    action
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || (action === 'apply' ? 'Bulk discount applied successfully!' : 'Bulk discount removed successfully!'));
                return true;
            } else {
                toast.error(data.message || (action === 'apply' ? 'Failed to apply bulk discount.' : 'Failed to remove bulk discount.'));
                return false;
            }
        } catch (error) {
            console.error('Bulk discount error:', error);
            toast.error('An error occurred while applying the discount.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handlePricingSubmit = async () => {
        const val = parseFloat(priceValue);
        if (isNaN(val) || val <= 0) {
            toast.error('Please enter a valid amount or percentage greater than 0.');
            return false;
        }

        const token = getToken();
        if (!token) {
            toast.error('You are not logged in. Please re-login.');
            return false;
        }

        setLoading(true);
        try {
            const response = await authFetch(`${API_URL}/api/products/bulk-pricing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetType,
                    targetValue: targetType === 'all' ? undefined : targetValue.trim(),
                    adjustmentMode,
                    valueType,
                    value: val,
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Bulk pricing applied successfully!');
                return true;
            } else {
                toast.error(data.message || 'Failed to apply bulk pricing.');
                return false;
            }
        } catch (error) {
            console.error('Bulk pricing error:', error);
            toast.error('An error occurred while applying the pricing update.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent | undefined, action: 'apply' | 'remove' = 'apply') => {
        if (e) e.preventDefault();

        if (targetType !== 'all' && !targetValue.trim()) {
            toast.error('Please select a target value.');
            return;
        }

        let success = false;
        if (activeTab === 'discount') {
            success = await handleDiscountSubmit(action);
        } else {
            success = await handlePricingSubmit();
        }

        if (success) {
            // Reset form
            setTargetType('category');
            setTargetValue('');
            setDiscountPercentage('');
            setSaleStart('');
            setSaleEnd('');
            setPriceValue('');
            if (activeTab === 'discount') {
                fetchActiveDiscounts();
            } else {
                onApply();
                onClose();
            }
        }
    };

    const handleRemoveSpecificDiscount = async (type: TargetType, value: string) => {
        const success = await handleDiscountSubmit('remove', type, value);
        if (success) {
            fetchActiveDiscounts();
        }
    };

    const options = getOptionsForTargetType();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-card-bg border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-visible flex flex-col max-h-[90vh]"
                style={{ animation: 'scaleUp 0.2s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-gold">Bulk Actions</h2>
                        <p className="text-xs text-text-muted mt-1">
                            Apply bulk discounts or update base pricing across multiple products.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-white transition-colors"
                        disabled={loading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border shrink-0 px-6 pt-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('discount')}
                        className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'discount'
                            ? 'text-gold border-gold'
                            : 'text-text-secondary border-transparent hover:text-gold-soft'
                            }`}
                    >
                        Bulk Discount
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('pricing')}
                        className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'pricing'
                            ? 'text-gold border-gold'
                            : 'text-text-secondary border-transparent hover:text-gold-soft'
                            }`}
                    >
                        Bulk Pricing
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto hidden-scrollbar">

                    {/* Target Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Action Target
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {([
                                { value: 'category', label: 'Category', icon: Layers },
                                { value: 'sub_category', label: 'Subcategory', icon: Layers },
                                { value: 'brand', label: 'Brand', icon: Star },
                                { value: 'all', label: 'All Products', icon: Tag },
                            ] as const).map(({ value, label, icon: Icon }) => (
                                <label
                                    key={value}
                                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${targetType === value
                                        ? 'border-gold bg-gold/10 text-gold'
                                        : 'border-border bg-page-bg text-text-secondary hover:border-gold/50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="targetType"
                                        value={value}
                                        checked={targetType === value}
                                        onChange={() => setTargetType(value)}
                                        className="hidden"
                                    />
                                    <Icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Target Value Dropdown */}
                    {targetType !== 'all' && (
                        <div className="relative">
                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                {targetType === 'category' ? 'Category' : targetType === 'sub_category' ? 'Subcategory' : 'Brand'}
                                <span className="text-red-500 ml-0.5">*</span>
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDropdownOpen(!dropdownOpen);
                                    }}
                                    className="w-full flex items-center justify-between rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-left focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 transition-colors"
                                >
                                    <span className={targetValue ? 'text-text-primary' : 'text-text-muted'}>
                                        {targetValue || `Select ${targetType === 'category' ? 'a category' : targetType === 'sub_category' ? 'a subcategory' : 'a brand'}...`}
                                    </span>
                                    {optionsLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                                    ) : (
                                        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {/* Dropdown list */}
                                {dropdownOpen && options.length > 0 && (
                                    <div className="absolute z-[70] w-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card-bg shadow-xl">
                                        {options.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTargetValue(opt);
                                                    setDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gold/10 transition-colors ${targetValue === opt
                                                    ? 'bg-gold/10 text-gold font-medium'
                                                    : 'text-text-primary'
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {dropdownOpen && options.length === 0 && !optionsLoading && (
                                    <div className="absolute z-[70] w-full mt-1 rounded-lg border border-border bg-card-bg shadow-xl p-3 text-center text-sm text-text-muted">
                                        No options found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <hr className="border-border" />

                    {activeTab === 'discount' && (
                        <div className="space-y-4 animate-fadeIn">
                            {/* Discount Percentage */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Discount Percentage <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <input
                                        type="number"
                                        required={activeTab === 'discount'}
                                        min="1"
                                        max="99"
                                        value={discountPercentage}
                                        onChange={(e) => setDiscountPercentage(e.target.value)}
                                        placeholder="e.g. 15"
                                        className="w-full rounded-lg border border-border bg-page-bg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                    />
                                </div>
                            </div>

                            {/* Date Pickers */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="bulk-sale-start" className="block text-sm font-medium text-text-secondary mb-1">
                                        Sale Start <span className="text-text-muted text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        id="bulk-sale-start"
                                        type="date"
                                        value={saleStart}
                                        onChange={(e) => setSaleStart(e.target.value)}
                                        className="w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="bulk-sale-end" className="block text-sm font-medium text-text-secondary mb-1">
                                        Sale End <span className="text-text-muted text-xs">(Optional)</span>
                                    </label>
                                    <input
                                        id="bulk-sale-end"
                                        type="date"
                                        value={saleEnd}
                                        onChange={(e) => setSaleEnd(e.target.value)}
                                        min={saleStart || undefined}
                                        className="w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Active Discounts List */}
                            {(activeDiscounts.length > 0 || fetchingDiscounts) && (
                                <div className="mt-8 pt-6 border-t border-border">
                                    <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                                        Active Discounts
                                        {fetchingDiscounts && <Loader2 className="w-3 h-3 animate-spin text-text-muted" />}
                                    </h3>

                                    <div className="space-y-3 max-h-48 overflow-y-auto hidden-scrollbar pr-2">
                                        {activeDiscounts.map((discount, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card-bg border border-border shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-md bg-gold/10 text-gold flex items-center justify-center shrink-0">
                                                        <Percent className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-text-primary">
                                                            {discount.value || 'All Products'}
                                                        </h4>
                                                        <p className="text-xs text-text-muted mt-0.5">
                                                            {discount.type === 'sub_category' ? 'Subcategory' : discount.type.charAt(0).toUpperCase() + discount.type.slice(1)} • {discount.variant_count} variants
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleRemoveSpecificDiscount(discount.type, discount.value);
                                                        }}
                                                        disabled={loading}
                                                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                        title="Remove Discount"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-4 animate-fadeIn">
                            {/* Adjustment Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Adjustment Mode
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { value: 'increase', label: 'Increase Price', icon: ArrowUpCircle },
                                        { value: 'decrease', label: 'Decrease Price', icon: ArrowDownCircle },
                                    ] as const).map(({ value, label, icon: Icon }) => (
                                        <label
                                            key={value}
                                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${adjustmentMode === value
                                                ? 'border-gold bg-gold/10 text-gold'
                                                : 'border-border bg-page-bg text-text-secondary hover:border-gold/50'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="adjustmentMode"
                                                value={value}
                                                checked={adjustmentMode === value}
                                                onChange={() => setAdjustmentMode(value as AdjustmentMode)}
                                                className="hidden"
                                            />
                                            <Icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Value Type & Input */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        Value Type
                                    </label>
                                    <select
                                        value={valueType}
                                        onChange={(e) => setValueType(e.target.value as ValueType)}
                                        className="w-full rounded-lg border border-border bg-page-bg px-3 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40 cursor-pointer"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="amount">Fixed Amount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">
                                        Value <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        {valueType === 'percentage' ? (
                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                        ) : (
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                        )}
                                        <input
                                            type="number"
                                            required={activeTab === 'pricing'}
                                            min="0.01"
                                            step={valueType === 'percentage' ? '1' : '0.01'}
                                            value={priceValue}
                                            onChange={(e) => setPriceValue(e.target.value)}
                                            placeholder={valueType === 'percentage' ? "e.g. 10" : "e.g. 50000"}
                                            className="w-full rounded-lg border border-border bg-page-bg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-amber-500/80 mt-1">
                                Note: This will permanently modify the base price of all matching variants. The change is immediate.
                            </p>
                        </div>
                    )}


                    {/* Actions */}
                    <div className="flex justify-between gap-3 pt-4 shrink-0">
                        <div className="flex gap-2">
                            {activeTab === 'discount' && (
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(undefined, 'remove')}
                                    disabled={loading || (targetType !== 'all' && !targetValue.trim())}
                                    className="px-4 py-2.5 text-sm font-semibold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-lg flex items-center gap-2 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Remove Discounts
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={(e) => handleSubmit(e, 'apply')}
                                disabled={
                                    loading ||
                                    (!targetValue.trim() && targetType !== 'all') ||
                                    (activeTab === 'discount' && !discountPercentage) ||
                                    (activeTab === 'pricing' && !priceValue)
                                }
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Applying...
                                    </>
                                ) : (
                                    activeTab === 'discount' ? 'Apply Discount' : 'Update Prices'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
