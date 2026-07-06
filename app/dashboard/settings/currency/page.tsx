'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getCurrencyConfig,
    upsertCurrencyConfig,
    deleteCurrencyConfig,
    formatINR,
    type CurrencyConfigEntry,
} from '@/lib/api';
import { Globe, Plus, Pencil, Trash2, Save, X, RefreshCw, AlertTriangle, Check } from 'lucide-react';

const COUNTRY_FLAGS: Record<string, string> = {
    IN: '🇮🇳', US: '🇺🇸', GB: '🇬🇧', AE: '🇦🇪', CA: '🇨🇦', AU: '🇦🇺', RU: '🇷🇺', KR: '🇰🇷',
    DE: '🇩🇪', FR: '🇫🇷', JP: '🇯🇵', SG: '🇸🇬', NZ: '🇳🇿', ZA: '🇿🇦', BR: '🇧🇷', MX: '🇲🇽',
    SA: '🇸🇦', MY: '🇲🇾', TH: '🇹🇭', ID: '🇮🇩', PH: '🇵🇭', VN: '🇻🇳', NG: '🇳🇬', KE: '🇰🇪',
};

const emptyEntry: Omit<CurrencyConfigEntry, 'updated_at'> = {
    country_code: '',
    country_name: '',
    currency_code: '',
    currency_symbol: '',
    exchange_rate: 0,
};

export default function CurrencySettingsPage() {
    const [configs, setConfigs] = useState<CurrencyConfigEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState(emptyEntry);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        const data = await getCurrencyConfig();
        setConfigs(data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    const handleEdit = (entry: CurrencyConfigEntry) => {
        setEditingCode(entry.country_code);
        setFormData({
            country_code: entry.country_code,
            country_name: entry.country_name,
            currency_code: entry.currency_code,
            currency_symbol: entry.currency_symbol,
            exchange_rate: Number(entry.exchange_rate),
        });
        setShowAddForm(false);
        setError('');
    };

    const handleAdd = () => {
        setShowAddForm(true);
        setEditingCode(null);
        setFormData({ ...emptyEntry });
        setError('');
    };

    const handleCancel = () => {
        setShowAddForm(false);
        setEditingCode(null);
        setFormData({ ...emptyEntry });
        setError('');
    };

    const handleSave = async () => {
        if (!formData.country_code || formData.country_code.length !== 2) {
            setError('Country code must be exactly 2 letters.');
            return;
        }
        if (!formData.country_name || !formData.currency_code || !formData.currency_symbol) {
            setError('All fields are required.');
            return;
        }
        if (Number(formData.exchange_rate) <= 0) {
            setError('Exchange rate must be greater than zero.');
            return;
        }

        setSaving(true);
        setError('');
        const result = await upsertCurrencyConfig({
            ...formData,
            country_code: formData.country_code.toUpperCase(),
            currency_code: formData.currency_code.toUpperCase(),
        });

        if (result.success) {
            setSuccess(editingCode ? 'Updated successfully!' : 'Added successfully!');
            setTimeout(() => setSuccess(''), 3000);
            handleCancel();
            await fetchConfigs();
        } else {
            setError(result.message || 'Failed to save.');
        }
        setSaving(false);
    };

    const handleDelete = async (code: string) => {
        if (code === 'US') {
            setError('Cannot delete USD — it is the global fallback currency.');
            setTimeout(() => setError(''), 4000);
            return;
        }
        if (!confirm(`Delete the currency config for ${code}? Products with country-specific pricing for this country will lose their overrides.`)) return;

        const ok = await deleteCurrencyConfig(code);
        if (ok) {
            setSuccess('Deleted successfully!');
            setTimeout(() => setSuccess(''), 3000);
            await fetchConfigs();
        } else {
            setError('Failed to delete.');
            setTimeout(() => setError(''), 4000);
        }
    };

    const previewConversion = (rate: number) => {
        if (!rate || rate <= 0) return '';
        const converted = 1000 * rate;
        return `$1,000 ≈ ${converted.toFixed(2)}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="h-6 w-6 text-blue-600" />
                        Currency Configuration
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage country → currency → exchange rate mappings for international pricing.
                        All product prices are stored in USD and converted using these rates.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchConfigs}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Country
                    </button>
                </div>
            </div>

            {/* Status messages */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* Add/Edit Form */}
            {(showAddForm || editingCode) && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                        {editingCode ? `Edit: ${editingCode}` : 'Add New Country'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Country Code (ISO)</label>
                            <input
                                type="text"
                                maxLength={2}
                                value={formData.country_code}
                                onChange={e => setFormData(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
                                disabled={!!editingCode}
                                placeholder="US"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Country Name</label>
                            <input
                                type="text"
                                value={formData.country_name}
                                onChange={e => setFormData(prev => ({ ...prev, country_name: e.target.value }))}
                                placeholder="United States"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Currency Code</label>
                            <input
                                type="text"
                                maxLength={3}
                                value={formData.currency_code}
                                onChange={e => setFormData(prev => ({ ...prev, currency_code: e.target.value.toUpperCase() }))}
                                placeholder="USD"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Symbol</label>
                            <input
                                type="text"
                                maxLength={10}
                                value={formData.currency_symbol}
                                onChange={e => setFormData(prev => ({ ...prev, currency_symbol: e.target.value }))}
                                placeholder="$"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Exchange Rate (1 USD = ?)</label>
                            <input
                                type="number"
                                step="0.000001"
                                min="0"
                                value={formData.exchange_rate || ''}
                                onChange={e => setFormData(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) || 0 }))}
                                placeholder="0.0116"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    {formData.exchange_rate > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                            Preview: {previewConversion(formData.exchange_rate)} {formData.currency_code || '???'}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Country</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Currency</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Symbol</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Exchange Rate</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">$1,000 =</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Last Updated</th>
                                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
                            ) : configs.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No currency configurations found.</td></tr>
                            ) : configs.map(entry => (
                                <tr key={entry.country_code} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{COUNTRY_FLAGS[entry.country_code] || '🏳️'}</span>
                                            <div>
                                                <p className="font-medium text-gray-900">{entry.country_name}</p>
                                                <p className="text-xs text-gray-400">{entry.country_code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-700">{entry.currency_code}</td>
                                    <td className="px-4 py-3 text-gray-700">{entry.currency_symbol}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">{Number(entry.exchange_rate).toFixed(6)}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        {entry.currency_code === 'USD'
                                            ? '$1,000'
                                            : `${entry.currency_symbol}${(1000 * Number(entry.exchange_rate)).toFixed(2)}`
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                                        {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleEdit(entry)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            {entry.country_code !== 'US' && entry.country_code !== 'IN' && (
                                                <button
                                                    onClick={() => handleDelete(entry.country_code)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info card */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-1">How Exchange Rates Work</h4>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>All product prices are stored in USD in the database.</li>
                    <li>The exchange rate defines: <strong>1 USD = X Target Currency</strong> (e.g. 1 USD = 83.50 INR).</li>
                    <li>When a customer from a configured country visits, the USD price is multiplied by the rate and displayed in their local currency.</li>
                    <li><strong>USD is the global fallback</strong> — if a visitor&apos;s country has no config, prices display in USD.</li>
                    <li>Country-specific product price overrides (set on the product edit page) take priority over the default price before conversion.</li>
                </ul>
            </div>
        </div>
    );
}
