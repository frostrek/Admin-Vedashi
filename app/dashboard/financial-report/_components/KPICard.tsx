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
    <div className="rounded-xl border border-border bg-card-bg p-6 shadow-sm flex flex-col justify-between group h-full hover-lift gold-glow transition-all relative overflow-visible hover:z-[60]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-text-muted uppercase tracking-wider">{label}</span>
          {tooltip && (
            <div className="relative group/tooltip">
              <HelpCircle className="w-3.5 h-3.5 text-text-muted/60 group-hover/tooltip:text-gold transition-colors cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-white border border-border rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 transform translate-y-1 group-hover/tooltip:translate-y-0 z-[100] pointer-events-none">
                <p className="text-[11px] font-semibold leading-relaxed text-black/80">
                  {tooltip}
                </p>
                {/* Tooltip Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white drop-shadow-[0_1px_0_rgba(0,0,0,0.05)]"></div>
              </div>
            </div>
          )}
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
