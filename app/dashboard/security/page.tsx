'use client';

import { useState, useEffect } from 'react';
import {
    Shield, ShieldCheck, Database, Lock, AlertTriangle,
    CheckCircle, Activity, Download, Trash2,
    RefreshCw, Clock, Server, Zap, HardDrive,
    ShieldAlert, Eye, ToggleLeft, ToggleRight, Loader2,
    KeyRound, FileJson, Unlock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    getBackups,
    createBackup,
    deleteBackup,
    decryptBackup,
    getMaintenanceStatus,
    toggleMaintenanceMode,
    BackupData,
    DecryptedBackup
} from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';

export default function SecurityDashboard() {
    const [backups, setBackups] = useState<BackupData[]>([]);
    const [loadingBackups, setLoadingBackups] = useState(true);
    const [creatingBackup, setCreatingBackup] = useState(false);

    const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
    const [maintenanceMessage, setMaintenanceMessage] = useState('');
    const [loadingMaintenance, setLoadingMaintenance] = useState(true);
    const [togglingMaintenance, setTogglingMaintenance] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
    const [deletingBackup, setDeletingBackup] = useState(false);

    const [decryptModalOpen, setDecryptModalOpen] = useState(false);
    const [backupToDecrypt, setBackupToDecrypt] = useState<string | null>(null);
    const [encryptionKey, setEncryptionKey] = useState('');
    const [decrypting, setDecrypting] = useState(false);
    const [decryptedData, setDecryptedData] = useState<DecryptedBackup | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoadingBackups(true);
        setLoadingMaintenance(true);

        try {
            const [backupsData, maintenanceData] = await Promise.all([
                getBackups(),
                getMaintenanceStatus()
            ]);

            setBackups(backupsData);
            setMaintenanceEnabled(maintenanceData.enabled);
            setMaintenanceMessage(maintenanceData.message || 'The system is undergoing maintenance. Please try again later.');
        } catch (error) {
            toast.error('Failed to load security data');
        } finally {
            setLoadingBackups(false);
            setLoadingMaintenance(false);
        }
    };

    const handleCreateBackup = async () => {
        setCreatingBackup(true);
        try {
            const success = await createBackup();
            if (success) {
                toast.success('Backup created successfully');
                const backupsData = await getBackups();
                setBackups(backupsData);
            } else {
                toast.error('Failed to create backup');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setCreatingBackup(false);
        }
    };

    const confirmDelete = (filename: string) => {
        setBackupToDelete(filename);
        setDeleteModalOpen(true);
    };

    const handleDeleteBackup = async () => {
        if (!backupToDelete) return;
        setDeletingBackup(true);

        try {
            const success = await deleteBackup(backupToDelete);
            if (success) {
                toast.success('Backup deleted');
                setBackups(backups => backups.filter(b => b.filename !== backupToDelete));
            } else {
                toast.error('Failed to delete backup');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setDeletingBackup(false);
            setDeleteModalOpen(false);
            setBackupToDelete(null);
        }
    };

    const openDecryptModal = (filename: string) => {
        setBackupToDecrypt(filename);
        setEncryptionKey('');
        setDecryptedData(null);
        setDecryptModalOpen(true);
    };

    const handleDecrypt = async () => {
        if (!backupToDecrypt || !encryptionKey) return;
        setDecrypting(true);
        setDecryptedData(null);

        try {
            const result = await decryptBackup(backupToDecrypt, encryptionKey);
            if (result.success && result.data) {
                setDecryptedData(result.data);
                toast.success('Backup decrypted successfully!');
            } else {
                toast.error(result.message || 'Decryption failed — check your key');
            }
        } catch {
            toast.error('Decryption failed');
        } finally {
            setDecrypting(false);
        }
    };

    const handleDownloadJson = () => {
        if (!decryptedData) return;
        const json = JSON.stringify(decryptedData.full_data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = decryptedData.filename.replace('.enc', '.json');
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Download started');
    };

    const handleToggleMaintenance = async () => {
        setTogglingMaintenance(true);
        try {
            const newState = !maintenanceEnabled;
            const success = await toggleMaintenanceMode(newState, newState ? maintenanceMessage : undefined);

            if (success) {
                setMaintenanceEnabled(newState);
                toast.success(`Maintenance mode ${newState ? 'enabled' : 'disabled'}`);
            } else {
                toast.error('Failed to toggle maintenance mode');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setTogglingMaintenance(false);
        }
    };

    const handleUpdateMessage = async () => {
        try {
            const success = await toggleMaintenanceMode(true, maintenanceMessage);
            if (success) {
                toast.success('Maintenance message updated');
            } else {
                toast.error('Failed to update message');
            }
        } catch {
            toast.error('An error occurred');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatRelativeTime = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        return `${diffDay}d ago`;
    };

    const defenses = [
        {
            icon: Lock,
            name: 'CSRF Protection',
            desc: 'Server-side token validation',
            color: 'emerald',
        },
        {
            icon: Shield,
            name: 'AES-256-GCM Encryption',
            desc: 'PII encrypted at rest',
            color: 'blue',
        },
        {
            icon: CheckCircle,
            name: 'Payment Idempotency',
            desc: 'UUID-tracked payment flows',
            color: 'violet',
        },
        {
            icon: Zap,
            name: 'Rate Limiting',
            desc: 'Multi-tier request throttling',
            color: 'amber',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gold-soft flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl border border-gold/20">
                            <ShieldAlert className="h-6 w-6 text-gold" />
                        </div>
                        Security & Operations
                    </h1>
                    <p className="text-text-muted mt-2 text-sm">Monitor active defenses, manage backups, and control disaster recovery</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border-subtle rounded-xl text-text-primary hover:bg-surface-hover transition-all duration-200 hover:border-gold/30 text-sm font-medium"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh All
                </button>
            </div>

            {/* Active Defenses Grid */}
            <div>
                <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gold" />
                    Active Defenses
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {defenses.map((defense) => (
                        <div
                            key={defense.name}
                            className="group bg-surface border border-border-subtle rounded-2xl p-5 hover:border-gold/20 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2.5 rounded-xl bg-${defense.color}-500/10 border border-${defense.color}-500/20`}
                                    style={{
                                        backgroundColor: defense.color === 'emerald' ? 'rgba(16,185,129,0.1)' :
                                            defense.color === 'blue' ? 'rgba(59,130,246,0.1)' :
                                                defense.color === 'violet' ? 'rgba(139,92,246,0.1)' :
                                                    'rgba(245,158,11,0.1)',
                                        borderColor: defense.color === 'emerald' ? 'rgba(16,185,129,0.2)' :
                                            defense.color === 'blue' ? 'rgba(59,130,246,0.2)' :
                                                defense.color === 'violet' ? 'rgba(139,92,246,0.2)' :
                                                    'rgba(245,158,11,0.2)',
                                    }}
                                >
                                    <defense.icon className="h-5 w-5"
                                        style={{
                                            color: defense.color === 'emerald' ? '#10B981' :
                                                defense.color === 'blue' ? '#3B82F6' :
                                                    defense.color === 'violet' ? '#8B5CF6' :
                                                        '#F59E0B'
                                        }}
                                    />
                                </div>
                                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Active
                                </span>
                            </div>
                            <h3 className="text-text-primary font-semibold text-sm">{defense.name}</h3>
                            <p className="text-text-muted text-xs mt-1">{defense.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Disaster Recovery Panel - Takes 2/5 */}
                <div className="lg:col-span-2 bg-surface border border-border-subtle rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-border-subtle bg-gradient-to-r from-surface to-surface-hover">
                        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2.5">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Disaster Recovery
                        </h2>
                        <p className="text-text-muted text-xs mt-1">Toggle maintenance mode and emergency controls</p>
                    </div>

                    <div className="p-6">
                        {/* Maintenance Mode Toggle */}
                        <div className={`rounded-xl border p-5 transition-all duration-300 ${maintenanceEnabled
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-border-subtle bg-background'
                            }`}>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Server className={`h-5 w-5 ${maintenanceEnabled ? 'text-red-500' : 'text-text-muted'}`} />
                                    <div>
                                        <h3 className="text-text-primary font-medium text-sm">Maintenance Mode</h3>
                                        <p className={`text-xs mt-0.5 ${maintenanceEnabled ? 'text-red-500' : 'text-text-muted'}`}>
                                            {maintenanceEnabled ? '⚠ Public traffic blocked (503)' : 'All systems operational'}
                                        </p>
                                    </div>
                                </div>

                                {loadingMaintenance ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                                ) : (
                                    <button
                                        onClick={handleToggleMaintenance}
                                        disabled={togglingMaintenance}
                                        className="transition-all duration-200 disabled:opacity-50"
                                        title={maintenanceEnabled ? 'Disable maintenance mode' : 'Enable maintenance mode'}
                                    >
                                        {togglingMaintenance ? (
                                            <Loader2 className="h-7 w-7 animate-spin text-gold" />
                                        ) : maintenanceEnabled ? (
                                            <ToggleRight className="h-10 w-10 text-red-500 hover:text-red-300" />
                                        ) : (
                                            <ToggleLeft className="h-10 w-10 text-text-muted hover:text-gold" />
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Message editor (always visible) */}
                            <div className="mt-3">
                                <label className="block text-xs text-text-muted mb-1.5 font-medium">
                                    {maintenanceEnabled ? 'Active message shown to visitors:' : 'Message to display when enabled:'}
                                </label>
                                <textarea
                                    value={maintenanceMessage}
                                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                                    className="w-full bg-surface border border-border-subtle rounded-lg p-3 text-text-primary text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all h-[72px] resize-none"
                                    placeholder="Enter maintenance message for customers..."
                                />
                                {maintenanceEnabled && (
                                    <button
                                        onClick={handleUpdateMessage}
                                        className="mt-2 px-4 py-1.5 text-xs font-medium bg-gold/10 border border-gold/20 text-gold rounded-lg hover:bg-gold/20 transition-all"
                                    >
                                        Update Message
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Info */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="bg-background rounded-lg border border-border-subtle p-3">
                                <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium">Emergency Backup</p>
                                <p className="text-text-primary text-sm font-semibold mt-1">On Shutdown</p>
                            </div>
                            <div className="bg-background rounded-lg border border-border-subtle p-3">
                                <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium">Auto Backup</p>
                                <p className="text-text-primary text-sm font-semibold mt-1">Daily 2 AM</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Backups Panel - Takes 3/5 */}
                <div className="lg:col-span-3 bg-surface border border-border-subtle rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-border-subtle bg-gradient-to-r from-surface to-surface-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2.5">
                                <HardDrive className="h-5 w-5 text-blue-500" />
                                Database Backups
                            </h2>
                            <p className="text-text-muted text-xs mt-1">
                                {backups.length} backup{backups.length !== 1 ? 's' : ''} stored · AES-256-GCM encrypted · 7-day retention
                            </p>
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={creatingBackup}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-[#C5A44E] hover:from-[#C5A44E] hover:to-gold text-black font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 text-sm shadow-lg shadow-gold/10"
                        >
                            {creatingBackup ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {creatingBackup ? 'Creating...' : 'New Backup'}
                        </button>
                    </div>

                    <div className="p-0">
                        {loadingBackups ? (
                            <div className="p-12 text-center text-text-muted">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-gold" />
                                <p className="text-sm">Loading backups...</p>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="p-12 text-center">
                                <Database className="h-12 w-12 text-border-subtle mx-auto mb-4" />
                                <p className="text-text-primary font-medium">No backups yet</p>
                                <p className="text-text-muted text-sm mt-1">Backups run automatically at 2:00 AM IST daily</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-subtle">
                                {backups.map((backup, i) => (
                                    <div
                                        key={backup.filename}
                                        className="flex items-center justify-between p-4 px-6 hover:bg-surface-hover/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex-shrink-0">
                                                <Database className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-text-primary text-sm font-mono truncate">
                                                    {backup.filename}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-text-muted text-xs flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(backup.created_at).toLocaleString()}
                                                    </span>
                                                    <span className="text-text-muted text-xs">
                                                        {formatRelativeTime(backup.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                <Lock className="h-3 w-3" />
                                                {formatSize(backup.size)}
                                            </span>
                                            <button
                                                onClick={() => openDecryptModal(backup.filename)}
                                                className="p-2 text-text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                title="Decrypt & view backup"
                                            >
                                                <Unlock className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(backup.filename)}
                                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                title="Delete backup"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal — uses the ConfirmModal's actual API (open, children, etc.) */}
            <ConfirmModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setBackupToDelete(null); }}
                onConfirm={handleDeleteBackup}
                title="Delete Backup"
                confirmLabel="Delete Permanently"
                confirmVariant="danger"
                loading={deletingBackup}
            >
                <div>
                    <p>Are you sure you want to permanently delete this backup?</p>
                    {backupToDelete && (
                        <p className="mt-2 px-3 py-2 bg-surface rounded-lg font-mono text-xs text-text-primary border border-border-subtle break-all">
                            {backupToDelete}
                        </p>
                    )}
                    <p className="mt-3 text-red-500 text-xs font-medium">⚠ This action cannot be undone.</p>
                </div>
            </ConfirmModal>
            {/* Decrypt Modal */}
            <ConfirmModal
                open={decryptModalOpen}
                onClose={() => { setDecryptModalOpen(false); setBackupToDecrypt(null); setDecryptedData(null); setEncryptionKey(''); }}
                onConfirm={decryptedData ? handleDownloadJson : handleDecrypt}
                title={decryptedData ? 'Backup Decrypted' : 'Decrypt Backup'}
                confirmLabel={decryptedData ? 'Download JSON' : 'Decrypt'}
                confirmVariant="primary"
                loading={decrypting}
            >
                <div>
                    {!decryptedData ? (
                        <>
                            <p className="text-sm text-text-muted mb-3">
                                Enter your <span className="text-gold font-medium">ENCRYPTION_KEY</span> from your <code className="px-1.5 py-0.5 bg-surface rounded text-xs">.env</code> file to decrypt this backup.
                            </p>
                            {backupToDecrypt && (
                                <p className="px-3 py-2 bg-surface rounded-lg font-mono text-xs text-text-primary border border-border-subtle break-all mb-3">
                                    {backupToDecrypt}
                                </p>
                            )}
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                <input
                                    type="password"
                                    value={encryptionKey}
                                    onChange={(e) => setEncryptionKey(e.target.value)}
                                    placeholder="64-character hex encryption key"
                                    className="w-full bg-surface border border-border-subtle rounded-lg pl-10 pr-4 py-2.5 text-text-primary text-sm font-mono focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all"
                                    autoComplete="off"
                                />
                            </div>
                            <p className="text-[11px] text-text-muted mt-2">⚠ The key never leaves this request. It is used server-side only.</p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-emerald-500 mb-3">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-semibold text-sm">Decryption Successful!</span>
                            </div>
                            <div className="bg-surface rounded-xl border border-border-subtle p-4 space-y-2">
                                <p className="text-xs text-text-muted">Created: <span className="text-text-primary">{new Date(decryptedData.metadata.created_at).toLocaleString()}</span></p>
                                <p className="text-xs text-text-muted">Total Records: <span className="text-text-primary font-semibold">{decryptedData.metadata.total_records?.toLocaleString()}</span></p>
                                <div className="border-t border-border-subtle pt-2 mt-2">
                                    <p className="text-xs text-text-muted font-medium mb-1.5">Tables:</p>
                                    {Object.entries(decryptedData.tables).map(([table, info]) => (
                                        <div key={table} className="flex items-center justify-between text-xs py-0.5">
                                            <span className="text-text-primary font-mono">{table.replace('inventory.', '')}</span>
                                            <span className="text-text-muted">{info.row_count} rows</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-text-muted mt-3 flex items-center gap-1.5">
                                <FileJson className="h-3.5 w-3.5" />
                                Click &quot;Download JSON&quot; to save the decrypted data.
                            </p>
                        </>
                    )}
                </div>
            </ConfirmModal>
        </div>
    );
}
