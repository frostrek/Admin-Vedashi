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
import { useTheme } from '@/context/ThemeContext';

export default function SecurityDashboard() {
    const { isDark } = useTheme();
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
                <div>
                    <h1 className={`font-serif text-3xl font-bold ${isDark ? 'text-gold' : 'text-emerald-950'} flex items-center gap-3`}>
                        <div className={`p-2.5 rounded-2xl border shadow-lg ${isDark ? 'bg-primary/20 border-border' : 'bg-gold/10 border-gold/20'}`}>
                            <ShieldAlert className="h-6 w-6 text-gold" />
                        </div>
                        Security & Operations
                    </h1>
                    <p className={`mt-2 text-[15px] font-semibold ${isDark ? 'text-brown' : 'text-emerald-950/80'} ml-1`}>Monitor active defenses, manage backups, and control disaster recovery</p>
                </div>
                <button
                    onClick={fetchData}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all duration-300 text-[11px] font-bold uppercase ${isDark ? 'bg-primary/20 border-gold/10 text-gold-soft hover:text-gold hover:bg-primary/40' : 'bg-primary text-gold hover:bg-primary-light border-gold/20 shadow-md'}`}
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Protocol
                </button>
            </div>

            {/* Active Defenses Grid */}
            <div className="animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                <h4 className={`font-serif text-[8px] font-bold uppercase mb-4 flex items-center gap-2 ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>
                    <Activity className="h-4 w-4 text-gold" />
                    Protocol Guardians
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {defenses.map((defense, idx) => (
                        <div
                            key={defense.name}
                            className={`group border rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 backdrop-blur-sm ${isDark ? 'bg-gradient-to-br from-card-bg to-card-bg-elevated border-border' : 'bg-white/95 border-gold/15 shadow-sm'}`}
                            style={{ animationDelay: `${150 + (idx * 50)}ms` }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-2xl border transition-all duration-500 ${isDark ? 'bg-primary/20 border-border group-hover:bg-primary/30' : 'bg-gold/5 border-gold/20 group-hover:bg-gold/15'}`}>
                                    <defense.icon className="h-5 w-5 text-gold" />
                                </div>
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-success bg-success/15 px-2 py-1 rounded-lg border border-success/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                    Active
                                </span>
                            </div>
                            <h4 className={`font-serif font-bold text-sm ${isDark ? 'text-gold' : 'text-emerald-950'}`}>{defense.name}</h4>
                            <p className={`text-[10px] mt-1 font-medium uppercase tracking-tight ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>{defense.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Disaster Recovery Panel - Takes 2/5 */}
                <div className={`lg:col-span-2 border rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm animate-fadeInUp ${isDark ? 'bg-gradient-to-br from-card-bg to-card-bg-elevated border-border' : 'bg-white/95 border-gold/15 shadow-gold/5'}`} style={{ animationDelay: '400ms' }}>
                    <div className={`p-6 border-b ${isDark ? 'border-border bg-primary/10' : 'border-gold/10 bg-emerald-50/40'}`}>
                        <h4 className={`font-serif text-base font-bold uppercase flex items-center gap-2.5 ${isDark ? 'text-gold' : 'text-emerald-950'}`}>
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            Disaster Protocol
                        </h4>
                        <p className={`text-[10px] font-bold uppercase mt-1 ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>Maintenance mode and emergency controls</p>
                    </div>

                    <div className="p-6">
                        {/* Maintenance Mode Toggle */}
                        <div className={`rounded-2xl border p-5 transition-all duration-500 ${maintenanceEnabled
                            ? (isDark ? 'border-danger/30 bg-danger/5' : 'border-danger/30 bg-red-50/50')
                            : (isDark ? 'border-border bg-black/20' : 'border-border-subtle bg-black/5')
                            }`}>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Server className={`h-5 w-5 ${maintenanceEnabled ? 'text-danger' : 'text-gold'}`} />
                                    <div>
                                        <h4 className={`font-serif font-bold text-sm ${maintenanceEnabled ? 'text-danger' : (isDark ? 'text-gold' : 'text-emerald-950')}`}>Lockdown Mode</h4>
                                        <p className={`text-[10px] font-bold uppercase mt-0.5 ${maintenanceEnabled ? 'text-danger' : (isDark ? 'text-text-muted' : 'text-emerald-900/60')}`}>
                                            {maintenanceEnabled ? '⚠ Traffic redirection active' : 'All systems operational'}
                                        </p>
                                    </div>
                                </div>

                                {loadingMaintenance ? (
                                    <Loader2 className={`h-5 w-5 animate-spin ${isDark ? 'text-text-muted' : 'text-emerald-900/40'}`} />
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
                                            <ToggleRight className="h-10 w-10 text-danger hover:text-danger/70 transition-colors" />
                                        ) : (
                                            <ToggleLeft className={`h-10 w-10 transition-colors ${isDark ? 'text-text-muted hover:text-gold' : 'text-emerald-900/40 hover:text-gold'}`} />
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Message editor (always visible) */}
                            <div className="mt-3">
                                <label className={`block text-xs mb-1.5 font-medium ${isDark ? 'text-text-muted' : 'text-emerald-900/70'}`}>
                                    {maintenanceEnabled ? 'Active message shown to visitors:' : 'Message to display when enabled:'}
                                </label>
                                <textarea
                                    value={maintenanceMessage}
                                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                                    className={`w-full border rounded-xl p-4 text-sm font-medium focus:outline-none transition-all h-[100px] resize-none ${isDark ? 'bg-black/20 border-border text-gold-soft focus:border-gold/30 focus:ring-1 focus:ring-gold/10' : 'bg-white border-gold/20 text-emerald-950 focus:border-gold/50 focus:ring-1 focus:ring-gold/20'}`}
                                    placeholder="Enter maintenance directive for entities..."
                                />
                                {maintenanceEnabled && (
                                    <button
                                        onClick={handleUpdateMessage}
                                        className={`mt-2 px-4 py-1.5 text-xs font-medium border rounded-lg transition-all ${isDark ? 'bg-gold/10 border-gold/20 text-gold hover:bg-gold/20' : 'bg-emerald-50 border-gold/30 text-emerald-900 hover:bg-emerald-100'}`}
                                    >
                                        Update Message
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Info */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className={`rounded-xl border p-3 ${isDark ? 'bg-black/20 border-border' : 'bg-black/5 border-border-subtle'}`}>
                                <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>Emergency Seal</p>
                                <p className={`text-sm font-bold mt-1 ${isDark ? 'text-gold' : 'text-emerald-950'}`}>On Shutdown</p>
                            </div>
                            <div className={`rounded-xl border p-3 ${isDark ? 'bg-black/20 border-border' : 'bg-black/5 border-border-subtle'}`}>
                                <p className={`text-[9px] uppercase font-bold ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>Auto Synthesis</p>
                                <p className={`text-sm font-bold mt-1 ${isDark ? 'text-gold' : 'text-emerald-950'}`}>Daily 02:00</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Backups Panel - Takes 3/5 */}
                <div className={`lg:col-span-3 border rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm animate-fadeInUp ${isDark ? 'bg-gradient-to-br from-card-bg to-card-bg-elevated border-border' : 'bg-white/95 border-gold/15 shadow-gold/5'}`} style={{ animationDelay: '500ms' }}>
                    <div className={`p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? 'border-border bg-primary/10' : 'border-gold/10 bg-emerald-50/40'}`}>
                        <div>
                            <h4 className={`font-serif text-base font-bold uppercase flex items-center gap-2.5 ${isDark ? 'text-gold' : 'text-emerald-950'}`}>
                                <HardDrive className="h-5 w-5 text-gold" />
                                Database Archives
                            </h4>
                            <p className={`text-[10px] font-bold uppercase mt-1 ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>
                                {backups.length} archives stored · AES-256-GCM encrypted
                            </p>
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={creatingBackup}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-gold border border-gold/20 font-bold uppercase text-[11px] rounded-xl hover:bg-primary/80 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-black/40"
                        >
                            {creatingBackup ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            {creatingBackup ? 'Synthesizing...' : 'New Archive'}
                        </button>
                    </div>

                    <div className="p-0">
                        {loadingBackups ? (
                            <div className={`p-12 text-center ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-gold" />
                                <p className="text-sm">Loading backups...</p>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="p-12 text-center">
                                <Database className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-border-subtle' : 'text-gold/20'}`} />
                                <p className={`font-medium ${isDark ? 'text-text-primary' : 'text-emerald-950'}`}>No backups yet</p>
                                <p className={`text-sm mt-1 ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>Backups run automatically at 2:00 AM IST daily</p>
                            </div>
                        ) : (
                            <div className={`divide-y ${isDark ? 'divide-border-subtle' : 'divide-gold/10'}`}>
                                {backups.map((backup, i) => (
                                    <div
                                        key={backup.filename}
                                        className={`flex items-center justify-between p-4 px-6 transition-all duration-300 group ${isDark ? 'hover:bg-primary/5' : 'hover:bg-emerald-50/50'}`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <div className={`p-3 rounded-2xl border transition-all duration-500 ${isDark ? 'bg-primary/20 border-border group-hover:bg-primary/30' : 'bg-gold/5 border-gold/20 group-hover:bg-gold/15'}`}>
                                                <Database className="h-4 w-4 text-gold" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-mono text-sm truncate transition-colors ${isDark ? 'text-gold group-hover:text-gold-soft' : 'text-emerald-950 group-hover:text-emerald-900'}`}>
                                                    {backup.filename}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 ${isDark ? 'text-text-muted' : 'text-emerald-900/60'}`}>
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(backup.created_at).toLocaleString()}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-md ${isDark ? 'text-text-muted bg-primary/10' : 'text-emerald-900/70 bg-gold/10'}`}>
                                                        {formatRelativeTime(backup.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border shadow-md ${isDark ? 'bg-primary/20 text-gold-soft border-border' : 'bg-gold/10 text-emerald-900 border-gold/20'}`}>
                                                <Lock className="h-3 w-3" />
                                                {formatSize(backup.size)}
                                            </span>
                                            <button
                                                onClick={() => openDecryptModal(backup.filename)}
                                                className={`p-2.5 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 ${isDark ? 'text-text-muted hover:text-gold hover:bg-primary/20' : 'text-emerald-900/40 hover:text-gold hover:bg-gold/10'}`}
                                                title="Decrypt & view archive"
                                            >
                                                <Unlock className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(backup.filename)}
                                                className={`p-2.5 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 ${isDark ? 'text-text-muted hover:text-danger hover:bg-danger/10' : 'text-emerald-900/40 hover:text-danger hover:bg-danger/10'}`}
                                                title="Delete archive"
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
