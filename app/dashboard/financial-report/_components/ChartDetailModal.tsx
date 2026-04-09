'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ── Vedashi brand palette ──────────────────────────────────── */
const GOLD        = '#A89250';
const GOLD_LIGHT  = '#C5A46D';
const GOLD_PALE   = '#F0E8D5';
const PRIMARY     = '#3B5D3B';
const PRIMARY_LIGHT = '#8CAF8C';
const PRIMARY_PALE  = '#E8F0E8';

interface ChartDetailModalProps {
  title: string;
  heroLabel?: string;
  heroValue?: string | number;
  rows: { label: string; value: string | number }[];
  onClose: () => void;
}

export default function ChartDetailModal({
  title,
  heroLabel,
  heroValue,
  rows,
  onClose,
}: ChartDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  /* close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* scroll lock */
  useEffect(() => {
    if (!mounted) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [mounted]);

  /* entrance animation via class toggle */
  useEffect(() => {
    if (mounted) {
      requestAnimationFrame(() => {
        overlayRef.current?.classList.add('cdm-overlay--visible');
        cardRef.current?.classList.add('cdm-card--visible');
      });
    }
  }, [mounted]);

  const handleClose = () => {
    overlayRef.current?.classList.remove('cdm-overlay--visible');
    cardRef.current?.classList.remove('cdm-card--visible');
    setTimeout(onClose, 320);
  };

  /* strip emoji from title for display */
  const cleanTitle = title.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

  const modalContent = (
    <>
      {/* ── Injected styles ─────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        .cdm-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;
          background: rgba(10, 14, 10, 0);
          backdrop-filter: blur(0px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          transition: background 0.35s ease, backdrop-filter 0.35s ease;
        }
        .cdm-overlay--visible {
          background: rgba(10, 14, 10, 0.62);
          backdrop-filter: blur(8px);
        }

        .cdm-card {
          position: relative;
          width: 100%; max-width: 480px;
          max-height: 100%;
          display: flex; flex-direction: column;
          background: var(--t-card-bg, #1C2A1C);
          border-radius: 24px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(28px) scale(0.96);
          transition: opacity 0.32s cubic-bezier(0.22,1,0.36,1),
                      transform 0.32s cubic-bezier(0.22,1,0.36,1);
          box-shadow:
            0 0 0 1px rgba(168,146,80,0.18),
            0 8px 24px rgba(0,0,0,0.10),
            0 32px 72px rgba(0,0,0,0.16),
            inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .cdm-card--visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .cdm-close-btn {
          position: absolute; top: 18px; right: 18px;
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(168,146,80,0.25);
          background: rgba(168,146,80,0.08);
          color: ${GOLD};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s, transform 0.18s;
          z-index: 2;
        }
        .cdm-close-btn:hover {
          background: rgba(168,146,80,0.18);
          border-color: ${GOLD};
          transform: scale(1.08) rotate(90deg);
        }

        .cdm-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--t-border-subtle, rgba(168,146,80,0.08));
          opacity: 0;
          transform: translateX(-8px);
          animation: cdm-row-in 0.28s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .cdm-row:last-child { border-bottom: none; }

        @keyframes cdm-row-in {
          to { opacity: 1; transform: translateX(0); }
        }

        .cdm-val-bar-bg { width: 44px; height: 4px; background: rgba(168,146,80,0.12); border-radius: 999px; overflow: hidden; margin-left:8px; }
        .cdm-val-bar-fill { height: 100%; background: ${GOLD}; border-radius: 999px; transition: width 1.2s cubic-bezier(0.22,1,0.36,1); }

        .cdm-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(
            135deg,
            transparent 40%,
            rgba(168,146,80,0.06) 50%,
            transparent 60%
          );
          background-size: 200% 200%;
          animation: cdm-shimmer 4s linear infinite;
          pointer-events: none;
        }
        @keyframes cdm-shimmer {
          0%   { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }

        .cdm-hero-number {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 52px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
          color: ${GOLD};
          animation: cdm-hero-in 0.55s cubic-bezier(0.22,1,0.36,1) 0.08s both;
        }
        @keyframes cdm-hero-in {
          from { opacity:0; transform: translateY(10px) scale(0.92); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }

        .cdm-tag {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.10em; text-transform: uppercase;
          color: ${PRIMARY};
          background: ${PRIMARY_PALE};
          border: 1px solid rgba(59,93,59,0.15);
          border-radius: 999px;
          padding: 4px 12px;
        }
      `}</style>

      {/* ── Overlay ─────────────────────────────────────────── */}
      <div
        ref={overlayRef}
        className="cdm-overlay"
        onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Card ──────────────────────────────────────────── */}
        <div ref={cardRef} className="cdm-card">

          {/* shimmer overlay */}
          <div className="cdm-shimmer" />

          {/* ── Header band ───────────────────────────────── */}
          <div
            style={{
              flexShrink: 0,
              background: `linear-gradient(135deg, ${PRIMARY} 0%, #2a4a2a 60%, #1e361e 100%)`,
              padding: '28px 28px 22px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* decorative arcs */}
            <svg
              aria-hidden="true"
              style={{ position:'absolute', right: -24, top: -24, opacity: 0.12, pointerEvents:'none' }}
              width="140" height="140" viewBox="0 0 140 140"
            >
              <circle cx="70" cy="70" r="55" stroke={GOLD_LIGHT} strokeWidth="1.2" fill="none" />
              <circle cx="70" cy="70" r="38" stroke={GOLD_LIGHT} strokeWidth="0.7" fill="none" />
            </svg>

            {/* close */}
            <button className="cdm-close-btn" onClick={handleClose} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="11" y1="1" x2="1"  y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            {/* title */}
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                color: 'rgba(197,164,109,0.65)',
                marginBottom: 6,
              }}
            >
              Detail View
            </p>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 22,
                fontWeight: 600,
                color: '#fff',
                letterSpacing: '0.01em',
                lineHeight: 1.25,
                marginBottom: heroValue ? 22 : 0,
                maxWidth: 320,
              }}
            >
              {cleanTitle}
            </h2>

            {/* hero value */}
            {heroValue && (
              <div
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  gap: 2,
                  background: 'rgba(0,0,0,0.25)',
                  border: `1px solid rgba(168,146,80,0.22)`,
                  borderRadius: 16,
                  padding: '14px 22px',
                }}
              >
                {heroLabel && (
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(197,164,109,0.60)',
                    }}
                  >
                    {heroLabel}
                  </span>
                )}
                <span className="cdm-hero-number">{heroValue}</span>
              </div>
            )}
          </div>

          {/* ── Gold divider line ──────────────────────────── */}
          <div
            style={{
              flexShrink: 0,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${GOLD} 30%, ${GOLD_LIGHT} 50%, ${GOLD} 70%, transparent)`,
              opacity: 0.55,
            }}
          />

          {/* ── Body rows ─────────────────────────────────── */}
          <div style={{ padding: '16px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* source tag */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 14 }}>
              <span className="cdm-tag">
                <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                  <circle cx="3.5" cy="3.5" r="3" stroke={PRIMARY} strokeWidth="1" />
                  <circle cx="3.5" cy="3.5" r="1" fill={PRIMARY} />
                </svg>
                Vedashi Analytics
              </span>
            </div>

            <div>
              {rows.map(({ label, value }, i) => (
                <div
                  key={label}
                  className="cdm-row"
                  style={{ animationDelay: `${0.10 + i * 0.055}s` }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'var(--t-text-muted, #888)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {label}
                  </span>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--t-text-primary, #1a1a1a)',
                        letterSpacing: '-0.01em',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {value}
                    </span>
                    {typeof value === 'string' && value.includes('%') && (
                      <div className="cdm-val-bar-bg">
                        <div 
                          className="cdm-val-bar-fill" 
                          style={{ width: `${Math.min(100, parseFloat(value) || 0)}%` }} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer action ──────────────────────────── */}
            <div style={{ marginTop: 24, marginBottom: 24, display:'flex', justifyContent:'center', flexShrink: 0 }}>
              <button
                onClick={handleClose}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: GOLD,
                  background: GOLD_PALE,
                  border: `1.5px solid rgba(168,146,80,0.30)`,
                  borderRadius: 999,
                  padding: '9px 28px',
                  cursor: 'pointer',
                  transition: 'background 0.18s, border-color 0.18s, transform 0.14s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,146,80,0.22)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = GOLD;
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = GOLD_PALE;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(168,146,80,0.30)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                Dismiss
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}