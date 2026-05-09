import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2, Save, Plus, Trash2, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

export default function DNS() {
    const { t } = useTranslation();
    const { canEdit } = useAuth();
    const [config, setConfig] = useState(null);
    const [records, setRecords] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', type: 'A', value: '', ttl: 3600 });

    const load = async () => {
        const [c, r] = await Promise.all([api.get('/dns/config'), api.get('/dns/records')]);
        setConfig(c.data);
        setRecords(r.data);
    };
    useEffect(() => { load(); }, []);

    const saveConfig = async () => {
        try {
            await api.put('/dns/config', {
                ...config,
                forwarders: typeof config.forwarders === 'string' ? config.forwarders.split(',').map((x) => x.trim()).filter(Boolean) : config.forwarders,
                block_lists: typeof config.block_lists === 'string' ? config.block_lists.split(',').map((x) => x.trim()).filter(Boolean) : config.block_lists,
            });
            toast.success(t('common.saved'));
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };

    const openCreate = () => { setEditing(null); setForm({ name: '', type: 'A', value: '', ttl: 3600 }); setOpen(true); };
    const openEdit = (rec) => { setEditing(rec); setForm({ ...rec }); setOpen(true); };
    const submit = async () => {
        try {
            if (editing) await api.put(`/dns/records/${editing.id}`, form);
            else await api.post('/dns/records', form);
            toast.success(t('common.saved'));
            setOpen(false);
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };
    const remove = async (r) => {
        if (!window.confirm(`${t('common.delete')}?`)) return;
        await api.delete(`/dns/records/${r.id}`);
        toast.success(t('common.deleted'));
        load();
    };

    if (!config) return <div className="text-xs text-muted-foreground">{t('common.loading')}</div>;

    return (
        <div data-testid="dns-page">
            <PageHeader icon={Globe2} title={t('dns.title')} subtitle={t('dns.subtitle')} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                    <CardHeader><CardTitle className="text-sm font-semibold">{t('dns.resolver')}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between rounded-md border border-border/70 bg-white/[0.03] px-3 py-2.5">
                            <Label className="text-xs uppercase tracking-wider">{t('common.enabled')}</Label>
                            <Switch checked={config.enabled} onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))} disabled={!canEdit} />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-border/70 bg-white/[0.03] px-3 py-2.5">
                            <Label className="text-xs uppercase tracking-wider">{t('dns.dnssec')}</Label>
                            <Switch checked={config.dnssec} onCheckedChange={(v) => setConfig((c) => ({ ...c, dnssec: v }))} disabled={!canEdit} />
                        </div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dns.forwarders')}</Label><Input className="h-9 font-mono mt-1" value={Array.isArray(config.forwarders) ? config.forwarders.join(', ') : config.forwarders} onChange={(e) => setConfig((c) => ({ ...c, forwarders: e.target.value }))} disabled={!canEdit} /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dns.cache')}</Label><Input type="number" className="h-9 font-mono mt-1" value={config.cache_size_mb} onChange={(e) => setConfig((c) => ({ ...c, cache_size_mb: parseInt(e.target.value || '0') }))} disabled={!canEdit} /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dns.block_lists')}</Label><Input className="h-9 font-mono mt-1" value={Array.isArray(config.block_lists) ? config.block_lists.join(', ') : config.block_lists} onChange={(e) => setConfig((c) => ({ ...c, block_lists: e.target.value }))} disabled={!canEdit} /></div>
                        {canEdit && <Button onClick={saveConfig} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="dns-save-config"><Save className="w-4 h-4" />{t('common.save')}</Button>}
                    </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold">{t('dns.records')} ({records.length})</CardTitle>
                        {canEdit && <Button size="sm" onClick={openCreate} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="dns-new-record"><Plus className="w-3.5 h-3.5" />{t('dns.new_record')}</Button>}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/70 bg-[hsl(var(--surface-2))]">
                                        <th className="py-2.5 px-3">{t('common.name')}</th>
                                        <th className="px-2">{t('common.type')}</th>
                                        <th className="px-2">{t('common.value')}</th>
                                        <th className="px-2">{t('dns.ttl')}</th>
                                        <th className="px-2 pr-3 text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((r) => (
                                        <tr key={r.id} className="border-b border-border/50 hover:bg-white/[0.04]" data-testid={`dns-row-${r.id}`}>
                                            <td className="py-2.5 px-3 font-mono">{r.name}</td>
                                            <td className="px-2"><Badge variant="outline" className="text-[10px]">{r.type}</Badge></td>
                                            <td className="px-2 font-mono">{r.value}</td>
                                            <td className="px-2 font-mono text-muted-foreground">{r.ttl}</td>
                                            <td className="px-2 pr-3 text-right">
                                                {canEdit && <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)} data-testid={`edit-dns-${r.id}`}><Edit3 className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => remove(r)} data-testid={`delete-dns-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></Button></div>}
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
                <SheetContent className="w-full sm:max-w-md bg-[hsl(var(--surface-1))] border-border" data-testid="dns-record-sheet">
                    <SheetHeader><SheetTitle>{editing ? t('common.edit') : t('dns.new_record')}</SheetTitle></SheetHeader>
                    <div className="mt-5 space-y-3">
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.name')}</Label><Input className="h-9 font-mono mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="web.local" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.type')}</Label>
                            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>{['A', 'AAAA', 'CNAME', 'MX', 'TXT'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.value')}</Label><Input className="h-9 font-mono mt-1" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dns.ttl')}</Label><Input type="number" className="h-9 font-mono mt-1" value={form.ttl} onChange={(e) => setForm((f) => ({ ...f, ttl: parseInt(e.target.value || '0') }))} /></div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                            <Button onClick={submit} className="bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="dns-record-save">{t('common.save')}</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
