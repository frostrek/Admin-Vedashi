'use client';
import { authFetch } from '@/lib/api';

import { useState } from 'react';
import { Shield, AlertTriangle, FileText, Database, Plus, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GDPRDashboard() {
    const [activeTab, setActiveTab] = useState<'requests' | 'breaches' | 'processors'>('requests');
    const [isReportingBreach, setIsReportingBreach] = useState(false);

    // Mock Data for Admin demonstration  (can be wired to real endpoints)
    const [requests] = useState([
        { id: 1, customer: 'John Doe', type: 'ERASURE', status: 'PENDING', date: '2023-10-25' },
        { id: 2, customer: 'Jane Smith', type: 'PORTABILITY', status: 'COMPLETED', date: '2023-10-24' },
    ]);

    const [processors] = useState([
        { id: 1, name: 'Stripe', purpose: 'Payment Processing', location: 'USA', dpa: true },
        { id: 2, name: 'AWS', purpose: 'Cloud Hosting', location: 'USA', dpa: true },
        { id: 3, name: 'Google Analytics', purpose: 'Website Analytics', location: 'USA', dpa: false },
    ]);

    const [breachForm, setBreachForm] = useState({
        incidentDate: '',
        discoveryDate: '',
        natureOfBreach: '',
        dataCategories: '',
        approxRecords: '',
        consequences: '',
        mitigation: '',
        dpaNotified: false
    });

    const handleReportBreach = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('ADMIN_TOKEN');
            const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/gdpr/breach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-CSRF-Token': (() => {
                        const match = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/) : null;
                        return match ? decodeURIComponent(match[1]) : '';
                    })()
                },
                body: JSON.stringify({
                    incidentDate: breachForm.incidentDate,
                    discoveryDate: breachForm.discoveryDate,
                    natureOfBreach: breachForm.natureOfBreach,
                    dataCategories: breachForm.dataCategories.split(',').map(s => s.trim()),
                    approxRecords: parseInt(breachForm.approxRecords),
                    consequences: breachForm.consequences,
                    mitigation: breachForm.mitigation,
                    dpaNotified: breachForm.dpaNotified,
                    dpaNotifiedDate: breachForm.dpaNotified ? new Date().toISOString() : null
                })
            });

            if (res.ok) {
                toast.success('Breach report successfully logged.');
                setIsReportingBreach(false);
            } else {
                toast.error('Failed to report breach.');
            }
        } catch (error) {
            toast.error('Network error reporting breach.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-white mb-1 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-gold" />
                        GDPR Compliance Center
                    </h1>
                    <p className="text-text-muted text-sm border-l-2 border-gold/50 pl-3">
                        Monitor Data Subject Requests, register processors, and log data breaches.
                    </p>
                </div>
                {activeTab === 'breaches' && !isReportingBreach && (
                    <button
                        onClick={() => setIsReportingBreach(true)}
                        className="flex items-center gap-2 rounded-xl bg-danger px-4 py-2 font-semibold text-white transition hover:bg-red-600 shadow-lg shadow-danger/20"
                    >
                        <AlertTriangle className="h-4 w-4" /> Report Breach (72h Policy)
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-border-subtle p-1">
                {[
                    { id: 'requests', label: 'Data Subject Requests', icon: FileText },
                    { id: 'breaches', label: 'Breach Register', icon: AlertTriangle },
                    { id: 'processors', label: 'Data Processors', icon: Database },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setIsReportingBreach(false); }}
                        className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-t-xl px-5 py-3 text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-card-bg text-gold border-t border-x border-border-subtle'
                            : 'text-text-muted hover:text-white hover:bg-card-bg/50'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" /> <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-card-bg border border-border-subtle rounded-xl p-6 min-h-[500px]">
                {/* ─── DATA SUBJECT REQUESTS ─── */}
                {activeTab === 'requests' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Incoming DSRs</h2>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <input type="text" placeholder="Search requests..." className="w-48 sm:w-64 rounded-xl bg-page-bg border border-border-subtle py-2 pl-9 pr-4 text-sm text-white focus:border-gold focus:outline-none" />
                                </div>
                                <button className="rounded-xl border border-border-subtle bg-page-bg p-2 text-text-muted hover:text-white transition">
                                    <Filter className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-text-muted">
                                <thead className="bg-page-bg/50 text-xs uppercase text-text-muted">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Request ID</th>
                                        <th className="px-4 py-3 font-semibold">Customer</th>
                                        <th className="px-4 py-3 font-semibold">Type</th>
                                        <th className="px-4 py-3 font-semibold">Date Received</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-subtle">
                                    {requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-page-bg/30 transition">
                                            <td className="px-4 py-3 font-mono text-gold-muted">REQ-{req.id.toString().padStart(4, '0')}</td>
                                            <td className="px-4 py-3 font-medium text-white">{req.customer}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded bg-page-bg px-2 py-1 text-xs border border-border-subtle">
                                                    {req.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{req.date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${req.status === 'COMPLETED' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                                                    }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${req.status === 'COMPLETED' ? 'bg-success' : 'bg-warning'}`}></span>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button className="text-gold hover:text-white text-xs font-semibold bg-gold/10 px-3 py-1.5 rounded-lg transition">Review</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── DATA PROCESSORS ─── */}
                {activeTab === 'processors' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Third-Party Processors</h2>
                            <button className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 font-semibold text-[#2D2926] transition hover:bg-gold-soft shadow-lg shadow-gold/20 text-sm">
                                <Plus className="h-4 w-4" /> Add Processor
                            </button>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {processors.map(proc => (
                                <div key={proc.id} className="border border-border-subtle rounded-xl p-5 bg-page-bg/50 hover:bg-page-bg transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-white font-bold">{proc.name}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${proc.dpa ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                            DPA {proc.dpa ? 'Signed' : 'Missing'}
                                        </span>
                                    </div>
                                    <p className="text-13 text-text-muted mb-1"><span className="text-white/60">Purpose:</span> {proc.purpose}</p>
                                    <p className="text-13 text-text-muted"><span className="text-white/60">Location:</span> {proc.location}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── BREACH LOGS ─── */}
                {activeTab === 'breaches' && (
                    <div className="animate-fadeIn">
                        {!isReportingBreach ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4 border border-success/20">
                                    <Shield className="h-8 w-8 text-success" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No Security Incidents</h3>
                                <p className="text-text-muted text-sm max-w-sm">
                                    There are currently no recorded data breaches. In the event of a breach, you must log it here within 72 hours of discovery.
                                </p>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto border border-border-subtle bg-page-bg/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-danger" /> Log Data Breach
                                    </h2>
                                    <button onClick={() => setIsReportingBreach(false)} className="text-text-muted hover:text-white bg-card-bg px-3 py-1.5 rounded-lg text-sm border border-border-subtle transition">Cancel</button>
                                </div>

                                <form onSubmit={handleReportBreach} className="space-y-5">
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1.5">Date of Incident *</label>
                                            <input required type="datetime-local" value={breachForm.incidentDate} onChange={e => setBreachForm({ ...breachForm, incidentDate: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1.5">Date of Discovery *</label>
                                            <input required type="datetime-local" value={breachForm.discoveryDate} onChange={e => setBreachForm({ ...breachForm, discoveryDate: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white mb-1.5">Nature of Breach *</label>
                                        <textarea required rows={3} value={breachForm.natureOfBreach} onChange={e => setBreachForm({ ...breachForm, natureOfBreach: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none placeholder:text-text-muted/50" placeholder="Describe what happened (e.g. Unauthorized access, malware, lost device)..."></textarea>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1.5">Affected Data Categories</label>
                                            <input type="text" value={breachForm.dataCategories} onChange={e => setBreachForm({ ...breachForm, dataCategories: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none" placeholder="Emails, Passwords, etc. (comma separated)" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1.5">Approx. Records Affected</label>
                                            <input required type="number" min="1" value={breachForm.approxRecords} onChange={e => setBreachForm({ ...breachForm, approxRecords: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none" placeholder="e.g. 5000" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white mb-1.5">Probable Consequences</label>
                                        <textarea rows={2} value={breachForm.consequences} onChange={e => setBreachForm({ ...breachForm, consequences: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none" placeholder="Potential risks to data subjects..."></textarea>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-white mb-1.5">Mitigation Measures Taken</label>
                                        <textarea rows={2} value={breachForm.mitigation} onChange={e => setBreachForm({ ...breachForm, mitigation: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-white focus:border-gold focus:outline-none" placeholder="Steps taken to secure systems..."></textarea>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={breachForm.dpaNotified} onChange={e => setBreachForm({ ...breachForm, dpaNotified: e.target.checked })} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-page-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger peer-checked:after:bg-white border border-border-subtle"></div>
                                        </label>
                                        <span className="text-sm text-white">Supervisory Authority (DPA) Notified</span>
                                    </div>

                                    <div className="pt-6 border-t border-border-subtle text-right">
                                        <button type="submit" className="rounded-xl bg-danger px-8 py-3 text-sm font-bold text-white transition hover:bg-red-600 shadow-lg shadow-danger/20">
                                            Submit Official Report
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}
