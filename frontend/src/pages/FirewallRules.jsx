import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Plus, Edit3, Trash2, Save, X, GripVertical, Lock } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT = {
    enabled: true,
    action: 'allow',
    interface: 'LAN',
    direction: 'in',
    protocol: 'any',
    source: 'any',
    source_port: 'any',
    destination: 'any',
    destination_port: 'any',
    description: '',
    log: false,
};

function ActionBadge({ action }) {
    const map = {
        allow: 'bg-[hsl(var(--ok)/0.16)] text-[hsl(var(--ok))] border-[hsl(var(--ok)/0.3)]',
        block: 'bg-[hsl(var(--bad)/0.16)] text-[hsl(var(--bad))] border-[hsl(var(--bad)/0.3)]',
        reject: 'bg-[hsl(var(--warn)/0.16)] text-[hsl(var(--warn))] border-[hsl(var(--warn)/0.3)]',
    };
    return (
        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${map[action] || ''}`}>
            {action}
        </Badge>
    );
}

function Row({ rule, onEdit, onDelete, onToggle, canEdit, interfaces, t }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto', opacity: isDragging ? 0.85 : 1 };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`group border-b border-border/50 hover:bg-foreground/[0.04] ${rule.enabled ? '' : 'opacity-60'}`}
            data-testid={`firewall-rule-row-${rule.id}`}
        >
            <td className="py-2.5 pl-2 pr-1 align-middle">
                {canEdit ? (
                    <button
                        {...attributes}
                        {...listeners}
                        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                        data-testid={`drag-handle-${rule.id}`}
                        aria-label="drag"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                )}
            </td>
            <td className="px-2 font-mono text-xs text-muted-foreground">{rule.order}</td>
            <td className="px-2">
                <Switch
                    checked={rule.enabled}
                    disabled={!canEdit}
                    onCheckedChange={() => onToggle(rule)}
                    data-testid={`toggle-rule-${rule.id}`}
                />
            </td>
            <td className="px-2"><ActionBadge action={rule.action} /></td>
            <td className="px-2 font-mono text-xs">{rule.interface}</td>
            <td className="px-2 font-mono text-xs uppercase">{rule.direction}</td>
            <td className="px-2 font-mono text-xs uppercase">{rule.protocol}</td>
            <td className="px-2 font-mono text-xs">{rule.source}</td>
            <td className="px-2 font-mono text-xs">{rule.destination}</td>
            <td className="px-2 font-mono text-xs">{rule.destination_port}</td>
            <td className="px-2 text-xs text-muted-foreground max-w-[260px] truncate">{rule.description}</td>
            <td className="px-2 pr-3">
                <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                        <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(rule)} data-testid={`edit-rule-${rule.id}`}>
                                <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))] hover:text-[hsl(var(--bad))] hover:bg-[hsl(var(--bad))]/10" onClick={() => onDelete(rule)} data-testid={`delete-rule-${rule.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}

export default function FirewallRules() {
    const { t } = useTranslation();
    const { canEdit, isViewer } = useAuth();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(DEFAULT);
    const [interfaces, setInterfaces] = useState([]);
    const [aliases, setAliases] = useState([]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const load = async () => {
        setLoading(true);
        try {
            const [r, i, a] = await Promise.all([
                api.get('/firewall-rules/'),
                api.get('/interfaces/'),
                api.get('/aliases/'),
            ]);
            setRules(r.data);
            setInterfaces(i.data);
            setAliases(a.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm(DEFAULT);
        setOpen(true);
    };
    const openEdit = (rule) => {
        setEditing(rule);
        setForm({ ...rule });
        setOpen(true);
    };

    const save = async () => {
        try {
            if (editing) {
                await api.put(`/firewall-rules/${editing.id}`, form);
                toast.success(t('common.saved'));
            } else {
                await api.post('/firewall-rules/', form);
                toast.success(t('common.saved'));
            }
            setOpen(false);
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    const remove = async (rule) => {
        if (!window.confirm(`${t('common.delete')}?`)) return;
        try {
            await api.delete(`/firewall-rules/${rule.id}`);
            toast.success(t('common.deleted'));
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    const toggle = async (rule) => {
        try {
            await api.patch(`/firewall-rules/${rule.id}/toggle`);
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    const onDragEnd = async ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIdx = rules.findIndex((r) => r.id === active.id);
        const newIdx = rules.findIndex((r) => r.id === over.id);
        const reordered = arrayMove(rules, oldIdx, newIdx).map((r, idx) => ({ ...r, order: idx }));
        setRules(reordered);
        try {
            await api.post('/firewall-rules/reorder', { ids: reordered.map((r) => r.id) });
        } catch (e) {
            toast.error(t('common.error'));
            await load();
        }
    };

    const protocols = ['any', 'tcp', 'udp', 'tcp/udp', 'icmp'];
    const actions = ['allow', 'block', 'reject'];
    const directions = ['in', 'out'];

    return (
        <div data-testid="firewall-rules-page">
            <PageHeader
                icon={Shield}
                title={t('firewall.title')}
                subtitle={t('firewall.subtitle')}
                action={
                    canEdit && (
                        <Button onClick={openCreate} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="firewall-rule-create-button">
                            <Plus className="w-4 h-4" />
                            {t('firewall.new_rule')}
                        </Button>
                    )
                }
            />

            <div className="rounded-xl border border-border/70 bg-[hsl(var(--surface-1))] overflow-hidden" data-testid="firewall-rules-table">
                <div className="overflow-auto">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/70 bg-[hsl(var(--surface-2))]">
                                    <th className="py-2.5 pl-3 pr-1"></th>
                                    <th className="px-2">{t('firewall.order')}</th>
                                    <th className="px-2">{t('common.enabled')}</th>
                                    <th className="px-2">{t('firewall.action')}</th>
                                    <th className="px-2">{t('firewall.interface')}</th>
                                    <th className="px-2">{t('firewall.direction')}</th>
                                    <th className="px-2">{t('firewall.protocol')}</th>
                                    <th className="px-2">{t('firewall.source')}</th>
                                    <th className="px-2">{t('firewall.destination')}</th>
                                    <th className="px-2">{t('firewall.destination_port')}</th>
                                    <th className="px-2">{t('common.description')}</th>
                                    <th className="px-2 pr-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                                    {rules.map((rule) => (
                                        <Row key={rule.id} rule={rule} interfaces={interfaces} canEdit={canEdit} onEdit={openEdit} onDelete={remove} onToggle={toggle} t={t} />
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                    </DndContext>
                    {!loading && rules.length === 0 && <EmptyState icon={Shield} title={t('firewall.empty')} hint={t('firewall.subtitle')} />}
                </div>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-xl bg-[hsl(var(--surface-1))] border-border" data-testid="firewall-rule-sheet">
                    <SheetHeader>
                        <SheetTitle>{editing ? t('firewall.edit_rule') : t('firewall.create_rule')}</SheetTitle>
                        <SheetDescription>{t('firewall.subtitle')}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-5 space-y-4">
                        <div className="flex items-center justify-between rounded-md border border-border/70 overlay-hairline px-3 py-2.5">
                            <div>
                                <Label className="text-xs uppercase tracking-wider">{t('common.enabled')}</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{t('firewall.subtitle')}</p>
                            </div>
                            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} data-testid="sheet-enabled" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.action')}</Label>
                                <Select value={form.action} onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}>
                                    <SelectTrigger className="h-9" data-testid="sheet-action"><SelectValue /></SelectTrigger>
                                    <SelectContent>{actions.map((a) => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.interface')}</Label>
                                <Select value={form.interface} onValueChange={(v) => setForm((f) => ({ ...f, interface: v }))}>
                                    <SelectTrigger className="h-9" data-testid="sheet-interface"><SelectValue /></SelectTrigger>
                                    <SelectContent>{interfaces.map((i) => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.direction')}</Label>
                                <Select value={form.direction} onValueChange={(v) => setForm((f) => ({ ...f, direction: v }))}>
                                    <SelectTrigger className="h-9" data-testid="sheet-direction"><SelectValue /></SelectTrigger>
                                    <SelectContent>{directions.map((a) => <SelectItem key={a} value={a}>{t(`firewall.${a}`)}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.protocol')}</Label>
                                <Select value={form.protocol} onValueChange={(v) => setForm((f) => ({ ...f, protocol: v }))}>
                                    <SelectTrigger className="h-9" data-testid="sheet-protocol"><SelectValue /></SelectTrigger>
                                    <SelectContent>{protocols.map((p) => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.source')}</Label>
                                <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className="font-mono h-9" placeholder="any | 192.168.1.0/24 | ALIAS" data-testid="sheet-source" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.source_port')}</Label>
                                <Input value={form.source_port} onChange={(e) => setForm((f) => ({ ...f, source_port: e.target.value }))} className="font-mono h-9" placeholder="any | 1024-65535" data-testid="sheet-source-port" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.destination')}</Label>
                                <Input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} className="font-mono h-9" placeholder="any | 10.0.0.0/8 | WEB_SERVERS" data-testid="sheet-destination" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('firewall.destination_port')}</Label>
                                <Input value={form.destination_port} onChange={(e) => setForm((f) => ({ ...f, destination_port: e.target.value }))} className="font-mono h-9" placeholder="any | 80,443" data-testid="sheet-destination-port" />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.description')}</Label>
                                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="h-9" data-testid="sheet-description" />
                            </div>
                            <div className="col-span-2 flex items-center justify-between rounded-md border border-border/70 overlay-hairline px-3 py-2.5">
                                <Label className="text-xs uppercase tracking-wider">{t('firewall.log')}</Label>
                                <Switch checked={form.log} onCheckedChange={(v) => setForm((f) => ({ ...f, log: v }))} data-testid="sheet-log" />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)} className="gap-2" data-testid="sheet-cancel"><X className="w-4 h-4" />{t('common.cancel')}</Button>
                            <Button onClick={save} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="firewall-rule-save-button"><Save className="w-4 h-4" />{t('common.save')}</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {isViewer && (
                <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    {t('common.read_only')}
                </div>
            )}
        </div>
    );
}
