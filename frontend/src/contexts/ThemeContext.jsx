import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext(null);
const STORAGE_KEY = 'fw_theme';

function readInitial() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    // Default: dark (NOC console)
    return 'dark';
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(readInitial);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {}
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        root.style.colorScheme = theme;
    }, [theme]);

    const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeCtx.Provider value={{ theme, setTheme, toggle, isDark: theme === 'dark', isLight: theme === 'light' }}>
            {children}
        </ThemeCtx.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeCtx);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
