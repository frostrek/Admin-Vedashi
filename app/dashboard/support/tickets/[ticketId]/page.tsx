'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Send, User, Shield, Clock } from 'lucide-react';
import { getAdminTicketDetail, adminReplyToTicket, updateAdminTicket } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-200 text-gray-500',
};

export default function AdminTicketDetailPage() {
    const params = useParams();
    const ticketId = params.ticketId as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const load = async () => {
        const result = await getAdminTicketDetail(ticketId);
        setData(result);
        setLoading(false);
    };

    useEffect(() => { if (ticketId) load(); }, [ticketId]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setSending(true);
        const result = await adminReplyToTicket(ticketId, replyText);
        if (result.success) {
            setReplyText('');
            await load();
            toast.success('Reply sent');
        } else toast.error(result.message || 'Failed');
        setSending(false);
    };

    const handleUpdate = async (field: string, value: string) => {
        const result = await updateAdminTicket(ticketId, { [field]: value });
        if (result.success) {
            toast.success(`${field} updated`);
            await load();
        } else toast.error('Update failed');
    };

    if (loading) return <div className="p-8 text-text-muted">Loading ticket...</div>;
    if (!data?.ticket) return <div className="p-8 text-text-muted">Ticket not found.</div>;

    const { ticket, messages = [] } = data;

    return (
        <div className="space-y-6">
            <Link href="/dashboard/support/tickets" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-gold transition-colors">
                <ChevronLeft className="h-4 w-4" /> All Tickets
            </Link>

            {/* Header */}
            <div className="bg-card-bg border border-border rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gold mb-1">{ticket.subject}</h1>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span className="font-mono">{ticket.ticket_number}</span>
                            <span>{ticket.customer_name} ({ticket.customer_email})</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(ticket.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div>
                            <label className="block text-[10px] uppercase text-text-muted mb-1">Status</label>
                            <select
                                value={ticket.status}
                                onChange={(e) => handleUpdate('status', e.target.value)}
                                className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg cursor-pointer ${STATUS_COLORS[ticket.status] || ''}`}
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-text-muted mb-1">Priority</label>
                            <select
                                value={ticket.priority}
                                onChange={(e) => handleUpdate('priority', e.target.value)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-card-bg border border-border cursor-pointer text-text"
                            >
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-3 flex gap-3 text-xs text-text-muted">
                    <span className="bg-surface px-2 py-0.5 rounded-full">{ticket.category}</span>
                    {ticket.assigned_name && <span>Assigned: {ticket.assigned_name}</span>}
                </div>
            </div>

            {/* Messages */}
            <div className="bg-card-bg border border-border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gold-soft mb-4">Conversation ({messages.length})</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {messages.map((msg: any) => {
                        const isAdmin = msg.sender_type === 'admin';
                        return (
                            <div key={msg.message_id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl p-4 ${isAdmin
                                    ? 'bg-gold/10 border border-gold/20 rounded-tr-md'
                                    : 'bg-surface border border-border rounded-tl-md'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2 text-xs text-text-muted">
                                        {isAdmin ? <Shield className="h-3 w-3 text-gold" /> : <User className="h-3 w-3" />}
                                        <span className="font-semibold">{isAdmin ? 'Admin' : msg.sender_name || 'Customer'}</span>
                                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-text whitespace-pre-line">{msg.body}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={endRef} />
                </div>

                {/* Reply box */}
                <form onSubmit={handleReply} className="mt-6 border-t border-border pt-4">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type admin reply..."
                        rows={3}
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text focus:outline-none focus:border-gold/50 resize-none"
                    />
                    <div className="flex justify-end mt-3">
                        <button
                            type="submit"
                            disabled={sending || !replyText.trim()}
                            className="inline-flex items-center gap-2 bg-gold/20 text-gold px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gold/30 transition-colors disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            {sending ? 'Sending...' : 'Send Reply'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
