'use client';

import { useState, useEffect } from 'react';
import { getSynonyms, createSynonym, updateSynonym, deleteSynonym, SearchSynonym } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SynonymsPage() {
    const [synonyms, setSynonyms] = useState<SearchSynonym[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [keyword, setKeyword] = useState('');
    const [synonymList, setSynonymList] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadData = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        const data = await getSynonyms();
        setSynonyms(data);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const openModal = (item?: SearchSynonym) => {
        if (item) {
            setIsEditing(true);
            setEditId(item.synonym_id);
            setKeyword(item.keyword);
            setSynonymList(item.synonyms.join(', '));
            setIsActive(item.is_active);
        } else {
            setIsEditing(false);
            setEditId(null);
            setKeyword('');
            setSynonymList('');
            setIsActive(true);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditId(null);
    };

    const handleSave = async () => {
        if (!keyword.trim() || !synonymList.trim()) {
            toast.error("Keyword and Synonyms are required.");
            return;
        }

        const synonymsArray = synonymList.split(',').map(s => s.trim()).filter(Boolean);
        if (synonymsArray.length === 0) {
            toast.error("At least one valid synonym is required.");
            return;
        }

        setSaving(true);
        try {
            if (isEditing && editId) {
                const { success, error } = await updateSynonym(editId, {
                    keyword: keyword.trim(),
                    synonyms: synonymsArray,
                    is_active: isActive
                });
                if (success) {
                    toast.success("Synonym updated successfully", {
                        className: '!bg-card-bg-elevated !text-text-primary !border !border-border',
                        iconTheme: { primary: '#C6A75E', secondary: '#1A1A1A' }
                    });
                    closeModal();
                    loadData();
                } else {
                    toast.error(error || "Failed to update synonym");
                }
            } else {
                const { success, error } = await createSynonym({
                    keyword: keyword.trim(),
                    synonyms: synonymsArray,
                    is_active: isActive
                });
                if (success) {
                    toast.success("Synonym created successfully", {
                        className: '!bg-card-bg-elevated !text-text-primary !border !border-border',
                        iconTheme: { primary: '#C6A75E', secondary: '#1A1A1A' }
                    });
                    closeModal();
                    loadData();
                } else {
                    toast.error(error || "Failed to create synonym");
                }
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, kw: string) => {
        if (!confirm(`Are you sure you want to delete the mapping for "${kw}"?`)) return;

        const success = await deleteSynonym(id);
        if (success) {
            toast.success("Synonym deleted", {
                className: '!bg-card-bg-elevated !text-text-primary !border !border-border',
                iconTheme: { primary: '#ef4444', secondary: '#1A1A1A' }
            });
            setSynonyms(s => s.filter(x => x.synonym_id !== id));
        } else {
            toast.error("Failed to delete synonym");
        }
    };

    const toggleStatus = async (item: SearchSynonym) => {
        const { success } = await updateSynonym(item.synonym_id, {
            is_active: !item.is_active
        });
        if (success) {
            toast.success(`Synonym ${!item.is_active ? 'enabled' : 'disabled'}`, {
                className: '!bg-card-bg-elevated !text-text-primary !border !border-border',
                iconTheme: { primary: '#C6A75E', secondary: '#1A1A1A' }
            });
            loadData();
        } else {
            toast.error("Failed to update status");
        }
    };

    const filtered = synonyms.filter(s =>
        s.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.synonyms.join(' ').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-gold-soft">Search Synonyms</h1>
                    <p className="text-sm text-text-muted mt-1">Map search terms to related words for better results.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-gold hover:bg-gold/[0.06] border border-border transition-all duration-300"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center space-x-2 bg-gradient-to-r from-primary to-primary-light text-[#E8D8B9] px-4 py-2 rounded-xl text-sm font-semibold hover:from-primary-light hover:to-primary transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Synonym</span>
                    </button>
                </div>
            </div>

            {/* Search Filter */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-1 shadow-sm transition-all duration-300 focus-within:border-gold/30 focus-within:ring-1 focus-within:ring-gold/20">
                <div className="relative flex items-center h-12">
                    <Search className="absolute left-4 h-5 w-5 text-text-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search keywords or synonyms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent pl-12 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-page-bg border-b border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider">
                                <th className="px-6 py-4">Keyword</th>
                                <th className="px-6 py-4">Synonyms</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4">Last Updated</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
                                        <p className="text-text-muted mt-3 text-sm animate-pulse">Loading synonyms...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-16 text-center text-text-muted">
                                        <div className="w-16 h-16 rounded-full bg-gold/5 flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="w-8 h-8 text-gold/60" />
                                        </div>
                                        <p className="text-base font-medium text-text-primary mb-1">No synonyms found</p>
                                        <p className="text-sm opacity-80">Click "Add Synonym" to create one.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(syn => (
                                    <tr key={syn.synonym_id} className="hover:bg-gold/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gold bg-gold/10 px-2.5 py-1 rounded-md text-sm border border-gold/20">
                                                {syn.keyword}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {syn.synonyms.map((s, idx) => (
                                                    <span key={idx} className="text-xs text-text-secondary bg-page-bg px-2 py-0.5 rounded-md border border-border-subtle">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleStatus(syn)}
                                                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${syn.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                                                    }`}
                                            >
                                                {syn.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted text-xs tabular-nums font-mono">
                                            {new Date(syn.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openModal(syn)}
                                                    className="p-2 text-text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-all duration-300"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(syn.synonym_id, syn.keyword)}
                                                    className="p-2 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-300"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit / Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-card-bg rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border-subtle relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                            <h2 className="text-xl font-bold font-serif text-gold-soft relative z-10">
                                {isEditing ? 'Edit Synonym' : 'Add Synonym'}
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                                    Target Keyword
                                </label>
                                <input
                                    type="text"
                                    value={keyword}
                                    onChange={e => setKeyword(e.target.value)}
                                    placeholder="e.g., shiraz"
                                    className="w-full p-3 bg-page-bg border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
                                />
                                <p className="text-[11px] text-text-muted/70 mt-1.5 ml-1">The main search term customers use.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                                    Synonyms (comma separated)
                                </label>
                                <textarea
                                    value={synonymList}
                                    onChange={e => setSynonymList(e.target.value)}
                                    placeholder="e.g., syrah, hermitage"
                                    rows={3}
                                    className="w-full p-3 bg-page-bg border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all resize-none"
                                />
                                <p className="text-[11px] text-text-muted/70 mt-1.5 ml-1">Searches for the target keyword will also match these.</p>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-page-bg border border-border hover:border-border-subtle transition-colors cursor-pointer" onClick={() => setIsActive(!isActive)}>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all duration-200 ${isActive ? 'bg-gold border-gold text-primary' : 'bg-transparent border-gray-500'}`}>
                                    {isActive && <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                                <label className="text-sm font-medium text-text-primary cursor-pointer select-none">Set as Active</label>
                            </div>
                        </div>
                        <div className="p-5 border-t border-border-subtle bg-page-bg flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-xl transition-all duration-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-light text-[#E8D8B9] rounded-xl text-sm font-semibold hover:from-primary-light hover:to-primary shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                <span>{saving ? 'Saving...' : 'Save Synonym'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
