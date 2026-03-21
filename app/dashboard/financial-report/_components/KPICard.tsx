import { HelpCircle } from 'lucide-react';
import DeltaBadge from './DeltaBadge';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  tooltip?: string;
  isInvertedDelta?: boolean;
}

export default function KPICard({ label, value, delta, deltaLabel, tooltip, isInvertedDelta = false }: KPICardProps) {
  return (
    <div className="rounded-xl border border-border bg-card-bg p-6 shadow-sm flex flex-col justify-between group h-full hover-lift gold-glow transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 cursor-help" title={tooltip}>
          <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">{label}</span>
          {tooltip && <HelpCircle className="w-3.5 h-3.5 text-text-muted" />}
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 mt-auto">
        <span className="text-[26px] xl:text-3xl font-bold font-serif text-gold whitespace-nowrap tracking-tight">{value}</span>
        {delta !== undefined && (
          <div className="flex flex-col items-end shrink-0">
            <DeltaBadge delta={delta} isInverted={isInvertedDelta} />
            {deltaLabel && <span className="text-[10px] text-text-muted mt-1 whitespace-nowrap">{deltaLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
