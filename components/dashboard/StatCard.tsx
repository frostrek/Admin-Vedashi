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
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 border border-border group-hover:bg-primary/30 transition-all duration-500">
                    <Icon className="h-6 w-6 text-gold drop-shadow-sm" />
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase ${isPositive ? 'bg-success/15 text-success border border-success/20' : 'bg-danger/15 text-danger border border-danger/20'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isPositive ? '+' : ''}{change}%
                    </div>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">
                    <div className="h-8 w-24 rounded-lg bg-page-bg/50 animate-pulse" />
                    <div className="h-4 w-16 rounded-lg bg-page-bg/50 animate-pulse" />
                </div>
            ) : (
                <>
                    <p className="text-3xl font-bold text-gold tracking-tight">
                        {value}
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em] text-gold-soft group-hover:text-gold transition-colors duration-500">
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
