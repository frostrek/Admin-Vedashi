'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Minus, Plus, Loader2 } from 'lucide-react';

interface StockControlProps {
    value: number;
    onChange: (value: number) => void;
    onSave?: (value: number) => Promise<boolean>;
    min?: number;
    loading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    showLabel?: boolean;
    label?: string;
}

export default function StockControl({
    value,
    onChange,
    onSave,
    min = 0,
    loading: externalLoading = false,
    disabled = false,
    size = 'md',
    showLabel = false,
    label = 'Stock Quantity',
}: StockControlProps) {
    const [internalValue, setInternalValue] = useState<string>(String(value));
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoading = externalLoading || saving;

    // Sync internal value when external value changes
    useEffect(() => {
        if (!saving) {
            setInternalValue(String(value));
        }
    }, [value, saving]);

    const sanitize = (raw: string): number => {
        const parsed = parseInt(raw, 10);
        if (isNaN(parsed) || parsed < min) return min;
        return parsed;
    };

    const commitValue = useCallback(
        async (newVal: number) => {
            onChange(newVal);
            if (onSave) {
                // Debounce the save call
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(async () => {
                    setSaving(true);
                    await onSave(newVal);
                    setSaving(false);
                }, 300);
            }
        },
        [onChange, onSave]
    );

    const increment = () => {
        if (isLoading || disabled) return;
        const newVal = sanitize(internalValue) + 1;
        setInternalValue(String(newVal));
        commitValue(newVal);
    };

    const decrement = () => {
        if (isLoading || disabled) return;
        const current = sanitize(internalValue);
        if (current <= min) return;
        const newVal = current - 1;
        setInternalValue(String(newVal));
        commitValue(newVal);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow only digits
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setInternalValue(raw);
    };

    const handleBlur = () => {
        const newVal = sanitize(internalValue);
        setInternalValue(String(newVal));
        commitValue(newVal);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        }
        // Block decimal point, minus, and 'e'
        if (['.', '-', 'e', 'E', '+'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const isSmall = size === 'sm';
    const atMin = sanitize(internalValue) <= min;

    return (
        <div>
            {showLabel && (
                <label className="block text-sm font-medium text-text-primary mb-1">
                    {label}
                </label>
            )}
            <div className={`stock-control ${isSmall ? 'stock-control--sm' : 'stock-control--md'}`}>
                {/* Decrement */}
                <button
                    type="button"
                    onClick={decrement}
                    disabled={atMin || isLoading || disabled}
                    className="stock-control__btn stock-control__btn--dec"
                    title="Decrease stock"
                    aria-label="Decrease stock"
                >
                    <Minus className={isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                </button>

                {/* Input */}
                <div className="stock-control__input-wrap">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={internalValue}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading || disabled}
                        className={`stock-control__input ${isSmall ? 'stock-control__input--sm' : 'stock-control__input--md'}`}
                        aria-label="Stock quantity"
                    />
                    {isLoading && (
                        <div className="stock-control__spinner">
                            <Loader2 className={`animate-spin ${isSmall ? 'h-3 w-3' : 'h-4 w-4'} text-primary`} />
                        </div>
                    )}
                </div>

                {/* Increment */}
                <button
                    type="button"
                    onClick={increment}
                    disabled={isLoading || disabled}
                    className="stock-control__btn stock-control__btn--inc"
                    title="Increase stock"
                    aria-label="Increase stock"
                >
                    <Plus className={isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                </button>
            </div>
        </div>
    );
}
