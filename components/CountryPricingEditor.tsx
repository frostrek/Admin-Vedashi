'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getProductCountryPrices,
    setProductCountryPrices,
    getCurrencyConfig,
    getProduct,
    type CountryPrice,
    type CurrencyConfigEntry,
    type Product,
} from '@/lib/api';
import { Globe, Plus, Trash2, Save, AlertTriangle, Check, Loader2, Info, ArrowRight } from 'lucide-react';

const COUNTRY_FLAGS: Record<string, string> = {
    IN: '🇮🇳', US: '🇺🇸', GB: '🇬🇧', AE: '🇦🇪', CA: '🇨🇦', AU: '🇦🇺', RU: '🇷🇺', KR: '🇰🇷',
    DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', SG: '🇸🇬', NZ: '🇳🇿', ZA: '🇿🇦', BR: '🇧🇷', MX: '🇲🇽',
    SA: '🇸🇦', MY: '🇲🇾', TH: '🇹🇭', ID: '🇮🇩', PH: '🇵🇭', VN: '🇻🇳', NG: '🇳🇬', KE: '🇰🇪',
};

interface CountryPricingEditorProps {
    productId?: string;
    defaultPriceInr?: number;
}

interface PriceRow {
    country_code: string;
    price_inr: number | string;
}

export default function CountryPricingEditor({ productId, defaultPriceInr }: CountryPricingEditorProps) {
    const [variants, setVariants] = useState<any[]>([]);
    const [rowsByVariant, setRowsByVariant] = useState<Record<string, PriceRow[]>>({});
    const [currencies, setCurrencies] = useState<CurrencyConfigEntry[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        if (!productId) {
            const configs = await getCurrencyConfig();
            setCurrencies(configs);
            setLoading(false);
            return;
        }

        try {
            const [prices, configs, product] = await Promise.all([
                getProductCountryPrices(productId),
                getCurrencyConfig(),
                getProduct(productId)
            ]);
            
            setCurrencies(configs);
            
            const fetchedVariants = product?.variants || [];
            setVariants(fetchedVariants);

            // Group prices by variant_id
            const grouped: Record<string, PriceRow[]> = {};
            fetchedVariants.forEach(v => {
                grouped[v.variant_id] = [];
            });
            
            prices.forEach(p => {
                if (p.variant_id && grouped[p.variant_id] !== undefined) {
                    grouped[p.variant_id].push({
                        country_code: p.country_code,
                        price_inr: p.price_inr,
                    });
                }
            });
            
            setRowsByVariant(grouped);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }, [productId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const addRow = (variantId: string) => {
        setRowsByVariant(prev => {
            const variantRows = prev[variantId] || [];
            const usedCodes = new Set(variantRows.map(r => r.country_code));
            const available = currencies.filter(c => !usedCodes.has(c.country_code) && c.country_code !== 'IN');
            
            if (available.length === 0) {
                setError('All configured countries already have overrides for this variant.');
                setTimeout(() => setError(''), 3000);
                return prev;
            }
            
            return {
                ...prev,
                [variantId]: [...variantRows, { country_code: available[0].country_code, price_inr: '' }]
            };
        });
    };

    const removeRow = (variantId: string, index: number) => {
        setRowsByVariant(prev => {
            const variantRows = [...(prev[variantId] || [])];
            variantRows.splice(index, 1);
            return { ...prev, [variantId]: variantRows };
        });
    };

    const updateRow = (variantId: string, index: number, field: keyof PriceRow, value: string) => {
        setRowsByVariant(prev => {
            const variantRows = [...(prev[variantId] || [])];
            variantRows[index] = { ...variantRows[index], [field]: value };
            return { ...prev, [variantId]: variantRows };
        });
    };

    const handleSave = async () => {
        let hasInvalid = false;
        let hasDuplicates = false;
        
        const payload: { variant_id: string; country_code: string; price_inr: number }[] = [];

        for (const [vId, rows] of Object.entries(rowsByVariant)) {
            const valid = rows.filter(r => r.country_code && Number(r.price_inr) > 0);
            
            if (rows.length > 0 && valid.length !== rows.length) hasInvalid = true;
            
            const codes = valid.map(r => r.country_code);
            if (new Set(codes).size !== codes.length) hasDuplicates = true;

            valid.forEach(v => {
                payload.push({ variant_id: vId, country_code: v.country_code, price_inr: Number(v.price_inr) });
            });
        }

        if (hasInvalid) {
            setError('Each row needs a country and valid INR price > 0.');
            setTimeout(() => setError(''), 4000);
            return;
        }

        if (hasDuplicates) {
            setError('Duplicate country entries detected on the same variant.');
            setTimeout(() => setError(''), 4000);
            return;
        }

        if (!productId) return;
        setSaving(true);
        setError('');
        
        const result = await setProductCountryPrices(productId, payload);

        if (result.success) {
            setSuccess('Country prices saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
            await fetchData();
        } else {
            setError(result.message || 'Failed to save country prices.');
            setTimeout(() => setError(''), 4000);
        }
        setSaving(false);
    };

    const getCurrencyInfo = (code: string) => currencies.find(c => c.country_code === code);

    if (!productId) {
        return (
            <div className="bg-white/[0.03] border border-border rounded-xl p-5 space-y-4 opacity-75">
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gold" />
                    <h4 className="font-serif text-sm font-semibold text-text-primary">Country-Specific Pricing</h4>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gold/[0.08] border border-gold/20 rounded-lg text-xs text-gold-soft">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    Please save the product first to configure per-country pricing.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-white/[0.03] border border-border rounded-xl p-6 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div className="bg-[#111] border border-border rounded-xl p-6 md:p-8 space-y-8 shadow-sm shadow-black/20 min-w-full lg:min-w-[800px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                        <Globe className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                        <h4 className="font-serif text-lg font-semibold text-text-primary">Country Pricing Overrides</h4>
                        <p className="text-xs text-text-muted mt-0.5">Manage regional INR pricing for all product variants</p>
                    </div>
                </div>
                {variants.length > 0 && (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-black bg-gold hover:bg-gold-soft rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-gold/20"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Update Storefront' : 'Save All Overrides'}
                    </button>
                )}
            </div>

            <p className="text-xs text-text-muted">
                Set custom INR prices per variant for selected countries. The storefront will automatically convert this base INR value into the local country currency.
            </p>

            {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5 flex-shrink-0" />
                    {success}
                </div>
            )}

            {variants.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl text-text-muted text-xs">
                    No variants found. A product must have at least one variant to assign country prices.
                </div>
            ) : (
                <div className="space-y-4">
                    {variants.map(variant => {
                        const vId = variant.variant_id;
                        const rows = rowsByVariant[vId] || [];
                        const usedCodes = new Set(rows.map(r => r.country_code));
                        const availableCountries = currencies.filter(c => !usedCodes.has(c.country_code) && c.country_code !== 'IN');
                        
                        return (
                            <div key={vId} className="bg-white/[0.02] border border-border rounded-xl p-4 space-y-4 overflow-hidden">
                                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                                    <div>
                                        <h5 className="font-medium text-sm text-text-primary flex items-center gap-2">
                                            {variant.variant_name} 
                                            {variant.is_default && <span className="bg-white/10 text-text-secondary text-[9px] uppercase px-1.5 py-0.5 rounded">Default</span>}
                                        </h5>
                                        <div className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                                            <span>Base Price:</span>
                                            <span className="text-white font-mono">₹{Number(variant.price).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => addRow(vId)}
                                        disabled={availableCountries.length === 0}
                                        className="flex items-center gap-1 text-[11px] font-medium text-gold-soft hover:text-gold bg-gold/10 hover:bg-gold/20 px-2.5 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Override
                                    </button>
                                </div>

                                {rows.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-[minmax(200px,2fr)_140px_minmax(160px,1.2fr)_44px] gap-6 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border/30 pb-3">
                                            <span>Country / Market</span>
                                            <span>Price (INR)</span>
                                            <span className="hidden md:block text-right">Preview Conversion</span>
                                            <span className="md:hidden text-right">Preview</span>
                                            <span></span>
                                        </div>

                                        {rows.map((row, idx) => {
                                            const currInfo = getCurrencyInfo(row.country_code);
                                            const converted = currInfo && Number(row.price_inr) > 0
                                                ? `${currInfo.currency_symbol} ${(Number(row.price_inr) * Number(currInfo.exchange_rate)).toFixed(2)}`
                                                : '—';

                                            return (
                                                <div key={idx} className="grid grid-cols-[minmax(200px,2fr)_140px_minmax(160px,1.2fr)_44px] gap-6 items-center bg-white/[0.04] border border-white/5 rounded-2xl px-4 py-4 hover:bg-white/[0.07] hover:border-gold/30 transition-all duration-300">
                                                    
                                                    {/* Country Selector - Widened and non-truncating */}
                                                    <div className="relative min-w-[180px]">
                                                        <select
                                                            value={row.country_code}
                                                            onChange={e => updateRow(vId, idx, 'country_code', e.target.value)}
                                                            className="w-full bg-[#151515] text-white border border-border/80 rounded-xl pl-4 pr-10 py-3 text-sm font-medium focus:border-gold/60 focus:ring-1 focus:ring-gold/20 focus:outline-none transition-all appearance-none cursor-pointer"
                                                        >
                                                            <option value={row.country_code} className="bg-[#151515] text-white">
                                                                {COUNTRY_FLAGS[row.country_code] || '🏳️'} {currInfo?.country_name || row.country_code}
                                                            </option>
                                                            {availableCountries.map(c => (
                                                                <option key={c.country_code} value={c.country_code} className="bg-[#151515] text-white">
                                                                    {COUNTRY_FLAGS[c.country_code] || '🏳️'} {c.country_name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-gold-soft transition-colors">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Price Input - Clean labels */}
                                                    <div className="space-y-1.5">
                                                      <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/40 text-xs font-mono select-none">₹</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={row.price_inr}
                                                            onChange={e => updateRow(vId, idx, 'price_inr', e.target.value)}
                                                            placeholder="0"
                                                            className="w-full bg-[#151515] text-white border border-border/80 rounded-xl pl-8 pr-3 py-3 text-sm font-mono focus:border-gold/60 focus:ring-1 focus:ring-gold/20 focus:outline-none transition-all"
                                                        />
                                                      </div>
                                                    </div>
                                                    
                                                    {/* Estimation Badge - Vertically center-aligned */}
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <div className="text-[13px] font-bold text-gold-soft bg-gold/10 px-4 py-2 rounded-xl border border-gold/20 shadow-inner whitespace-nowrap">
                                                            {converted}
                                                        </div>
                                                        {currInfo && (
                                                            <div className="text-[9px] text-text-muted font-medium bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                Rate: 1:{(Number(currInfo.exchange_rate)).toFixed(4)} {currInfo.currency_code}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Delete Action */}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(vId, idx)}
                                                        className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all border border-transparent hover:border-red-400/20"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-text-muted italic px-2">No overrides. Selling at base price globally.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
