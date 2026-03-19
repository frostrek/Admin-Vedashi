'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { 
    User, Mail, Shield, ShieldCheck, Key, Settings, 
    Bell, Github, Twitter, Globe, Camera, Save, 
    Loader2, AlertCircle, CheckCircle2, Lock, 
    Smartphone, History, Activity, Calendar,
    Package
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { useTheme } from '@/context/ThemeContext';
import { 
    updateAdminProfile, 
    changeAdminPassword, 
    updateAdminProfileImage,
    getAdminMe
} from '@/lib/api';

export default function ProfileStratumPage() {
    const { isDark } = useTheme();
    const { user } = useAdminAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('identity');

    // Profile data state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);
    const [pageLoading, setPageLoading] = useState(true);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityLoading, setSecurityLoading] = useState(false);

    // Vibe Matrix state
    const [aura, setAura] = useState('Balanced');
    const [volume, setVolume] = useState(60);

    useEffect(() => {
        const fetchProfile = async () => {
            setPageLoading(true);
            try {
                const res = await getAdminMe();
                if (res.success && res.data) {
                    const profile = res.data;
                    setName(profile.full_name || '');
                    setEmail(profile.email || '');
                    setPhone(profile.phone || '');
                    setBio(profile.bio || 'Senior Alchemist of the Vedic Admin Panel. Orchestrating digital vibrations for universal health.');
                    setCreatedAt(profile.created_at || null);
                    setIsActive(!!profile.is_active);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            } finally {
                setPageLoading(false);
            }
        };

        fetchProfile();

        // Load preferences from local storage if they exist
        const savedAura = localStorage.getItem('admin_aura');
        const savedVolume = localStorage.getItem('admin_volume');

        if (savedAura) setAura(savedAura);
        if (savedVolume) setVolume(parseInt(savedVolume));
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const customerId = user?.customer_id || (user as any)?.id;
        if (!customerId) return toast.error('Admin record not found');
        
        setLoading(true);
        try {
            const res = await updateAdminProfile(customerId as string, {
                full_name: name,
                phone: phone,
                bio: bio,
            });
            if (res.success) {
                localStorage.setItem('admin_phone', phone);
                toast.success('Identity resonance updated!');
            } else {
                toast.error(res.message || 'Failed to update resonance');
            }
        } catch (error) {
            toast.error('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return toast.error('Keys do not resonate (Passwords do not match)');
        if (newPassword.length < 8) return toast.error('Key too weak (Minimum 8 characters)');

        setSecurityLoading(true);
        try {
            const res = await changeAdminPassword(currentPassword, newPassword);
            if (res.success) {
                toast.success('Security vault recalibrated!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(res.message || 'Calibration failure');
            }
        } catch (error) {
            toast.error('Vault connection interrupted');
        } finally {
            setSecurityLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const customerId = user?.customer_id || (user as any)?.id;
        if (!file || !customerId) return;

        setLoading(true);
        try {
            const res = await updateAdminProfileImage(customerId, file);
            if (res.success) {
                toast.success('Avatar frequency updated');
                // Normally we'd refresh the profile or update context
                window.location.reload(); 
            } else {
                toast.error('Image resonance failed');
            }
        } catch (error) {
            toast.error('Upload interrupted');
        } finally {
            setLoading(false);
        }
    };

    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    useEffect(() => {
        const fetchAuditTrail = async () => {
            if (activeTab === 'activity' && user?.email) {
                setLogsLoading(true);
                try {
                    const { getActivityLogs } = await import('@/lib/api');
                    const data = await getActivityLogs({ 
                        actor_email: user.email, 
                        limit: '5' 
                    });
                    setLogs(data.logs);
                } catch (err) {
                    console.error('Failed to resonance audit trail:', err);
                } finally {
                    setLogsLoading(false);
                }
            }
        };
        fetchAuditTrail();
    }, [activeTab, user?.email]);

    const inputCls = `w-full rounded-2xl border ${isDark ? 'border-white/10 bg-black/80 text-gold-soft' : 'border-gold/20 bg-white/90 text-emerald-950 shadow-sm'} px-6 py-4 text-sm placeholder:text-text-muted/30 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all duration-300 shadow-inner`;
    const labelCls = `text-[11px] font-black uppercase ${isDark ? 'text-gold' : 'text-emerald-900'} mb-3 block ml-1.5 drop-shadow-sm`;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 animate-fadeIn min-h-screen">
            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-gold/20 shadow-lg">
                            <User className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-gold' : 'text-emerald-950'} tracking-tighter`}>Admin Profile Stratum</h1>
                    </div>
                    <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-text-muted' : 'text-emerald-900/40'} ml-16`}>
                        Orchestrate your administrative essence and security resonance.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* ── Sidebar Navigation ── */}
                <div className="lg:col-span-3 space-y-5">
                    <button 
                        onClick={() => setActiveTab('identity')}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-500 border-2 ${activeTab === 'identity' ? 'bg-primary border-gold shadow-[0_0_25px_rgba(130,139,92,0.4)] text-gold' : `${isDark ? 'bg-black/60 border-white/10 text-gold-soft/40' : 'bg-white/60 border-gold/10 text-emerald-900/40'} hover:bg-black/80 hover:text-gold hover:border-gold/40`}`}
                    >
                        <User className="w-4.5 h-4.5" />
                        <span className="text-[11px] font-black uppercase">Identity</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-500 border-2 ${activeTab === 'security' ? 'bg-primary border-gold shadow-[0_0_25px_rgba(130,139,92,0.4)] text-gold' : `${isDark ? 'bg-black/60 border-white/10 text-gold-soft/40' : 'bg-white/60 border-gold/10 text-emerald-900/40'} hover:bg-black/80 hover:text-gold hover:border-gold/40`}`}
                    >
                        <Shield className="w-4.5 h-4.5" />
                        <span className="text-[11px] font-black uppercase">Security</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('preferences')}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-500 border-2 ${activeTab === 'preferences' ? 'bg-primary border-gold shadow-[0_0_25px_rgba(130,139,92,0.4)] text-gold' : `${isDark ? 'bg-black/60 border-white/10 text-gold-soft/40' : 'bg-white/60 border-gold/10 text-emerald-900/40'} hover:bg-black/80 hover:text-gold hover:border-gold/40`}`}
                    >
                        <Settings className="w-4.5 h-4.5" />
                        <span className="text-[11px] font-black uppercase">Vibe Matrix</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('activity')}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-500 border-2 ${activeTab === 'activity' ? 'bg-primary border-gold shadow-[0_0_25px_rgba(130,139,92,0.4)] text-gold' : `${isDark ? 'bg-black/60 border-white/10 text-gold-soft/40' : 'bg-white/60 border-gold/10 text-emerald-900/40'} hover:bg-black/80 hover:text-gold hover:border-gold/40`}`}
                    >
                        <Activity className="w-4.5 h-4.5" />
                        <span className="text-[11px] font-black uppercase">Audit Trail</span>
                    </button>
                </div>

                {/* ── Main Content Content ── */}
                <div className="lg:col-span-9">
                    <div className={`${isDark ? 'bg-black/70 backdrop-blur-xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white/95 backdrop-blur-md border-gold/20 shadow-[0_0_40px_rgba(130,139,92,0.1)]'} border rounded-[2.5rem] overflow-hidden animate-fadeInUp`}>
                        {activeTab === 'identity' && (
                            <div className="p-10 space-y-10">
                                <div className="flex flex-col md:flex-row gap-10 items-center border-b border-white/10 pb-10">
                                    <div className="relative group">
                                        <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gold shadow-[0_0_40px_rgba(197,164,109,0.3)] bg-primary/40 flex items-center justify-center">
                                            <span className="text-5xl font-bold text-gold drop-shadow-md">
                                                {name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`flex-1 text-center md:text-left space-y-4 ${pageLoading ? 'animate-pulse' : ''}`}>
                                        <div>
                                            <h4 className={`text-3xl font-bold ${isDark ? 'text-gold' : 'text-emerald-950'} leading-tight drop-shadow-sm`}>
                                                {pageLoading ? 'Synchronizing Essence...' : name}
                                            </h4>
                                            <p className={`text-[11px] ${isDark ? 'text-gold-soft/50' : 'text-emerald-900/40'} font-black uppercase mt-1`}>Administrator • Level 9 Specialist</p>
                                        </div>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                            <span className={`px-5 py-2 ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'} text-[10px] font-black uppercase rounded-full border flex items-center gap-2.5 shadow-sm`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                                {isActive ? 'Fully Resonated' : 'Dormant Essence'}
                                            </span>
                                             <span className="px-5 py-2 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-full border border-blue-500/30 flex items-center gap-2.5 shadow-sm">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Active Since {createdAt ? new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Mar 2024'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSaveProfile} className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className={labelCls}>Soul Name</label>
                                            <input 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className={inputCls}
                                                placeholder="Enter full name..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelCls}>Frequency (Email)</label>
                                            <input 
                                                value={email}
                                                readOnly
                                                disabled
                                                className={inputCls + ' opacity-50 cursor-not-allowed'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelCls}>Communication Line</label>
                                            <div className="relative">
                                                <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/30" />
                                                <input 
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    className={inputCls + ' pl-14'}
                                                    placeholder="+91 XXXXX XXXXX"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelCls}>Role Stratum</label>
                                            <div className={`px-6 py-4 rounded-2xl border ${isDark ? 'border-white/10 bg-black/60 text-gold/60' : 'border-gold/10 bg-emerald-50 text-emerald-900/60'} text-sm font-bold uppercase italic`}>
                                                Super Administrator (Unrestricted Access)
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className={labelCls}>Identity Manuscript (Bio)</label>
                                        <textarea 
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            className={inputCls + ' min-h-[120px] resize-none'}
                                            placeholder="Whisper your administrative journey..."
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-6">
                                        <p className="text-[10px] font-bold text-gold/30 uppercase italic">
                                            Vibrations persist after local resonance save.
                                        </p>
                                        <button 
                                            type="submit"
                                            disabled={loading || pageLoading}
                                            className="px-12 py-4 bg-gold hover:bg-gold-muted text-primary text-[10px] font-bold uppercase rounded-2xl transition-all shadow-xl shadow-gold/20 flex items-center gap-3 disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Resonate Identity
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleChangePassword} className="p-10 space-y-12 animate-fadeIn">
                                <div className="space-y-4">
                                    <h4 className="font-serif text-xl font-bold text-gold tracking-tight flex items-center gap-3">
                                        <Key className="w-5 h-5" /> Key Calibration
                                    </h4>
                                    <p className="text-xs text-text-muted leading-relaxed">Ensure your administrative vault remains impenetrable by cycling your security keys periodically.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className={labelCls}>Primordial Key (Current Password)</label>
                                        <input 
                                            type="password" 
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className={inputCls} 
                                            placeholder="••••••••••••" 
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className={labelCls}>Ascended Key (New Password)</label>
                                            <input 
                                                type="password" 
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className={inputCls} 
                                                placeholder="New security vibration" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelCls}>Confirm Ascension</label>
                                            <input 
                                                type="password" 
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={inputCls} 
                                                placeholder="Re-enter for resonance" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-5 items-start">
                                    <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-amber-500 uppercase">Vulnerability Alert</p>
                                        <p className="text-[11px] text-amber-200/60 leading-relaxed font-medium">Your current key was last harmonized 124 days ago. We recommend a recalibration to maintain absolute security integrity.</p>
                                    </div>
                                </div>

                                <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center">
                                            <Smartphone className="w-5 h-5 text-gold" />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold ${isDark ? 'text-gold-soft' : 'text-emerald-900'} uppercase`}>Two-Factor Resonance</p>
                                            <p className="text-[10px] text-emerald-400 font-bold uppercase">Configured & Active</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={securityLoading}
                                        className="px-10 py-4 bg-gold hover:bg-gold-muted text-primary text-[10px] font-bold uppercase rounded-2xl transition-all shadow-lg shadow-gold/20 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {securityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                        Recalibrate Keys
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="p-10 space-y-12 animate-fadeIn">
                                <div className="space-y-4 text-center">
                                    <h4 className="font-serif text-2xl font-bold text-gold">Vibe Matrix</h4>
                                    <p className="text-xs text-text-muted leading-relaxed uppercase font-bold">Tune the frequencies of your administrative environment.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className={`p-8 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-primary/5 border-primary/10'} space-y-4`}>
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-sm font-bold ${isDark ? 'text-gold' : 'text-emerald-950'}`}>Visual Aura</h4>
                                            <Sparkles className="w-5 h-5 text-gold/40" />
                                        </div>
                                        <p className="text-[10px] text-text-muted uppercase font-bold">Control the luminous intensity of the stratum.</p>
                                        <div className="flex gap-3 pt-2">
                                            {['Minimal', 'Balanced', 'Intense'].map(a => (
                                                <button 
                                                    key={a} 
                                                    onClick={() => {
                                                        setAura(a);
                                                        localStorage.setItem('admin_aura', a);
                                                        toast.success(`Aura shifted to ${a}`);
                                                    }}
                                                    className={`px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase ${aura === a ? 'bg-primary text-gold border-gold' : 'bg-primary/10 border-gold/10 text-gold/40 hover:bg-primary/20'}`}
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={`p-8 rounded-3xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-primary/5 border-primary/10'} space-y-4`}>
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-sm font-bold ${isDark ? 'text-gold' : 'text-emerald-950'}`}>Sound Resonance</h4>
                                            <Bell className="w-5 h-5 text-gold/40" />
                                        </div>
                                        <p className="text-[10px] text-text-muted uppercase font-bold">Harmonize with interface notification vibrations.</p>
                                        <div className="flex items-center gap-4 pt-2">
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="100" 
                                                value={volume}
                                                onChange={(e) => {
                                                    const v = parseInt(e.target.value);
                                                    setVolume(v);
                                                    localStorage.setItem('admin_volume', v.toString());
                                                }}
                                                className="flex-1 h-1.5 bg-black/20 rounded-full appearance-none cursor-pointer accent-gold"
                                            />
                                            <span className="text-[10px] font-black text-gold w-8">{volume}%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-center pt-8 border-t border-white/5">
                                    <p className="text-[10px] text-gold/30 uppercase font-black italic">Advanced frequencies currently under spectral refinement</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="p-10 space-y-8 animate-fadeIn">
                                <div className="flex justify-between items-end">
                                    <h4 className="font-serif text-xl font-bold text-gold tracking-tight flex items-center gap-3">
                                        <History className="w-5 h-5" /> Recent Vibrations
                                    </h4>
                                    <span className="text-[10px] font-bold text-gold-soft uppercase opacity-40">Last 5 actions</span>
                                </div>

                                <div className="space-y-4">
                                    {logsLoading ? (
                                        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                                            <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
                                            <p className="text-[10px] font-black uppercase text-gold/40">Synchronizing Chronicles...</p>
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-20 bg-white/5 border border-white/5 rounded-3xl">
                                            <Activity className="w-10 h-10 text-gold/10 mb-4" />
                                            <p className="text-[10px] font-black uppercase text-gold/40">No administrative vibrations recorded.</p>
                                        </div>
                                    ) : (
                                         logs.map((log) => (
                                            <div 
                                                key={log.id} 
                                                onClick={() => router.push(`/dashboard/activity-logs?log_id=${log.id}`)}
                                                className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-gold/20 hover:bg-white/[0.04] transition-all group cursor-pointer"
                                            >
                                                <div className={`h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner ${isDark ? 'text-gold' : 'text-emerald-900'}`}>
                                                    {log.action.includes('order') ? <Package className="w-5 h-5" /> : 
                                                     log.action.includes('setting') ? <Settings className="w-5 h-5" /> : 
                                                     <Activity className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-xs font-bold uppercase group-hover:text-gold transition-colors ${isDark ? 'text-gold-soft' : 'text-emerald-950'}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </p>
                                                    <p className="text-[10px] text-text-muted mt-1 font-bold opacity-60">
                                                        {new Date(log.created_at).toLocaleString(undefined, { 
                                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="text-[10px] font-bold text-gold/20 uppercase group-hover:text-gold/40 transition-colors">
                                                    {log.entity_type}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-components as needed for specific styling
function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}

function LayoutTemplate(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="18" height="7" x="3" y="3" rx="1" />
            <rect width="9" height="7" x="3" y="14" rx="1" />
            <rect width="5" height="7" x="16" y="14" rx="1" />
        </svg>
    );
}
