import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem('fw_user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('fw_token', data.access_token);
            localStorage.setItem('fw_user', JSON.stringify(data.user));
            setUser(data.user);
            return data.user;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('fw_token');
        localStorage.removeItem('fw_user');
        setUser(null);
        window.location.href = '/login';
    }, []);

    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            localStorage.setItem('fw_user', JSON.stringify(data));
            setUser(data);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('fw_token');
        if (token && !user) {
            refresh();
        }
    }, [refresh, user]);

    const isAdmin = user?.role === 'admin';
    const isOperator = user?.role === 'operator';
    const isViewer = user?.role === 'viewer';
    const canEdit = isAdmin || isOperator;

    return (
        <AuthCtx.Provider value={{ user, loading, login, logout, refresh, isAdmin, isOperator, isViewer, canEdit }}>
            {children}
        </AuthCtx.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
