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
    Filter,
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
                { to: '/url-filter', label: t('nav.url_filter'), icon: Filter },
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
            className="hidden md:flex md:flex-col w-[260px] shrink-0 sticky top-0 h-screen"
            style={{
                backgroundColor: 'hsl(var(--sidebar-bg))',
                color: 'hsl(var(--sidebar-fg))',
                borderRight: '1px solid hsl(var(--sidebar-border))',
            }}
            data-testid="app-sidebar"
        >
            <div
                className="flex items-center gap-2.5 px-5 h-16"
                style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
            >
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                >
                    <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight" style={{ color: 'hsl(var(--sidebar-active-fg))' }}>
                        {t('app_name')}
                    </span>
                    <span className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: 'hsl(var(--sidebar-section))' }}>
                        Ubuntu 24 • v1.0
                    </span>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" data-testid="app-sidebar-nav">
                {groups.map((group) => (
                    <div key={group.label}>
                        <div
                            className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: 'hsl(var(--sidebar-section))' }}
                        >
                            {group.label}
                        </div>
                        <ul className="space-y-0.5">
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
                                                    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                                    isActive ? 'sidebar-link-active' : 'hover:text-white',
                                                )
                                            }
                                            style={({ isActive }) => ({
                                                color: isActive ? 'hsl(var(--sidebar-active-fg))' : 'hsl(var(--sidebar-fg))',
                                                backgroundColor: isActive ? 'hsl(var(--sidebar-active-bg))' : 'transparent',
                                            })}
                                            onMouseEnter={(e) => {
                                                if (!e.currentTarget.classList.contains('sidebar-link-active')) {
                                                    e.currentTarget.style.backgroundColor = 'hsl(var(--sidebar-active-soft))';
                                                    e.currentTarget.style.color = 'hsl(var(--sidebar-active-fg))';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!e.currentTarget.classList.contains('sidebar-link-active')) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = 'hsl(var(--sidebar-fg))';
                                                }
                                            }}
                                        >
                                            <Icon className="w-[18px] h-[18px] shrink-0" />
                                            <span>{it.label}</span>
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
            <div
                className="px-5 py-3 text-[10px]"
                style={{
                    borderTop: '1px solid hsl(var(--sidebar-border))',
                    color: 'hsl(var(--sidebar-section))',
                }}
            >
                <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="font-mono uppercase tracking-wider">SYSTEM ONLINE</span>
                </div>
            </div>
        </aside>
    );
}
