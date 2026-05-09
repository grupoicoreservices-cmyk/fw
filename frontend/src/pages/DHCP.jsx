import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, Save, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

export default function DHCP() {
    const { t } = useTranslation();
    const { canEdit } = useAuth();
    const [config, setConfig] = useState(null);
    const [leases, setLeases] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ ip: '', mac: '', hostname: '', state: 'static' });

    const load = async () => {
        const [c, l] = await Promise.all([api.get('/dhcp/config'), api.get('/dhcp/leases')]);
        setConfig(c.data);
        setLeases(l.data);
    };
    useEffect(() => { load(); }, []);

    const saveConfig = async () => {
        try {
            await api.put('/dhcp/config', {
                ...config,
                dns_servers: typeof config.dns_servers === 'string' ? config.dns_servers.split(',').map(s => s.trim()).filter(Boolean) : (config.dns_servers || []),
            });
            toast.success(t('common.saved'));
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };
    const addLease = async () => {
        try {
            await api.post('/dhcp/leases', form);
            toast.success(t('common.saved'));
            setOpen(false);
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };
    const removeLease = async (l) => {
        if (!window.confirm(`${t('common.delete')}?`)) return;
        await api.delete(`/dhcp/leases/${l.id}`);
        toast.success(t('common.deleted'));
        load();
    };

    if (!config) return <div className="text-xs text-muted-foreground">{t('common.loading')}</div>;

    return (
        <div data-testid="dhcp-page">
            <PageHeader icon={Server} title={t('dhcp.title')} subtitle={t('dhcp.subtitle')} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                    <CardHeader><CardTitle className="text-sm font-semibold">{t('dhcp.config')}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between rounded-md border border-border/70 overlay-hairline px-3 py-2.5">
                            <Label className="text-xs uppercase tracking-wider">{t('common.enabled')}</Label>
                            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))} disabled={!canEdit} data-testid="dhcp-enabled" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.interface')}</Label><Input className="h-9 font-mono mt-1" value={config.interface} onChange={(e) => setConfig((c) => ({ ...c, interface: e.target.value }))} disabled={!canEdit} /></div>
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.subnet')}</Label><Input className="h-9 font-mono mt-1" value={config.subnet} onChange={(e) => setConfig((c) => ({ ...c, subnet: e.target.value }))} disabled={!canEdit} /></div>
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.range_start')}</Label><Input className="h-9 font-mono mt-1" value={config.range_start} onChange={(e) => setConfig((c) => ({ ...c, range_start: e.target.value }))} disabled={!canEdit} /></div>
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.range_end')}</Label><Input className="h-9 font-mono mt-1" value={config.range_end} onChange={(e) => setConfig((c) => ({ ...c, range_end: e.target.value }))} disabled={!canEdit} /></div>
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.gateway')}</Label><Input className="h-9 font-mono mt-1" value={config.gateway} onChange={(e) => setConfig((c) => ({ ...c, gateway: e.target.value }))} disabled={!canEdit} /></div>
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.lease_time')}</Label><Input type="number" className="h-9 font-mono mt-1" value={config.lease_time} onChange={(e) => setConfig((c) => ({ ...c, lease_time: parseInt(e.target.value || '0') }))} disabled={!canEdit} /></div>
                            <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.dns_servers')}</Label><Input className="h-9 font-mono mt-1" value={Array.isArray(config.dns_servers) ? config.dns_servers.join(', ') : config.dns_servers} onChange={(e) => setConfig((c) => ({ ...c, dns_servers: e.target.value }))} disabled={!canEdit} placeholder="1.1.1.1, 8.8.8.8" /></div>
                            <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.domain_name')}</Label><Input className="h-9 font-mono mt-1" value={config.domain_name} onChange={(e) => setConfig((c) => ({ ...c, domain_name: e.target.value }))} disabled={!canEdit} /></div>
                        </div>
                        {canEdit && <Button onClick={saveConfig} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="dhcp-save-config"><Save className="w-4 h-4" />{t('common.save')}</Button>}
                    </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold">{t('dhcp.leases')} ({leases.length})</CardTitle>
                        {canEdit && <Button size="sm" onClick={() => setOpen(true)} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="dhcp-new-lease"><Plus className="w-3.5 h-3.5" />{t('dhcp.new_lease')}</Button>}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/70 bg-[hsl(var(--surface-2))]">
                                        <th className="py-2.5 px-3">{t('dhcp.ip')}</th>
                                        <th className="px-2">{t('dhcp.mac')}</th>
                                        <th className="px-2">{t('dhcp.hostname')}</th>
                                        <th className="px-2">{t('dhcp.state')}</th>
                                        <th className="px-2 pr-3 text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leases.map((l) => (
                                        <tr key={l.id} className="border-b border-border/50 hover:bg-foreground/[0.04]" data-testid={`lease-row-${l.id}`}>
                                            <td className="py-2.5 px-3 font-mono">{l.ip}</td>
                                            <td className="px-2 font-mono text-muted-foreground">{l.mac}</td>
                                            <td className="px-2">{l.hostname}</td>
                                            <td className="px-2"><Badge variant="outline" className="text-[10px] uppercase">{l.state}</Badge></td>
                                            <td className="px-2 pr-3 text-right">
                                                {canEdit && <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => removeLease(l)} data-testid={`delete-lease-${l.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-md bg-[hsl(var(--surface-1))] border-border" data-testid="lease-sheet">
                    <SheetHeader><SheetTitle>{t('dhcp.new_lease')}</SheetTitle></SheetHeader>
                    <div className="mt-5 space-y-3">
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.ip')}</Label><Input className="h-9 font-mono mt-1" value={form.ip} onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))} placeholder="192.168.1.150" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.mac')}</Label><Input className="h-9 font-mono mt-1" value={form.mac} onChange={(e) => setForm((f) => ({ ...f, mac: e.target.value }))} placeholder="aa:bb:cc:dd:ee:ff" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dhcp.hostname')}</Label><Input className="h-9 mt-1" value={form.hostname} onChange={(e) => setForm((f) => ({ ...f, hostname: e.target.value }))} /></div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                            <Button onClick={addLease} className="bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="lease-save-button">{t('common.save')}</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
