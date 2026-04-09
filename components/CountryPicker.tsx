'use client';

import React, { useState, useRef, useEffect } from 'react';
import { COUNTRIES, Country } from '@/lib/countries';
import { ChevronDown, Search, X } from 'lucide-react';

interface CountryPickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function CountryPicker({ value, onChange, placeholder = 'Select country', className = '' }: CountryPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus search when opened
    useEffect(() => {
        if (open && searchRef.current) {
            searchRef.current.focus();
        }
    }, [open]);

    const filtered = search
        ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
                const s = search.toLowerCase();
                const aStarts = a.name.toLowerCase().startsWith(s);
                const bStarts = b.name.toLowerCase().startsWith(s);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.name.localeCompare(b.name);
            })
        : COUNTRIES;

    const selected = COUNTRIES.find(c => c.name.toLowerCase() === value?.toLowerCase());

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => { setOpen(!open); setSearch(''); }}
                className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 bg-white text-gray-900 transition-all"
            >
                <span className="flex items-center gap-2 truncate">
                    {selected ? (
                        <>
                            <span className="text-lg leading-none">{selected.flag}</span>
                            <span>{selected.name}</span>
                        </>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {value && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(''); } }}
                            className="p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5 text-gray-400" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-white shadow-xl overflow-hidden"
                    style={{ maxHeight: '340px' }}
                >
                    {/* Search */}
                    <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search countries..."
                                className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-400 text-center">
                                No countries found
                            </div>
                        ) : (
                            filtered.map(country => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                        onChange(country.name);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gold/[0.06] ${value === country.name
                                        ? 'bg-gold/[0.08] text-gold-soft font-medium'
                                        : 'text-gray-700'
                                        }`}
                                >
                                    <span className="text-lg leading-none flex-shrink-0">{country.flag}</span>
                                    <span className="truncate">{country.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
