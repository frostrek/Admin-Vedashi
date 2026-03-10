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
        <div className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 hover:border-gold/20">
            {/* Subtle gold accent bar at top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="flex items-start justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/30 border border-primary/20">
                    <Icon className="h-5 w-5 text-gold" />
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isPositive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {isPositive ? '+' : ''}{change}%
                    </div>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">
                    <div className="h-7 w-24 rounded animate-shimmer" />
                    <div className="h-4 w-16 rounded animate-shimmer" />
                </div>
            ) : (
                <>
                    <p className="font-serif text-2xl font-bold text-gold tracking-tight">
                        {value}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-text-secondary">
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
