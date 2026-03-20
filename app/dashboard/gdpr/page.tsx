'use client';

import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, FileText, Database, Plus, Search, Filter, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAdminGdprRequests, getAdminGdprBreaches, getAdminGdprProcessors, createAdminGdprProcessor, deleteAdminGdprProcessor, createAdminGdprBreach, authFetch } from '@/lib/api';

export default function GDPRDashboard() {
    const [activeTab, setActiveTab] = useState<'requests' | 'breaches' | 'processors'>('requests');
    const [isReportingBreach, setIsReportingBreach] = useState(false);
    const [loading, setLoading] = useState(true);

    const [requests, setRequests] = useState<any[]>([]);
    const [breaches, setBreaches] = useState<any[]>([]);
    const [processors, setProcessors] = useState<any[]>([]);
    const [isAddingProcessor, setIsAddingProcessor] = useState(false);
    const [processorForm, setProcessorForm] = useState({
        name: '',
        purpose: '',
        location: '',
        dpa_signed: false
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [reqData, breachData, procData] = await Promise.all([
                getAdminGdprRequests(),
                getAdminGdprBreaches(),
                getAdminGdprProcessors()
            ]);
            setRequests(reqData);
            setBreaches(breachData);
            setProcessors(procData);
        } catch (error) {
            toast.error('Failed to load GDPR data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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
            const res = await createAdminGdprBreach({
                incidentDate: breachForm.incidentDate,
                discoveryDate: breachForm.discoveryDate,
                natureOfBreach: breachForm.natureOfBreach,
                dataCategories: breachForm.dataCategories.split(',').map(s => s.trim()),
                approxRecords: parseInt(breachForm.approxRecords),
                consequences: breachForm.consequences,
                mitigation: breachForm.mitigation,
                dpaNotified: breachForm.dpaNotified,
                dpaNotifiedDate: breachForm.dpaNotified ? new Date().toISOString() : null
            });

            if (res.success) {
                toast.success('Breach report successfully logged.');
                setIsReportingBreach(false);
                loadData(); // Refresh list
            } else {
                toast.error(res.message || 'Failed to report breach.');
            }
        } catch (error) {
            toast.error('Network error reporting breach.');
        }
    };

    const handleAddProcessor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await createAdminGdprProcessor(processorForm);
            if (res.success) {
                toast.success('Processor added successfully.');
                setIsAddingProcessor(false);
                setProcessorForm({ name: '', purpose: '', location: '', dpa_signed: false });
                loadData();
            } else {
                toast.error(res.message || 'Failed to add processor.');
            }
        } catch (error) {
            toast.error('Network error adding processor.');
        }
    };

    const handleDeleteProcessor = async (id: string) => {
        if (!confirm('Are you sure you want to remove this data processor?')) return;
        try {
            const res = await deleteAdminGdprProcessor(id);
            if (res.success) {
                toast.success('Processor removed.');
                loadData();
            } else {
                toast.error(res.message || 'Failed to remove processor.');
            }
        } catch (error) {
            toast.error('Network error removing processor.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-gold" />
                        GDPR Compliance Center
                    </h1>
                    <p className="text-text-muted font-semiboldtext-sm border-l-2 border-black/50 pl-3">
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
                            : 'text-text-muted hover:text-text-primary hover:bg-card-bg/50'
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
                            <h4 className="font-serif text-lg font-bold text-text-primary">Incoming DSRs</h4>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                    <input type="text" placeholder="Search requests..." className="w-48 sm:w-64 rounded-xl bg-page-bg border border-border-subtle py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-gold focus:outline-none" />
                                </div>
                                <button className="rounded-xl border border-border-subtle bg-page-bg p-2 text-text-muted hover:text-text-primary transition">
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
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gold/50 mb-2" />
                                                <p>Loading requests...</p>
                                            </td>
                                        </tr>
                                    ) : requests.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-text-muted italic">
                                                No data subject requests found.
                                            </td>
                                        </tr>
                                    ) : requests.map((req) => (
                                        <tr key={req.request_id || req.id} className="hover:bg-page-bg/30 transition">
                                            <td className="px-4 py-3 font-mono text-gold-muted uppercase text-xs">
                                                {req.request_id?.substring(0, 8) || `REQ-${req.id}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-text-primary">{req.customer_name || req.customer}</p>
                                                <p className="text-[10px] text-text-muted font-bold">{req.customer_email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="rounded bg-page-bg px-2 py-1 text-[10px] font-black border border-border-subtle text-text-muted">
                                                    {req.request_type || req.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-text-secondary text-xs">
                                                {new Date(req.created_at || req.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${req.status === 'COMPLETED' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                                                    }`}>
                                                    <span className={`h-1 w-1 rounded-full ${req.status === 'COMPLETED' ? 'bg-success' : 'bg-warning'}`}></span>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button className="text-gold hover:text-text-primary text-[10px] font-black uppercase bg-gold/10 px-3 py-1.5 rounded-lg transition">Review</button>
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
                            <h4 className="font-serif text-lg font-bold text-text-primary">Third-Party Processors</h4>
                            <button 
                                onClick={() => setIsAddingProcessor(true)}
                                className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 font-semibold text-white transition hover:bg-gold-soft shadow-lg shadow-gold/20 text-sm"
                            >
                                <Plus className="h-4 w-4" /> Add Processor
                            </button>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {loading ? (
                                <div className="col-span-full py-12 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gold/40 mb-2" />
                                    <p>Loading processors...</p>
                                </div>
                            ) : processors.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-text-muted italic">
                                    No processors registered.
                                </div>
                            ) : processors.map(proc => (
                                <div key={proc.processor_id || proc.id} className="group relative border border-border-subtle rounded-xl p-5 bg-page-bg/50 hover:bg-page-bg transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-serif text-text-primary font-bold">{proc.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${(proc.dpa_signed || proc.dpa) ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                                DPA {(proc.dpa_signed || proc.dpa) ? 'Signed' : 'Missing'}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteProcessor(proc.processor_id || proc.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-danger hover:bg-danger/10 rounded-lg transition"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-13 text-text-secondary mb-1"><span className="text-text-muted font-bold uppercase text-[9px]">Purpose:</span> {proc.purpose}</p>
                                    <p className="text-13 text-text-secondary"><span className="text-text-muted font-bold uppercase text-[9px]">Location:</span> {proc.location}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── BREACH LOGS ─── */}
                {activeTab === 'breaches' && (
                    <div className="animate-fadeIn">
                        {!isReportingBreach ? (
                            <div className="space-y-6">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold/40 mb-2" />
                                        <p className="text-text-muted">Searching the archives...</p>
                                    </div>
                                ) : breaches.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4 border border-success/20">
                                            <Shield className="h-8 w-8 text-success" />
                                        </div>
                                        <h4 className="font-serif text-lg font-bold text-text-primary mb-2">No Security Incidents</h4>
                                        <p className="text-text-muted text-sm max-w-sm">
                                            There are currently no recorded data breaches. In the event of a breach, you must log it here within 72 hours of discovery.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-text-muted">
                                            <thead className="bg-page-bg/50 text-xs uppercase text-text-muted">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold">Incident Date</th>
                                                    <th className="px-4 py-3 font-semibold">Nature</th>
                                                    <th className="px-4 py-3 font-semibold">Affected</th>
                                                    <th className="px-4 py-3 font-semibold">DPA Notified</th>
                                                    <th className="px-4 py-3 font-semibold text-right">Records</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-subtle">
                                                {breaches.map((b: any) => (
                                                    <tr key={b.log_id} className="hover:bg-page-bg/30 transition">
                                                        <td className="px-4 py-3 text-xs">
                                                            {new Date(b.incident_date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-bold text-text-primary line-clamp-1">{b.nature_of_breach}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs italic">
                                                            {b.data_categories_affected?.join(', ') || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${b.dpa_notified ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                                                {b.dpa_notified ? 'YES' : 'NO'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-gold">
                                                            {b.approx_records_affected?.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto border border-border-subtle bg-page-bg/50 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                                    <h4 className="font-serif text-xl font-bold text-text-primary flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-danger" /> Log Data Breach
                                    </h4>
                                    <button onClick={() => setIsReportingBreach(false)} className="text-text-muted hover:text-text-primary bg-card-bg px-3 py-1.5 rounded-lg text-sm border border-border-subtle transition">Cancel</button>
                                </div>

                                <form onSubmit={handleReportBreach} className="space-y-5">
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Date of Incident *</label>
                                            <input required type="datetime-local" value={breachForm.incidentDate} onChange={e => setBreachForm({ ...breachForm, incidentDate: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Date of Discovery *</label>
                                            <input required type="datetime-local" value={breachForm.discoveryDate} onChange={e => setBreachForm({ ...breachForm, discoveryDate: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Nature of Breach *</label>
                                        <textarea required rows={3} value={breachForm.natureOfBreach} onChange={e => setBreachForm({ ...breachForm, natureOfBreach: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none placeholder:text-text-muted/50" placeholder="Describe what happened (e.g. Unauthorized access, malware, lost device)..."></textarea>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Affected Data Categories</label>
                                            <input type="text" value={breachForm.dataCategories} onChange={e => setBreachForm({ ...breachForm, dataCategories: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none" placeholder="Emails, Passwords, etc. (comma separated)" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Approx. Records Affected</label>
                                            <input required type="number" min="1" value={breachForm.approxRecords} onChange={e => setBreachForm({ ...breachForm, approxRecords: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none" placeholder="e.g. 5000" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Probable Consequences</label>
                                        <textarea rows={2} value={breachForm.consequences} onChange={e => setBreachForm({ ...breachForm, consequences: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none" placeholder="Potential risks to data subjects..."></textarea>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Mitigation Measures Taken</label>
                                        <textarea rows={2} value={breachForm.mitigation} onChange={e => setBreachForm({ ...breachForm, mitigation: e.target.value })} className="w-full rounded-xl bg-card-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none" placeholder="Steps taken to secure systems..."></textarea>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={breachForm.dpaNotified} onChange={e => setBreachForm({ ...breachForm, dpaNotified: e.target.checked })} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-page-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-danger peer-checked:after:bg-white border border-border-subtle"></div>
                                        </label>
                                        <span className="text-sm text-text-primary">Supervisory Authority (DPA) Notified</span>
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

            {/* ADD PROCESSOR MODAL */}
            {isAddingProcessor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddingProcessor(false)} />
                    <div className="relative bg-card-bg border border-border-subtle w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeInUp">
                        <div className="p-6 border-b border-border-subtle bg-page-bg/30">
                            <h4 className="font-serif text-xl font-bold text-text-primary">Add Data Processor</h4>
                            <p className="text-xs text-text-muted mt-1">Register a third-party service that handles user data</p>
                        </div>
                        
                        <form onSubmit={handleAddProcessor}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-text-secondary mb-2">Processor Name</label>
                                    <input 
                                        required
                                        type="text"
                                        value={processorForm.name}
                                        onChange={(e) => setProcessorForm({...processorForm, name: e.target.value})}
                                        placeholder="e.g. Stripe, AWS, Mailchimp"
                                        className="w-full bg-card-bg border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:border-gold focus:outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-text-secondary mb-2">Primary Purpose</label>
                                    <input 
                                        required
                                        type="text"
                                        value={processorForm.purpose}
                                        onChange={(e) => setProcessorForm({...processorForm, purpose: e.target.value})}
                                        placeholder="e.g. Payment Gateway"
                                        className="w-full bg-card-bg border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:border-gold focus:outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-text-secondary mb-2">Data Location</label>
                                    <input 
                                        required
                                        type="text"
                                        value={processorForm.location}
                                        onChange={(e) => setProcessorForm({...processorForm, location: e.target.value})}
                                        placeholder="e.g. USA, EEA, Global"
                                        className="w-full bg-card-bg border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:border-gold focus:outline-none transition-all"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={processorForm.dpa_signed} 
                                            onChange={(e) => setProcessorForm({...processorForm, dpa_signed: e.target.checked})} 
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-page-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success peer-checked:after:bg-white border border-border-subtle"></div>
                                    </label>
                                    <span className="text-sm text-text-primary">Data Processing Agreement (DPA) Signed</span>
                                </div>
                            </div>

                            <div className="p-6 bg-page-bg/30 border-t border-border-subtle flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddingProcessor(false)}
                                    className="flex-1 py-3 text-xs font-bold uppercase text-text-muted hover:text-text-primary transition-colors bg-card-bg rounded-xl border border-border-subtle"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 bg-gold hover:bg-gold-soft text-white py-3 rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-gold/20"
                                >
                                    Add Processor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
