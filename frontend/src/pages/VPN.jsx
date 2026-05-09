import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, Users, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

function VpnCard({ vpn, onAddPeer, onRemovePeer, canEdit }) {
    const { t } = useTranslation();
    return (
        <Card className="bg-[hsl(var(--surface-1))] border-border/70" data-testid={`vpn-card-${vpn.id}`}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(var(--info))]/15 border border-[hsl(var(--info))]/30 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-[hsl(var(--info))]" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{vpn.name}</CardTitle>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5">{vpn.type} • :{vpn.listen_port} • {vpn.subnet}</div>
                    </div>
                </div>
                <Badge className={vpn.enabled ? 'bg-[hsl(var(--ok)/0.16)] text-[hsl(var(--ok))] border border-[hsl(var(--ok)/0.3)]' : ''} variant={vpn.enabled ? 'default' : 'outline'}>
                    {vpn.enabled ? t('common.enabled') : t('common.disabled')}
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t('vpn.peers')} ({(vpn.peers || []).length})
                    </div>
                    {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => onAddPeer(vpn)} className="gap-1.5" data-testid={`add-peer-${vpn.id}`}>
                            <Plus className="w-3.5 h-3.5" />{t('vpn.add_peer')}
                        </Button>
                    )}
                </div>
                <div className="space-y-2">
                    {(vpn.peers || []).map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-md bg-[hsl(var(--surface-2))] border border-border/70" data-testid={`peer-${p.id}`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-[hsl(var(--ok))]' : 'bg-[hsl(var(--neutral))]'}`} />
                                <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{p.name}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{p.allowed_ips}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]" data-testid={`peer-status-${p.id}`}>{p.connected ? t('vpn.connected') : t('vpn.disconnected')}</Badge>
                                {canEdit && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--bad))]" onClick={() => onRemovePeer(vpn, p)} data-testid={`remove-peer-${p.id}`}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {(vpn.peers || []).length === 0 && <div className="text-xs text-muted-foreground text-center py-6">{t('common.empty')}</div>}
                </div>
            </CardContent>
        </Card>
    );
}

export default function VPN() {
    const { t } = useTranslation();
    const { canEdit, isAdmin } = useAuth();
    const [vpns, setVpns] = useState([]);
    const [open, setOpen] = useState(false);
    const [target, setTarget] = useState(null);
    const [form, setForm] = useState({ name: '', allowed_ips: '', public_key: '' });

    const load = async () => setVpns((await api.get('/vpn/')).data);
    useEffect(() => { load(); }, []);

    const wg = vpns.filter((v) => v.type === 'wireguard');
    const ovpn = vpns.filter((v) => v.type === 'openvpn');

    const openAddPeer = (v) => { setTarget(v); setForm({ name: '', allowed_ips: '', public_key: '' }); setOpen(true); };
    const submitPeer = async () => {
        try {
            await api.post(`/vpn/${target.id}/peers`, { ...form, connected: true });
            toast.success(t('common.saved'));
            setOpen(false);
            load();
        } catch (e) { toast.error(e?.response?.data?.detail || t('common.error')); }
    };
    const removePeer = async (v, p) => {
        if (!window.confirm(`${t('common.delete')}?`)) return;
        await api.delete(`/vpn/${v.id}/peers/${p.id}`);
        toast.success(t('common.deleted'));
        load();
    };

    return (
        <div data-testid="vpn-page">
            <PageHeader icon={KeyRound} title={t('vpn.title')} subtitle={t('vpn.subtitle')} />

            <Tabs defaultValue="wg" className="w-full">
                <TabsList className="bg-[hsl(var(--surface-2))] border border-border">
                    <TabsTrigger value="wg" data-testid="tab-wireguard">WireGuard ({wg.length})</TabsTrigger>
                    <TabsTrigger value="ovpn" data-testid="tab-openvpn">OpenVPN ({ovpn.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="wg" className="mt-4 space-y-4">
                    {wg.map((v) => <VpnCard key={v.id} vpn={v} onAddPeer={openAddPeer} onRemovePeer={removePeer} canEdit={canEdit} />)}
                </TabsContent>
                <TabsContent value="ovpn" className="mt-4 space-y-4">
                    {ovpn.map((v) => <VpnCard key={v.id} vpn={v} onAddPeer={openAddPeer} onRemovePeer={removePeer} canEdit={canEdit} />)}
                </TabsContent>
            </Tabs>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent className="w-full sm:max-w-md bg-[hsl(var(--surface-1))] border-border" data-testid="peer-sheet">
                    <SheetHeader>
                        <SheetTitle>{t('vpn.add_peer')} — {target?.name}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-5 space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('common.name')}</Label>
                            <Input className="h-9" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('vpn.allowed_ips')}</Label>
                            <Input className="h-9 font-mono" value={form.allowed_ips} onChange={(e) => setForm((f) => ({ ...f, allowed_ips: e.target.value }))} placeholder="10.10.0.10/32" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('vpn.public_key')}</Label>
                            <Input className="h-9 font-mono" value={form.public_key} onChange={(e) => setForm((f) => ({ ...f, public_key: e.target.value }))} />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
                            <Button onClick={submitPeer} className="bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="peer-save-button">{t('common.save')}</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
