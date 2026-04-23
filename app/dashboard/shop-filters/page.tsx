'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch, authHeaders } from '@/lib/api';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, X, Loader2, ChevronDown, ChevronUp,
    Save, RefreshCw, SlidersHorizontal, Eye, EyeOff,
    GripVertical, Info, Edit3, Check, Search, Filter, Layers,
    ArrowUp, ArrowDown
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────

interface FilterValue {
    value_id: number;
    attribute_id: number;
    value_name: string;
    value_slug: string;
    display_order: number;
    is_active: boolean;
}

interface FilterAttribute {
    attribute_id: number;
    attribute_name: string;
    attribute_slug: string;
    display_order: number;
    is_active: boolean;
    filter_type: string;
    values: FilterValue[];
}

interface BuiltInFilterConfig {
    enabled: boolean;
    label: string;
    display_order: number;
    description?: string;
    default_open?: boolean;
    options?: any[];
    presets?: any[];
    percentages?: number[];
    custom_countries?: any[];
    show_in_stock?: boolean;
    show_best_sellers?: boolean;
    show_new_arrivals?: boolean;
}

// ─── Shared UI ─────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, label, sub, info }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; info?: string }) => (
    <label className="flex items-center gap-3.5 cursor-pointer select-none group py-1">
        <div className={`relative w-10 h-5.5 rounded-full transition-all duration-500 flex-shrink-0 ${checked ? 'bg-[#3B5D3B] shadow-[0_0_10px_rgba(29,53,29,0.2)]' : 'bg-neutral-200'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-500 ease-out ${checked ? 'translate-x-4.5' : 'translate-x-0'}`} />
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        </div>
        <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-text-primary group-hover:text-gold transition-colors duration-300">
                {label}
                {info && (
                    <span className="relative group/info cursor-pointer inline-flex items-center">
                        <Info className="w-3.5 h-3.5 text-text-muted hover:text-gold transition-colors duration-300" />
                        <span className="absolute bottom-full left-0 origin-bottom-left mb-2 w-max max-w-xs px-3 py-2 text-[11px] text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover/info:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                            {info}
                        </span>
                    </span>
                )}
            </div>
            {sub && <p className="text-[9px] text-text-muted mt-0.5 font-bold uppercase tracking-tight">{sub}</p>}
        </div>
    </label>
);

const inputCls = "w-full rounded-xl border border-border-subtle bg-page-bg/50 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/10 transition-all duration-300 font-medium";

// ─── Main Component ────────────────────────────────────────────────

export default function ShopFiltersCMSPage() {
    // Built-in configs
    const [config, setConfig] = useState<Record<string, BuiltInFilterConfig>>({});
    const [savingConfig, setSavingConfig] = useState(false);

    // Dynamic attributes
    const [attributes, setAttributes] = useState<FilterAttribute[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAttrName, setNewAttrName] = useState('');
    const [newAttrType, setNewAttrType] = useState('checkbox');
    const [newMin, setNewMin] = useState<string>('');
    const [newMax, setNewMax] = useState<string>('');
    const [creating, setCreating] = useState(false);

    const [editingAttrId, setEditingAttrId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editingBuiltIn, setEditingBuiltIn] = useState<string | null>(null);
    const [builtInEditName, setBuiltInEditName] = useState('');

    const [addingValueFor, setAddingValueFor] = useState<number | null>(null);
    const [newValueName, setNewValueName] = useState('');
    const [creatingValue, setCreatingValue] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    // ─── Loaders ──────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Load Built-in Config
            const confRes = await authFetch(`${API_URL}/api/shop-filter-config/admin`, {
                headers: authHeaders({ 'Content-Type': 'application/json' }),
            });
            const confData = await confRes.json();
            if (confData.success) {
                setConfig(confData.data);
            }

            // Load Dynamic Attributes
            const res = await authFetch(`${API_URL}/api/filter-attributes/admin`, {
                headers: authHeaders({ 'Content-Type': 'application/json' }),
            });
            const data = await res.json();
            if (data.success) {
                const sorted = (data.data || []).sort((a: FilterAttribute, b: FilterAttribute) => a.display_order - b.display_order);
                const hydrated = await Promise.all(sorted.map(async (attr: FilterAttribute) => {
                    try {
                        const vRes = await authFetch(`${API_URL}/api/filter-attributes/admin/${attr.attribute_id}/values`, {
                            headers: authHeaders({ 'Content-Type': 'application/json' }),
                        });
                        const vData = await vRes.json();
                        return { ...attr, values: vData.success ? (vData.data || []).sort((a: FilterValue, b: FilterValue) => a.display_order - b.display_order) : [] };
                    } catch {
                        return { ...attr, values: [] };
                    }
                }));
                setAttributes(hydrated);
            }
        } catch {
            toast.error('Network error loading filters');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Lock body scroll and apply global blur when modal is open
    useEffect(() => {
        if (showCreateModal) {
            document.body.classList.add('modal-open-blur');
        } else {
            document.body.classList.remove('modal-open-blur');
        }
        return () => document.body.classList.remove('modal-open-blur');
    }, [showCreateModal]);

    // ─── Actions: Built-in Filters ─────────────────────────────────

    const handleUpdateBuiltIn = async (key: string, updates: Partial<BuiltInFilterConfig>) => {
        const current = config[key];
        const updated = { ...current, ...updates };

        try {
            const res = await authFetch(`${API_URL}/api/shop-filter-config/admin/${key}`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ value: updated }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`"${updated.label}" updated`);
                setConfig(prev => ({ ...prev, [key]: updated }));
            } else {
                toast.error(data.message || 'Failed to update');
            }
        } catch {
            toast.error('Error updating filter');
        }
    };

    // ─── Actions: Dynamic Attributes ───────────────────────────────

    const handleCreateAttribute = async () => {
        if (!newAttrName.trim()) return;
        setCreating(true);
        try {
            const res = await authFetch(`${API_URL}/api/filter-attributes/admin`, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    attribute_name: newAttrName.trim(),
                    filter_type: newAttrType,
                    min_val: newAttrType === 'range' && newMin !== '' ? Number(newMin) : null,
                    max_val: newAttrType === 'range' && newMax !== '' ? Number(newMax) : null,
                    display_order: attributes.length + 10,
                    is_active: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Dynamic attribute created');
                setShowCreateModal(false);
                setNewAttrName('');
                setNewAttrType('checkbox');
                setNewMin('');
                setNewMax('');
                await load();
            } else {
                toast.error(data.message || 'Failed to create');
            }
        } catch {
            toast.error('Error creating attribute');
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateAttribute = async (attr: FilterAttribute, updates: Partial<FilterAttribute>) => {
        try {
            const res = await authFetch(`${API_URL}/api/filter-attributes/admin/${attr.attribute_id}`, {
                method: 'PATCH',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`"${attr.attribute_name}" updated`);
                setAttributes(prev => prev.map(a => a.attribute_id === attr.attribute_id ? { ...a, ...updates } : a));
            } else {
                toast.error(data.message || 'Failed to update');
            }
        } catch {
            toast.error('Error updating attribute');
        }
    };

    const handleDeleteAttribute = async (attr: FilterAttribute) => {
        if (!confirm(`Delete filter "${attr.attribute_name}" and all its values? This cannot be undone.`)) return;
        try {
            const res = await authFetch(`${API_URL}/api/filter-attributes/admin/${attr.attribute_id}`, {
                method: 'DELETE',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Attribute deleted');
                setAttributes(prev => prev.filter(a => a.attribute_id !== attr.attribute_id));
            } else {
                toast.error(data.message || 'Failed to delete');
            }
        } catch {
            toast.error('Error deleting attribute');
        }
    };

    const handleCreateValue = async (attributeId: number) => {
        if (!newValueName.trim()) return;
        setCreatingValue(true);
        try {
            const attr = attributes.find(a => a.attribute_id === attributeId);
            const res = await authFetch(`${API_URL}/api/filter-attributes/admin/${attributeId}/values`, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    value_name: newValueName.trim(),
                    display_order: (attr?.values?.length || 0) + 1,
                    is_active: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setNewValueName('');
                setAddingValueFor(null);
                await load();
            }
        } catch {
            toast.error('Error creating value');
        } finally {
            setCreatingValue(false);
        }
    };

    const handleUpdateValue = async (valueId: number, updates: Partial<FilterValue>) => {
        try {
            const res = await authFetch(`${API_URL}/api/filter-attributes/admin/values/${valueId}`, {
                method: 'PATCH',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (data.success) {
                setAttributes(prev => prev.map(attr => ({
                    ...attr,
                    values: attr.values.map(v => v.value_id === valueId ? { ...v, ...updates } : v),
                })));
            }
        } catch {
            toast.error('Error updating value');
        }
    };

    const handleDeleteValue = async (valueId: number, valueName: string) => {
        if (!confirm(`Delete value "${valueName}"?`)) return;
        try {
            const res = await authFetch(`${API_URL}/api/filter-attributes/admin/values/${valueId}`, {
                method: 'DELETE',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
            });
            const data = await res.json();
            if (data.success) {
                setAttributes(prev => prev.map(attr => ({
                    ...attr,
                    values: attr.values.filter(v => v.value_id !== valueId),
                })));
            }
        } catch {
            toast.error('Error deleting value');
        }
    };

    // ─── Reorder Handlers ────────────────────────────────────────

    const handleReorderBuiltIn = async (key: string, direction: 'up' | 'down') => {
        const currentOrder = config[key].display_order ?? 0;
        const newOrder = direction === 'up' ? currentOrder - 10 : currentOrder + 10;

        // Optimistic UI update
        setConfig(prev => ({
            ...prev,
            [key]: { ...prev[key], display_order: newOrder }
        }));

        await handleUpdateBuiltIn(key, { display_order: newOrder });
    };

    const handleReorderDynamic = async (attrId: number, direction: 'up' | 'down') => {
        const attr = attributes.find(a => a.attribute_id === attrId);
        if (!attr) return;
        const currentOrder = attr.display_order ?? 0;
        const newOrder = direction === 'up' ? currentOrder - 10 : currentOrder + 10;

        // Optimistic UI
        setAttributes(prev => prev.map(a =>
            a.attribute_id === attrId ? { ...a, display_order: newOrder } : a
        ).sort((a, b) => a.display_order - b.display_order));

        await handleUpdateAttribute(attr, { display_order: newOrder });
    };

    // ─── Filtered View ───────────────────────────────────────────

    const builtInKeys = Object.keys(config).filter(key => key !== 'sort_options')
        .sort((a, b) => (config[a].display_order ?? 0) - (config[b].display_order ?? 0));
    const filteredBuiltIn = searchQuery
        ? builtInKeys.filter(k => config[k].label.toLowerCase().includes(searchQuery.toLowerCase()))
        : builtInKeys;

    const filteredAttributes = searchQuery
        ? attributes.filter(a => a.attribute_name.toLowerCase().includes(searchQuery.toLowerCase()))
        : attributes;

    const activeBuiltInCount = builtInKeys.filter(k => config[k].enabled).length;
    const activeDynamicCount = attributes.filter(a => a.is_active).length;

    // ─── Render ──────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#C5A46D] mx-auto mb-3" />
                    <p className="text-sm text-neutral-500">Loading shop filter configuration…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className={`space-y-4 animate-fadeIn transition-all duration-500 ${showCreateModal ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}>

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-1">
                            Shop Filter Orchestrator
                        </h1>
                        <p className="text-sm font-semibold text-black">
                            Architect the filter experience for your products page. Enable built-in filters or create dynamic attributes.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={load}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 border border-border bg-primary/10 text-[10px] font-bold uppercase text-gold-soft rounded-xl hover:bg-primary/20 transition-all duration-300"
                        >
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary border border-gold/20 text-gold text-[11px] font-bold uppercase rounded-xl hover:shadow-[0_0_20px_rgba(197,164,109,0.3)] transition-all duration-300"
                        >
                            <Plus className="w-4 h-4" /> New Dynamic Filter
                        </button>
                    </div>
                </div>

                {/* ── Stats Strip ── */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                    {[
                        { label: 'Built-in Filters', value: builtInKeys.length },
                        { label: 'Active Built-in', value: activeBuiltInCount },
                        { label: 'Dynamic Filters', value: attributes.length },
                        { label: 'Active Dynamic', value: activeDynamicCount },
                    ].map(stat => (
                        <div key={stat.label} className="bg-card-bg p-4 rounded-xl border border-border-subtle relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-neutral-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                            <p className="text-[10px] text-black/50 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-black">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Sort Options Quick Config ── */}
                {config.sort_options && (
                    <div className="animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                        <div className="bg-card-bg border border-border-subtle rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <h4 className="text-[13px] font-bold text-black tracking-tight flex items-center gap-2">
                                    Storefront Sort Menu
                                </h4>
                                <p className="text-[10px] text-black/60 mt-0.5 font-medium">Global sorting options displayed at the top of the product grid.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">{config.sort_options.options?.length || 0} Sort Keys</span>
                                <button
                                    onClick={() => handleUpdateBuiltIn('sort_options', { enabled: !config.sort_options.enabled })}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${config.sort_options.enabled ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
                                        }`}
                                >
                                    {config.sort_options.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Search ── */}
                <div className="animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search all filters…"
                            className={`${inputCls} pl-11`}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                                <X className="w-4 h-4 text-text-muted/40 hover:text-gold transition-colors" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* ── Standard Built-in Filters ── */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-3">
                            Core Built-in Filters
                        </h4>

                        {filteredBuiltIn.map((key) => {
                            const conf = config[key];
                            const isEditing = editingBuiltIn === key;

                            return (
                                <div key={key} className={`bg-white border rounded-2xl transition-all duration-500 group/card ${conf.enabled ? 'border-border-subtle shadow-sm hover:shadow-md' : 'border-border-subtle/30 opacity-70 grayscale-[0.5]'}`}>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 flex-1 mr-4">
                                                    <input
                                                        className={`${inputCls} flex-1`}
                                                        value={builtInEditName}
                                                        onChange={e => setBuiltInEditName(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateBuiltIn(key, { label: builtInEditName });
                                                                setEditingBuiltIn(null);
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => { handleUpdateBuiltIn(key, { label: builtInEditName }); setEditingBuiltIn(null); }}
                                                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setEditingBuiltIn(null)} className="p-2 rounded-lg hover:bg-page-bg text-text-muted">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h5 className="font-serif text-2xl font-bold text-black group-hover/card:text-black transition-colors duration-300">{conf.label}</h5>
                                                        <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[9px] font-black text-neutral-400 tracking-widest">SYSTEM</span>
                                                    </div>
                                                    {conf.description && <p className="text-[11px] text-black/60  mt-1.5 font-medium leading-relaxed max-w-[90%]">{conf.description}</p>}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center bg-page-bg/50 border border-border-subtle rounded-xl p-1 mr-1">
                                                    <button
                                                        onClick={() => handleReorderBuiltIn(key, 'up')}
                                                        className="p-1 rounded-lg hover:text-gold transition-colors"
                                                        title="Move up"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-[10px] font-black px-2 min-w-[28px] text-center text-text-primary">#{conf.display_order ?? 0}</span>
                                                    <button
                                                        onClick={() => handleReorderBuiltIn(key, 'down')}
                                                        className="p-1 rounded-lg hover:text-gold transition-colors"
                                                        title="Move down"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleUpdateBuiltIn(key, { enabled: !conf.enabled })}
                                                    className={`p-2.5 rounded-xl transition-all duration-300 ${conf.enabled
                                                        ? 'text-gold bg-gold/10 border border-gold/20'
                                                        : 'text-text-muted/40 bg-neutral-50 border border-transparent hover:bg-neutral-100'
                                                        }`}
                                                    title={conf.enabled ? 'Active on storefront' : 'Hidden on storefront'}
                                                >
                                                    {conf.enabled ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-3.5 border-t border-neutral-100 flex items-center justify-between">
                                            <div className="flex flex-col gap-4 flex-1">
                                                <Toggle
                                                    label="Expanded by Default"
                                                    checked={!!conf.default_open}
                                                    onChange={(v) => handleUpdateBuiltIn(key, { default_open: v })}
                                                />
                                                {key === 'availability' && (
                                                    <div className="ml-1 pl-4 border-l-2 border-gold/10 space-y-3 py-1">
                                                        <Toggle label="Show 'In Stock'" checked={!!conf.show_in_stock} onChange={v => handleUpdateBuiltIn(key, { show_in_stock: v })} />
                                                        <Toggle label="Show 'Best Sellers'" checked={!!conf.show_best_sellers} onChange={v => handleUpdateBuiltIn(key, { show_best_sellers: v })} />
                                                        <Toggle label="Show 'New Arrivals'" checked={!!conf.show_new_arrivals} onChange={v => handleUpdateBuiltIn(key, { show_new_arrivals: v })} />
                                                    </div>
                                                )}
                                            </div>

                                            {!isEditing && (
                                                <button
                                                    onClick={() => { setEditingBuiltIn(key); setBuiltInEditName(conf.label); }}
                                                    className="p-2.5 text-text-muted hover:text-gold transition-colors"
                                                    title="Rename display label"
                                                >
                                                    <Edit3 className="w-4.5 h-4.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Dynamic Filter Attributes ── */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                Dynamic Product Attributes
                            </h4>
                        </div>

                        {filteredAttributes.length === 0 ? (
                            <div className="bg-card-bg border border-border-subtle rounded-xl p-10 text-center">
                                <p className="text-black/70 font-semibold text-sm">No dynamic attributes configured</p>
                                <p className="text-black/40 text-[11px] mt-1">Create custom product attributes and assign values to them.</p>
                            </div>
                        ) : (
                            filteredAttributes.map((attr) => (
                                <div key={attr.attribute_id} className={`bg-white border rounded-2xl transition-all duration-500 group/card ${attr.is_active ? 'border-border-subtle shadow-sm hover:shadow-md' : 'border-border-subtle/30 opacity-70 grayscale-[0.5]'}`}>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            {editingAttrId === attr.attribute_id ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        className={`${inputCls} flex-1`}
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateAttribute(attr, { attribute_name: editName });
                                                                setEditingAttrId(null);
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => { handleUpdateAttribute(attr, { attribute_name: editName }); setEditingAttrId(null); }}
                                                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-serif text-2xl font-bold text-[#8B7355] group-hover/card:text-gold transition-colors duration-300">{attr.attribute_name}</h4>
                                                        <span className="px-2.5 py-0.5 rounded-full bg-gold/5 border border-gold/10 text-[9px] font-black text-gold uppercase tracking-widest">
                                                            {attr.filter_type || 'checkbox'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-text-muted mt-2 font-bold uppercase tracking-tight flex items-center gap-2">
                                                        <Layers className="w-3.5 h-3.5" />
                                                        {attr.values?.length || 0} Defined Options
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center bg-page-bg/50 border border-border-subtle rounded-xl p-1 mr-1">
                                                    <button
                                                        onClick={() => handleReorderDynamic(attr.attribute_id, 'up')}
                                                        className="p-1 rounded-lg hover:text-gold transition-colors"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-[10px] font-black px-2 min-w-[28px] text-center text-text-primary">#{attr.display_order ?? 0}</span>
                                                    <button
                                                        onClick={() => handleReorderDynamic(attr.attribute_id, 'down')}
                                                        className="p-1 rounded-lg hover:text-gold transition-colors"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleUpdateAttribute(attr, { is_active: !attr.is_active })}
                                                    className={`p-2.5 rounded-xl transition-all duration-300 ${attr.is_active
                                                        ? 'text-gold bg-gold/10 border border-gold/20'
                                                        : 'text-text-muted/40 bg-neutral-50 border border-transparent hover:bg-neutral-100'
                                                        }`}
                                                >
                                                    {attr.is_active ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteAttribute(attr)}
                                                    className="p-2.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Values Setup Area */}
                                        <div className="bg-page-bg/30 rounded-2xl p-3 border border-border-subtle/50">
                                            <div className="flex flex-wrap gap-2 text-[11px]">
                                                {attr.values && attr.values.length > 0 ? (
                                                    attr.values.map((val) => (
                                                        <div key={val.value_id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${val.is_active ? 'border-border-subtle bg-white text-text-primary shadow-sm hover:border-gold/30' : 'border-border-subtle/50 bg-neutral-50 text-text-muted opacity-50'}`}>
                                                            <span className="font-bold">{val.value_name}</span>
                                                            <button onClick={() => handleDeleteValue(val.value_id, val.value_name)} className="hover:text-red-500 transition-colors ml-0.5">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="w-full py-2 text-center">
                                                        <span className="text-[10px] text-text-muted/50 italic font-bold uppercase tracking-tighter">No configurations defined</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-border-subtle/30">
                                                {addingValueFor === attr.attribute_id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className={`${inputCls} flex-1 !py-2 !text-xs !rounded-lg`}
                                                            value={newValueName}
                                                            onChange={e => setNewValueName(e.target.value)}
                                                            placeholder="New option name..."
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') handleCreateValue(attr.attribute_id); }}
                                                        />
                                                        <button onClick={() => handleCreateValue(attr.attribute_id)} className="p-2 bg-emerald-500 text-white rounded-lg shadow-sm">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => { setAddingValueFor(null); setNewValueName(''); }} className="p-2 bg-neutral-100 text-text-muted rounded-lg">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <button
                                                            onClick={() => { setAddingValueFor(attr.attribute_id); setNewValueName(''); }}
                                                            className="flex items-center gap-2 text-[10px] font-black uppercase text-gold hover:text-gold-soft transition-all"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Append Option
                                                        </button>
                                                        {editingAttrId !== attr.attribute_id && (
                                                            <button
                                                                onClick={() => { setEditingAttrId(attr.attribute_id); setEditName(attr.attribute_name); }}
                                                                className="p-1.5 text-text-muted hover:text-gold transition-colors"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Standard Dynamic Attribute Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Global Backdrop - covers EVERYTHING since it's z-9999 */}
                    <div
                        className="fixed inset-0 bg-[#0a0a0a]/70 backdrop-blur-[12px] transition-all duration-500"
                        onClick={() => setShowCreateModal(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-lg bg-white border border-border-subtle rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                        {/* Header */}
                        <div className="px-8 pt-8 pb-6 border-b border-border-subtle flex items-center justify-between bg-white">
                            <div>
                                <h4 className="font-serif text-2xl font-bold text-gold tracking-tight">
                                    New Dynamic Filter
                                </h4>
                                <p className="text-[10px] text-text-muted mt-1 font-black uppercase tracking-[0.2em] opacity-60">Architect a custom attribute for product intent</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-gold hover:bg-gold/5 transition-all duration-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-8 bg-white">
                            {/* Attribute Name Input */}
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">
                                    Attribute Name <span className="text-danger">*</span>
                                </label>
                                <input
                                    className="w-full rounded-2xl border border-border-subtle bg-page-bg/50 px-5 py-4 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-gold/40 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all duration-300 font-medium shadow-inner"
                                    value={newAttrName}
                                    onChange={e => setNewAttrName(e.target.value)}
                                    placeholder="e.g. Size, Material, Capacity..."
                                    autoFocus
                                />
                            </div>

                            {/* Filter Type Selector */}
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">
                                    Filter Type
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full rounded-2xl border border-border-subtle bg-page-bg/50 px-5 py-4 appearance-none text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-4 focus:ring-gold/5 transition-all duration-300 font-medium cursor-pointer shadow-inner"
                                        value={newAttrType}
                                        onChange={e => setNewAttrType(e.target.value)}
                                    >
                                        <option value="checkbox">✓ Checkbox (Multi-select)</option>
                                        <option value="radio">○ Radio (Single-select)</option>
                                        <option value="dropdown">▼ Dropdown (Single-select)</option>
                                        <option value="toggle">⚲ Toggle (On/Off)</option>
                                        <option value="range">⟷ Range Slider (Numeric)</option>
                                        <option value="color_swatch">🎨 Color Swatch (Visual picker)</option>
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none opacity-50" />
                                </div>
                            </div>

                            {/* Range Inputs (Appears only if Filter Type is Range) */}
                            {newAttrType === 'range' && (
                                <div className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Min Value</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-border-subtle bg-white px-5 py-3.5 text-sm text-text-primary focus:border-gold/30 focus:outline-none transition-all font-medium"
                                            value={newMin}
                                            onChange={e => setNewMin(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Max Value</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-border-subtle bg-white px-5 py-3.5 text-sm text-text-primary focus:border-gold/30 focus:outline-none transition-all font-medium"
                                            value={newMax}
                                            onChange={e => setNewMax(e.target.value)}
                                            placeholder="1000"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 bg-page-bg/30 border-t border-border-subtle flex items-center justify-end gap-4">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-text-primary transition-all duration-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAttribute}
                                disabled={creating || !newAttrName.trim()}
                                className="flex items-center gap-2.5 px-8 py-3.5 bg-[#4a5238] border border-[#5a6345] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#3d442e] hover:shadow-[0_8px_25px_rgba(74,82,56,0.3)] disabled:opacity-40 transition-all duration-500 transform active:scale-[0.98]"
                            >
                                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {creating ? 'Architecting...' : 'Confirm Filter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                body.modal-open-blur aside,
                body.modal-open-blur .md\\:ml-72,
                body.modal-open-blur .md\\:ml-\\[68px\\] {
                    filter: blur(8px) grayscale(0.3);
                    transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>
        </div>
    );
}
