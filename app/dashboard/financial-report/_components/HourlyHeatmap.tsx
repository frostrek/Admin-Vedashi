'use client';

import { useState } from 'react';
import ChartDetailModal from './ChartDetailModal';

interface HourlyHeatmapProps {
  data: { hour: number; revenue: number }[];
}

const GOLD = '#A89250';
const GOLD_LIGHT = '#C5A46D';
const PRIMARY = '#3B5D3B';

const formatINR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const [detail, setDetail] = useState<{
    title: string;
    heroLabel: string;
    heroValue: string;
    rows: { label: string; value: string | number }[];
  } | null>(null);

  // Normalize array to 24 slots (0 index = 12 AM)
  const fullDay = Array.from({ length: 24 }).map((_, i) => {
    const found = data?.find(d => d.hour === i);
    return {
      hour: i,
      revenue: found?.revenue || 0,
      label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
      shortLabel: i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`,
    };
  });

  const maxRevenue = Math.max(...fullDay.map(d => d.revenue), 1);
  const totalRevenue = fullDay.reduce((s, d) => s + d.revenue, 0);

  // Find peak hour
  const peakHour = fullDay.reduce((best, slot) => (slot.revenue > best.revenue ? slot : best), fullDay[0]);

  // Classify peak period
  const getPeakPeriod = (hour: number) => {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
  };

  const handleSlotClick = (slot: typeof fullDay[number]) => {
    const share = totalRevenue > 0 ? ((slot.revenue / totalRevenue) * 100).toFixed(1) : '0';
    const isPeak = slot.hour === peakHour.hour && slot.revenue > 0;
    setDetail({
      title: `Revenue — ${slot.label}`,
      heroLabel: 'Hourly Revenue',
      heroValue: formatINR(slot.revenue),
      rows: [
        { label: 'Time Slot',        value: `${slot.label} (${slot.hour}:00 – ${slot.hour}:59)` },
        { label: 'Revenue',          value: formatINR(slot.revenue) },
        { label: '% of Daily Total', value: `${share}%` },
        { label: 'Daily Total',      value: formatINR(totalRevenue) },
        { label: 'Status',           value: isPeak ? '🔥 Peak Hour' : (slot.revenue === 0 ? 'No Revenue' : 'Active') },
        { label: 'Period',           value: getPeakPeriod(slot.hour) },
      ],
    });
  };

  return (
    <>
      {detail && (
        <ChartDetailModal
          title={detail.title}
          heroLabel={detail.heroLabel}
          heroValue={detail.heroValue}
          rows={detail.rows}
          onClose={() => setDetail(null)}
        />
      )}

      <style>{`
        .hm-grid {
          display: grid;
          grid-template-columns: repeat(24, minmax(12px, 1fr));
          gap: 3px;
          height: 96px;
          margin-bottom: 8px;
        }
        .hm-bar {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          height: 100%;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          background: var(--t-border-subtle, rgba(255,255,255,0.06));
          overflow: hidden;
        }
        .hm-bar:hover {
          transform: scaleY(1.06);
          box-shadow: 0 0 8px rgba(168,146,80,0.25);
          z-index: 2;
        }
        .hm-bar--selected {
          box-shadow: 0 0 0 2px ${GOLD}, 0 0 12px rgba(168,146,80,0.30) !important;
        }
        .hm-fill {
          position: absolute;
          bottom: 0;
          width: 100%;
          border-radius: 4px;
          transition: height 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.3s;
          background: linear-gradient(to top, ${PRIMARY}, ${GOLD});
        }
        .hm-tooltip {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.15s;
          pointer-events: none;
          z-index: 3;
          font-size: 9px;
          color: #fff;
          white-space: nowrap;
          padding: 0 2px;
          background: rgba(0,0,0,0.70);
          border-radius: 4px;
        }
        .hm-bar:hover .hm-tooltip { opacity: 1; }
        .hm-labels {
          display: grid;
          grid-template-columns: repeat(24, minmax(12px, 1fr));
          gap: 3px;
          user-select: none;
          text-align: center;
        }
        .hm-label {
          font-size: 9px;
          color: var(--t-text-muted, #888);
          white-space: nowrap;
          overflow: hidden;
        }
        .hm-summary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(168,146,80,0.10);
        }
        .hm-summary-item {
          text-align: center;
        }
        .hm-summary-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--t-text-muted, #888);
          margin-bottom: 2px;
        }
        .hm-summary-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          font-weight: 700;
          color: ${GOLD};
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      <div style={{ width: '100%', position: 'relative' }}>
        <div className="hm-grid">
          {fullDay.map((slot) => {
            const intensity = slot.revenue / maxRevenue;
            let opacity = intensity;
            if (slot.revenue > 0 && opacity < 0.15) opacity = 0.15;

            return (
              <div
                key={slot.hour}
                className="hm-bar"
                onClick={() => handleSlotClick(slot)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSlotClick(slot); }}
              >
                {slot.revenue > 0 && (
                  <div
                    className="hm-fill"
                    style={{
                      height: `${Math.max(intensity * 100, 8)}%`,
                      opacity: Math.max(opacity, 0.3),
                    }}
                  />
                )}
                <div className="hm-tooltip">
                  {slot.shortLabel}: {formatINR(slot.revenue)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hm-labels">
          {fullDay.map((slot) => (
            <span key={`l-${slot.hour}`} className="hm-label">
              {slot.hour % 3 === 0 ? slot.shortLabel : ''}
            </span>
          ))}
        </div>

        {/* Summary stats */}
        <div className="hm-summary">
          <div className="hm-summary-item">
            <div className="hm-summary-label">Peak Hour</div>
            <div className="hm-summary-value">{peakHour.label}</div>
          </div>
          <div className="hm-summary-item">
            <div className="hm-summary-label">Peak Revenue</div>
            <div className="hm-summary-value">{formatINR(peakHour.revenue)}</div>
          </div>
          <div className="hm-summary-item">
            <div className="hm-summary-label">Total</div>
            <div className="hm-summary-value">{formatINR(totalRevenue)}</div>
          </div>
          <div className="hm-summary-item">
            <div className="hm-summary-label">Active Hours</div>
            <div className="hm-summary-value">{fullDay.filter(s => s.revenue > 0).length}/24</div>
          </div>
        </div>
      </div>
    </>
  );
}
