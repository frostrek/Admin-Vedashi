import React from 'react';

interface PaymentToggleProps {
    status: string;
    onToggle: (newStatus: string) => void;
    disabled?: boolean;
}

export function PaymentToggle({ status, onToggle, disabled }: PaymentToggleProps) {
    const isPaid = status?.toLowerCase() === 'paid';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isPaid}
            disabled={disabled}
            onClick={() => onToggle(isPaid ? 'UNPAID' : 'PAID')}
            className={`
                relative inline-flex h-6 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isPaid ? 'bg-success/80' : 'bg-text-muted/30'}
            `}
        >
            <span className="sr-only">Toggle Payment Status</span>

            <span
                aria-hidden="true"
                className={`
                    pointer-events-none absolute inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${isPaid ? 'translate-x-9' : 'translate-x-1'}
                `}
            />
            <span
                className={`absolute text-[9px] font-bold uppercase transition-opacity duration-200 select-none pointer-events-none
                    ${isPaid ? 'opacity-100 left-2 text-white' : 'opacity-0'}
                `}
            >
                Paid
            </span>
            <span
                className={`absolute text-[9px] font-bold uppercase transition-opacity duration-200 select-none pointer-events-none
                    ${!isPaid ? 'opacity-100 right-1.5 text-text-primary/70' : 'opacity-0'}
                `}
            >
                Unpd
            </span>
        </button>
    );
}
