import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from 'recharts';
import { Activity, Cpu, MemoryStick, ShieldAlert, ShieldCheck, Wifi, Network, KeyRound, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ServerCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader } from '@/components/layout/PageHeader';

function Spark({ data, dataKey, color, height = 48 }) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id={`g-${dataKey}-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.6} fill={`url(#g-${dataKey}-${color.replace('#', '')})`} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function Kpi({ icon: Icon, label, value, unit, color = '#22d3ee', spark, testId }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-border/70 bg-[hsl(var(--surface-1))] p-4 shadow-[0_10px_30px_hsl(0_0%_0%/0.35)]"
            data-testid={testId}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                </div>
                <span className="live-dot" style={{ background: color }} />
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl md:text-3xl tracking-tight" style={{ color }} data-testid={`${testId}-value`}>
                    {value}
                </span>
                {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
            </div>
            {spark && spark.length > 0 && (
                <div className="mt-2">
                    <Spark data={spark} dataKey="v" color={color} />
                </div>
            )}
        </motion.div>
    );
}

function sevColor(sev) {
    if (sev === 'critical') return '#f87171';
    if (sev === 'warning') return '#fbbf24';
    return '#22d3ee';
}

export default function Dashboard() {
    const { t } = useTranslation();
    const { data: live } = usePolling(async () => (await api.get('/metrics/live?limit=40')).data, [], 2500);
    const { data: summary } = usePolling(async () => (await api.get('/metrics/summary')).data, [], 3000);
    const { data: recentLogs } = usePolling(async () => (await api.get('/logs/?limit=10')).data, [], 3000);

    const samples = live?.samples || [];
    const formatted = useMemo(
        () =>
            samples.map((s) => ({
                ts: new Date(s.ts).toLocaleTimeString(),
                rx: s.rx_mbps,
                tx: s.tx_mbps,
                cpu: s.cpu,
                ram: s.ram,
                conn: s.connections,
                blocked: s.blocked_per_tick,
                allowed: s.allowed_per_tick,
            })),
        [samples],
    );
    const sparkData = (key) => formatted.slice(-20).map((d) => ({ v: d[key] }));
    const cur = summary?.current || {};

    return (
        <div data-testid="dashboard-page">
            <PageHeader
                icon={Activity}
                title={t('dashboard.title')}
                subtitle={t('dashboard.subtitle')}
                action={
                    <Badge variant="outline" className="gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]">
                        <span className="live-dot" />
                        {t('dashboard.live')}
                    </Badge>
                }
            />

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <Kpi icon={Cpu} label={t('dashboard.cpu')} value={cur.cpu ?? '—'} unit="%" color="#22d3ee" spark={sparkData('cpu')} testId="kpi-cpu" />
                <Kpi icon={MemoryStick} label={t('dashboard.ram')} value={cur.ram ?? '—'} unit="%" color="#34d399" spark={sparkData('ram')} testId="kpi-ram" />
                <Kpi icon={Network} label={t('dashboard.connections')} value={cur.connections ?? '—'} color="#22d3ee" spark={sparkData('conn')} testId="kpi-connections" />
                <Kpi icon={ArrowDownToLine} label={t('dashboard.rx')} value={cur.rx_mbps ?? '—'} unit="Mbps" color="#34d399" spark={sparkData('rx')} testId="kpi-rx" />
                <Kpi icon={ArrowUpFromLine} label={t('dashboard.tx')} value={cur.tx_mbps ?? '—'} unit="Mbps" color="#fbbf24" spark={sparkData('tx')} testId="kpi-tx" />
                <Kpi icon={ShieldAlert} label={t('dashboard.blocked')} value={cur.blocked_total ?? '—'} color="#f87171" spark={sparkData('blocked')} testId="kpi-blocked" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                <Card className="xl:col-span-2 bg-[hsl(var(--surface-1))] border-border/70" data-testid="chart-card-traffic">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('dashboard.traffic_chart')}
                        </CardTitle>
                        <div className="flex items-center gap-3 text-[10px] font-mono uppercase">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#34d399]" /> RX</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#fbbf24]" /> TX</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={formatted} margin={{ top: 0, right: 6, bottom: 0, left: -16 }}>
                                <defs>
                                    <linearGradient id="gRX" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gTX" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.45} />
                                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="hsl(222 22% 18%)" strokeDasharray="3 3" />
                                <XAxis dataKey="ts" tick={{ fontSize: 10, fill: 'hsl(215 20% 70%)' }} hide />
                                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 70%)', fontFamily: 'JetBrains Mono' }} />
                                <Tooltip
                                    contentStyle={{ background: 'hsl(222 44% 8%)', border: '1px solid hsl(222 22% 18%)', borderRadius: 8, fontSize: 12 }}
                                    labelStyle={{ color: 'hsl(215 20% 70%)' }}
                                />
                                <Area type="monotone" dataKey="rx" stroke="#34d399" strokeWidth={2} fill="url(#gRX)" isAnimationActive={false} />
                                <Area type="monotone" dataKey="tx" stroke="#fbbf24" strokeWidth={2} fill="url(#gTX)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="chart-card-resources">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('dashboard.resources_chart')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={formatted} margin={{ top: 0, right: 6, bottom: 0, left: -16 }}>
                                <CartesianGrid stroke="hsl(222 22% 18%)" strokeDasharray="3 3" />
                                <XAxis dataKey="ts" hide />
                                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 70%)', fontFamily: 'JetBrains Mono' }} domain={[0, 100]} />
                                <Tooltip contentStyle={{ background: 'hsl(222 44% 8%)', border: '1px solid hsl(222 22% 18%)', borderRadius: 8, fontSize: 12 }} />
                                <Line type="monotone" dataKey="cpu" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} name="CPU%" />
                                <Line type="monotone" dataKey="ram" stroke="#a78bfa" strokeWidth={2} dot={false} isAnimationActive={false} name="RAM%" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="chart-card-events">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('dashboard.events_chart')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={formatted.slice(-30)} margin={{ top: 0, right: 6, bottom: 0, left: -16 }}>
                                <CartesianGrid stroke="hsl(222 22% 18%)" strokeDasharray="3 3" />
                                <XAxis dataKey="ts" hide />
                                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 70%)', fontFamily: 'JetBrains Mono' }} />
                                <Tooltip contentStyle={{ background: 'hsl(222 44% 8%)', border: '1px solid hsl(222 22% 18%)', borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="allowed" stackId="a" fill="#34d399" name="Allowed" />
                                <Bar dataKey="blocked" stackId="a" fill="#f87171" name="Blocked" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--surface-1))] border-border/70 xl:col-span-2" data-testid="recent-events-card">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {t('dashboard.recent_threats')}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{(recentLogs?.items || []).length} events</Badge>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[220px]">
                            <div className="space-y-1">
                                {(recentLogs?.items || []).map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-3 text-xs font-mono px-2 py-1.5 rounded hover:bg-white/[0.04] border-l-[3px]"
                                        style={{ borderLeftColor: sevColor(log.severity) }}
                                        data-testid={`dashboard-log-${log.id}`}
                                    >
                                        <span className="text-muted-foreground w-20 shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                                        <span
                                            className="uppercase text-[10px] w-16 shrink-0 font-semibold"
                                            style={{ color: sevColor(log.severity) }}
                                        >
                                            {log.severity}
                                        </span>
                                        <span className="text-muted-foreground w-12 shrink-0">{log.interface}</span>
                                        <span className="flex-1 text-foreground/90 break-all">{log.message}</span>
                                    </div>
                                ))}
                                {!recentLogs?.items?.length && (
                                    <div className="text-xs text-muted-foreground text-center py-8">{t('common.empty')}</div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Kpi icon={ShieldCheck} label={t('dashboard.rules_active')} value={`${summary?.rules_active ?? '—'}/${summary?.rules_total ?? '—'}`} color="#22d3ee" testId="kpi-rules" />
                <Kpi icon={Wifi} label={t('dashboard.interfaces_up')} value={summary?.interfaces_up ?? '—'} color="#34d399" testId="kpi-interfaces" />
                <Kpi icon={KeyRound} label={t('dashboard.vpn_active')} value={summary?.vpn_active ?? '—'} color="#fbbf24" testId="kpi-vpn" />
                <Kpi icon={ServerCog} label={t('dashboard.leases')} value={summary?.leases ?? '—'} color="#a78bfa" testId="kpi-leases" />
            </div>
        </div>
    );
}
