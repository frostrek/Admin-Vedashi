'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, Key, Loader2, RefreshCcw, Copy, Check, AlertTriangle
} from 'lucide-react';
import SortableHeader, { SortDir, compare } from '@/components/SortableHeader';
import ConfirmModal from '@/components/ConfirmModal';

import { 
    getPartnerKeys, 
    generatePartnerKey, 
    rotatePartnerKey, 
    revokePartnerKey, 
    PartnerCredential, 
    GeneratedKeyData 
} from '@/lib/api/partnerKeys';

const AVAILABLE_SCOPES = [
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'insights', label: 'Insights' }
];

function getStatus(key: PartnerCredential): { label: string; color: string } {
    if (!key.is_active && key.grace_expires_at && new Date(key.grace_expires_at) > new Date()) {
        return { label: 'Grace Period', color: 'bg-orange-500/20 text-orange-400' };
    }
    if (!key.is_active) {
        return { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400' };
    }
    if (new Date(key.expires_at) < new Date()) {
        return { label: 'Expired', color: 'bg-red-500/20 text-red-400' };
    }
    return { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' };
}

export default function PartnerKeysPage() {
    const [keys, setKeys] = useState<PartnerCredential[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Sort State
    const [sortKey, setSortKey] = useState<string | null>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Create Modal State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ label: '', scopes: ['orders'] });
    const [creating, setCreating] = useState(false);

    // Generated Key Display State
    const [generatedKey, setGeneratedKey] = useState<GeneratedKeyData | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Confirm Modals State
    const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
    const [rotateKeyId, setRotateKeyId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const loadKeys = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPartnerKeys();
            setKeys(data);
        } catch { 
            toast.error('Failed to load partner keys'); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { loadKeys(); }, [loadKeys]);

    const handleSort = (key: string, dir: SortDir) => {
        setSortKey(dir ? key : null);
        setSortDir(dir);
    };

    const sortedKeys = useMemo(() => {
        if (!sortKey || !sortDir) return keys;
        return [...keys].sort((a, b) => compare(a, b, sortKey, sortDir));
    }, [keys, sortKey, sortDir]);

    // Create Key Action
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.label.trim()) { toast.error('Label is required'); return; }
        if (createForm.scopes.length === 0) { toast.error('Select at least one scope'); return; }

        setCreating(true);
        const res = await generatePartnerKey(createForm.label, createForm.scopes);
        setCreating(false);

        if (res.success && res.data) {
            setCreateModalOpen(false);
            setGeneratedKey(res.data);
            toast.success('Partner API Key generated successfully');
            loadKeys();
        } else {
            toast.error(res.error || 'Failed to generate key');
        }
    };

    const toggleScope = (scopeId: string) => {
        setCreateForm(prev => ({
            ...prev,
            scopes: prev.scopes.includes(scopeId) 
                ? prev.scopes.filter(s => s !== scopeId)
                : [...prev.scopes, scopeId]
        }));
    };

    // Rotate Key Action
    const handleRotate = async () => {
        if (!rotateKeyId) return;
        setActionLoading(true);
        const res = await rotatePartnerKey(rotateKeyId);
        setActionLoading(false);

        if (res.success && res.data) {
            setRotateKeyId(null);
            setGeneratedKey(res.data);
            toast.success('Key rotated successfully');
            loadKeys();
        } else {
            toast.error(res.error || 'Failed to rotate key');
        }
    };

    // Revoke Key Action
    const handleRevoke = async () => {
        if (!revokeKeyId) return;
        setActionLoading(true);
        const res = await revokePartnerKey(revokeKeyId);
        setActionLoading(false);

        if (res.success) {
            setRevokeKeyId(null);
            toast.success('Key revoked successfully');
            loadKeys();
        } else {
            toast.error(res.error || 'Failed to revoke key');
        }
    };

    const copyText = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold">API & Integrations</h1>
                    <p className="text-[15px] font-semibold text-brown">Manage Partner API Keys and access scopes</p>
                </div>
                <button
                    onClick={() => {
                        setCreateForm({ label: '', scopes: ['orders'] });
                        setCreateModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Generate New Key
                </button>
            </div>

            {/* Generated Key Modal / Banner */}
            {generatedKey && (
                <div className="bg-[#1D351D]/20 border border-emerald-500/30 rounded-xl p-6 relative animate-fadeInUp">
                    <button 
                        onClick={() => setGeneratedKey(null)}
                        className="absolute top-4 right-4 text-text-muted hover:text-white text-xl leading-none"
                    >
                        &times;
                    </button>
                    <div className="flex gap-4">
                        <div className="bg-emerald-500/20 p-3 rounded-full h-fit border border-emerald-500/30">
                            <Key className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-emerald-400 mb-1">New API Key Generated</h3>
                                <p className="text-sm text-text-secondary">
                                    Copy <strong>both</strong> values below and store them securely. The API Key <strong>will never be shown again</strong>.
                                </p>
                            </div>

                            {/* Vendor ID */}
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Vendor ID</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-black/40 border border-border p-3 rounded-lg text-text-primary font-mono text-sm select-all">
                                        {generatedKey.vendor_id}
                                    </code>
                                    <button 
                                        onClick={() => copyText(generatedKey.vendor_id, 'vendor_id')}
                                        className="p-3 bg-card-bg border border-border rounded-lg hover:border-gold/40 text-text-muted hover:text-gold transition-colors flex-shrink-0 flex items-center justify-center w-12"
                                        title="Copy Vendor ID"
                                    >
                                        {copiedField === 'vendor_id' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">API Key <span className="text-red-400">(shown once)</span></label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-black/40 border border-border p-3 rounded-lg text-gold font-mono break-all text-sm select-all">
                                        {generatedKey.api_key}
                                    </code>
                                    <button 
                                        onClick={() => copyText(generatedKey.api_key, 'api_key')}
                                        className="p-3 bg-card-bg border border-border rounded-lg hover:border-gold/40 text-text-muted hover:text-gold transition-colors flex-shrink-0 flex items-center justify-center w-12"
                                        title="Copy API Key"
                                    >
                                        {copiedField === 'api_key' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : keys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-text-muted">
                        <Key className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">No partner keys generated yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-base">
                            <thead>
                                <tr className="border-b border-border text-text-muted">
                                    <SortableHeader label="Label" sortKey="label" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <SortableHeader label="Vendor ID" sortKey="vendor_id" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <th className="text-left px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Scopes</th>
                                    <SortableHeader label="Last Used" sortKey="last_used_at" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <SortableHeader label="Status" sortKey="is_active" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} />
                                    <th className="text-right px-4 py-3 font-semibold text-sm text-gold-muted uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedKeys.map(k => {
                                    const status = getStatus(k);
                                    return (
                                        <tr key={k.id} className="border-b border-border/50 hover:bg-gold/[0.03] transition-colors">
                                            <td className="px-4 py-4">
                                                <span className="font-semibold text-text-primary">{k.label}</span>
                                                <div className="text-[11px] text-text-muted mt-0.5">
                                                    Created: {new Date(k.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs text-text-secondary bg-black/20 px-2 py-1 rounded border border-border">
                                                        {k.vendor_id}
                                                    </span>
                                                    <button
                                                        onClick={() => copyText(k.vendor_id, `vid_${k.id}`)}
                                                        className="p-1 rounded hover:bg-gold/10 text-text-muted hover:text-gold transition-colors"
                                                        title="Copy Vendor ID"
                                                    >
                                                        {copiedField === `vid_${k.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 max-w-[200px]">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {k.scopes.map(scope => (
                                                        <span key={scope} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-gold-muted">
                                                            {scope}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-text-secondary">
                                                {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-4 py-4 space-y-1">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                                {status.label === 'Grace Period' && k.grace_expires_at && (
                                                    <div className="text-[10px] text-orange-400/80 pl-1">
                                                        Until {new Date(k.grace_expires_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setRotateKeyId(k.vendor_id)} 
                                                        disabled={!k.is_active}
                                                        title={k.is_active ? "Rotate Key" : "Cannot rotate inactive key"}
                                                        className="p-1.5 rounded-lg hover:bg-blue-500/10 text-text-muted hover:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <RefreshCcw className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setRevokeKeyId(k.vendor_id)} 
                                                        disabled={!k.is_active && !k.grace_expires_at}
                                                        title="Revoke Key"
                                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-card-bg border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-border bg-card-bg">
                            <h4 className="font-serif text-lg font-bold text-gold">Generate API Key</h4>
                            <button onClick={() => setCreateModalOpen(false)} className="text-text-muted hover:text-white">&times;</button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Key Label <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required
                                    value={createForm.label}
                                    onChange={e => setCreateForm({ ...createForm, label: e.target.value })}
                                    placeholder="e.g. ERP System Integration"
                                    className="w-full rounded-lg border border-border bg-page-bg px-4 py-2.5 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/40"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-3">Access Scopes <span className="text-red-500">*</span></label>
                                <div className="space-y-3 bg-page-bg p-4 rounded-lg border border-border/50">
                                    {AVAILABLE_SCOPES.map(scope => (
                                        <label key={scope.id} className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    checked={createForm.scopes.includes(scope.id)}
                                                    onChange={() => toggleScope(scope.id)}
                                                />
                                                <div className="w-5 h-5 rounded border border-border bg-card-bg flex items-center justify-center peer-checked:bg-primary peer-checked:border-primary transition-colors group-hover:border-gold/50">
                                                    {createForm.scopes.includes(scope.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-text-primary group-hover:text-gold transition-colors">{scope.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setCreateModalOpen(false)} disabled={creating}
                                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating || createForm.scopes.length === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-light text-[#E8D8B9] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : 'Generate Key'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revoke Confirmation */}
            <ConfirmModal
                open={!!revokeKeyId}
                onClose={() => setRevokeKeyId(null)}
                title="Revoke API Key"
                onConfirm={handleRevoke}
                confirmLabel="Yes, Revoke Key"
                cancelLabel="Cancel"
                confirmVariant="danger"
                loading={actionLoading}
            >
                <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                        Are you sure you want to permanently revoke this API key? 
                    </p>
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex gap-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-xs leading-relaxed">
                            Any external systems or integrations currently using this key will immediately lose access to the API and will start receiving 401 Unauthorized errors.
                        </p>
                    </div>
                </div>
            </ConfirmModal>

            {/* Rotate Confirmation */}
            <ConfirmModal
                open={!!rotateKeyId}
                onClose={() => setRotateKeyId(null)}
                title="Rotate API Key"
                onConfirm={handleRotate}
                confirmLabel="Rotate Key"
                cancelLabel="Cancel"
                confirmVariant="primary"
                loading={actionLoading}
            >
                <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                        Rotating a key will generate a completely new API credential for this integration.
                    </p>
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-blue-400">
                        <p className="text-xs leading-relaxed">
                            <strong>Grace Period:</strong> The old key will remain active for exactly <strong>7 days</strong> to give you time to update your systems. After 7 days, the old key will automatically be revoked.
                        </p>
                    </div>
                </div>
            </ConfirmModal>

        </div>
    );
}
