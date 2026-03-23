'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { reactivateAccount } from '@/lib/api';
import { Leaf, RefreshCw, Eye, EyeOff } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Reactivation modal state
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deactivatedEmail, setDeactivatedEmail] = useState('');
  const [deactivatedPassword, setDeactivatedPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }

  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Welcome to admin panel!');
      router.push('/dashboard');
    } else if (result.deactivated) {
      // Account is deactivated → show reactivation modal
      setDeactivatedEmail(email);
      setDeactivatedPassword(password);
      setShowReactivateModal(true);
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    const result = await reactivateAccount(deactivatedEmail, deactivatedPassword);
    setReactivating(false);

    if (result.success) {
      setShowReactivateModal(false);
      // Log the user in with the returned tokens
      const loginResult = await login(deactivatedEmail, deactivatedPassword);
      if (loginResult.success) {
        toast.success('Welcome back! Your account has been reactivated.');
        router.push('/dashboard');
      } else {
        toast.success('Account reactivated! Please sign in again.');
      }
    } else {
      toast.error(result.error || 'Failed to reactivate account');
    }
  };

  const handleCancelReactivation = () => {
    setShowReactivateModal(false);
    setDeactivatedEmail('');
    setDeactivatedPassword('');
    toast('Your account remains deactivated.', { icon: '🔒' });
  };

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Radial vignette background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 via-transparent to-plum/20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gold/3 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-2xl shadow-primary/30 border border-gold/15">
            <span className="text-2xl font-bold text-gold">V</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#A89250] tracking-wide uppercase">Vedashi Admin</h1>
          <p className="mt-1 text-sm text-[#A89250]/60">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-6 shadow-2xl shadow-black/30">
          {/* Ornamental line */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gold/25 to-transparent mb-6" />

          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/15 transition-all duration-300"
              placeholder="admin@vedashi.com"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2.5 pr-10 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/15 transition-all duration-300"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89250]/50 hover:text-[#A89250] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-[#E8D8B9] hover:bg-primary-light border border-gold/10 transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-primary/20"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Bottom ornamental line */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent mt-6" />
        </form>
      </div>

      {/* ── Reactivation Modal ─────────────────────────────────────── */}
      <ConfirmModal
        open={showReactivateModal}
        onClose={handleCancelReactivation}
        title="Reactivate Your Account"
        confirmLabel="Yes, Reactivate"
        cancelLabel="Cancel"
        onConfirm={handleReactivate}
        confirmVariant="primary"
        loading={reactivating}
      >
        <div className="space-y-4">
          {/* Icon + Message */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-gold/15">
              <RefreshCw className="h-7 w-7 text-gold" />
            </div>
            <p className="text-sm text-[#A89250]/60 leading-relaxed">
              Your account is currently deactivated.
              <br />
              Would you like to reactivate it and regain access?
            </p>
          </div>

          {/* Email hint */}
          <div className="rounded-lg bg-hover/50 border border-border px-3 py-2.5">
            <p className="text-xs text-[#A89250]/40">Account</p>
            <p className="text-sm font-medium text-text-primary mt-0.5">{deactivatedEmail}</p>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}
