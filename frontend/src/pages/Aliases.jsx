import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tags, Plus, Edit3, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, EmptyState } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT = { name: '', type: 'host', addresses: [], description: '' };

export default function Aliases() {
    const { t } = useTranslation();
    const { canEdit } = useAuth();
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(DEFAULT);
    const [addrText, setAddrText] = useState('');

    const load = async () => setItems((await api.get('/aliases/')).data);
    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm(DEFAULT); setAddrText(''); setOpen(true); };
    const openEdit = (it) => { setEditing(it); setForm({ ...it }); setAddrText((it.addresses || []).join('\n')); setOpen(true); };
    const save = async () => {
        const payload = {
            ...form,
            addresses: addrText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        };
        try {
            if (editing) await api.put(`/aliases/${editing.id}`, payload);
            else await api.post('/aliases/', payload);
            toast.success(t('common.saved'));
            setOpen(false);
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };
    const remove = async (it) => {
        if (!window.confirm(`${t('common.delete')}?`)) return;
        await api.delete(`/aliases/${it.id}`);
        toast.success(t('common.deleted'));
        load();
    };

    return (
        <div data-testid="aliases-page">
            <PageHeader icon={Tags} title={t('aliases.title')} subtitle={t('aliases.subtitle')}
                action={canEdit && <Button onClick={openCreate} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="alias-create-button"><Plus className="w-4 h-4" />{t('aliases.new')}</Button>} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((it) => (
                    <Card key={it.id} className="bg-[hsl(var(--surface-1))] border-border/70" data-testid={`alias-card-${it.id}`}>
                        <CardHeader className="flex-row items-start justify-between space-y-0">
                            <div className="min-w-0">
                                <CardTitle className="text-base font-mono truncate">{it.name}</CardTitle>
                                <Badge variant="outline" className="text-[10px] mt-1.5 uppercase">{t(`aliases.types.${it.type}`)}</Badge>
                            </div>
                            {canEdit && (
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(it)} data-testid={`edit-alias-${it.id}`}><Edit3 className="w-3.5 h-3.5" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => remove(it)} data-testid={`delete-alias-${it.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {(it.addresses || []).map((a) => (
                                    <Badge key={a} className="font-mono text-[10px] bg-[hsl(var(--surface-2))] text-foreground border border-border">
                                        {a}
                                    </Badge>
                                ))}
                            </div>
                            {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
                        </CardContent>
                    </Card>
                ))}
                {items.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState icon={Tags} title={t('common.empty')} hint={t('aliases.subtitle')} />
                    </div>
                )}
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-md bg-[hsl(var(--surface-1))] border-border" data-testid="alias-sheet">
                    <SheetHeader><SheetTitle>{editing ? t('common.edit') : t('aliases.new')}</SheetTitle></SheetHeader>
                    <div className="mt-5 space-y-3">
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.name')}</Label><Input className="h-9 font-mono mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase().replace(/\s+/g, '_') }))} placeholder="WEB_SERVERS" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.type')}</Label>
                            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="host">{t('aliases.types.host')}</SelectItem>
                                    <SelectItem value="network">{t('aliases.types.network')}</SelectItem>
                                    <SelectItem value="port">{t('aliases.types.port')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('aliases.addresses')}</Label>
                            <Textarea className="font-mono mt-1" rows={5} value={addrText} onChange={(e) => setAddrText(e.target.value)} placeholder="192.168.1.10&#10;192.168.1.11&#10;10.0.0.0/8" />
                        </div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.description')}</Label><Input className="h-9 mt-1" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)} className="gap-2"><X className="w-4 h-4" />{t('common.cancel')}</Button>
                            <Button onClick={save} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="alias-save-button"><Save className="w-4 h-4" />{t('common.save')}</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
