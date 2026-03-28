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
    <label className="flex items-center gap-4 cursor-pointer select-none p-4 bg-black/20 rounded-2xl border border-border hover:bg-black/30 transition-all duration-300">
        <div className={`relative w-12 h-6 rounded-full transition-all duration-500 flex-shrink-0 ${checked ? 'bg-gold shadow-[0_0_10px_rgba(197,164,109,0.3)]' : 'bg-border'}`}>
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-500 ease-out ${checked ? 'translate-x-6' : ''}`} />
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        </div>
        <div>
            <div className="flex items-center gap-2 text-sm font-bold text-gold-soft">
                {label}
                {info && (
                    <span className="relative group cursor-pointer inline-flex items-center font-sans tracking-normal font-medium">
                        <Info className="w-4 h-4 text-neutral-400 hover:text-gold transition-colors duration-300" />
                        <span className="absolute bottom-full left-0 origin-bottom-left mb-2 w-max max-w-xs px-3 py-2 text-xs text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                            {info}
                        </span>
                    </span>
                )}
            </div>
            {sub && <p className="text-[10px] text-text-muted mt-0.5 font-medium uppercase">{sub}</p>}
        </div>
    </label>
);

const inputCls = "w-full rounded-xl border border-border bg-black/20 px-4 py-2.5 text-sm text-gold-soft placeholder:text-text-muted/40 focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/10 transition-all duration-300 font-medium";

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
        ).sort((a,b) => a.display_order - b.display_order));

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
        <div className="p-8 max-w-5xl mx-auto space-y-10 min-h-screen">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fadeInUp">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-border shadow-lg">
                            <SlidersHorizontal className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className="font-serif text-3xl font-bold text-gold">Shop Filter Orchestrator</h1>
                    </div>
                    <p className="text-[15px] font-semibold text-brown">
                        Architect the filter experience for your /products page. Enable built-in filters like Price & Category, or create entirely new dynamic attributes.
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
            <div className="grid grid-cols-4 gap-4 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                {[
                    { label: 'Built-in Filters', value: builtInKeys.length, color: 'text-gold' },
                    { label: 'Active Built-in', value: activeBuiltInCount, color: 'text-emerald-400' },
                    { label: 'Dynamic Filters', value: attributes.length, color: 'text-sky-400' },
                    { label: 'Active Dynamic', value: activeDynamicCount, color: 'text-purple-400' },
                ].map(stat => (
                    <div key={stat.label} className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-2xl p-5 text-center">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Sort Options Quick Config ── */}
            {config.sort_options && (
                <div className="animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                    <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-2xl p-5 flex items-center justify-between">
                        <div>
                            <h3 className="font-serif text-sm font-bold text-gold uppercase flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Storefront Sort Menu
                            </h3>
                            <p className="text-xs text-text-muted mt-1">Global sorting options displayed at the top of the product grid.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] text-text-muted font-bold uppercase">{config.sort_options.options?.length || 0} Sort Keys</span>
                            <button
                                onClick={() => handleUpdateBuiltIn('sort_options', { enabled: !config.sort_options.enabled })}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                    config.sort_options.enabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Standard Built-in Filters ── */}
                <div className="space-y-4">
                    <h2 className="font-serif text-lg font-bold text-gold flex items-center gap-2 mb-6">
                        <Layers className="w-5 h-5" />
                        Core Built-in Filters
                    </h2>
                    
                    {filteredBuiltIn.map((key) => {
                        const conf = config[key];
                        const isEditing = editingBuiltIn === key;

                        return (
                            <div key={key} className={`bg-gradient-to-br from-card-bg to-card-bg-elevated border rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${conf.enabled ? 'border-border' : 'border-border/30 opacity-70'}`}>
                                <div className="px-5 py-4 flex items-center justify-between">
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
                                            <button onClick={() => setEditingBuiltIn(null)} className="p-2 rounded-lg hover:bg-white/5 text-text-muted">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-serif text-sm font-bold text-gold uppercase">{conf.label}</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-border text-[9px] font-bold text-text-muted uppercase">SYSTEM</span>
                                                <span className="px-2 py-0.5 rounded-full bg-black/20 text-[9px] font-bold text-gold/60 uppercase border border-gold/10" title="Storefront display order (lower means higher up)">Order: {conf.display_order ?? 0}</span>
                                            </div>
                                            {conf.description && <p className="text-[10px] text-text-muted mt-1">{conf.description}</p>}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleReorderBuiltIn(key, 'up')}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-gold transition-colors"
                                            title="Move up (-10)"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleReorderBuiltIn(key, 'down')}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-gold transition-colors"
                                            title="Move down (+10)"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        {!isEditing && (
                                            <button
                                                onClick={() => { setEditingBuiltIn(key); setBuiltInEditName(conf.label); }}
                                                className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-gold transition-colors"
                                                title="Rename display label"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleUpdateBuiltIn(key, { enabled: !conf.enabled })}
                                            className={`p-2 rounded-xl transition-all duration-300 ${
                                                conf.enabled
                                                    ? 'text-gold bg-primary/20 border border-gold/20'
                                                    : 'text-text-muted/40 hover:text-gold hover:bg-white/5 border border-transparent'
                                            }`}
                                            title={conf.enabled ? 'Active on storefront' : 'Hidden on storefront'}
                                        >
                                            {conf.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="px-5 pb-4 pt-2 border-t border-border/30 bg-black/10 flex flex-col gap-3">
                                    <Toggle
                                        label="Expanded by Default"
                                        checked={!!conf.default_open}
                                        onChange={(v) => handleUpdateBuiltIn(key, { default_open: v })}
                                    />
                                    {/* Additional specific built-in config triggers can go here (like Price Presets array mutator) */}
                                    {key === 'availability' && (
                                        <div className="ml-4 pl-4 border-l border-border/50 space-y-2 mt-2">
                                            <Toggle label="Show 'In Stock'" checked={!!conf.show_in_stock} onChange={v => handleUpdateBuiltIn(key, { show_in_stock: v })} />
                                            <Toggle label="Show 'Best Sellers'" checked={!!conf.show_best_sellers} onChange={v => handleUpdateBuiltIn(key, { show_best_sellers: v })} />
                                            <Toggle label="Show 'New Arrivals'" checked={!!conf.show_new_arrivals} onChange={v => handleUpdateBuiltIn(key, { show_new_arrivals: v })} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Dynamic Filter Attributes ── */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-serif text-lg font-bold text-gold flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Dynamic Product Attributes
                        </h2>
                    </div>

                    {filteredAttributes.length === 0 ? (
                        <div className="bg-gradient-to-br from-card-bg to-card-bg-elevated border border-border rounded-2xl p-10 text-center">
                            <p className="text-gold-soft font-semibold text-sm">No dynamic attributes configured</p>
                            <p className="text-text-muted text-[11px] mt-1">Create custom product attributes and assign values to them.</p>
                        </div>
                    ) : (
                        filteredAttributes.map((attr) => (
                            <div key={attr.attribute_id} className={`bg-gradient-to-br from-card-bg to-card-bg-elevated border rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${attr.is_active ? 'border-border' : 'border-border/30 opacity-70'}`}>
                                <div className="px-5 py-4 flex items-center gap-3">
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
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-serif text-sm font-bold text-gold uppercase">{attr.attribute_name}</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-primary/20 border border-border text-[9px] font-bold text-text-muted uppercase">
                                                    {attr.filter_type || 'checkbox'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-black/20 text-[9px] font-bold text-gold/60 uppercase border border-gold/10" title="Storefront display order (lower means higher up)">Order: {attr.display_order ?? 0}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => handleReorderDynamic(attr.attribute_id, 'up')}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-gold transition-colors"
                                            title="Move up (-10)"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleReorderDynamic(attr.attribute_id, 'down')}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-gold transition-colors"
                                            title="Move down (+10)"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        {editingAttrId !== attr.attribute_id && (
                                            <button
                                                onClick={() => { setEditingAttrId(attr.attribute_id); setEditName(attr.attribute_name); }}
                                                className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-gold"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleUpdateAttribute(attr, { is_active: !attr.is_active })}
                                            className={`p-2 rounded-xl transition-all duration-300 ${
                                                attr.is_active
                                                    ? 'text-gold bg-primary/20 border border-gold/20'
                                                    : 'text-text-muted/40 hover:text-gold hover:bg-white/5 border border-transparent'
                                            }`}
                                        >
                                            {attr.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAttribute(attr)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Values Setup */}
                                <div className="px-5 pb-5 border-t border-border/30 bg-black/10">
                                    <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                                        {attr.values && attr.values.length > 0 ? (
                                            attr.values.map((val) => (
                                                <div key={val.value_id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${val.is_active ? 'border-border/50 bg-black/20 text-gold-soft' : 'border-border/20 bg-black/10 text-text-muted opacity-50'}`}>
                                                    <span>{val.value_name}</span>
                                                    <button onClick={() => handleDeleteValue(val.value_id, val.value_name)} className="hover:text-red-400 ml-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-text-muted/50 italic">No values defined.</span>
                                        )}
                                    </div>

                                    {/* Add Value inline */}
                                    <div className="mt-4">
                                        {addingValueFor === attr.attribute_id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    className={`${inputCls} flex-1 !py-1.5 !text-xs`}
                                                    value={newValueName}
                                                    onChange={e => setNewValueName(e.target.value)}
                                                    placeholder="Value name..."
                                                    autoFocus
                                                    onKeyDown={e => { if (e.key === 'Enter') handleCreateValue(attr.attribute_id); }}
                                                />
                                                <button onClick={() => handleCreateValue(attr.attribute_id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => { setAddingValueFor(null); setNewValueName(''); }} className="p-1.5 hover:bg-white/5 text-text-muted rounded-lg shrink-0">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setAddingValueFor(attr.attribute_id); setNewValueName(''); }}
                                                className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-gold/60 hover:text-gold transition-all"
                                            >
                                                <Plus className="w-3 h-3" /> Append Value
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Premium Create Dynamic Attribute Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                        onClick={() => setShowCreateModal(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-gradient-to-br from-[#111] via-[#161616] to-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_0_60px_-15px_rgba(212,175,55,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Decorative Top Glow */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
                        
                        {/* Header */}
                        <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-serif text-xl font-bold bg-gradient-to-r from-gold to-yellow-200 bg-clip-text text-transparent">
                                    New Dynamic Filter
                                </h3>
                                <p className="text-text-muted text-xs mt-1">Create a custom attribute to filter products</p>
                            </div>
                            <button 
                                onClick={() => setShowCreateModal(false)} 
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all group"
                            >
                                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-8 py-8 space-y-6">
                            {/* Attribute Name Input */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    <Edit3 className="w-3.5 h-3.5 text-gold/70" />
                                    Attribute Name
                                </label>
                                <div className="relative group">
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all font-medium"
                                        value={newAttrName}
                                        onChange={e => setNewAttrName(e.target.value)}
                                        placeholder="e.g. Size, Material, Capacity..."
                                        autoFocus
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gold/0 via-gold/10 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                            </div>

                            {/* Filter Type Selector */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    <Layers className="w-3.5 h-3.5 text-gold/70" />
                                    Filter Type
                                </label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 appearance-none text-sm text-white focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all font-medium cursor-pointer"
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
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                                </div>
                            </div>

                            {/* Range Inputs (Appears only if Filter Type is Range) */}
                            {newAttrType === 'range' && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Min Value</label>
                                        <input
                                            type="number"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/50 transition-all font-medium"
                                            value={newMin}
                                            onChange={e => setNewMin(e.target.value)}
                                            placeholder="e.g. 0"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Max Value</label>
                                        <input
                                            type="number"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/50 transition-all font-medium"
                                            value={newMax}
                                            onChange={e => setNewMax(e.target.value)}
                                            placeholder="e.g. 1000"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 bg-black/20 border-t border-white/5 flex items-center gap-4">
                            <button 
                                onClick={() => setShowCreateModal(false)} 
                                className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAttribute}
                                disabled={creating || !newAttrName.trim()}
                                className="flex-1 group relative py-3.5 rounded-xl bg-gradient-to-r from-gold/80 to-yellow-600/80 hover:from-gold hover:to-yellow-500 text-black text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />} 
                                    Create Filter
                                </span>
                                {/* Hover Glow */}
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
