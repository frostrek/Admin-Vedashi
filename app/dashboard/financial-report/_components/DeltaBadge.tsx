import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DeltaBadgeProps {
  delta: number;
  isInverted?: boolean;
}

export default function DeltaBadge({ delta, isInverted = false }: DeltaBadgeProps) {
  const isPositive = delta >= 0;
  const isGood = isInverted ? !isPositive : isPositive;
  // Use theme-aware colors: success green / danger red from the Vedashi palette
  const colorClass = isGood
    ? 'text-success bg-success/10'
    : 'text-danger bg-danger/10';
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}
