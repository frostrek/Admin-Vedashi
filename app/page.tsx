'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { reactivateAccount } from '@/lib/api';
import { Leaf, RefreshCw, Eye, EyeOff } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import toast from 'react-hot-toast';
import { Turnstile } from '@marsidev/react-turnstile';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Reactivation modal state
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deactivatedEmail, setDeactivatedEmail] = useState('');
  const [deactivatedPassword, setDeactivatedPassword] = useState('');

  // CAPTCHA state
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1f0d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Leaf className="w-10 h-10 text-[#8dbf8d] animate-pulse" />
          <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#8dbf8d] to-transparent animate-shimmer" />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireCaptcha && !turnstileToken) {
      toast.error('Please complete the CAPTCHA correctly.');
      return;
    }
    setLoading(true);
    const result = await login(email, password, turnstileToken || undefined);
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
      if (result.requireCaptcha) {
          setRequireCaptcha(true);
      }
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
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#0d1f0d]"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark herbal overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a0a]/90 via-[#0d2010]/80 to-[#0a1a0a]/90 backdrop-blur-[2px]" />

      <div className="w-full max-w-md relative z-10 transition-all duration-500">
        
        {/* Glassmorphic Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50">
          
          {/* Header & Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src="/vedashi-logo.png" 
                alt="Vedashi logo" 
                className="h-20 sm:h-24 w-auto object-contain filter drop-shadow-md brightness-0 sepia saturate-[16] hue-rotate-[5deg] brightness-[2.5] contrast-[1.2]" 
              />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#e8f0e8] tracking-widest uppercase mb-1">Admin Portal</h2>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-[#8dbf8d] to-transparent mx-auto mt-3 mb-2" />
            <p className="text-sm font-medium text-[#8dbf8d]/80 uppercase tracking-widest mt-3">Sacred Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#8dbf8d] uppercase tracking-wider pl-1">Administrator Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#8dbf8d] focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-[#8dbf8d] transition-all duration-300"
                placeholder="admin@vedashi.com"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#8dbf8d] uppercase tracking-wider pl-1">Security Key</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-3 pr-10 text-sm text-white placeholder-white/40 focus:border-[#8dbf8d] focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-[#8dbf8d] transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8dbf8d]/60 hover:text-[#8dbf8d] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {requireCaptcha && (
              <div className="mt-6 flex justify-center w-full overflow-hidden rounded-xl bg-white/5 p-2 border border-white/10">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                  onSuccess={(token) => {
                    setTurnstileToken(token);
                    if (turnstileToken === null) {
                      toast.success('Security verified');
                    }
                  }}
                  onError={() => {
                    setTurnstileToken('');
                    toast.error('Verification failed');
                  }}
                  onExpire={() => setTurnstileToken('')}
                  options={{ theme: 'dark', size: 'normal' }}
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (requireCaptcha && !turnstileToken)}
                className="w-full group rounded-xl bg-[#2d5a2d] hover:bg-[#3d6b3d] py-3.5 text-sm font-bold tracking-wider uppercase text-white border border-[#4a7c4a]/50 transition-all duration-300 disabled:opacity-50 hover:shadow-[0_0_20px_rgba(74,124,74,0.4)] disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</>
                ) : 'Enter Portal'}
              </button>
            </div>
          </form>
          
          <div className="mt-8 flex justify-center opacity-60 flex-col items-center">
             <Leaf className="w-5 h-5 text-[#8dbf8d] mb-2" />
             <p className="text-[10px] text-white/50 uppercase tracking-widest text-center">Protected by Vedashi Security</p>
          </div>
        </div>
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
