import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Shield,
    ShieldAlert,
    ShieldOff,
    Ban,
    Globe,
    Network,
    AlertTriangle,
    Activity,
    Pause,
    Play,
    Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader, EmptyState } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

function sevColor(sev) {
    if (sev === 'critical') return 'hsl(var(--bad))';
    if (sev === 'warning') return 'hsl(var(--warn))';
    return 'hsl(var(--info))';
}

function TypeChip({ type }) {
    const { t } = useTranslation();
    const tone = {
        port_scan: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-[hsl(var(--info))]/30',
        brute_force: 'bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30',
        sql_injection: 'bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30',
        malware_c2: 'bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30',
        suspicious_traffic: 'bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30',
        repeated_attempts: 'bg-[hsl(var(--neutral))]/15 text-muted-foreground border-border',
        high_traffic: 'bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30',
    };
    return (
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${tone[type] || ''}`}>
            {t(`attacks.types.${type}`, type)}
        </Badge>
    );
}

function isInternal(ip) {
    if (!ip) return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
}

function LiveFeed({ canEdit, onBlock, blockedSet }) {
    const { t } = useTranslation();
    const [paused, setPaused] = useState(false);
    const [items, setItems] = useState([]);
    const seenIds = useRef(new Set());

    const { data } = usePolling(
        async () => {
            if (paused) return null;
            const params = new URLSearchParams();
            params.set('action', 'block');
            params.set('limit', '40');
            return (await api.get(`/logs/?${params.toString()}`)).data;
        },
        [paused],
        1500,
    );

    useEffect(() => {
        if (!data?.items) return;
        const incoming = data.items;
        const newOnes = incoming.filter((x) => !seenIds.current.has(x.id));
        if (newOnes.length === 0) return;
        newOnes.forEach((x) => seenIds.current.add(x.id));
        setItems((prev) => {
            const merged = [...newOnes, ...prev];
            return merged.slice(0, 60);
        });
    }, [data]);

    const counts = useMemo(() => {
        const c = { critical: 0, warning: 0, info: 0 };
        items.forEach((x) => { c[x.severity] = (c[x.severity] || 0) + 1; });
        return c;
    }, [items]);

    return (
        <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="attacks-live-feed">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Radio className="w-4 h-4 text-[hsl(var(--bad))]" />
                        {t('attacks.live_feed_title')}
                    </CardTitle>
                    {!paused && (
                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[hsl(var(--bad))] font-mono">
                            <span className="live-dot" style={{ background: 'hsl(var(--bad))' }} />
                            {t('attacks.live_now')}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(var(--bad))]" /> crit {counts.critical}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[hsl(var(--warn))]" /> warn {counts.warning}</span>
                    </div>
                    {paused ? (
                        <Button size="sm" onClick={() => setPaused(false)} className="gap-1.5 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="live-feed-resume">
                            <Play className="w-3.5 h-3.5" />
                            {t('logs.resume')}
                        </Button>
                    ) : (
                        <Button size="sm" variant="outline" onClick={() => setPaused(true)} className="gap-1.5" data-testid="live-feed-pause">
                            <Pause className="w-3.5 h-3.5" />
                            {t('logs.pause')}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[560px]">
                    <div className="divide-y divide-border/50" data-testid="live-feed-stream">
                        <AnimatePresence initial={false}>
                            {items.map((log) => {
                                const direction = isInternal(log.src_ip) ? 'internal' : 'external';
                                const blocked = blockedSet?.has(log.src_ip);
                                return (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -8, height: 0 }}
                                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="px-3 py-2.5 border-l-[3px] new-attack hover-soft"
                                        style={{ borderLeftColor: sevColor(log.severity) }}
                                        data-testid={`live-event-${log.id}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="shrink-0 flex flex-col items-center gap-1 w-16">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] uppercase font-semibold tracking-wider"
                                                    style={{
                                                        background: `${sevColor(log.severity)}1f`,
                                                        color: sevColor(log.severity),
                                                        borderColor: `${sevColor(log.severity)}55`,
                                                    }}
                                                >
                                                    {log.severity}
                                                </Badge>
                                                <span className="text-[9px] font-mono text-muted-foreground">
                                                    {new Date(log.ts).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[9px] uppercase ${direction === 'external' ? 'bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30' : 'bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30'}`}
                                                    >
                                                        {direction === 'external' ? <Globe className="w-2.5 h-2.5 mr-1" /> : <Network className="w-2.5 h-2.5 mr-1" />}
                                                        {t(`attacks.${direction}`)}
                                                    </Badge>
                                                    {log.src_flag && <span className="text-base leading-none">{log.src_flag}</span>}
                                                    <span className="font-mono text-sm font-medium">{log.src_ip}</span>
                                                    {log.src_hostname && (
                                                        <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[260px]" title={log.src_hostname}>
                                                            {log.src_hostname}
                                                        </span>
                                                    )}
                                                    {log.attack_type && log.attack_type !== 'normal' && <TypeChip type={log.attack_type} />}
                                                </div>
                                                <div className="text-xs font-mono text-foreground/80 mt-1 leading-relaxed">
                                                    <span className="text-muted-foreground">→ {log.dst_ip}:{log.port}</span>{' '}
                                                    <span className="text-muted-foreground/80">[{log.protocol}]</span>{' '}
                                                    <span>{log.message}</span>
                                                </div>
                                            </div>
                                            {canEdit && (
                                                blocked ? (
                                                    <Badge className="shrink-0 bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border border-[hsl(var(--bad))]/30 self-center">
                                                        <Ban className="w-3 h-3 mr-1" />{t('attacks.blocked')}
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => onBlock({ src_ip: log.src_ip, src_hostname: log.src_hostname })}
                                                        className="shrink-0 h-7 text-[11px] gap-1.5 bg-[hsl(var(--bad))] hover:bg-[hsl(var(--bad))]/90 text-white self-center"
                                                        data-testid={`live-block-${log.id}`}
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                        {t('attacks.block')}
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {items.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-12">
                                <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                {t('attacks.live_feed_waiting')}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export default function Attacks() {
    const { t } = useTranslation();
    const { canEdit } = useAuth();
    const [direction, setDirection] = useState('all');
    const [severity, setSeverity] = useState('all');
    const [windowMin, setWindowMin] = useState(15);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [target, setTarget] = useState(null);
    const [reason, setReason] = useState('');
    const [redirect, setRedirect] = useState(true);
    const [activeTab, setActiveTab] = useState('aggregated');
    const newRowRefs = useRef(new Set());

    const { data } = usePolling(
        async () => {
            const params = new URLSearchParams();
            if (direction !== 'all') params.set('direction', direction);
            if (severity !== 'all') params.set('severity', severity);
            params.set('minutes', String(windowMin));
            return (await api.get(`/attacks/?${params.toString()}`)).data;
        },
        [direction, severity, windowMin],
        2500,
    );
    const { data: summary } = usePolling(async () => (await api.get('/attacks/summary')).data, [], 3000);
    const { data: blockedList } = usePolling(async () => (await api.get('/attacks/blocked-list')).data, [], 3000);

    const items = data?.items || [];
    const blockedSet = useMemo(() => new Set(blockedList?.addresses || []), [blockedList]);

    // Track which ips are new (just appeared)
    useEffect(() => {
        const cur = new Set(items.map((i) => i.src_ip));
        // Reset new-marker set if we want fresh detection per render
        newRowRefs.current = cur;
    }, [items]);

    const askBlock = (item) => {
        setTarget(item);
        setReason('');
        setRedirect(true);
        setConfirmOpen(true);
    };
    const doBlock = async () => {
        try {
            await api.post('/attacks/block', {
                ip: target.src_ip,
                hostname: target.src_hostname,
                reason,
                redirect_to_block_page: redirect,
            });
            toast.success(t('attacks.blocked_success', { ip: target.src_ip }));
            setConfirmOpen(false);
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };
    const doUnblock = async (item) => {
        try {
            await api.post('/attacks/unblock', { ip: item.src_ip });
            toast.success(t('attacks.unblocked_success', { ip: item.src_ip }));
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    return (
        <div data-testid="attacks-page">
            <PageHeader
                icon={ShieldAlert}
                title={t('attacks.title')}
                subtitle={t('attacks.subtitle')}
                action={
                    <Badge variant="outline" className="gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider border-[hsl(var(--bad))]/30 bg-[hsl(var(--bad))]/10 text-[hsl(var(--bad))]">
                        <span className="live-dot" style={{ background: 'hsl(var(--bad))' }} />
                        {t('attacks.window', { minutes: windowMin })}
                    </Badge>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="attacks-stat-unique">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5" />{t('attacks.unique_attackers')}</div>
                        <div className="font-mono text-3xl mt-2 text-[hsl(var(--bad))]">{summary?.unique_attackers ?? '—'}</div>
                    </CardContent>
                </Card>
                <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="attacks-stat-events">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><ShieldOff className="w-3.5 h-3.5" />{t('attacks.blocked_events')}</div>
                        <div className="font-mono text-3xl mt-2 text-[hsl(var(--warn))]">{summary?.total_blocked_events ?? '—'}</div>
                    </CardContent>
                </Card>
                <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="attacks-stat-blocked">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Ban className="w-3.5 h-3.5" />{t('attacks.currently_blocked')}</div>
                        <div className="font-mono text-3xl mt-2 text-[hsl(var(--info))]">{summary?.currently_blocked_ips ?? '—'}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[hsl(var(--surface-2))] border border-border">
                    <TabsTrigger value="aggregated" className="gap-2" data-testid="tab-aggregated">
                        <Shield className="w-3.5 h-3.5" />
                        {t('attacks.tab_aggregated')}
                    </TabsTrigger>
                    <TabsTrigger value="live" className="gap-2 data-[state=active]:text-[hsl(var(--bad))]" data-testid="tab-live-feed">
                        <Radio className="w-3.5 h-3.5" />
                        {t('attacks.tab_live')}
                        <span className="live-dot ml-1" style={{ background: 'hsl(var(--bad))' }} />
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="aggregated" className="mt-4 space-y-3">
                    <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                        <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('attacks.direction')}</span>
                                <ToggleGroup type="single" value={direction} onValueChange={(v) => v && setDirection(v)} className="bg-[hsl(var(--surface-2))] border border-border rounded-md p-0.5" data-testid="attacks-direction-toggle">
                                    <ToggleGroupItem value="all" className="px-2.5 h-7 text-xs">{t('attacks.all')}</ToggleGroupItem>
                                    <ToggleGroupItem value="external" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--bad))]/20 data-[state=on]:text-[hsl(var(--bad))]"><Globe className="w-3 h-3 mr-1" />{t('attacks.external')}</ToggleGroupItem>
                                    <ToggleGroupItem value="internal" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--warn))]/20 data-[state=on]:text-[hsl(var(--warn))]"><Network className="w-3 h-3 mr-1" />{t('attacks.internal')}</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('logs.severity')}</span>
                                <ToggleGroup type="single" value={severity} onValueChange={(v) => v && setSeverity(v)} className="bg-[hsl(var(--surface-2))] border border-border rounded-md p-0.5" data-testid="attacks-severity-toggle">
                                    <ToggleGroupItem value="all" className="px-2.5 h-7 text-xs">{t('attacks.all')}</ToggleGroupItem>
                                    <ToggleGroupItem value="warning" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--warn))]/20 data-[state=on]:text-[hsl(var(--warn))]">{t('logs.warning')}</ToggleGroupItem>
                                    <ToggleGroupItem value="critical" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--bad))]/20 data-[state=on]:text-[hsl(var(--bad))]">{t('logs.critical')}</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">window</span>
                                <ToggleGroup type="single" value={String(windowMin)} onValueChange={(v) => v && setWindowMin(parseInt(v))} className="bg-[hsl(var(--surface-2))] border border-border rounded-md p-0.5" data-testid="attacks-window-toggle">
                                    <ToggleGroupItem value="5" className="px-2.5 h-7 text-xs">5m</ToggleGroupItem>
                                    <ToggleGroupItem value="15" className="px-2.5 h-7 text-xs">15m</ToggleGroupItem>
                                    <ToggleGroupItem value="60" className="px-2.5 h-7 text-xs">1h</ToggleGroupItem>
                                    <ToggleGroupItem value="120" className="px-2.5 h-7 text-xs">2h</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="attacks-table">
                        <CardContent className="p-0">
                            <div className="overflow-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/70 bg-[hsl(var(--surface-2))]">
                                            <th className="py-2.5 px-3">{t('attacks.severity')}</th>
                                            <th className="px-2">{t('attacks.direction')}</th>
                                            <th className="px-2">{t('attacks.country')}</th>
                                            <th className="px-2">{t('attacks.ip')}</th>
                                            <th className="px-2">{t('attacks.hostname')}</th>
                                            <th className="px-2">{t('attacks.attack_types')}</th>
                                            <th className="px-2 text-right">{t('attacks.hits')}</th>
                                            <th className="px-2">{t('attacks.targets')}</th>
                                            <th className="px-2">{t('attacks.last_seen')}</th>
                                            <th className="px-2 pr-3 text-right">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence initial={false}>
                                            {items.map((it) => (
                                                <motion.tr
                                                    key={it.src_ip}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="border-b border-border/50 row-hover"
                                                    data-testid={`attack-row-${it.src_ip.replace(/\./g, '-')}`}
                                                >
                                                    <td className="py-2.5 px-3">
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] uppercase"
                                                            style={{
                                                                background: `${sevColor(it.severity_max)}1f`,
                                                                color: sevColor(it.severity_max),
                                                                borderColor: `${sevColor(it.severity_max)}55`,
                                                            }}
                                                        >
                                                            {it.severity_max}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-2">
                                                        <Badge variant="outline" className={`text-[10px] uppercase ${it.direction === 'external' ? 'bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30' : 'bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30'}`}>
                                                            {it.direction === 'external' ? <Globe className="w-2.5 h-2.5 mr-1" /> : <Network className="w-2.5 h-2.5 mr-1" />}
                                                            {t(`attacks.${it.direction}`)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-2 font-mono">
                                                        <span className="text-base mr-1">{it.src_flag}</span>
                                                        <span className="text-muted-foreground">{it.src_country}</span>
                                                    </td>
                                                    <td className="px-2 font-mono font-medium">{it.src_ip}</td>
                                                    <td className="px-2 font-mono text-muted-foreground max-w-[260px] truncate" title={it.src_hostname}>{it.src_hostname || '—'}</td>
                                                    <td className="px-2">
                                                        <div className="flex flex-wrap gap-1">
                                                            {it.attack_types.slice(0, 3).map((a) => <TypeChip key={a} type={a} />)}
                                                            {it.attack_types.length > 3 && <Badge variant="outline" className="text-[10px]">+{it.attack_types.length - 3}</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 font-mono text-right">{it.count}</td>
                                                    <td className="px-2 font-mono text-muted-foreground max-w-[200px] truncate">{(it.targets || [])[0] || '—'}</td>
                                                    <td className="px-2 font-mono text-muted-foreground">{it.last_seen ? new Date(it.last_seen).toLocaleTimeString() : '—'}</td>
                                                    <td className="px-2 pr-3 text-right">
                                                        {it.is_blocked ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Badge className="bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border border-[hsl(var(--bad))]/40" data-testid={`blocked-badge-${it.src_ip.replace(/\./g, '-')}`}><Ban className="w-3 h-3 mr-1" />{t('attacks.blocked')}</Badge>
                                                                {canEdit && (
                                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => doUnblock(it)} data-testid={`unblock-${it.src_ip.replace(/\./g, '-')}`}>
                                                                        {t('attacks.unblock')}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            canEdit && (
                                                                <Button size="sm" onClick={() => askBlock(it)} className="h-7 text-xs gap-1.5 bg-[hsl(var(--bad))] hover:bg-[hsl(var(--bad))]/90 text-white" data-testid={`block-${it.src_ip.replace(/\./g, '-')}`}>
                                                                    <Ban className="w-3.5 h-3.5" />
                                                                    {t('attacks.block')}
                                                                </Button>
                                                            )
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                                {items.length === 0 && <EmptyState icon={Shield} title={t('attacks.empty')} />}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="live" className="mt-4">
                    <LiveFeed canEdit={canEdit} onBlock={askBlock} blockedSet={blockedSet} />
                </TabsContent>
            </Tabs>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="bg-[hsl(var(--surface-1))] border-border" data-testid="block-confirm-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-[hsl(var(--bad))]" />{t('attacks.confirm_block', { ip: target?.src_ip })}</DialogTitle>
                        <DialogDescription>
                            {target?.src_hostname && <div className="font-mono text-xs mt-1">{target.src_hostname}</div>}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('attacks.block_reason')}</Label>
                            <Input className="h-9 mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="port scan continuous" data-testid="block-reason" />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border/70 overlay-hairline px-3 py-2.5">
                            <Label className="text-xs uppercase tracking-wider">{t('attacks.redirect_to_block_page')}</Label>
                            <Switch checked={redirect} onCheckedChange={setRedirect} data-testid="block-redirect-switch" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={doBlock} className="bg-[hsl(var(--bad))] hover:bg-[hsl(var(--bad))]/90 text-white gap-2" data-testid="block-confirm-button">
                            <Ban className="w-4 h-4" />
                            {t('attacks.block')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
