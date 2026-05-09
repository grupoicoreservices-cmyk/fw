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
    '/users': { key: 'nav.users' },
    '/export': { key: 'nav.export' },
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
        admin: 'bg-[hsl(var(--bad)/0.16)] text-[hsl(var(--bad))] border-[hsl(var(--bad)/0.3)]',
        operator: 'bg-[hsl(var(--warn)/0.16)] text-[hsl(var(--warn))] border-[hsl(var(--warn)/0.3)]',
        viewer: 'bg-[hsl(var(--neutral)/0.16)] text-muted-foreground border-border',
    };

    return (
        <header className="h-16 border-b border-border/70 bg-[hsl(var(--surface-1))]/80 backdrop-blur sticky top-0 z-30" data-testid="app-topbar">
            <div className="h-full flex items-center justify-between gap-4 px-4 md:px-8">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="md:hidden w-9 h-9 rounded-lg bg-[hsl(var(--info))]/15 border border-[hsl(var(--info))]/30 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-[hsl(var(--info))]" />
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <span className="font-mono uppercase tracking-wider">Console</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-foreground font-medium" data-testid="topbar-page-title">
                            {t(current.key)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ToggleGroup
                        type="single"
                        value={i18n.language?.startsWith('en') ? 'en' : 'pt'}
                        onValueChange={changeLang}
                        className="bg-[hsl(var(--surface-2))] border border-border rounded-md p-0.5"
                        data-testid="language-toggle"
                    >
                        <ToggleGroupItem value="pt" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--info))]/20 data-[state=on]:text-[hsl(var(--info))]" data-testid="language-pt">
                            PT
                        </ToggleGroupItem>
                        <ToggleGroupItem value="en" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--info))]/20 data-[state=on]:text-[hsl(var(--info))]" data-testid="language-en">
                            EN
                        </ToggleGroupItem>
                    </ToggleGroup>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2 px-2 h-9" data-testid="user-menu">
                                <Avatar className="w-7 h-7">
                                    <AvatarFallback className="text-[10px] bg-[hsl(var(--info))]/20 text-[hsl(var(--info))]">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden md:flex flex-col items-start leading-tight">
                                    <span className="text-xs font-medium">{user?.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{user?.email}</span>
                                </div>
                                <Badge variant="outline" className={`hidden md:inline-flex ml-1 text-[10px] uppercase ${roleColor[user?.role] || ''}`}>
                                    {user?.role}
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-xs">
                                <div className="text-muted-foreground text-[10px] font-mono uppercase tracking-wider">{t('common.signed_in_as')}</div>
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
