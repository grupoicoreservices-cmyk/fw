import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users2, Plus, Edit3, Trash2, Save, X, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

const DEFAULT = { email: '', name: '', role: 'viewer', password: '', enabled: true };

export default function Users() {
    const { t } = useTranslation();
    const { user: me } = useAuth();
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(DEFAULT);

    const load = async () => setItems((await api.get('/users/')).data);
    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm(DEFAULT); setOpen(true); };
    const openEdit = (it) => { setEditing(it); setForm({ email: it.email, name: it.name, role: it.role, password: '', enabled: it.enabled }); setOpen(true); };
    const save = async () => {
        try {
            if (editing) {
                const payload = { name: form.name, role: form.role, enabled: form.enabled };
                if (form.password) payload.password = form.password;
                await api.put(`/users/${editing.id}`, payload);
            } else {
                await api.post('/users/', form);
            }
            toast.success(t('common.saved'));
            setOpen(false);
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };
    const remove = async (it) => {
        if (!window.confirm(`${t('common.delete')}?`)) return;
        try {
            await api.delete(`/users/${it.id}`);
            toast.success(t('common.deleted'));
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };

    const roleColor = {
        admin: 'bg-[hsl(var(--bad)/0.16)] text-[hsl(var(--bad))] border-[hsl(var(--bad)/0.3)]',
        operator: 'bg-[hsl(var(--warn)/0.16)] text-[hsl(var(--warn))] border-[hsl(var(--warn)/0.3)]',
        viewer: 'bg-[hsl(var(--surface-2))] text-muted-foreground border-border',
    };

    return (
        <div data-testid="users-page">
            <PageHeader icon={Users2} title={t('users.title')} subtitle={t('users.subtitle')}
                action={<Button onClick={openCreate} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="user-create-button"><Plus className="w-4 h-4" />{t('users.new')}</Button>} />

            <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid="users-table">
                <CardContent className="p-0">
                    <div className="overflow-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/70 bg-[hsl(var(--surface-2))]">
                                    <th className="py-2.5 px-3">{t('users.email')}</th>
                                    <th className="px-2">{t('users.name')}</th>
                                    <th className="px-2">{t('users.role')}</th>
                                    <th className="px-2">{t('common.status')}</th>
                                    <th className="px-2">{t('common.created')}</th>
                                    <th className="px-2 pr-3 text-right">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((u) => (
                                    <tr key={u.id} className={`border-b border-border/50 hover:bg-white/[0.04] ${u.enabled ? '' : 'opacity-60'}`} data-testid={`user-row-${u.id}`}>
                                        <td className="py-2.5 px-3 font-mono">{u.email}{u.id === me?.id && <Badge variant="outline" className="ml-2 text-[10px]">YOU</Badge>}</td>
                                        <td className="px-2">{u.name}</td>
                                        <td className="px-2"><Badge variant="outline" className={`text-[10px] uppercase ${roleColor[u.role]}`}><Shield className="w-3 h-3 mr-1" />{u.role}</Badge></td>
                                        <td className="px-2">{u.enabled ? <Badge className="bg-[hsl(var(--ok)/0.16)] text-[hsl(var(--ok))] border border-[hsl(var(--ok)/0.3)]">{t('common.enabled')}</Badge> : <Badge variant="outline">{t('common.disabled')}</Badge>}</td>
                                        <td className="px-2 font-mono text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                                        <td className="px-2 pr-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)} data-testid={`edit-user-${u.id}`}><Edit3 className="w-3.5 h-3.5" /></Button>
                                                {u.id !== me?.id && <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => remove(u)} data-testid={`delete-user-${u.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-md bg-[hsl(var(--surface-1))] border-border" data-testid="user-sheet">
                    <SheetHeader><SheetTitle>{editing ? t('common.edit') : t('users.new')}</SheetTitle></SheetHeader>
                    <div className="mt-5 space-y-3">
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('users.email')}</Label><Input className="h-9 font-mono mt-1" value={form.email} disabled={!!editing} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} data-testid="user-email" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('users.name')}</Label><Input className="h-9 mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="user-name" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('users.role')}</Label>
                            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                                <SelectTrigger className="h-9 mt-1" data-testid="user-role"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
                                    <SelectItem value="operator">{t('users.roles.operator')}</SelectItem>
                                    <SelectItem value="viewer">{t('users.roles.viewer')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('users.password')} {editing && <span className="text-muted-foreground">(opcional)</span>}</Label><Input type="password" className="h-9 font-mono mt-1" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} data-testid="user-password" /></div>
                        <div className="flex items-center justify-between rounded-md border border-border/70 bg-white/[0.03] px-3 py-2.5">
                            <Label className="text-xs uppercase tracking-wider">{t('common.enabled')}</Label>
                            <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} data-testid="user-enabled" />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)} className="gap-2"><X className="w-4 h-4" />{t('common.cancel')}</Button>
                            <Button onClick={save} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="user-save-button"><Save className="w-4 h-4" />{t('common.save')}</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
