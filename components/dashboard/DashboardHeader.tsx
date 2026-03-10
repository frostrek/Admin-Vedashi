'use client';

import { LucideIcon } from 'lucide-react';

interface DashboardHeaderProps {
    title?: string;
    subtitle?: string;
    buttonLabel?: string;
    onButtonClick?: () => void;
    icon?: LucideIcon;
}

export default function DashboardHeader({
    title = 'AI User Reports for Better Control',
    subtitle = 'Get detailed user reports with one click and optimize your business decisions',
    buttonLabel = 'Generate Auto Reports',
    onButtonClick,
    icon: Icon,
}: DashboardHeaderProps) {
    return (
        <div
            className="relative overflow-hidden rounded-2xl p-6 sm:p-8 border border-[#C5A46D]/15"
            style={{
                background: 'linear-gradient(to bottom right, #3A0E12, #4B0F1A, #3B1E2B)',
            }}
        >
            {/* Radial vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#C5A46D]/[0.04] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-[#C5A46D]/[0.03] translate-y-1/2" />
            <div className="absolute top-6 right-10 w-20 h-20 rounded-full bg-[#C5A46D]/[0.02]" />

            {/* Ornament line */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#C5A46D]/30 to-transparent" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="max-w-lg">
                    <div className="flex items-center gap-2 mb-2">
                        {Icon && <Icon className="h-5 w-5 text-[#C5A46D]/80" />}
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C5A46D]/60">
                            Dashboard
                        </span>
                    </div>

                    <h2 className="font-serif text-xl sm:text-2xl font-bold leading-tight text-[#E8D8B9]">
                        {title}
                    </h2>

                    <p className="mt-2 text-sm text-[#A89880] leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {buttonLabel && (
                    <button
                        onClick={onButtonClick}
                        className="flex-shrink-0 rounded-xl bg-[#C5A46D]/15 backdrop-blur-sm border border-[#C5A46D]/25 px-5 py-2.5 text-sm font-semibold text-[#E8D8B9] hover:bg-[#C5A46D]/25 hover:border-[#C5A46D]/40 transition-all duration-300 active:scale-[0.97]"
                    >
                        {buttonLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
