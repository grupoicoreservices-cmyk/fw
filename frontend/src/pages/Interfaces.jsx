import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Network,
    ArrowDownToLine,
    ArrowUpFromLine,
    Power,
    PowerOff,
    Radar,
    Plus,
    Edit3,
    Trash2,
    Save,
    X,
    KeyRound,
    FileCode2,
    Copy,
    Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT = {
    name: '',
    device: '',
    role: 'lan',
    connection_type: 'static',
    ipv4: '',
    gateway: '',
    dns_servers: [],
    mac: '',
    mtu: 1500,
    enabled: true,
    description: '',
    pppoe_username: '',
    pppoe_password: '',
    pppoe_service: '',
};

function roleColor(role) {
    if (role === 'wan') return 'border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]';
    if (role === 'lan') return 'border-[hsl(var(--ok))]/40 bg-[hsl(var(--ok))]/10 text-[hsl(var(--ok))]';
    return 'border-[hsl(var(--warn))]/40 bg-[hsl(var(--warn))]/10 text-[hsl(var(--warn))]';
}

function connectionBadge(conn) {
    const map = {
        static: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-[hsl(var(--info))]/30',
        dhcp: 'bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))] border-[hsl(var(--ok))]/30',
        pppoe: 'bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/30',
    };
    return map[conn] || '';
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

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(DEFAULT);
    const [dnsText, setDnsText] = useState('');
    const [netplanOpen, setNetplanOpen] = useState(false);
    const [netplanYaml, setNetplanYaml] = useState('');
    const [netplanLoading, setNetplanLoading] = useState(false);

    const openNetplan = async () => {
        setNetplanOpen(true);
        setNetplanLoading(true);
        try {
            const { data } = await api.get('/interfaces/export/netplan', {
                responseType: 'text',
                transformResponse: [(d) => d],
            });
            setNetplanYaml(typeof data === 'string' ? data : String(data));
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
            setNetplanYaml('# Erro ao gerar Netplan');
        } finally {
            setNetplanLoading(false);
        }
    };

    const copyNetplan = async () => {
        try {
            await navigator.clipboard.writeText(netplanYaml || '');
            toast.success(t('interfaces.netplan_copied'));
        } catch {
            toast.error(t('common.error'));
        }
    };

    const downloadNetplan = () => {
        const blob = new Blob([netplanYaml || ''], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '99-firewall-console.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const openCreate = () => {
        setEditing(null);
        setForm(DEFAULT);
        setDnsText('');
        setOpen(true);
    };
    const openEdit = (it) => {
        setEditing(it);
        const f = { ...DEFAULT, ...it };
        setForm(f);
        setDnsText((it.dns_servers || []).join(', '));
        setOpen(true);
    };
    const save = async () => {
        const payload = {
            ...form,
            dns_servers: dnsText
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean),
            mtu: parseInt(form.mtu) || 1500,
        };
        // Don't send back the masked password
        if (payload.pppoe_password === '••••••••') {
            payload.pppoe_password = '';
        }
        try {
            if (editing) {
                await api.put(`/interfaces/${editing.id}`, payload);
            } else {
                await api.post('/interfaces/', payload);
            }
            toast.success(t('common.saved'));
            setOpen(false);
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };
    const remove = async (it) => {
        if (!window.confirm(`${t('common.delete')} ${it.name}?`)) return;
        try {
            await api.delete(`/interfaces/${it.id}`);
            toast.success(t('common.deleted'));
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };
    const toggle = async (it) => {
        try {
            await api.patch(`/interfaces/${it.id}/toggle`);
            toast.success(t('common.saved'));
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
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
                        <div className="flex items-center gap-2">
                            <Button onClick={openNetplan} variant="outline" className="gap-2" data-testid="interfaces-netplan-button">
                                <FileCode2 className="w-4 h-4" />
                                {t('interfaces.view_netplan')}
                            </Button>
                            <Button onClick={discover} variant="outline" className="gap-2" data-testid="interfaces-discover-button">
                                <Radar className="w-4 h-4" />
                                {t('interfaces.discover')}
                            </Button>
                            <Button onClick={openCreate} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="interfaces-create-button">
                                <Plus className="w-4 h-4" />
                                {t('interfaces.new')}
                            </Button>
                        </div>
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
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${roleColor(it.role)}`}>
                                                <Network className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="text-base font-mono truncate">{it.name}</CardTitle>
                                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                                                    <span>{it.device} · {it.role}</span>
                                                    <Badge variant="outline" className={`text-[9px] uppercase px-1.5 ${connectionBadge(it.connection_type || 'static')}`}>
                                                        {it.connection_type === 'pppoe' ? <KeyRound className="w-2.5 h-2.5 mr-1" /> : null}
                                                        {(it.connection_type || 'static').toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Badge variant="outline" className={`text-[10px] uppercase ${up ? 'bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))] border-[hsl(var(--ok))]/30' : 'bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30'}`} data-testid={`interface-status-${it.name.toLowerCase()}`}>
                                                {up ? 'UP' : 'DOWN'}
                                            </Badge>
                                            {isAdmin && (
                                                <>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)} data-testid={`edit-interface-${it.id}`}>
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle(it)} data-testid={`toggle-interface-${it.id}`}>
                                                        {it.enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />}
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => remove(it)} data-testid={`delete-interface-${it.id}`}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.ipv4')}</div>
                                            <div className="font-mono">{it.connection_type === 'dhcp' ? 'DHCP' : it.connection_type === 'pppoe' ? 'PPPoE' : (it.ipv4 || '—')}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.gateway')}</div>
                                            <div className="font-mono">{it.gateway || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.mac')}</div>
                                            <div className="font-mono text-muted-foreground">{it.mac || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('interfaces.mtu')}</div>
                                            <div className="font-mono">{it.mtu}</div>
                                        </div>
                                    </div>
                                    {it.connection_type === 'pppoe' && (
                                        <div className="text-[11px] font-mono text-muted-foreground">
                                            <span className="text-foreground">PPPoE:</span> {it.pppoe_username || '—'}
                                            {it.pppoe_service && <> · <span className="text-foreground">{t('interfaces.service')}:</span> {it.pppoe_service}</>}
                                        </div>
                                    )}
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

            {/* Edit / Create Sheet */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-xl bg-[hsl(var(--surface-1))] border-border overflow-y-auto" data-testid="interface-sheet">
                    <SheetHeader>
                        <SheetTitle>{editing ? `${t('common.edit')} — ${editing.name}` : t('interfaces.new')}</SheetTitle>
                        <SheetDescription>{t('interfaces.subtitle')}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.name')}</Label>
                                <Input className="h-9 font-mono mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="WAN" data-testid="iface-name" />
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.device')}</Label>
                                <Input className="h-9 font-mono mt-1" value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} placeholder="eth0 / enp1s0" data-testid="iface-device" />
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.role')}</Label>
                                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                                    <SelectTrigger className="h-9 mt-1" data-testid="iface-role"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="wan">WAN</SelectItem>
                                        <SelectItem value="lan">LAN</SelectItem>
                                        <SelectItem value="opt">OPT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.connection_type')}</Label>
                                <Select value={form.connection_type} onValueChange={(v) => setForm({ ...form, connection_type: v })}>
                                    <SelectTrigger className="h-9 mt-1" data-testid="iface-connection-type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="static">Static IP</SelectItem>
                                        <SelectItem value="dhcp">DHCP</SelectItem>
                                        <SelectItem value="pppoe">PPPoE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Static IP fields */}
                        {form.connection_type === 'static' && (
                            <div className="space-y-3 rounded-md border border-border/70 overlay-hairline p-3">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Static IP</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.ipv4')}</Label>
                                        <Input className="h-9 font-mono mt-1" value={form.ipv4} onChange={(e) => setForm({ ...form, ipv4: e.target.value })} placeholder="192.168.1.1/24" data-testid="iface-ipv4" />
                                    </div>
                                    <div>
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.gateway')}</Label>
                                        <Input className="h-9 font-mono mt-1" value={form.gateway} onChange={(e) => setForm({ ...form, gateway: e.target.value })} placeholder="192.168.1.254" data-testid="iface-gateway" />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.dns_servers')}</Label>
                                        <Input className="h-9 font-mono mt-1" value={dnsText} onChange={(e) => setDnsText(e.target.value)} placeholder="1.1.1.1, 8.8.8.8" data-testid="iface-dns" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DHCP info */}
                        {form.connection_type === 'dhcp' && (
                            <div className="rounded-md border border-[hsl(var(--ok))]/30 bg-[hsl(var(--ok))]/5 p-3 text-xs text-[hsl(var(--ok))]">
                                {t('interfaces.dhcp_hint')}
                            </div>
                        )}

                        {/* PPPoE fields */}
                        {form.connection_type === 'pppoe' && (
                            <div className="space-y-3 rounded-md border border-[hsl(var(--warn))]/30 bg-[hsl(var(--warn))]/5 p-3">
                                <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--warn))] font-mono flex items-center gap-2">
                                    <KeyRound className="w-3 h-3" />
                                    PPPoE
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.pppoe_username')}</Label>
                                        <Input className="h-9 font-mono mt-1" value={form.pppoe_username} onChange={(e) => setForm({ ...form, pppoe_username: e.target.value })} autoComplete="off" data-testid="iface-pppoe-user" />
                                    </div>
                                    <div>
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.pppoe_password')}</Label>
                                        <Input type="password" className="h-9 font-mono mt-1" value={form.pppoe_password} onChange={(e) => setForm({ ...form, pppoe_password: e.target.value })} autoComplete="off" data-testid="iface-pppoe-pass" />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.pppoe_service')}</Label>
                                        <Input className="h-9 font-mono mt-1" value={form.pppoe_service} onChange={(e) => setForm({ ...form, pppoe_service: e.target.value })} placeholder="(opcional)" data-testid="iface-pppoe-service" />
                                    </div>
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    {t('interfaces.pppoe_hint')}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.mac')}</Label>
                                <Input className="h-9 font-mono mt-1" value={form.mac} onChange={(e) => setForm({ ...form, mac: e.target.value })} placeholder="aa:bb:cc:dd:ee:ff" />
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('interfaces.mtu')}</Label>
                                <Input type="number" className="h-9 font-mono mt-1" value={form.mtu} onChange={(e) => setForm({ ...form, mtu: e.target.value })} placeholder="1500" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.description')}</Label>
                                <Input className="h-9 mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-md border border-border/70 overlay-hairline px-3 py-2.5">
                            <Label className="text-xs uppercase tracking-wider">{t('common.enabled')}</Label>
                            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} data-testid="iface-enabled" />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)} className="gap-2"><X className="w-4 h-4" />{t('common.cancel')}</Button>
                            <Button onClick={save} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="iface-save-button">
                                <Save className="w-4 h-4" />
                                {t('common.save')}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Netplan YAML Viewer */}
            <Dialog open={netplanOpen} onOpenChange={setNetplanOpen}>
                <DialogContent className="max-w-3xl bg-card border-border" data-testid="netplan-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileCode2 className="w-5 h-5 text-primary" />
                            {t('interfaces.netplan_title')}
                        </DialogTitle>
                        <DialogDescription>{t('interfaces.netplan_subtitle')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="rounded-md border border-border bg-[#0d0f12] text-[#e6edf3] p-4 max-h-[60vh] overflow-auto">
                            <pre className="font-mono text-xs whitespace-pre leading-relaxed" data-testid="netplan-yaml-content">
                                {netplanLoading ? '# Gerando Netplan YAML...' : netplanYaml}
                            </pre>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" className="gap-2" onClick={copyNetplan} disabled={!netplanYaml || netplanLoading} data-testid="netplan-copy-button">
                                <Copy className="w-4 h-4" />
                                {t('interfaces.netplan_copy')}
                            </Button>
                            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={downloadNetplan} disabled={!netplanYaml || netplanLoading} data-testid="netplan-download-button">
                                <Download className="w-4 h-4" />
                                {t('interfaces.netplan_download')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
