import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Pause, Play, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader } from '@/components/layout/PageHeader';

function sevColor(sev) {
    if (sev === 'critical') return '#f87171';
    if (sev === 'warning') return '#fbbf24';
    return '#22d3ee';
}

export default function Logs() {
    const { t } = useTranslation();
    const [paused, setPaused] = useState(false);
    const [severity, setSeverity] = useState('all');
    const [iface, setIface] = useState('all');
    const [q, setQ] = useState('');
    const [items, setItems] = useState([]);

    const { data } = usePolling(
        async () => {
            if (paused) return null;
            const params = new URLSearchParams();
            if (severity !== 'all') params.set('severity', severity);
            if (iface !== 'all') params.set('interface', iface);
            if (q.trim()) params.set('q', q.trim());
            params.set('limit', '200');
            return (await api.get(`/logs/?${params.toString()}`)).data;
        },
        [paused, severity, iface, q],
        2000,
    );

    useEffect(() => {
        if (data?.items) setItems(data.items);
    }, [data]);

    const counts = useMemo(() => {
        const c = { info: 0, warning: 0, critical: 0 };
        for (const x of items) c[x.severity] = (c[x.severity] || 0) + 1;
        return c;
    }, [items]);

    return (
        <div data-testid="logs-page">
            <PageHeader
                icon={Activity}
                title={t('logs.title')}
                subtitle={t('logs.subtitle')}
                action={
                    <div className="flex items-center gap-2">
                        {paused ? (
                            <Button onClick={() => setPaused(false)} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="logs-resume-button">
                                <Play className="w-4 h-4" />{t('logs.resume')}
                            </Button>
                        ) : (
                            <Button onClick={() => setPaused(true)} variant="outline" className="gap-2" data-testid="logs-pause-button">
                                <Pause className="w-4 h-4" />{t('logs.pause')}
                            </Button>
                        )}
                    </div>
                }
            />

            <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder={t('logs.search_placeholder')}
                                    className="pl-9 h-9 font-mono text-xs bg-[hsl(var(--surface-2))]"
                                    data-testid="logs-search-input"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden md:inline">{t('logs.severity')}</span>
                            <ToggleGroup type="single" value={severity} onValueChange={(v) => v && setSeverity(v)} className="bg-[hsl(var(--surface-2))] border border-border rounded-md p-0.5" data-testid="logs-severity-toggle">
                                <ToggleGroupItem value="all" className="px-2.5 h-7 text-xs data-[state=on]:bg-white/10">{t('logs.all')}</ToggleGroupItem>
                                <ToggleGroupItem value="info" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--info))]/20 data-[state=on]:text-[hsl(var(--info))]">{t('logs.info')}</ToggleGroupItem>
                                <ToggleGroupItem value="warning" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--warn))]/20 data-[state=on]:text-[hsl(var(--warn))]">{t('logs.warning')}</ToggleGroupItem>
                                <ToggleGroupItem value="critical" className="px-2.5 h-7 text-xs data-[state=on]:bg-[hsl(var(--bad))]/20 data-[state=on]:text-[hsl(var(--bad))]">{t('logs.critical')}</ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-2">
                        <Badge variant="outline" className="text-[10px]">total {items.length}</Badge>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#22d3ee' }} /> info {counts.info}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} /> warn {counts.warning}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#f87171' }} /> crit {counts.critical}</span>
                        {paused && <Badge className="bg-[hsl(var(--warn))]/20 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30">PAUSED</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <div data-testid="logs-stream">
                            {items.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-3 px-3 py-1.5 font-mono text-xs leading-5 hover:bg-foreground/[0.04] border-b border-border/40 border-l-[3px]"
                                    style={{ borderLeftColor: sevColor(log.severity) }}
                                    data-testid={`log-line-${log.id}`}
                                >
                                    <span className="text-muted-foreground w-20 shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                                    <span className="uppercase text-[10px] w-16 shrink-0 font-semibold" style={{ color: sevColor(log.severity) }}>{log.severity}</span>
                                    <span className="text-muted-foreground w-12 shrink-0">{log.interface}</span>
                                    <span className="text-muted-foreground w-14 shrink-0 uppercase">{log.action}</span>
                                    <span className="text-muted-foreground w-32 shrink-0 truncate">{log.src_ip} → {log.dst_ip}:{log.port}</span>
                                    <span className="flex-1 text-foreground/90 break-all">{log.message}</span>
                                </div>
                            ))}
                            {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-12">{t('common.empty')}</div>}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
