'use client';

import { Info, TrendingUp, Package, Clock, Landmark, Receipt, CreditCard, Wallet, BadgePercent, Banknote, Gift } from 'lucide-react';
import KPICard from '../_components/KPICard';
import { FinancialReportData } from '@/lib/api/analytics';

const ASSETS = [
  {
    icon: Wallet,
    label: 'Cash & Equivalents',
    description: 'Operating cash held in checking and savings accounts — your immediate liquidity.',
  },
  {
    icon: Package,
    label: 'Inventory',
    description: 'Total market value of stock currently held in warehouse, ready for fulfillment.',
  },
  {
    icon: Receipt,
    label: 'Accounts Receivable',
    description: 'Outstanding payments owed to you by B2B clients or wholesale purchasers.',
  },
];

const LIABILITIES = [
  {
    icon: Banknote,
    label: 'Accounts Payable',
    description: 'Outstanding amounts owed to suppliers and vendors for goods or services received.',
  },
  {
    icon: BadgePercent,
    label: 'Taxes Payable',
    description: 'Sales tax collected from customers that must be remitted to the government.',
  },
  {
    icon: CreditCard,
    label: 'Short-Term Loans',
    description: 'Active lines of credit or working capital loans due within the fiscal year.',
  },
];

const ECOM = [
  {
    icon: Landmark,
    label: 'Funds in Transit',
    description: 'Money cleared by processors like Razorpay, Stripe, or PayPal — not yet deposited into your operational account.',
  },
  {
    icon: Gift,
    label: 'Deferred Revenue',
    description: 'Gift cards sold but not yet redeemed; recognized as revenue only upon use.',
  },
];

const KPI_CONFIG = [
  {
    label: 'Current Ratio',
    value: '1.8',
    icon: TrendingUp,
    status: 'healthy' as const,
    tooltip: 'A healthy ratio is 1.5–2.0, indicating ability to pay short-term debts. Formula: Current Assets / Current Liabilities.',
  },
  {
    label: 'Inventory Turnover',
    value: '4.2×',
    icon: Package,
    status: 'neutral' as const,
    tooltip: 'Shows how quickly inventory is sold and replaced annually. Higher is generally better.',
  },
  {
    label: 'Days Sales Outstanding',
    value: '2.5 days',
    icon: Clock,
    status: 'neutral' as const,
    tooltip: 'Average days from order placed to delivered. Lower indicates faster fulfillment.',
  },
];

function SectionCard({
  title,
  accent,
  items,
}: {
  title: string;
  accent: 'default' | 'ecom';
  items: { icon: React.ElementType; label: string; description: string }[];
}) {
  const isEcom = accent === 'ecom';

  return (
    <div
      className={`
        rounded-2xl border p-6 shadow-sm hover-lift transition-all duration-200
        ${isEcom
          ? 'bg-gradient-to-br from-amber-50/60 to-transparent border-amber-200/60 dark:from-amber-900/10 dark:border-amber-700/30'
          : 'bg-card-bg border-border'}
      `}
    >
      <div className={`flex items-center gap-2 mb-5 pb-3 border-b ${isEcom ? 'border-amber-200/50 dark:border-amber-700/30' : 'border-border'}`}>
        <h3
          className={`text-xs font-semibold uppercase tracking-widest ${
            isEcom ? 'text-amber-600 dark:text-amber-400' : 'text-text-secondary'
          }`}
        >
          {title}
        </h3>
      </div>

      <ul className="space-y-5">
        {items.map(({ icon: Icon, label, description }) => (
          <li key={label} className="flex items-start gap-3">
            <div
              className={`
                mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                ${isEcom
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-primary/8 text-primary'}
              `}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className={`text-sm font-semibold leading-tight mb-0.5 ${isEcom ? 'text-amber-700 dark:text-amber-300' : 'text-text-primary'}`}>
                {label}
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BalanceSheetTab({ data }: { data?: FinancialReportData }) {
  if (!data) return null;

  return (
    <div className="space-y-7 animate-fadeIn">

      {/* Notice Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-info/25 bg-info/8 px-4 py-3.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-info" />
        <p className="text-sm leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">Estimates only.</span>{' '}
          Connect your accounting system — Xero or QuickBooks — for exact asset and liability figures.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {KPI_CONFIG.map(({ label, value, tooltip }) => (
          <KPICard
            key={label}
            label={label}
            value={value}
            tooltip={tooltip}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-widest px-1">Balance Sheet Overview</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Assets" accent="default" items={ASSETS} />
        <SectionCard title="Liabilities" accent="default" items={LIABILITIES} />
        <SectionCard title="E-commerce Specifics" accent="ecom" items={ECOM} />
      </div>

    </div>
  );
}