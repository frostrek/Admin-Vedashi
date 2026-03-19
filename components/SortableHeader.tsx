'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc' | null;

interface SortableHeaderProps {
    label: string;
    sortKey: string;
    currentSortKey: string | null;
    currentSortDir: SortDir;
    onSort: (key: string, dir: SortDir) => void;
    className?: string;
    align?: 'left' | 'right' | 'center';
}

/**
 * Reusable sortable table header.
 * Cycles: neutral → asc → desc → neutral
 */
export default function SortableHeader({
    label,
    sortKey,
    currentSortKey,
    currentSortDir,
    onSort,
    className = '',
    align = 'left',
}: SortableHeaderProps) {
    const isActive = currentSortKey === sortKey;

    const handleClick = () => {
        if (!isActive) {
            onSort(sortKey, 'asc');
        } else if (currentSortDir === 'asc') {
            onSort(sortKey, 'desc');
        } else {
            onSort(sortKey, null); // reset to neutral
        }
    };

    const alignClass =
        align === 'right' ? 'text-right justify-end' :
        align === 'center' ? 'text-center justify-center' : 'text-left';

    return (
        <th
            className={`px-4 py-3 text-xs font-semibold text-gold-muted uppercase select-none whitespace-nowrap ${alignClass} ${className}`}
        >
            <button
                type="button"
                onClick={handleClick}
                className={`inline-flex items-center gap-1 group transition-colors duration-200 ${
                    isActive ? 'text-gold' : 'text-gold-muted hover:text-gold'
                }`}
            >
                {label}
                <span className="flex-shrink-0 w-3.5 h-3.5 inline-flex items-center justify-center">
                    {isActive && currentSortDir === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : isActive && currentSortDir === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                    ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-80 transition-opacity" />
                    )}
                </span>
            </button>
        </th>
    );
}

/**
 * Generic comparator for sorting arrays.
 * Works with strings, numbers, dates, and booleans.
 */
export function compare(a: any, b: any, key: string, dir: SortDir): number {
    if (!dir) return 0;

    let valA = a[key];
    let valB = b[key];

    // Handle nested keys like 'customer_name'
    if (valA === undefined && key.includes('.')) {
        const parts = key.split('.');
        valA = parts.reduce((obj, k) => obj?.[k], a);
        valB = parts.reduce((obj, k) => obj?.[k], b);
    }

    // Nulls / undefined always go to the bottom
    if (valA == null && valB == null) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;

    // Date strings
    if (typeof valA === 'string' && !isNaN(Date.parse(valA)) && key.toLowerCase().includes('at') || key.toLowerCase().includes('date')) {
        const da = new Date(valA).getTime();
        const db = new Date(valB).getTime();
        return dir === 'asc' ? da - db : db - da;
    }

    // Numbers
    if (typeof valA === 'number' && typeof valB === 'number') {
        return dir === 'asc' ? valA - valB : valB - valA;
    }

    // Booleans
    if (typeof valA === 'boolean') {
        return dir === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
    }

    // Strings
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    const cmp = strA.localeCompare(strB);
    return dir === 'asc' ? cmp : -cmp;
}
