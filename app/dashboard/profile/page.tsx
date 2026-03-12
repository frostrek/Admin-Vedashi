'use client';

import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { 
    User, Mail, Shield, ShieldCheck, Key, Settings, 
    Bell, Github, Twitter, Globe, Camera, Save, 
    Loader2, AlertCircle, CheckCircle2, Lock, 
    Smartphone, History, Activity, Calendar,
    Package, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useTheme } from '@/context/ThemeContext';

export default function ProfileStratumPage() {
    const { isDark } = useTheme();
    const { user } = useAdminAuth();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('identity');

    // Mock states for demonstration (would normally be connected to an API)
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('+91 98765 43210');
    const [bio, setBio] = useState('Senior Alchemist of the Vedic Admin Panel. Orchestrating digital vibrations for universal health.');

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success('Identity resonance updated!');
        setLoading(false);
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
    const labelCls = `text-[11px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-gold' : 'text-emerald-900'} mb-3 block ml-1.5 drop-shadow-sm`;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 animate-fadeIn min-h-screen">
            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/20 border border-gold/20 shadow-lg">
                            <User className="w-6 h-6 text-gold" />
                        </div>
                        <h1 className={`text-3xl font-serif font-bold ${isDark ? 'text-gold' : 'text-emerald-950'} tracking-tighter`}>Admin Profile Stratum</h1>
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-text-muted' : 'text-emerald-900/40'} ml-16`}>
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
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Identity</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-500 border-2 ${activeTab === 'security' ? 'bg-primary border-gold shadow-[0_0_25px_rgba(130,139,92,0.4)] text-gold' : `${isDark ? 'bg-black/60 border-white/10 text-gold-soft/40' : 'bg-white/60 border-gold/10 text-emerald-900/40'} hover:bg-black/80 hover:text-gold hover:border-gold/40`}`}
                    >
                        <Shield className="w-4.5 h-4.5" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Security</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('preferences')}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-500 border-2 ${activeTab === 'preferences' ? 'bg-primary border-gold shadow-[0_0_25px_rgba(130,139,92,0.4)] text-gold' : `${isDark ? 'bg-black/60 border-white/10 text-gold-soft/40' : 'bg-white/60 border-gold/10 text-emerald-900/40'} hover:bg-black/80 hover:text-gold hover:border-gold/40`}`}
                    >
                        <Settings className="w-4.5 h-4.5" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Vibe Matrix</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('activity')}
                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-500 border-2 ${activeTab === 'activity' ? 'bg-primary border-gold shadow-[0_0_25px_rgba(130,139,92,0.4)] text-gold' : `${isDark ? 'bg-black/60 border-white/10 text-gold-soft/40' : 'bg-white/60 border-gold/10 text-emerald-900/40'} hover:bg-black/80 hover:text-gold hover:border-gold/40`}`}
                    >
                        <Activity className="w-4.5 h-4.5" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Audit Trail</span>
                    </button>
                </div>

                {/* ── Main Content Content ── */}
                <div className="lg:col-span-9">
                    <div className={`${isDark ? 'bg-black/70 backdrop-blur-xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white/95 backdrop-blur-md border-gold/20 shadow-[0_0_40px_rgba(130,139,92,0.1)]'} border rounded-[2.5rem] overflow-hidden animate-fadeInUp`}>
                        {activeTab === 'identity' && (
                            <form onSubmit={handleSaveProfile} className="p-10 space-y-10">
                                <div className="flex flex-col md:flex-row gap-10 items-center border-b border-white/10 pb-10">
                                    <div className="relative group">
                                        <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gold shadow-[0_0_40px_rgba(197,164,109,0.3)] bg-primary/40 flex items-center justify-center">
                                            <span className="text-5xl font-serif font-bold text-gold drop-shadow-md">
                                                {name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <button type="button" className="absolute bottom-1 right-1 p-3 bg-gold text-black rounded-full shadow-[0_0_15px_rgba(197,164,109,0.5)] hover:scale-110 active:scale-95 transition-all">
                                            <Camera className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 text-center md:text-left space-y-4">
                                        <div>
                                            <h2 className={`text-3xl font-serif font-bold ${isDark ? 'text-gold' : 'text-emerald-950'} leading-tight drop-shadow-sm`}>{name}</h2>
                                            <p className={`text-[11px] ${isDark ? 'text-gold-soft/50' : 'text-emerald-900/40'} font-black uppercase tracking-[0.4em] mt-1`}>Administrator • Level 9 Specialist</p>
                                        </div>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                            <span className="px-5 py-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-500/30 flex items-center gap-2.5 shadow-sm">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Fully Resonated
                                            </span>
                                            <span className="px-5 py-2 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-500/30 flex items-center gap-2.5 shadow-sm">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Active Since Mar 2024
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className={labelCls}>Soul Name</label>
                                        <input 
                                            type="text" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)}
                                            className={inputCls} 
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelCls}>Frequency (Email)</label>
                                        <input 
                                            type="email" 
                                            value={email} 
                                            disabled
                                            className={`${inputCls} opacity-50 cursor-not-allowed`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelCls}>Communication Line</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/30" />
                                            <input 
                                                type="tel" 
                                                value={phone} 
                                                onChange={(e) => setPhone(e.target.value)}
                                                className={`${inputCls} pl-14`}
                                                placeholder="+91..."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={labelCls}>Role Stratum</label>
                                        <div className={`px-6 py-4 rounded-2xl border ${isDark ? 'border-white/10 bg-black/60 text-gold/60' : 'border-gold/10 bg-emerald-50 text-emerald-900/60'} text-sm font-bold uppercase tracking-[0.15em] italic font-serif`}>
                                            Super Administrator (Unrestricted Access)
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={labelCls}>Identity Manuscript (Bio)</label>
                                    <textarea 
                                        rows={4}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className={`${inputCls} resize-none`}
                                        placeholder="Tell your story..."
                                    />
                                </div>

                                <div className="flex justify-end pt-6">
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-3 px-10 py-4 bg-primary border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-[0.3em] rounded-2xl hover:shadow-[0_0_30px_rgba(197,164,109,0.3)] transition-all disabled:opacity-50 group"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                        Preserve Identity
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <div className="p-10 space-y-12 animate-fadeIn">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-serif font-bold text-gold tracking-tight flex items-center gap-3">
                                        <Key className="w-5 h-5" /> Key Calibration
                                    </h3>
                                    <p className="text-xs text-text-muted leading-relaxed">Ensure your administrative vault remains impenetrable by cycling your security keys periodically.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className={labelCls}>Primordial Key (Current Password)</label>
                                        <input type="password" className={inputCls} placeholder="••••••••••••" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className={labelCls}>Ascended Key (New Password)</label>
                                            <input type="password" className={inputCls} placeholder="New security vibration" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={labelCls}>Confirm Ascension</label>
                                            <input type="password" className={inputCls} placeholder="Re-enter for resonance" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-5 items-start">
                                    <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Vulnerability Alert</p>
                                        <p className="text-[11px] text-amber-200/60 leading-relaxed font-medium">Your current key was last harmonized 124 days ago. We recommend a recalibration to maintain absolute security integrity.</p>
                                    </div>
                                </div>

                                <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center">
                                            <Smartphone className="w-5 h-5 text-gold" />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold ${isDark ? 'text-gold-soft' : 'text-emerald-900'} uppercase tracking-wider`}>Two-Factor Resonance</p>
                                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Configured & Active</p>
                                        </div>
                                    </div>
                                    <button className={`px-8 py-3 ${isDark ? 'bg-black/40 border-white/10 text-gold-soft hover:bg-black/60' : 'bg-emerald-50 border-gold/10 text-emerald-900 hover:bg-emerald-100'} border text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all`}>
                                        Recalibrate Keys
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="p-10 space-y-12 animate-fadeIn flex flex-col items-center justify-center min-h-[400px]">
                                <Sparkles className="w-16 h-16 text-gold/20 mb-6 animate-pulse" />
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-serif font-bold text-gold">Vibe Matrix</h3>
                                    <p className="text-xs text-text-muted max-w-sm mx-auto uppercase tracking-widest font-bold leading-relaxed">Coming Soon: Personalize your administrative atmosphere with custom color frequencies and sound vibrations.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="p-10 space-y-8 animate-fadeIn">
                                <div className="flex justify-between items-end">
                                    <h3 className="text-xl font-serif font-bold text-gold tracking-tight flex items-center gap-3">
                                        <History className="w-5 h-5" /> Recent Vibrations
                                    </h3>
                                    <span className="text-[10px] font-bold text-gold-soft uppercase tracking-[0.2em] opacity-40">Last 5 actions</span>
                                </div>

                                <div className="space-y-4">
                                    {logsLoading ? (
                                        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                                            <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gold/40">Synchronizing Chronicles...</p>
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-20 bg-white/5 border border-white/5 rounded-3xl">
                                            <Activity className="w-10 h-10 text-gold/10 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gold/40">No administrative vibrations recorded.</p>
                                        </div>
                                    ) : (
                                        logs.map((log) => (
                                            <div key={log.id} className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-gold/20 hover:bg-white/[0.04] transition-all group">
                                                <div className={`h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner ${isDark ? 'text-gold' : 'text-emerald-900'}`}>
                                                    {log.action.includes('order') ? <Package className="w-5 h-5" /> : 
                                                     log.action.includes('setting') ? <Settings className="w-5 h-5" /> : 
                                                     <Activity className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-xs font-bold uppercase tracking-wider group-hover:text-gold transition-colors ${isDark ? 'text-gold-soft' : 'text-emerald-950'}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </p>
                                                    <p className="text-[10px] text-text-muted mt-1 font-bold opacity-60 tracking-widest">
                                                        {new Date(log.created_at).toLocaleString(undefined, { 
                                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="text-[10px] font-bold text-gold/20 uppercase tracking-widest group-hover:text-gold/40 transition-colors">
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
