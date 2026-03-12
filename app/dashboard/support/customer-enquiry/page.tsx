'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    MessageSquare, Star, Clock, Search, Filter, Mail, User, 
    ChevronDown, CheckCircle, HelpCircle, Bug, Inbox, XCircle, 
    Paperclip, Send, Lock, Edit3, Smartphone, ExternalLink, RefreshCw, Trash2
} from 'lucide-react';
import { getAdminFeedback, updateFeedbackStatus, replyToFeedback } from '@/lib/api';
import toast from 'react-hot-toast';

const TYPES = ['all', 'suggestion', 'complaint', 'bug_report', 'contact', 'other'];
const STATUSES = ['all', 'new', 'reviewed', 'resolved', 'dismissed'];
const ASSIGNEES = ['all', 'unassigned', 'me', 'other'];

const STATUS_CONFIG: Record<string, { color: string, colorBadge: string, icon: any, label: string }> = {
    new: { color: 'text-info', colorBadge: 'bg-info/10 text-info', icon: Inbox, label: 'Pending' },
    reviewed: { color: 'text-warning', colorBadge: 'bg-warning/10 text-warning', icon: Search, label: 'Open' },
    resolved: { color: 'text-success', colorBadge: 'bg-success/10 text-success', icon: CheckCircle, label: 'Resolved' },
    dismissed: { color: 'text-text-muted', colorBadge: 'bg-text-muted/10 text-text-muted', icon: XCircle, label: 'Dismissed' },
};

const TYPE_ICONS: Record<string, any> = {
    other: Inbox
};

const CANNED_RESPONSES = [
    { name: 'Greeting', text: 'Namaste! Thank you for reaching out to Vedashi. How can we assist you with your herbal wellness journey today?' },
    { name: 'Order Status', text: 'Thank you for your enquiry. Your order is currently being processed and will be dispatched shortly. You will receive a tracking link via email once it is on its way.' },
    { name: 'Shipping Delay', text: 'Namaste! We sincerely apologize for the delay in your order. Due to high demand for our authentic herbal formulations, processing is taking slightly longer than usual. Your order will be dispatched within the next 24-48 hours. Thank you for your patience.' },
    { name: 'Dosha Guide', text: 'To assist you better, we recommend taking our Dosha quiz on the website. Ayurveda works best when tailored to your unique Prakriti (constitution).' },
    { name: 'Ayurvedic Consult', text: 'Namaste! For a more personalized wellness plan, we suggest booking a private consultation with our Ayurvedic experts. They can provide deeper insights into your specific health needs.' },
    { name: 'Natural Quality', text: 'All Vedashi products are 100% natural, ethically sourced, and follow authentic Ayurvedic formulations without any synthetic additives.' },
    { name: 'Usage Directions', text: 'For best results, we recommend taking this formulation twice a day, preferably after meals with warm water or as directed by your physician. Consistency is key to experiencing the full benefits of Ayurveda.' },
    { name: 'Feedback Request', text: 'We hope you are enjoying your Vedashi experience! If you have a moment, we would love to hear your feedback on our products. Your insights help us serve the wellness community better.' },
    { name: 'Closing', text: 'We hope this helps! Please let us know if you have any other questions. Wishing you vitality and balance.' }
];

// Helper: initials
const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

// Helper: relative time
const timeAgo = (dateInput: string | Date | undefined) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function AdminFeedbackPage() {
    const [data, setData] = useState<any>({ feedback: [], total: 0 });
    const [filters, setFilters] = useState({ type: 'all', status: 'all', search: '', assignee: 'all' });
    const [loading, setLoading] = useState(true);
    
    const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const [replyText, setReplyText] = useState('');
    const [replyType, setReplyType] = useState<'reply' | 'note'>('reply');
    const [showTemplates, setShowTemplates] = useState(false);
    
    // Simulate Working Features Locally
    const [localReplies, setLocalReplies] = useState<Record<string, {type: 'reply'|'note', text: string, date: Date}[]>>({});
    const [localTags, setLocalTags] = useState<Record<string, string[]>>({});
    const [localAssignments, setLocalAssignments] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = async () => {
        setLoading(true);
        const params: any = {};
        if (filters.type !== 'all') params.type = filters.type;
        if (filters.status !== 'all') params.status = filters.status;
        if (filters.search) params.search = filters.search;
        const result = await getAdminFeedback(params);
        setData(result);
        
        // Auto-select first item if possible
        if (result.feedback && result.feedback.length > 0 && !selectedFeedbackId) {
            setSelectedFeedbackId(result.feedback[0].feedback_id);
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, [filters.type, filters.status, filters.search]); 

    const handleStatus = async (id: string, status: string) => {
        const r = await updateFeedbackStatus(id, status);
        if (r.success) { 
            toast.success(`Marked as ${status}`); 
            load(); 
        }
        else toast.error('Update failed');
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedFeedbackId) return;
        
        const loadingToast = toast.loading(`${replyType === 'note' ? 'Saving note...' : 'Sending reply...'}`);
        
        try {
            const r = await replyToFeedback(selectedFeedbackId, replyText, replyType);
            if (r.success) {
                toast.success(`${replyType === 'note' ? 'Internal note saved' : 'Reply sent successfully!'}`, { id: loadingToast });
                setReplyText('');
                load(); // Refresh to show new reply from backend
            } else {
                toast.error(r.message || 'Action failed', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Network error', { id: loadingToast });
        }
    };


    const handleAddTag = () => {
        if (!selectedFeedbackId) return;
        const tag = window.prompt('Enter new tag:');
        if (tag && tag.trim()) {
            setLocalTags(prev => ({
                ...prev,
                [selectedFeedbackId]: [...(prev[selectedFeedbackId] || []), tag.trim()]
            }));
            toast.success('Tag added');
        }
    };

    const handleAssign = () => {
        if (!selectedFeedbackId) return;
        const assignee = window.prompt('Assign to (enter name):', 'Aditya N.');
        if (assignee && assignee.trim()) {
            setLocalAssignments(prev => ({
                ...prev,
                [selectedFeedbackId]: assignee.trim()
            }));
            toast.success(`Assigned to ${assignee}`);
        }
    };

    const toggleSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkAction = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const action = e.target.value;
        if (!action || selectedIds.length === 0) return;

        if (confirm(`Are you sure you want to apply this action to ${selectedIds.length} items?`)) {
            let successCount = 0;
            for (const id of selectedIds) {
                const r = await updateFeedbackStatus(id, action);
                if (r.success) successCount++;
            }
            toast.success(`Updated ${successCount} enquiries successfully`);
            setSelectedIds([]);
            load();
        }
        e.target.value = ''; // Reset dropdown
    };

    const selectedFeedback = data.feedback?.find((f: any) => f.feedback_id === selectedFeedbackId);

    // Simulate Base Tags logic based on type
    const getBaseTags = (fb: any) => {
        return fb.type === 'bug_report' ? ['#bug', 'high-priority'] : 
               fb.type === 'complaint' ? ['#exchange', fb.rating ? `rating-${fb.rating}` : null].filter(Boolean) : 
               fb.type === 'suggestion' ? ['#enhancement'] : ['#support'];
    };

    const filteredFeedback = (data.feedback || []).filter((fb: any) => {
        if (filters.assignee === 'all') return true;
        const assignedTo = localAssignments[fb.feedback_id];
        if (filters.assignee === 'unassigned') return !assignedTo;
        if (filters.assignee === 'me') return assignedTo === 'Aditya N.'; 
        if (filters.assignee === 'other') return assignedTo && assignedTo !== 'Aditya N.';
        return true;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6 lg:-m-8 bg-background overflow-hidden animate-fadeIn font-sans">

            {/* Minimal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card-bg z-10 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-text mb-0.5 font-serif">Customer Enquiries</h1>
                    <p className="text-xs text-text-muted">Manage and resolve incoming support requests across all channels.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={load} className="p-2 border border-border rounded-lg text-text-secondary hover:bg-background transition-colors mr-1" title="Refresh list">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <div className="h-5 w-px bg-border/80"></div>
                    
                    {/* Functional Bulk Actions */}
                    <div className="relative">
                        <select 
                            onChange={handleBulkAction}
                            disabled={selectedIds.length === 0}
                            className="appearance-none px-4 py-2 border border-border rounded-lg text-sm font-medium text-text bg-background hover:bg-border/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pr-8"
                        >
                            <option value="">Bulk Actions ({selectedIds.length})</option>
                            <option value="resolved">Mark as Resolved</option>
                            <option value="reviewed">Mark as Open</option>
                            <option value="dismissed">Dismiss Selected</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT COLUMN: Master List */}
                <div className="w-full lg:w-[420px] 2xl:w-[460px] shrink-0 border-r border-border bg-card-bg flex flex-col z-0">
                    
                    {/* List Header & Filters */}
                    <div className="p-4 border-b border-border bg-card-bg sticky top-0 z-10 shrink-0">
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                            <input
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && load()}
                                placeholder="Search queries..."
                                className="w-full pl-9 pr-4 py-2 font-medium bg-background text-text border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted/60 placeholder:font-normal"
                            />
                        </div>
                        <div className="flex gap-2 text-[12px] font-medium text-text-secondary">
                            <div className="relative flex-1">
                                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                                <select 
                                    value={filters.status} 
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })} 
                                    className="w-full appearance-none bg-background text-text border border-border rounded-md pl-7 pr-2 py-1.5 focus:outline-none cursor-pointer transition-colors hover:border-text-muted/40"
                                >
                                    <option value="all">Status</option>
                                    {STATUSES.filter(s => s !== 'all').map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
                                </select>
                            </div>
                            
                            <div className="relative flex-[0.8]">
                                <select 
                                    value={filters.assignee}
                                    onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                                    className="w-full appearance-none bg-background text-text border border-border rounded-md px-2 py-1.5 text-center focus:outline-none cursor-pointer hover:border-text-muted/40"
                                >
                                    <option value="all">Assignee</option>
                                    {ASSIGNEES.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto min-h-0 bg-card-bg custom-scrollbar text-text">
                        {loading ? (
                            <div className="p-8 text-center text-text-muted text-sm border-t border-border/50">Loading enquiries...</div>
                        ) : filteredFeedback.length === 0 ? (
                            <div className="p-12 text-center text-text-muted text-sm border-t border-border/50 flex flex-col items-center">
                                <Search className="w-8 h-8 opacity-40 mb-3" />
                                No enquiries found matching filters.
                            </div>
                        ) : (
                            <div className="flex flex-col border-t border-border/50">
                                {filteredFeedback.map((fb: any, index: number) => {
                                    const isSelected = selectedFeedbackId === fb.feedback_id;
                                    const isChecked = selectedIds.includes(fb.feedback_id);
                                    const style = STATUS_CONFIG[fb.status] || STATUS_CONFIG.new;
                                    const TypeIcon = TYPE_ICONS[fb.type] || HelpCircle;

                                    const allTags = [...getBaseTags(fb), ...(localTags[fb.feedback_id] || [])];

                                    return (
                                        <div 
                                            key={fb.feedback_id}
                                            onClick={() => setSelectedFeedbackId(fb.feedback_id)}
                                            className={`
                                                relative py-4 pr-4 cursor-pointer transition-colors border-b border-border/50
                                                ${isSelected ? 'bg-primary/10 dark:bg-primary/20 border-l-[3px] border-primary pl-[13px]' : 'bg-card-bg hover:bg-primary/5 border-l-[3px] border-transparent pl-[13px]'}
                                            `}
                                        >
                                            <div className="flex gap-3">
                                                <div className="pt-0.5 relative z-10" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={(e) => toggleSelection(fb.feedback_id, e as any)}
                                                        className="w-4 h-4 rounded border-border bg-card-bg text-primary focus:ring-primary/20 cursor-pointer" 
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1.5 gap-2">
                                                        <span className="font-bold text-text text-[14px] truncate">{fb.name || 'Anonymous'}</span>
                                                        <span className="text-[11px] text-text-muted whitespace-nowrap">{timeAgo(fb.created_at)}</span>
                                                    </div>
                                                    
                                                    <p className="text-[13px] text-text font-medium leading-tight mb-2.5 flex items-start gap-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${fb.status === 'new' ? 'bg-info' : 'bg-border'}`} />
                                                        <span className="truncate">{fb.subject || (fb.type || 'General').replace('_', ' ')}</span>
                                                    </p>
                                                    
                                                    <div className="flex items-center justify-between mt-3">
                                                        <div className="flex items-center gap-3 text-[11px] font-medium text-text-muted">
                                                            <span className="flex items-center gap-1.5 uppercase tracking-wide">
                                                                <TypeIcon className="w-3 h-3" /> {(fb.type || 'General').replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border border-current ${style.colorBadge} ${isSelected ? 'bg-transparent' : 'bg-transparent'}`}>
                                                            <style.icon className="w-3 h-3" />
                                                            {style.label}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                                        {allTags.map(tag => (
                                                            <span key={tag as string} className="bg-border/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-text-muted tracking-wider">{tag as string}</span>
                                                        ))}
                                                        {localAssignments[fb.feedback_id] && (
                                                             <span className="bg-primary/20 text-text px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-primary/30">
                                                                <User className="w-2.5 h-2.5" /> {localAssignments[fb.feedback_id]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* List Footer Pagination */}
                    <div className="p-3 border-t border-border bg-card-bg text-[11px] font-medium text-text-muted flex justify-between items-center shrink-0">
                        <span>Showing {selectedIds.length > 0 ? `${selectedIds.length} selected` : `1-${Math.min(filteredFeedback.length, 25)} of ${filteredFeedback.length}`}</span>
                        <div className="flex items-center gap-1">
                            <button className="w-7 h-7 flex flex-col items-center justify-center rounded-full bg-border text-text font-bold hover:opacity-80 transition-opacity">1</button>
                            <button className="w-7 h-7 flex flex-col items-center justify-center rounded-full hover:bg-border/50 transition-colors">2</button>
                            <span className="mx-1">...</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Detail View */}
                {selectedFeedback ? (
                    <div className="hidden lg:flex flex-col flex-1 min-w-0 h-full bg-background relative z-10 border-l border-border/30 animate-fadeIn">
                        {/* Detail Header */}
                        <div className="px-6 py-5 flex items-center justify-between border-b border-border bg-card-bg sticky top-0 z-20 shrink-0">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-background border border-border rounded-xl text-text-muted self-start mt-0.5 pointer-events-none">
                                    <Inbox className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col justify-center min-h-[46px]">
                                    <h2 className="text-[17px] font-bold text-text flex items-center gap-2 mb-1">
                                        {selectedFeedback.subject || (selectedFeedback.type || 'Enquiry').replace('_', ' ')} 
                                        <span className="text-text-muted text-[15px] font-semibold">#{selectedFeedback.feedback_id.substring(0, 4).toUpperCase()}</span>
                                    </h2>
                                    <div className="flex items-center gap-3 text-[12px] text-text-muted font-medium">
                                        <span className="flex items-center gap-1.5 capitalize">
                                            <Inbox className="w-3.5 h-3.5" /> {selectedFeedback.type || 'General'}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-border"></span>
                                        <span className="flex items-center gap-1.5">
                                            PID-{selectedFeedback.feedback_id.substring(0,3).toUpperCase()}
                                        </span>
                                        
                                        {localAssignments[selectedFeedback.feedback_id] && (
                                           <>
                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                            <span className="flex items-center gap-1.5 text-text font-bold bg-primary/20 px-2 py-0.5 rounded-md border border-primary/30 ring-1 ring-primary/10">
                                                <User className="w-3.5 h-3.5" /> {localAssignments[selectedFeedback.feedback_id]}
                                            </span>
                                           </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Clickable Status Indicator */}
                                <div className="relative group">
                                    <select
                                        value={selectedFeedback.status}
                                        onChange={(e) => handleStatus(selectedFeedback.feedback_id, e.target.value)}
                                        className={`appearance-none px-3 py-1.5 border rounded-lg text-[13px] font-bold flex items-center gap-1.5 cursor-pointer focus:outline-none bg-background shadow-sm ${STATUS_CONFIG[selectedFeedback.status]?.color || 'text-text'}`}
                                        style={{ paddingRight: '1rem' }}
                                    >
                                        <option value="new">Pending</option>
                                        <option value="reviewed">Open</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="dismissed">Dismissed</option>
                                    </select>
                                </div>
                                
                                <button onClick={() => toast("Ticket locked internally.", { icon: '🔒' })} className="p-2 text-text-muted hover:text-text hover:bg-border/30 rounded-lg transition-colors title='Lock context'">
                                    <Lock className="w-4 h-4" />
                                </button>
                                <div className="h-5 w-px bg-border mx-1"></div>
                                <button 
                                    onClick={handleAssign}
                                    className="px-4 py-2 bg-background border border-border rounded-lg text-[13px] font-bold text-text flex items-center gap-2 hover:bg-border/30 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    <User className="w-3.5 h-3.5" /> Assign
                                </button>
                                {selectedFeedback.status !== 'resolved' && (
                                    <button 
                                        onClick={() => handleStatus(selectedFeedback.feedback_id, 'resolved')}
                                        className="px-6 py-2 bg-success text-white rounded-lg text-[13px] font-bold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                                    >
                                        Resolve
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Custom Scrollable Conversation Area */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-background custom-scrollbar relative p-6 md:p-8 xl:p-10 space-y-8">
                                
                            <div className="flex items-center gap-6 w-full max-w-4xl mx-auto">
                                <div className="h-[1px] bg-border/60 flex-1"></div>
                                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] whitespace-nowrap flex items-center gap-2">
                                    SUBMITTED <span className="opacity-40">·</span> {new Date(selectedFeedback.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                                </span>
                                <div className="h-[1px] bg-border/60 flex-1"></div>
                            </div>

                            {/* Base Customer Message Bubble */}
                            <div className="flex gap-4 w-full max-w-4xl mx-auto">
                                <div className="w-10 h-10 rounded-full bg-[#D1B894] flex flex-col items-center justify-center text-[#2C1B16] font-bold text-sm shrink-0 border border-border mt-1 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gold/20"></div>
                                    <span className="relative z-10">{getInitials(selectedFeedback.name)}</span>
                                </div>
                                <div className="flex-1 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-1 pl-1">
                                        <span className="font-bold text-[13px] text-text">Customer</span>
                                        <span className="text-[11px] font-medium text-text-muted">{new Date(selectedFeedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="bg-card-bg border border-border text-text rounded-2xl rounded-tl-sm p-4 shadow-sm">
                                        <p className="text-[14px] leading-relaxed font-medium whitespace-pre-wrap">
                                            {selectedFeedback.message}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Backend Replies */}
                            {(selectedFeedback.replies || []).map((reply: any, i: number) => {
                                if (reply.type === 'note') {
                                    return (
                                        <div key={reply.reply_id || i} className="ml-14 max-w-[85%] max-w-4xl mx-auto bg-warning/20 border border-warning/30 rounded-2xl p-4 shadow-sm relative mt-4 animate-fadeIn">
                                            <div className="absolute -left-3 top-4 w-6 h-6 bg-warning/20 rounded-md transform rotate-45 border-b border-l border border-warning/30 z-0"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-warning text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase">Internal Note</span>
                                                    <span className="text-[11px] font-medium text-warning-dark">{timeAgo(reply.timestamp)} by Admin</span>
                                                </div>
                                                <p className="text-[14px] leading-relaxed text-warning-dark font-medium mt-1 whitespace-pre-wrap">
                                                    "{reply.message}"
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                if (reply.author_type === 'customer') {
                                    return (
                                        <div key={reply.reply_id || i} className="flex gap-4 w-full justify-start animate-fadeIn mt-4 max-w-4xl mx-auto">
                                            <div className="w-10 h-10 rounded-full bg-border shrink-0 mt-1 flex items-center justify-center font-bold text-sm text-text-muted">
                                                C
                                            </div>
                                            <div className="flex-1 max-w-[80%] flex flex-col items-start">
                                                <div className="flex items-center gap-2 mb-1 pl-1">
                                                    <span className="font-bold text-[13px] text-text">Customer</span>
                                                    <span className="text-[11px] font-medium text-text-muted">{timeAgo(reply.timestamp)}</span>
                                                </div>
                                                <div className="bg-card-bg border border-border text-text rounded-2xl rounded-tl-sm p-4 shadow-sm relative text-left w-auto inline-block">
                                                    <p className="text-[14px] leading-relaxed font-medium whitespace-pre-wrap">
                                                        {reply.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <div key={reply.reply_id || i} className="flex gap-4 w-full justify-end animate-fadeIn mt-4 max-w-4xl mx-auto">
                                        <div className="flex-1 max-w-[80%] flex flex-col items-end">
                                            <div className="flex items-center gap-2 mb-1 pr-1">
                                                <span className="font-bold text-[13px] text-text">
                                                    {reply.replier_id === 'SYSTEM-BOT' ? 'System (Auto)' : 'You (Agent)'}
                                                </span>
                                                <span className="text-[11px] font-medium text-text-muted">{timeAgo(reply.timestamp)}</span>
                                            </div>
                                            <div className={`${reply.replier_id === 'SYSTEM-BOT' ? 'bg-info/20 text-text border border-info/30' : 'bg-primary text-white'} rounded-2xl rounded-tr-sm p-4 shadow-sm relative text-left w-auto inline-block`}>
                                                <p className="text-[14px] leading-relaxed font-medium whitespace-pre-wrap">
                                                    {reply.message}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-border shrink-0 mt-1 relative overflow-hidden border border-border">
                                            <div className="absolute inset-0 bg-primary-dark opacity-10"></div>
                                            <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-primary">
                                                {reply.replier_id === 'SYSTEM-BOT' ? 'VB' : 'AN'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reply Box Container - Sticky Bottom */}
                        <div className="px-6 pb-4 pt-4 bg-background border-t border-border mt-auto shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                            
                            {/* Rich Text Editor UI */}
                            <div className="border border-border rounded-xl focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all bg-card-bg overflow-hidden flex flex-col shadow-sm max-w-4xl mx-auto">
                                
                                <div className="flex items-center border-b border-border/60 bg-card-bg/50">
                                    <button 
                                        onClick={() => setReplyType('reply')}
                                        className={`px-6 py-2.5 text-[13px] font-bold transition-all relative ${replyType === 'reply' ? 'text-text bg-primary/20' : 'text-text-secondary hover:text-text hover:bg-border/30'}`}
                                    >
                                        Reply to Customer
                                        <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${replyType === 'reply' ? 'bg-primary' : 'bg-transparent'}`}></span>
                                    </button>
                                    <button 
                                        onClick={() => setReplyType('note')}
                                        className={`px-6 py-2.5 text-[13px] font-bold transition-all relative group ${replyType === 'note' ? 'text-text bg-warning/20' : 'text-text-secondary hover:text-text hover:bg-border/30'}`}
                                    >
                                        Private Note
                                        <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${replyType === 'note' ? 'bg-warning-dark' : 'bg-transparent'}`}></span>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                            Internal use only - never visible to customers
                                        </div>
                                    </button>
                                    <div className="flex-1"></div>
                                    <div className="relative h-full flex items-center">
                                        <button 
                                            onClick={() => setShowTemplates(!showTemplates)} 
                                            className={`text-[11px] font-bold tracking-wide uppercase px-4 flex items-center gap-1.5 transition-colors h-[40px] ${showTemplates ? 'text-primary bg-primary/5' : 'text-text-muted hover:text-text'}`}
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" /> Templates
                                            <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {showTemplates && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)}></div>
                                                <div className="absolute top-full right-0 mt-1 w-64 bg-card-bg border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-slideDown">
                                                    <div className="p-2 border-b border-border/50 bg-background/50 text-[10px] font-bold text-text-muted uppercase tracking-widest text-center">
                                                        Select Canned Response
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
                                                        {CANNED_RESPONSES.map((res, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    setReplyText(prev => prev ? (prev.endsWith('\n') ? prev + res.text : prev + '\n' + res.text) : res.text);
                                                                    setShowTemplates(false);
                                                                    toast.success('Template applied');
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 hover:bg-primary/5 transition-colors group border-b border-border/10 last:border-0"
                                                            >
                                                                <div className="text-[13px] font-bold text-text group-hover:text-primary transition-colors">{res.name}</div>
                                                                <div className="text-[11px] text-text-muted truncate">{res.text}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Text Area */}
                                <div className={`relative ${replyType === 'note' ? 'bg-warning/5' : 'bg-background'}`}>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply();
                                        }}
                                        placeholder={replyType === 'reply' ? `Hello ${selectedFeedback.name?.split(' ')[0] || ''}, write your reply here... (Ctrl+Enter to send)` : "Add a private internal note for the team..."}
                                        className="w-full min-h-[120px] px-5 py-4 bg-transparent outline-none resize-none text-[14px] text-text placeholder:text-text-muted/60 placeholder:font-medium"
                                    ></textarea>
                                </div>

                                {/* Editor Footer */}
                                <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-card-bg">
                                    <div className="flex items-center gap-3">
                                        <button onClick={handleAddTag} className="py-1 px-3 border border-border bg-background text-text-muted hover:text-text rounded-md text-[12px] font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                                            + Add Tag
                                        </button>
                                    </div>
                                    
                                    <button 
                                        onClick={handleSendReply}
                                        disabled={!replyText.trim()}
                                        className={`px-6 py-2 rounded-lg text-[13px] font-bold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                                            replyType === 'reply' 
                                            ? 'bg-primary hover:opacity-90' 
                                            : 'bg-warning hover:opacity-90'
                                        }`}
                                    >
                                        {replyType === 'reply' ? 'Send Reply' : 'Save Note'}
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="hidden lg:flex flex-col flex-1 items-center justify-center bg-background p-12 text-center relative border-l border-border/30 h-full">
                        <div className="w-24 h-24 bg-card-bg rounded-3xl border border-border/50 flex items-center justify-center shadow-sm mb-6 mt-[-10%]">
                            <MessageSquare className="w-10 h-10 text-primary/40" />
                        </div>
                        <h2 className="text-[22px] font-serif font-bold text-text mb-2">No conversation selected</h2>
                        <p className="text-text-muted font-medium max-w-sm">Choose an enquiry from the list to view details, reply accurately, or collaborate with internal notes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
