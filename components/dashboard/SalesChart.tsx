'use client';

import { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';

interface SalesDataPoint {
    label: string;
    value: number;
}

interface SalesChartProps {
    data: SalesDataPoint[];
    title?: string;
    period?: string;
    onPeriodChange?: (period: string) => void;
    loading?: boolean;
}

const PERIODS = ['Daily', 'Weekly', 'Monthly'];

// Theme-aware chart color palettes
const CHART_COLORS = {
    light: {
        stroke: '#3B5D3B',       // Herbal green
        gradientTop: '#3B5D3B',
        grid: '#D9CFC4',         // Soft beige
        axis: '#8C7B72',         // Muted text
        tooltipBg: '#F6F1EA',    // Warm ivory
        tooltipBorder: '#D9CFC4',
        tooltipText: '#2C1B16',  // Dark brown text
        tooltipLabel: '#3B5D3B', // Herbal green
        dotFill: '#FFFFFF',
    },
    dark: {
        stroke: '#C5A46D',       // Antique gold
        gradientTop: '#C5A46D',
        grid: '#3A2E2E',
        axis: '#6B5E52',
        tooltipBg: '#252020',
        tooltipBorder: '#3A2E2E',
        tooltipText: '#E8D8B9',
        tooltipLabel: '#C5A46D',
        dotFill: '#1E1A1A',
    },
};

export default function SalesChart({
    data,
    title = 'Sales Overview',
    period = 'Monthly',
    onPeriodChange,
    loading = false,
}: SalesChartProps) {
    const [activePeriod, setActivePeriod] = useState(period);
    const { isDark } = useTheme();
    const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

    const handlePeriodChange = (p: string) => {
        setActivePeriod(p);
        onPeriodChange?.(p);
    };

    return (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h3 className="font-serif text-base font-semibold text-gold-soft">{title}</h3>
                    <p className="text-xs text-text-muted mt-0.5">Revenue performance over time</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-page-bg p-1 border border-border-subtle">
                    {PERIODS.map(p => (
                        <button
                            key={p}
                            onClick={() => handlePeriodChange(p)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-300 ${activePeriod === p
                                ? 'bg-primary text-[#E8D8B9] shadow-sm'
                                : 'text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-[280px] rounded-xl animate-shimmer" />
            ) : data.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-sm text-text-muted">
                    No sales data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.gradientTop} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors.gradientTop} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: colors.axis }}
                            dy={8}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: colors.axis }}
                            tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}M`}
                        />
                        <Tooltip
                            contentStyle={{
                                background: colors.tooltipBg,
                                border: `1px solid ${colors.tooltipBorder}`,
                                borderRadius: '10px',
                                color: colors.tooltipText,
                                fontSize: '13px',
                                padding: '8px 14px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                            }}
                            formatter={(val: number | undefined) => [`₹${(val ?? 0).toLocaleString('en-IN')}`, 'Revenue']}
                            labelStyle={{ color: colors.tooltipLabel, fontWeight: 600, marginBottom: 4 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={colors.stroke}
                            strokeWidth={2.5}
                            fill="url(#salesGradient)"
                            dot={false}
                            activeDot={{
                                r: 5,
                                stroke: colors.stroke,
                                strokeWidth: 2,
                                fill: colors.dotFill,
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
