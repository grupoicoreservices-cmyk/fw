import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, ChevronRight, ShieldCheck } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const routeTitles = {
    '/': { key: 'nav.dashboard' },
    '/interfaces': { key: 'nav.interfaces' },
    '/aliases': { key: 'nav.aliases' },
    '/firewall': { key: 'nav.rules' },
    '/nat': { key: 'nav.nat' },
    '/vpn': { key: 'nav.vpn' },
    '/dhcp': { key: 'nav.dhcp' },
    '/dns': { key: 'nav.dns' },
    '/logs': { key: 'nav.logs' },
    '/attacks': { key: 'nav.attacks' },
    '/users': { key: 'nav.users' },
    '/block-page': { key: 'nav.block_page' },
    '/export': { key: 'nav.export' },
    '/url-filter': { key: 'nav.url_filter' },
};

export default function Topbar() {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const location = useLocation();

    const current = routeTitles[location.pathname] || routeTitles['/'];
    const initials = (user?.name || user?.email || 'U')
        .split(/\s+|@/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase())
        .join('');

    const changeLang = (lng) => {
        if (!lng) return;
        i18n.changeLanguage(lng);
        try {
            localStorage.setItem('i18nextLng', lng);
        } catch {}
    };

    const roleColor = {
        admin: 'bg-[hsl(var(--bad)/0.10)] text-[hsl(var(--bad))] border-[hsl(var(--bad)/0.3)]',
        operator: 'bg-[hsl(var(--warn)/0.18)] text-[hsl(var(--warn))] border-[hsl(var(--warn)/0.4)]',
        viewer: 'bg-[hsl(var(--neutral)/0.10)] text-muted-foreground border-border',
    };

    return (
        <header
            className="h-16 sticky top-0 z-30"
            style={{
                backgroundColor: 'hsl(var(--card))',
                borderBottom: '1px solid hsl(var(--border))',
            }}
            data-testid="app-topbar"
        >
            <div className="h-full flex items-center justify-between gap-4 px-4 md:px-8">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'hsl(var(--primary))' }}
                    >
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center text-xs gap-1.5 text-muted-foreground">
                        <span className="font-medium uppercase tracking-wider text-[11px]">Console</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-foreground font-semibold text-sm" data-testid="topbar-page-title">
                            {t(current.key)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ToggleGroup
                        type="single"
                        value={i18n.language?.startsWith('en') ? 'en' : 'pt'}
                        onValueChange={changeLang}
                        className="bg-secondary border border-border rounded-md p-0.5"
                        data-testid="language-toggle"
                    >
                        <ToggleGroupItem
                            value="pt"
                            className="px-2.5 h-7 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            data-testid="language-pt"
                        >
                            PT
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="en"
                            className="px-2.5 h-7 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            data-testid="language-en"
                        >
                            EN
                        </ToggleGroupItem>
                    </ToggleGroup>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2 px-2 h-9 hover:bg-secondary" data-testid="user-menu">
                                <Avatar className="w-7 h-7">
                                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-semibold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden md:flex flex-col items-start leading-tight">
                                    <span className="text-xs font-semibold">{user?.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{user?.email}</span>
                                </div>
                                <Badge variant="outline" className={`hidden md:inline-flex ml-1 text-[10px] uppercase font-semibold ${roleColor[user?.role] || ''}`}>
                                    {user?.role}
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-xs">
                                <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{t('common.signed_in_as')}</div>
                                <div className="truncate font-medium">{user?.email}</div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} data-testid="user-menu-logout" className="gap-2 cursor-pointer">
                                <LogOut className="w-4 h-4" />
                                {t('common.logout')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
