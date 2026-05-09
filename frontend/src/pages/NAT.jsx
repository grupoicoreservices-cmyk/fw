import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Plus, Edit3, Trash2, Save, X, Wand2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_INBOUND = { enabled: true, direction: 'inbound', interface: 'WAN', protocol: 'tcp', external_port: '', internal_ip: '', internal_port: '', source: 'any', description: '' };
const DEFAULT_OUTBOUND = { enabled: true, direction: 'outbound', interface: 'WAN', protocol: 'any', external_port: '', internal_ip: '', internal_port: '', source: 'any', nat_to: 'masquerade', description: '' };

export default function NAT() {
    const { t } = useTranslation();
    const { canEdit } = useAuth();
    const [items, setItems] = useState([]);
    const [interfaces, setInterfaces] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(DEFAULT_INBOUND);
    const [activeTab, setActiveTab] = useState('inbound');

    const load = async () => {
        const [a, b] = await Promise.all([api.get('/nat/'), api.get('/interfaces/')]);
        setItems(a.data);
        setInterfaces(b.data);
    };
    useEffect(() => { load(); }, []);

    const inbound = items.filter((i) => (i.direction || 'inbound') === 'inbound');
    const outbound = items.filter((i) => i.direction === 'outbound');

    const openCreate = (dir) => {
        setEditing(null);
        setForm(dir === 'outbound' ? DEFAULT_OUTBOUND : DEFAULT_INBOUND);
        setOpen(true);
    };
    const openEdit = (it) => {
        setEditing(it);
        setForm({ ...it });
        setOpen(true);
    };
    const save = async () => {
        try {
            if (editing) await api.put(`/nat/${editing.id}`, form);
            else await api.post('/nat/', form);
            toast.success(t('common.saved'));
            setOpen(false);
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };
    const remove = async (it) => {
        if (!window.confirm(`${t('common.delete')}?`)) return;
        await api.delete(`/nat/${it.id}`);
        toast.success(t('common.deleted'));
        load();
    };
    const autoOutbound = async () => {
        try {
            const { data } = await api.post('/nat/auto-outbound');
            if (data.count === 0) toast.info(t('nat_outbound.no_wan'));
            else toast.success(t('nat_outbound.auto_created', { count: data.count }));
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };

    const renderInbound = () => (
        <div className="rounded-xl border border-border/70 bg-[hsl(var(--surface-1))] overflow-hidden" data-testid="nat-inbound-table">
            <div className="overflow-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/70 bg-[hsl(var(--surface-2))]">
                            <th className="py-2.5 px-3">{t('common.enabled')}</th>
                            <th className="px-2">{t('nat.interface')}</th>
                            <th className="px-2">{t('nat.protocol')}</th>
                            <th className="px-2">{t('nat.external_port')}</th>
                            <th className="px-2">{t('nat.internal_ip')}</th>
                            <th className="px-2">{t('nat.internal_port')}</th>
                            <th className="px-2">{t('common.description')}</th>
                            <th className="px-2 pr-3 text-right">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inbound.map((it) => (
                            <tr key={it.id} className={`border-b border-border/50 hover:bg-foreground/[0.04] ${it.enabled ? '' : 'opacity-60'}`} data-testid={`nat-inbound-row-${it.id}`}>
                                <td className="py-2.5 px-3">{it.enabled ? <Badge className="bg-[hsl(var(--ok)/0.16)] text-[hsl(var(--ok))] border border-[hsl(var(--ok)/0.3)]">ON</Badge> : <Badge variant="outline">OFF</Badge>}</td>
                                <td className="px-2 font-mono">{it.interface}</td>
                                <td className="px-2 font-mono uppercase">{it.protocol}</td>
                                <td className="px-2 font-mono">{it.external_port}</td>
                                <td className="px-2 font-mono">{it.internal_ip}</td>
                                <td className="px-2 font-mono">{it.internal_port}</td>
                                <td className="px-2 text-muted-foreground max-w-[260px] truncate">{it.description}</td>
                                <td className="px-2 pr-3">
                                    <div className="flex items-center justify-end gap-1">
                                        {canEdit && <>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)} data-testid={`edit-nat-${it.id}`}><Edit3 className="w-3.5 h-3.5" /></Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => remove(it)} data-testid={`delete-nat-${it.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {inbound.length === 0 && <EmptyState icon={ArrowDownToLine} title={t('common.empty')} />}
            </div>
        </div>
    );

    const renderOutbound = () => (
        <div className="rounded-xl border border-border/70 bg-[hsl(var(--surface-1))] overflow-hidden" data-testid="nat-outbound-table">
            <div className="overflow-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/70 bg-[hsl(var(--surface-2))]">
                            <th className="py-2.5 px-3">{t('common.enabled')}</th>
                            <th className="px-2">{t('nat.interface')}</th>
                            <th className="px-2">{t('nat.protocol')}</th>
                            <th className="px-2">{t('firewall.source')}</th>
                            <th className="px-2">{t('nat_outbound.nat_to')}</th>
                            <th className="px-2">{t('common.description')}</th>
                            <th className="px-2 pr-3 text-right">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {outbound.map((it) => (
                            <tr key={it.id} className={`border-b border-border/50 hover:bg-foreground/[0.04] ${it.enabled ? '' : 'opacity-60'}`} data-testid={`nat-outbound-row-${it.id}`}>
                                <td className="py-2.5 px-3">{it.enabled ? <Badge className="bg-[hsl(var(--ok)/0.16)] text-[hsl(var(--ok))] border border-[hsl(var(--ok)/0.3)]">ON</Badge> : <Badge variant="outline">OFF</Badge>}</td>
                                <td className="px-2 font-mono">{it.interface}</td>
                                <td className="px-2 font-mono uppercase">{it.protocol}</td>
                                <td className="px-2 font-mono">{it.source || 'any'}</td>
                                <td className="px-2"><Badge variant="outline" className="text-[10px] uppercase font-mono bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-[hsl(var(--info))]/30">{it.nat_to || 'masquerade'}</Badge></td>
                                <td className="px-2 text-muted-foreground max-w-[260px] truncate">{it.description}</td>
                                <td className="px-2 pr-3">
                                    <div className="flex items-center justify-end gap-1">
                                        {canEdit && <>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)} data-testid={`edit-nat-out-${it.id}`}><Edit3 className="w-3.5 h-3.5" /></Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => remove(it)} data-testid={`delete-nat-out-${it.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                                        </>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {outbound.length === 0 && <EmptyState icon={ArrowUpFromLine} title={t('common.empty')} hint={t('nat_outbound.subtitle_outbound')} />}
            </div>
        </div>
    );

    return (
        <div data-testid="nat-page">
            <PageHeader
                icon={ArrowRightLeft}
                title={t('nat.title')}
                subtitle={t('nat.subtitle')}
                action={
                    canEdit && (
                        <div className="flex items-center gap-2">
                            {activeTab === 'outbound' && (
                                <Button onClick={autoOutbound} variant="outline" className="gap-2 border-[hsl(var(--info))]/40 text-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/10" data-testid="nat-auto-outbound">
                                    <Wand2 className="w-4 h-4" />
                                    {t('nat_outbound.auto_create')}
                                </Button>
                            )}
                            <Button onClick={() => openCreate(activeTab)} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="nat-create-button">
                                <Plus className="w-4 h-4" />
                                {t('nat.new')}
                            </Button>
                        </div>
                    )
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[hsl(var(--surface-2))] border border-border">
                    <TabsTrigger value="inbound" className="gap-2" data-testid="tab-nat-inbound"><ArrowDownToLine className="w-3.5 h-3.5" />{t('nat_outbound.tab_inbound')} ({inbound.length})</TabsTrigger>
                    <TabsTrigger value="outbound" className="gap-2" data-testid="tab-nat-outbound"><ArrowUpFromLine className="w-3.5 h-3.5" />{t('nat_outbound.tab_outbound')} ({outbound.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="inbound" className="mt-4">{renderInbound()}</TabsContent>
                <TabsContent value="outbound" className="mt-4">
                    <div className="text-xs text-muted-foreground mb-3 font-mono"># {t('nat_outbound.subtitle_outbound')}</div>
                    {renderOutbound()}
                </TabsContent>
            </Tabs>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-lg bg-[hsl(var(--surface-1))] border-border" data-testid="nat-sheet">
                    <SheetHeader>
                        <SheetTitle>{editing ? t('common.edit') : t('nat.new')} — {form.direction === 'outbound' ? t('nat_outbound.tab_outbound') : t('nat_outbound.tab_inbound')}</SheetTitle>
                        <SheetDescription>{form.direction === 'outbound' ? t('nat_outbound.subtitle_outbound') : t('nat.subtitle')}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between rounded-md border border-border/70 overlay-hairline px-3 py-2.5">
                            <Label className="text-xs uppercase tracking-wider">{t('common.enabled')}</Label>
                            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('nat.interface')}</Label>
                                <Select value={form.interface} onValueChange={(v) => setForm((f) => ({ ...f, interface: v }))}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>{interfaces.map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('nat.protocol')}</Label>
                                <Select value={form.protocol} onValueChange={(v) => setForm((f) => ({ ...f, protocol: v }))}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>{['any', 'tcp', 'udp', 'tcp/udp'].map((p) => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            {form.direction === 'inbound' ? (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('nat.external_port')}</Label>
                                        <Input className="h-9 font-mono" value={form.external_port} onChange={(e) => setForm((f) => ({ ...f, external_port: e.target.value }))} placeholder="443" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('nat.internal_port')}</Label>
                                        <Input className="h-9 font-mono" value={form.internal_port} onChange={(e) => setForm((f) => ({ ...f, internal_port: e.target.value }))} placeholder="8443" />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('nat.internal_ip')}</Label>
                                        <Input className="h-9 font-mono" value={form.internal_ip} onChange={(e) => setForm((f) => ({ ...f, internal_ip: e.target.value }))} placeholder="192.168.50.10" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.source')}</Label>
                                        <Input className="h-9 font-mono" value={form.source || ''} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="any | 192.168.1.0/24" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('nat_outbound.nat_to')}</Label>
                                        <Input className="h-9 font-mono" value={form.nat_to || ''} onChange={(e) => setForm((f) => ({ ...f, nat_to: e.target.value }))} placeholder="masquerade | 1.2.3.4" />
                                    </div>
                                </>
                            )}
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.description')}</Label>
                                <Input className="h-9" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)} className="gap-2"><X className="w-4 h-4" />{t('common.cancel')}</Button>
                            <Button onClick={save} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="nat-save-button"><Save className="w-4 h-4" />{t('common.save')}</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
