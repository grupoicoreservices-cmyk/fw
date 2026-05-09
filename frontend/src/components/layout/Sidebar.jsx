import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Network,
    Tags,
    Shield,
    ArrowRightLeft,
    KeyRound,
    Server,
    Globe2,
    Activity,
    Users2,
    FileDown,
    ShieldCheck,
    ShieldAlert,
    ShieldOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const groups = [
        {
            label: t('nav.overview'),
            items: [{ to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true }],
        },
        {
            label: t('nav.network'),
            items: [
                { to: '/interfaces', label: t('nav.interfaces'), icon: Network },
                { to: '/aliases', label: t('nav.aliases'), icon: Tags },
            ],
        },
        {
            label: t('nav.firewall'),
            items: [
                { to: '/firewall', label: t('nav.rules'), icon: Shield },
                { to: '/nat', label: t('nav.nat'), icon: ArrowRightLeft },
            ],
        },
        {
            label: t('nav.services'),
            items: [
                { to: '/vpn', label: t('nav.vpn'), icon: KeyRound },
                { to: '/dhcp', label: t('nav.dhcp'), icon: Server },
                { to: '/dns', label: t('nav.dns'), icon: Globe2 },
            ],
        },
        {
            label: t('nav.monitoring'),
            items: [
                { to: '/logs', label: t('nav.logs'), icon: Activity },
                { to: '/attacks', label: t('nav.attacks'), icon: ShieldAlert },
            ],
        },
        {
            label: t('nav.administration'),
            items: [
                ...(user?.role === 'admin' ? [{ to: '/users', label: t('nav.users'), icon: Users2 }] : []),
                ...(user?.role === 'admin' ? [{ to: '/block-page', label: t('nav.block_page'), icon: ShieldOff }] : []),
                { to: '/export', label: t('nav.export'), icon: FileDown },
            ],
        },
    ];

    return (
        <aside
            className="hidden md:flex md:flex-col w-[260px] shrink-0 border-r border-border/70 bg-[hsl(var(--surface-1))]/95 backdrop-blur sticky top-0 h-screen"
            data-testid="app-sidebar"
        >
            <div className="flex items-center gap-2 px-5 h-16 border-b border-border/70">
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--info))]/15 border border-[hsl(var(--info))]/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[hsl(var(--info))]" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-none">Firewall Console</span>
                    <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Ubuntu 24 • v1.0</span>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" data-testid="app-sidebar-nav">
                {groups.map((group) => (
                    <div key={group.label}>
                        <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                            {group.label}
                        </div>
                        <ul className="space-y-1">
                            {group.items.map((it) => {
                                const Icon = it.icon;
                                return (
                                    <li key={it.to}>
                                        <NavLink
                                            to={it.to}
                                            end={it.end}
                                            data-testid={`sidebar-nav-item-${it.to.replace('/', '') || 'dashboard'}`}
                                            className={({ isActive }) =>
                                                cn(
                                                    'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                                                    isActive
                                                        ? 'text-foreground bg-foreground/[0.06] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[hsl(var(--info))]'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]',
                                                )
                                            }
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            <span>{it.label}</span>
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
            <div className="px-5 py-3 border-t border-border/70 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="font-mono uppercase tracking-wider">SIM MODE • ONLINE</span>
                </div>
            </div>
        </aside>
    );
}
