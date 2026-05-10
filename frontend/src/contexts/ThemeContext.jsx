import React, { createContext, useContext, useEffect } from 'react';

/*
 * Single corporate-clean theme.
 * The toggle is intentionally disabled — we always render the unified theme
 * (white content + dark sidebar via CSS tokens). The `theme` value is kept
 * as a stable "light" string so any legacy code (Toaster, isDark checks) keeps
 * working without visual changes.
 */
const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
    }, []);

    const value = {
        theme: 'light',
        setTheme: () => {},
        toggle: () => {},
        isDark: false,
        isLight: true,
    };

    return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeCtx);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
