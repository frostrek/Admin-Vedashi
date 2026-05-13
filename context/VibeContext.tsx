'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { updateAdminProfile, getAdminMe } from '@/lib/api';
import toast from 'react-hot-toast';

export type AuraType = 'Minimal' | 'Balanced' | 'Intense';
export type DoshaType = 'Vata' | 'Pitta' | 'Kapha' | 'None';

interface VibeSettings {
    aura: AuraType;
    volume: number;
    dosha: DoshaType;
    pulse: number; // 0 to 100
}

interface VibeContextType {
    settings: VibeSettings;
    updateSettings: (newSettings: Partial<VibeSettings>) => void;
    saveSettings: () => Promise<void>;
    isLoading: boolean;
}

const VibeContext = createContext<VibeContextType | undefined>(undefined);

const DEFAULT_SETTINGS: VibeSettings = {
    aura: 'Balanced',
    volume: 60,
    dosha: 'None',
    pulse: 50,
};

export function VibeProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAdminAuth();
    const [settings, setSettings] = useState<VibeSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    // Load from DB or LocalStorage on mount/auth
    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);

            // 1. Try LocalStorage fallback first for instant feels
            const local = localStorage.getItem('admin_vibe_matrix');
            if (local) {
                try {
                    setSettings(prev => ({ ...prev, ...JSON.parse(local) }));
                } catch (e) {
                    console.error('Failed to parse local vibe settings');
                }
            }

            // 2. If authenticated, fetch from DB
            if (isAuthenticated) {
                try {
                    const res = await getAdminMe();
                    if (res.success && res.data?.preferences?.vibe_matrix) {
                        const dbSettings = res.data.preferences.vibe_matrix;
                        setSettings(dbSettings);
                        localStorage.setItem('admin_vibe_matrix', JSON.stringify(dbSettings));
                    }
                } catch (err) {
                    console.error('Failed to sync vibe matrix from DB:', err);
                }
            }

            setIsLoading(false);
        };

        loadSettings();
    }, [isAuthenticated]);

    // Apply settings to document
    useEffect(() => {
        const root = document.documentElement;

        // Apply Aura
        root.classList.remove('aura-minimal', 'aura-balanced', 'aura-intense');
        root.classList.add(`aura-${settings.aura.toLowerCase()}`);

        // Apply Dosha
        root.classList.remove('theme-vata', 'theme-pitta', 'theme-kapha');
        if (settings.dosha !== 'None') {
            root.classList.add(`theme-${settings.dosha.toLowerCase()}`);
        }

        // Apply Pulse (CSS Variables)
        root.style.setProperty('--vibe-pulse-speed', `${(101 - settings.pulse) / 25}s`);
        root.style.setProperty('--vibe-aura-opacity', settings.aura === 'Minimal' ? '0.05' : settings.aura === 'Balanced' ? '0.15' : '0.3');

    }, [settings]);

    const updateSettings = (newSettings: Partial<VibeSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            // Auto-save to local storage for instant feedback
            localStorage.setItem('admin_vibe_matrix', JSON.stringify(updated));
            return updated;
        });
    };

    const saveSettings = async () => {
        const customerId = user?.customer_id;
        if (!customerId || !isAuthenticated) {
            toast.error('Identity not verified for persistent resonance');
            return;
        }

        try {
            const res = await updateAdminProfile(customerId, {
                preferences: { vibe_matrix: settings }
            });
            if (res.success) {
                toast.success('Vibe Matrix harmonized with cosmic vault');
            } else {
                toast.error(res.message || 'Sync failure');
            }
        } catch (err) {
            toast.error('Connection to spiritual server lost');
        }
    };

    return (
        <VibeContext.Provider value={{ settings, updateSettings, saveSettings, isLoading }}>
            {children}
        </VibeContext.Provider>
    );
}

export function useVibe() {
    const ctx = useContext(VibeContext);
    if (!ctx) throw new Error('useVibe must be used within VibeProvider');
    return ctx;
}
