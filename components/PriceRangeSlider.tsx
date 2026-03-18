'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PriceRangeSliderProps {
    min: number;
    max: number;
    step?: number;
    initialMin?: number;
    initialMax?: number;
    onChange: (min: number, max: number) => void;
}

export default function PriceRangeSlider({
    min,
    max,
    step = 10,
    initialMin,
    initialMax,
    onChange
}: PriceRangeSliderProps) {
    const [minVal, setMinVal] = useState(initialMin ?? min);
    const [maxVal, setMaxVal] = useState(initialMax ?? max);
    const minRef = useRef<HTMLInputElement>(null);
    const maxRef = useRef<HTMLInputElement>(null);
    const range = useRef<HTMLDivElement>(null);

    // Convert to percentage
    const getPercent = (value: number) => Math.round(((value - min) / (max - min)) * 100);

    // Set width of the range to decrease from the left side
    useEffect(() => {
        if (maxRef.current) {
            const minPercent = getPercent(minVal);
            const maxPercent = getPercent(+maxRef.current.value); // Preceding with + to convert the value to a number

            if (range.current) {
                range.current.style.left = `${minPercent}%`;
                range.current.style.width = `${maxPercent - minPercent}%`;
            }
        }
    }, [minVal, min, max]);

    // Set width of the range to decrease from the right side
    useEffect(() => {
        if (minRef.current) {
            const minPercent = getPercent(+minRef.current.value);
            const maxPercent = getPercent(maxVal);

            if (range.current) {
                range.current.style.width = `${maxPercent - minPercent}%`;
            }
        }
    }, [maxVal, min, max]);

    // Update state when initial values change
    useEffect(() => {
        setMinVal(initialMin ?? min);
        setMaxVal(initialMax ?? max);
    }, [initialMin, initialMax, min, max]);

    return (
        <div className="flex flex-col gap-6 py-4 px-2">
            <div className="relative w-full h-10">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={minVal}
                    ref={minRef}
                    onChange={(event) => {
                        const value = Math.min(+event.target.value, maxVal - step);
                        setMinVal(value);
                        onChange(value, maxVal);
                        event.target.value = value.toString();
                    }}
                    className="thumb thumb--zindex-3"
                    style={{ zIndex: minVal > max - 100 ? 5 : undefined }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={maxVal}
                    ref={maxRef}
                    onChange={(event) => {
                        const value = Math.max(+event.target.value, minVal + step);
                        setMaxVal(value);
                        onChange(minVal, value);
                        event.target.value = value.toString();
                    }}
                    className="thumb thumb--zindex-4"
                />

                <div className="slider">
                    <div className="slider__track" />
                    <div ref={range} className="slider__range" />
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Min Price</span>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">₹</span>
                        <input
                            type="number"
                            value={minVal}
                            onChange={(e) => {
                                const val = Math.min(Math.max(+e.target.value, min), maxVal - step);
                                setMinVal(val);
                                onChange(val, maxVal);
                            }}
                            className="w-full bg-transparent border border-border rounded-lg pl-6 pr-2 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Max Price</span>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">₹</span>
                        <input
                            type="number"
                            value={maxVal}
                            onChange={(e) => {
                                const val = Math.max(Math.min(+e.target.value, max), minVal + step);
                                setMaxVal(val);
                                onChange(minVal, val);
                            }}
                            className="w-full bg-transparent border border-border rounded-lg pl-6 pr-2 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </div>
            </div>

            <style jsx>{`
                .slider {
                    position: relative;
                    width: 100%;
                }

                .slider__track,
                .slider__range,
                .slider__left-value,
                .slider__right-value {
                    position: absolute;
                }

                .slider__track,
                .slider__range {
                    border-radius: 3px;
                    height: 5px;
                }

                .slider__track {
                    background-color: var(--border-subtle, #3d3b38);
                    opacity: 0.3;
                    width: 100%;
                    z-index: 1;
                }

                .slider__range {
                    background-color: #d4af37;
                    z-index: 2;
                }

                .thumb,
                .thumb::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    -webkit-tap-highlight-color: transparent;
                }

                .thumb {
                    pointer-events: none;
                    position: absolute;
                    height: 0;
                    width: 100%;
                    outline: none;
                }

                .thumb--zindex-3 {
                    z-index: 3;
                }

                .thumb--zindex-4 {
                    z-index: 4;
                }

                .thumb::-webkit-slider-thumb {
                    background-color: #f9f9f9;
                    border: 2px solid #d4af37;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
                    cursor: pointer;
                    height: 18px;
                    width: 18px;
                    margin-top: 4px;
                    pointer-events: all;
                    position: relative;
                    transition: all 0.2s ease;
                }
                
                .thumb:active::-webkit-slider-thumb {
                    transform: scale(1.1);
                    box-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
                }

                .thumb::-moz-range-thumb {
                    background-color: #f9f9f9;
                    border: 2px solid #d4af37;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
                    cursor: pointer;
                    height: 18px;
                    width: 18px;
                    pointer-events: all;
                    position: relative;
                    transition: all 0.2s ease;
                }
            `}</style>
        </div>
    );
}
