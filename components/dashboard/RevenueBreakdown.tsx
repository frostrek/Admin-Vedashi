'use client';

interface BreakdownItem {
    label: string;
    value: number;
    color: string; // tailwind  bg class
}

interface RevenueBreakdownProps {
    total: number;
    items: BreakdownItem[];
    loading?: boolean;
    title?: string;
}

export default function RevenueBreakdown({
    total,
    items,
    loading = false,
    title = 'Gross Volume',
}: RevenueBreakdownProps) {
    return (
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card-bg to-card-bg-elevated p-5 sm:p-6">
            <div className="mb-5">
                <h3 className="font-serif text-base font-semibold text-gold-soft">{title}</h3>
                <p className="text-xs text-text-muted mt-0.5">Revenue breakdown by payment method</p>
            </div>

            {loading ? (
                <div className="space-y-4">
                    <div className="h-8 w-32 rounded animate-shimmer" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-2">
                            <div className="h-4 w-24 rounded animate-shimmer" />
                            <div className="h-3 w-full rounded-full animate-shimmer" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <p className="font-serif text-3xl font-bold text-gold mb-6 tracking-tight">
                        ₹{total.toLocaleString('en-IN')}
                    </p>

                    <div className="space-y-4">
                        {items.map(item => {
                            const percentage = total > 0 ? (item.value / total) * 100 : 0;
                            return (
                                <div key={item.label}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium text-text-secondary">
                                            {item.label}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gold-soft">
                                                ₹{item.value.toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-xs text-text-muted">
                                                ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-page-bg overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
