'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Shield, AlertTriangle, Eye, EyeOff, Wine } from 'lucide-react';
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
                <h1 className="font-serif text-2xl font-bold text-gold-soft tracking-wide">
                    Account Settings
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                    Manage your account preferences and security
                </p>
            </div>

            {/* Account Info Card */}
            <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 shadow-lg shadow-black/10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/20 border border-gold/10">
                        <Wine className="h-6 w-6 text-[#E8D8B9]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-primary">{user?.name || 'Admin'}</h3>
                        <p className="text-sm text-text-secondary">{user?.email || '—'}</p>
                    </div>
                </div>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Role</p>
                        <p className="mt-0.5 text-sm font-medium text-text-primary capitalize">{user?.role || 'admin'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Status</p>
                        <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                        </span>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-[#7B2D3A]/30 bg-gradient-to-br from-[#2A1015]/50 to-[#1A0A0D]/50 p-6 shadow-lg shadow-black/10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B2D3A]/20 border border-[#7B2D3A]/30">
                        <Shield className="h-4.5 w-4.5 text-[#D4A0A0]" />
                    </div>
                    <div>
                        <h2 className="font-serif text-lg font-bold text-[#E8C8C8] tracking-wide">
                            Danger Zone
                        </h2>
                    </div>
                </div>

                <div className="h-[1px] bg-gradient-to-r from-transparent via-[#7B2D3A]/30 to-transparent mb-5" />

                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Deactivate Account</h3>
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
