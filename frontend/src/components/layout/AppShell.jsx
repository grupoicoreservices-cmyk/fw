import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

export default function AppShell() {
    return (
        <div className="min-h-screen bg-soc bg-soc-radial text-foreground" data-testid="app-shell">
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <Topbar />
                    <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1600px] w-full mx-auto">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
