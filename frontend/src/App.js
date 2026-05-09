import React from 'react';
import '@/i18n';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import AppShell from '@/components/layout/AppShell';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import FirewallRules from '@/pages/FirewallRules';
import NAT from '@/pages/NAT';
import VPN from '@/pages/VPN';
import DHCP from '@/pages/DHCP';
import DNS from '@/pages/DNS';
import Aliases from '@/pages/Aliases';
import Interfaces from '@/pages/Interfaces';
import Logs from '@/pages/Logs';
import Users from '@/pages/Users';
import Export from '@/pages/Export';
import Attacks from '@/pages/Attacks';
import BlockedPublic from '@/pages/BlockedPublic';
import BlockPageAdmin from '@/pages/BlockPageAdmin';

function Protected({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function AdminOnly({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/" replace />;
    return children;
}

function ThemedToaster() {
    const { isDark } = useTheme();
    return (
        <Toaster
            position="top-right"
            theme={isDark ? 'dark' : 'light'}
            toastOptions={{
                style: {
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                },
            }}
        />
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/blocked" element={<BlockedPublic />} />
                        <Route
                            path="/"
                            element={
                                <Protected>
                                    <AppShell />
                                </Protected>
                            }
                        >
                            <Route index element={<Dashboard />} />
                            <Route path="interfaces" element={<Interfaces />} />
                            <Route path="aliases" element={<Aliases />} />
                            <Route path="firewall" element={<FirewallRules />} />
                            <Route path="nat" element={<NAT />} />
                            <Route path="vpn" element={<VPN />} />
                            <Route path="dhcp" element={<DHCP />} />
                            <Route path="dns" element={<DNS />} />
                            <Route path="logs" element={<Logs />} />
                            <Route path="attacks" element={<Attacks />} />
                            <Route
                                path="users"
                                element={
                                    <AdminOnly>
                                        <Users />
                                    </AdminOnly>
                                }
                            />
                            <Route
                                path="block-page"
                                element={
                                    <AdminOnly>
                                        <BlockPageAdmin />
                                    </AdminOnly>
                                }
                            />
                            <Route path="export" element={<Export />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
                <ThemedToaster />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
