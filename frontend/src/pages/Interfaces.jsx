import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Network, ArrowDownToLine, ArrowUpFromLine, Power, PowerOff, Radar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

function roleColor(role) {
    if (role === 'wan') return 'border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]';
    if (role === 'lan') return 'border-[hsl(var(--ok))]/40 bg-[hsl(var(--ok))]/10 text-[hsl(var(--ok))]';
    return 'border-[hsl(var(--warn))]/40 bg-[hsl(var(--warn))]/10 text-[hsl(var(--warn))]';
}

function fmtBytes(n) {
    if (!n) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
}

export default function Interfaces() {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();
    const { data } = usePolling(async () => (await api.get('/interfaces/')).data, [], 2500);
    const items = data || [];

    const toggle = async (it) => {
        try {
            await api.patch(`/interfaces/${it.id}/toggle`);
            toast.success(t('common.saved'));
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };

    const discover = async () => {
        try {
            const { data } = await api.post('/interfaces/discover');
            if (data.count === 0) {
                toast.info(t('interfaces.discover_none'));
            } else {
                toast.success(t('interfaces.discover_success', { count: data.count }));
            }
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    return (
        <div data-testid="interfaces-page">
            <PageHeader
                icon={Network}
                title={t('interfaces.title')}
                subtitle={t('interfaces.subtitle')}
                action={
                    isAdmin && (
                        <Button onClick={discover} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="interfaces-discover-button">
                            <Radar className="w-4 h-4" />
                            {t('interfaces.discover')}
                        </Button>
                    )
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((it) => {
                    const up = it.enabled && it.status !== 'down';
                    return (
                        <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                            <Card className={`bg-[hsl(var(--surface-1))] border-border/70 ${up ? '' : 'opacity-70'}`} data-testid={`interface-card-${it.id}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${roleColor(it.role)}`}>
                                                <Network className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-mono">{it.name}</CardTitle>
                                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5">{it.device} • {it.role}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`text-[10px] uppercase ${up ? 'bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))] border-[hsl(var(--ok))]/30' : 'bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30'}`} data-testid={`interface-status-${it.name.toLowerCase()}`}>
                                                {up ? 'UP' : 'DOWN'}
                                            </Badge>
                                            {isAdmin && (
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle(it)} data-testid={`toggle-interface-${it.id}`}>
                                                    {it.enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.ipv4')}</div>
                                            <div className="font-mono">{it.ipv4 || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.gateway')}</div>
                                            <div className="font-mono">{it.gateway || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.mac')}</div>
                                            <div className="font-mono text-muted-foreground">{it.mac}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.mtu')}</div>
                                            <div className="font-mono">{it.mtu}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-md border border-border/70 bg-[hsl(var(--surface-2))] p-2">
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                <ArrowDownToLine className="w-3 h-3" />
                                                {t('interfaces.rx')}
                                            </div>
                                            <div className="font-mono text-sm text-[hsl(var(--ok))]" data-testid={`interface-rx-${it.id}`}>{(it.rx_mbps ?? 0).toFixed(2)} Mbps</div>
                                            <div className="font-mono text-[10px] text-muted-foreground">{fmtBytes(it.rx_bytes || 0)}</div>
                                        </div>
                                        <div className="rounded-md border border-border/70 bg-[hsl(var(--surface-2))] p-2">
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                                <ArrowUpFromLine className="w-3 h-3" />
                                                {t('interfaces.tx')}
                                            </div>
                                            <div className="font-mono text-sm text-[hsl(var(--warn))]" data-testid={`interface-tx-${it.id}`}>{(it.tx_mbps ?? 0).toFixed(2)} Mbps</div>
                                            <div className="font-mono text-[10px] text-muted-foreground">{fmtBytes(it.tx_bytes || 0)}</div>
                                        </div>
                                    </div>
                                    {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
