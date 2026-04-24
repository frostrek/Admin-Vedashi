'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Search, Filter, Loader2, Edit2, Trash2, CheckCircle, XCircle, History, Eye, ArrowUp, ArrowDown, Type, Heading1, Info, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getAdminLegalDocuments,
    createAdminLegalDocument,
    updateAdminLegalDocument,
    deleteAdminLegalDocument,
    LegalDocument
} from '@/lib/api';

export default function LegalManagement() {
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentDoc, setCurrentDoc] = useState<Partial<LegalDocument> | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [blocks, setBlocks] = useState<{ type: 'heading' | 'paragraph' | 'html', text: string }[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getAdminLegalDocuments();
            setDocuments(data);
        } catch (error) {
            toast.error('Failed to load legal documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Helper to parse content into blocks or return a default single paragraph block
    const parseContentToBlocks = (content: string): { type: 'heading' | 'paragraph' | 'html', text: string }[] => {
        if (!content) return [];
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed) && parsed.every(b => (b.type === 'heading' || b.type === 'paragraph' || b.type === 'html') && typeof b.text === 'string')) {
                return parsed;
            }
        } catch (e) {
            // Not JSON, likely old HTML content or plain text
        }
        // Fallback: Check if it looks like HTML
        const looksLikeHtml = /<[a-z][\s\S]*>/i.test(content);
        return [{ type: looksLikeHtml ? 'html' : 'paragraph', text: content }];
    };

    useEffect(() => {
        if (currentDoc) {
            setBlocks(parseContentToBlocks(currentDoc.content || ''));
        } else {
            setBlocks([]);
        }
    }, [currentDoc?.id, isEditing]);

    const addBlock = (type: 'heading' | 'paragraph' | 'html') => {
        setBlocks([...blocks, { type, text: '' }]);
    };

    const updateBlock = (index: number, text: string) => {
        const newBlocks = [...blocks];
        newBlocks[index].text = text;
        setBlocks(newBlocks);
    };

    const deleteBlock = (index: number) => {
        const newBlocks = blocks.filter((_, i) => i !== index);
        setBlocks(newBlocks);
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === blocks.length - 1) return;

        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        setBlocks(newBlocks);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Convert blocks back to string for backend
        const content = JSON.stringify(blocks);

        if (!currentDoc?.slug || !currentDoc?.title || !content || !currentDoc?.version) {
            toast.error('All fields are required');
            return;
        }

        try {
            const docData = { ...currentDoc, content };
            let res;
            if (currentDoc.id) {
                res = await updateAdminLegalDocument(currentDoc.id, docData);
            } else {
                res = await createAdminLegalDocument(docData);
            }

            if (res.success) {
                toast.success(currentDoc.id ? 'Document updated' : 'New version created');
                setIsEditing(false);
                setCurrentDoc(null);
                loadData();
            } else {
                toast.error(res.message || 'Failed to save document');
            }
        } catch (error) {
            toast.error('Network error saving document');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this version?')) return;
        try {
            const success = await deleteAdminLegalDocument(id);
            if (success) {
                toast.success('Document deleted');
                loadData();
            } else {
                toast.error('Failed to delete document');
            }
        } catch (error) {
            toast.error('Network error deleting document');
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
                        Legal Content Management
                    </h1>
                    <p className="text-[15px] font-semibold text-black">
                        Manage Terms of Service, Privacy Policy, and other legal documents.
                    </p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => {
                            setCurrentDoc({ slug: '', title: '', content: '', version: '1.0.0', is_active: true });
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#E8D8B9] transition-all hover:bg-primary-light"
                    >
                        <Plus className="h-4 w-4" /> New Legal Document
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-card-bg border border-border-subtle rounded-xl p-6 animate-fadeIn">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                        <h4 className="font-serif text-xl font-bold text-text-primary">
                            {currentDoc?.id ? `Edit Version ${currentDoc.version}` : 'Create New Legal Document'}
                        </h4>
                        <button
                            onClick={() => { setIsEditing(false); setIsPreviewing(false); }}
                            className="text-text-muted hover:text-text-primary bg-page-bg px-3 py-1.5 rounded-lg text-sm border border-border-subtle transition"
                        >
                            Cancel
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
                                    Slug (URL Key) *
                                    <span className="relative group cursor-pointer inline-flex items-center">
                                        <Info className="w-4 h-4 text-text-muted hover:text-gold transition-colors duration-300" />
                                        <span className="absolute bottom-full left-0 origin-bottom-left mb-2 w-max max-w-xs px-3 py-2 text-xs font-medium text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                                            The URL path for this legal document (e.g., &apos;terms-of-service&apos;). Must be unique and use dashes for spaces.
                                        </span>
                                    </span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={currentDoc?.slug}
                                    onChange={e => setCurrentDoc({ ...currentDoc, slug: e.target.value })}
                                    placeholder="e.g. terms-of-service"
                                    className="w-full rounded-xl bg-page-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none"
                                    disabled={!!currentDoc?.id}
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
                                    Title (Display Name) *
                                    <span className="relative group cursor-pointer inline-flex items-center">
                                        <Info className="w-4 h-4 text-text-muted hover:text-gold transition-colors duration-300" />
                                        <span className="absolute bottom-full right-0 origin-bottom-right mb-2 w-max max-w-xs px-3 py-2 text-xs font-medium text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                                            The human-readable title of the document (e.g., &apos;Terms of Service&apos;). This will be displayed as the page title.
                                        </span>
                                    </span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={currentDoc?.title}
                                    onChange={e => setCurrentDoc({ ...currentDoc, title: e.target.value })}
                                    placeholder="e.g. Terms of Service"
                                    className="w-full rounded-xl bg-page-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
                                    Version *
                                    <span className="relative group cursor-pointer inline-flex items-center">
                                        <Info className="w-4 h-4 text-text-muted hover:text-gold transition-colors duration-300" />
                                        <span className="absolute bottom-full left-0 origin-bottom-left mb-2 w-max max-w-xs px-3 py-2 text-xs font-medium text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                                            The version number for this document (e.g., &apos;1.0.1&apos;). Updating the version helps track changes over time.
                                        </span>
                                    </span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={currentDoc?.version}
                                    onChange={e => setCurrentDoc({ ...currentDoc, version: e.target.value })}
                                    placeholder="e.g. 1.0.1"
                                    className="w-full rounded-xl bg-page-bg border border-border-subtle px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-8">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentDoc?.is_active}
                                        onChange={e => setCurrentDoc({ ...currentDoc, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-page-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success peer-checked:after:bg-white border border-border-subtle"></div>
                                </label>
                                <span className="text-sm text-text-primary font-medium">Set as Active Version</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                                    Structured Content (Heading & Paragraph Blocks) *
                                    <span className="relative group cursor-pointer inline-flex items-center">
                                        <Info className="w-4 h-4 text-text-muted hover:text-gold transition-colors duration-300" />
                                        <span className="absolute bottom-full left-0 origin-bottom-left mb-2 w-max max-w-xs px-3 py-2 text-xs font-medium text-white bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[99999]">
                                            Build your document using content blocks. Use headings for sections and paragraphs for the actual text. You can reorder them as needed.
                                        </span>
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => addBlock('heading')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-page-bg border border-border-subtle rounded-lg text-text-primary hover:border-gold transition"
                                    >
                                        <Heading1 className="h-3.5 w-3.5 text-gold" /> Add Heading
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addBlock('paragraph')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-page-bg border border-border-subtle rounded-lg text-text-primary hover:border-gold transition"
                                    >
                                        <Type className="h-3.5 w-3.5 text-gold" /> Add Paragraph
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => addBlock('html')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-page-bg border border-border-subtle rounded-lg text-text-primary hover:border-gold transition"
                                    >
                                        <Code className="h-3.5 w-3.5 text-gold" /> Add HTML
                                    </button>
                                    <div className="w-[1px] bg-border-subtle mx-1" />
                                    <button
                                        type="button"
                                        onClick={() => setIsPreviewing(!isPreviewing)}
                                        className="text-xs font-bold text-gold hover:text-gold-soft flex items-center gap-1 px-3"
                                    >
                                        <Eye className="h-3.5 w-3.5" /> {isPreviewing ? 'Show Editor' : 'Live Preview'}
                                    </button>
                                </div>
                            </div>

                            {isPreviewing ? (
                                <div className="w-full min-h-[400px] rounded-xl bg-page-bg border border-border-subtle p-8 overflow-y-auto">
                                    <div className="max-w-3xl mx-auto space-y-6">
                                        {blocks.length === 0 ? (
                                            <p className="text-text-muted italic text-center py-20">No content blocks added yet. Start by adding a heading or paragraph.</p>
                                        ) : blocks.map((block, idx) => (
                                            <div key={idx}>
                                                {block.type === 'heading' ? (
                                                    <h4 className="font-serif text-2xl font-bold text-gray-900">{block.text || 'Untitled Heading'}</h4>
                                                ) : block.type === 'paragraph' ? (
                                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{block.text || 'Empty paragraph content...'}</p>
                                                ) : (
                                                    <div className="max-w-none" dangerouslySetInnerHTML={{ __html: block.text || '<!-- Empty HTML block -->' }} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {blocks.length === 0 ? (
                                        <div className="border-2 border-dashed border-border-subtle rounded-2xl p-12 text-center">
                                            <div className="bg-page-bg w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                                                <Plus className="h-6 w-6 text-gold-muted" />
                                            </div>
                                            <p className="text-text-muted text-sm font-medium mb-4">No content blocks yet</p>
                                            <div className="flex justify-center gap-3">
                                                <button type="button" onClick={() => addBlock('heading')} className="text-xs font-bold text-gold bg-gold/5 px-4 py-2 rounded-xl border border-gold/20 hover:bg-gold/10 transition">Add Heading</button>
                                                <button type="button" onClick={() => addBlock('paragraph')} className="text-xs font-bold text-gold bg-gold/5 px-4 py-2 rounded-xl border border-gold/20 hover:bg-gold/10 transition">Add Paragraph</button>
                                                <button type="button" onClick={() => addBlock('html')} className="text-xs font-bold text-gold bg-gold/5 px-4 py-2 rounded-xl border border-gold/20 hover:bg-gold/10 transition">Add HTML</button>
                                            </div>
                                        </div>
                                    ) : blocks.map((block, idx) => (
                                        <div key={idx} className="group relative bg-page-bg/50 border border-border-subtle rounded-xl p-4 transition-all hover:bg-page-bg hover:border-gold/30">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${block.type === 'heading' ? 'bg-gold/10 text-gold border border-gold/20' :
                                                        block.type === 'paragraph' ? 'bg-success/10 text-success border border-success/20' :
                                                            'bg-neutral-800 text-gold border border-neutral-700'
                                                        }`}>
                                                        {block.type}
                                                    </span>
                                                    <span className="text-[10px] text-text-muted font-bold">#{idx + 1}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => moveBlock(idx, 'up')} className="p-1.5 text-text-muted hover:text-gold hover:bg-card-bg rounded-lg border border-transparent hover:border-border-subtle transition"><ArrowUp className="h-3.5 w-3.5" /></button>
                                                    <button type="button" onClick={() => moveBlock(idx, 'down')} className="p-1.5 text-text-muted hover:text-gold hover:bg-card-bg rounded-lg border border-transparent hover:border-border-subtle transition"><ArrowDown className="h-3.5 w-3.5" /></button>
                                                    <div className="w-[1px] h-4 bg-border-subtle mx-1" />
                                                    <button type="button" onClick={() => deleteBlock(idx)} className="p-1.5 text-text-muted hover:text-danger hover:bg-card-bg rounded-lg border border-transparent hover:border-border-subtle transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </div>
                                            {block.type === 'heading' ? (
                                                <input
                                                    type="text"
                                                    value={block.text}
                                                    onChange={e => updateBlock(idx, e.target.value)}
                                                    placeholder="Enter heading text..."
                                                    className="w-full bg-card-bg border border-border-subtle rounded-lg px-4 py-2.5 text-lg font-bold text-text-primary focus:border-gold focus:outline-none"
                                                />
                                            ) : block.type === 'paragraph' ? (
                                                <textarea
                                                    rows={4}
                                                    value={block.text}
                                                    onChange={e => updateBlock(idx, e.target.value)}
                                                    placeholder="Enter paragraph content..."
                                                    className="w-full bg-card-bg border border-border-subtle rounded-lg px-4 py-2.5 text-sm text-text-primary leading-relaxed focus:border-gold focus:outline-none resize-none"
                                                ></textarea>
                                            ) : (
                                                <div className="space-y-2">
                                                    <textarea
                                                        rows={10}
                                                        value={block.text}
                                                        onChange={e => updateBlock(idx, e.target.value)}
                                                        placeholder="Paste your raw HTML here (tables, custom styles, etc.)..."
                                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-xs font-mono text-gold leading-relaxed focus:border-gold focus:outline-none resize-none"
                                                    ></textarea>
                                                    <p className="text-[10px] text-text-muted italic">Warning: Raw HTML will be rendered directly. Ensure it is valid and safe.</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-border-subtle text-right flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setIsPreviewing(false); }}
                                className="px-6 py-2.5 rounded-xl border border-border-subtle text-text-muted hover:text-text-primary font-bold text-sm transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-lg bg-primary px-8 py-2.5 text-sm font-bold text-[#E8D8B9] border border-gold/10 transition-all hover:bg-primary-light shadow-lg shadow-primary/10"
                            >
                                {currentDoc?.id ? 'Update Version' : 'Save Document'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-card-bg border border-border-subtle rounded-xl py-6 min-h-[500px]">
                    <div className="flex items-center justify-between mb-6 px-6">
                        <h4 className="font-serif text-lg font-bold text-text-primary">Legal Documents & Versions</h4>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-48 sm:w-64 rounded-xl bg-page-bg border border-border-subtle py-2 pl-9 pr-4 text-sm text-text-primary focus:border-gold focus:outline-none"
                                />
                            </div>
                            <button className="rounded-xl border border-border-subtle bg-page-bg p-2 text-text-muted hover:text-text-primary transition">
                                <Filter className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-text-muted">
                            <thead className="bg-page-bg/50 text-sm font-semibold text-gold-muted uppercase">
                                <tr>
                                    <th className="pl-6 pr-4 py-3">Title / Slug</th>
                                    <th className="px-4 py-3">Version</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Last Updated</th>
                                    <th className="px-4 py-3 pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gold/50 mb-2" />
                                            <p>Loading documents...</p>
                                        </td>
                                    </tr>
                                ) : filteredDocs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-text-muted italic">
                                            No legal documents found.
                                        </td>
                                    </tr>
                                ) : filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-page-bg/30 transition">
                                        <td className="pl-6 pr-4 py-3">
                                            <p className="font-bold text-text-primary">{doc.title}</p>
                                            <p className="text-[10px] text-gold-muted font-bold uppercase">{doc.slug}</p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            v{doc.version}
                                        </td>
                                        <td className="px-4 py-3">
                                            {doc.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-[10px] font-black uppercase text-success">
                                                    <CheckCircle className="h-3 w-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-page-bg px-2.5 py-1 text-[10px] font-black uppercase text-text-muted border border-border-subtle">
                                                    <History className="h-3 w-3" /> Archived
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary text-xs">
                                            {new Date(doc.updated_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 pr-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setCurrentDoc(doc); setIsEditing(true); }}
                                                    className="p-2 text-text-muted hover:text-gold transition bg-page-bg rounded-lg border border-border-subtle"
                                                    title="Edit Version"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-2 text-text-muted hover:text-danger transition bg-page-bg rounded-lg border border-border-subtle"
                                                    title="Delete Version"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
