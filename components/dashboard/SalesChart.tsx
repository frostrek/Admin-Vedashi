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
    title = 'Revenue Synthesis',
    period = 'Monthly',
    onPeriodChange,
    loading = false,
}: SalesChartProps) {
    const { isDark } = useTheme();
    const [activePeriod, setActivePeriod] = useState(period);
    
    const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

    const handlePeriodChange = (p: string) => {
        setActivePeriod(p);
        onPeriodChange?.(p);
    };

    return (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 sm:p-6 shadow-xl backdrop-blur-sm transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h3 className="font-serif text-base font-bold text-gold tracking-wide uppercase">{title}</h3>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Monthly yield vs established wellness targets</p>
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-primary/20 p-1 border border-border">
                    {PERIODS.map(p => (
                        <button
                            key={p}
                            onClick={() => handlePeriodChange(p)}
                            className={`rounded-lg px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activePeriod === p
                                ? 'bg-primary text-gold border border-gold/20 shadow-lg'
                                : 'text-text-muted hover:text-gold-soft hover:bg-primary/10'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-[280px] rounded-xl bg-primary/5 animate-pulse" />
            ) : data.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-sm text-text-muted italic">
                    Waiting for synthesis data...
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: colors.axis, fontWeight: 600 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: colors.axis, fontWeight: 600 }}
                            tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{
                                background: colors.tooltipBg,
                                border: `1px solid ${colors.tooltipBorder}`,
                                borderRadius: '12px',
                                color: colors.tooltipText,
                                fontSize: '12px',
                                padding: '10px 16px',
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                            }}
                            itemStyle={{ color: colors.tooltipLabel, fontWeight: 700 }}
                            labelStyle={{ color: colors.tooltipText, fontWeight: 800, marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '10px' }}
                            formatter={(val: number | undefined) => [`₹${(val ?? 0).toLocaleString('en-IN')}`, 'Synthesis Total']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={colors.stroke}
                            strokeWidth={3}
                            fill="url(#salesGradient)"
                            dot={false}
                            activeDot={{
                                r: 6,
                                stroke: colors.stroke,
                                strokeWidth: 3,
                                fill: colors.dotFill,
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
