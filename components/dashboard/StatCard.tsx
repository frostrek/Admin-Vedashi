'use client';

import Link from 'next/link';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number; // percentage
    icon: LucideIcon;
    color: string; // tailwind bg class e.g. 'bg-blue-500'
    href?: string;
    loading?: boolean;
}

export default function StatCard({
    title,
    value,
    change,
    icon: Icon,
    href = '#',
    loading = false,
}: StatCardProps) {
    const isPositive = (change ?? 0) >= 0;

    const content = (
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all duration-500">
                    <Icon className="h-6 w-6 text-emerald-900 drop-shadow-sm" />
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase ${isPositive ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-600 border border-rose-500/10'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isPositive ? '+' : ''}{change}%
                    </div>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">
                    <div className="h-8 w-24 rounded-lg bg-emerald-900/5 animate-pulse" />
                    <div className="h-4 w-16 rounded-lg bg-emerald-900/5 animate-pulse" />
                </div>
            ) : (
                <>
                    <p className="font-serif text-3xl font-bold text-emerald-950 tracking-tight">
                        {value}
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-900/60 group-hover:text-emerald-900 transition-colors duration-500">
                        {title}
                    </p>
                </>
            )}
        </div>
    );

    if (href && href !== '#') {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}
