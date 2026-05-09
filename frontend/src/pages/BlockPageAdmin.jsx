import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldOff, Save, ExternalLink, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

const PRESET_COLORS = ['#f87171', '#fbbf24', '#22d3ee', '#34d399', '#a78bfa', '#f472b6'];

export default function BlockPageAdmin() {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();
    const [cfg, setCfg] = useState(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const { data } = await api.get('/block-page/admin');
        setCfg({
            title: data.title || 'Acesso bloqueado',
            headline: data.headline || 'Você foi bloqueado pelo firewall',
            message: data.message || '',
            organization: data.organization || 'Firewall Console',
            contact_email: data.contact_email || '',
            support_url: data.support_url || '',
            accent_color: data.accent_color || '#f87171',
            reference_id_visible: data.reference_id_visible !== false,
            show_reason: data.show_reason !== false,
            show_ip: data.show_ip !== false,
        });
    };
    useEffect(() => { load(); }, []);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/block-page/admin', cfg);
            toast.success(t('common.saved'));
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    if (!cfg) return <div className="text-xs text-muted-foreground">{t('common.loading')}</div>;

    const accent = cfg.accent_color || '#f87171';

    return (
        <div data-testid="block-page-admin">
            <PageHeader
                icon={ShieldOff}
                title={t('block_page.title_admin')}
                subtitle={t('block_page.subtitle_admin')}
                action={
                    <Button asChild variant="outline" className="gap-2" data-testid="open-public-block-page">
                        <a href="/blocked" target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" />{t('block_page.open_public')}</a>
                    </Button>
                }
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                    <CardHeader><CardTitle className="text-sm font-semibold">{t('common.edit')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('block_page.form.title')}</Label><Input className="h-9 mt-1" value={cfg.title} onChange={(e) => setCfg({ ...cfg, title: e.target.value })} disabled={!isAdmin} data-testid="bp-title" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('block_page.form.headline')}</Label><Input className="h-9 mt-1" value={cfg.headline} onChange={(e) => setCfg({ ...cfg, headline: e.target.value })} disabled={!isAdmin} data-testid="bp-headline" /></div>
                        <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('block_page.form.message')}</Label><Textarea rows={5} className="mt-1" value={cfg.message} onChange={(e) => setCfg({ ...cfg, message: e.target.value })} disabled={!isAdmin} data-testid="bp-message" /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('block_page.form.organization')}</Label><Input className="h-9 mt-1" value={cfg.organization} onChange={(e) => setCfg({ ...cfg, organization: e.target.value })} disabled={!isAdmin} /></div>
                            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('block_page.form.contact_email')}</Label><Input className="h-9 font-mono mt-1" value={cfg.contact_email} onChange={(e) => setCfg({ ...cfg, contact_email: e.target.value })} disabled={!isAdmin} placeholder="security@example.com" /></div>
                            <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('block_page.form.support_url')}</Label><Input className="h-9 font-mono mt-1" value={cfg.support_url} onChange={(e) => setCfg({ ...cfg, support_url: e.target.value })} disabled={!isAdmin} placeholder="https://support.example.com" /></div>
                        </div>
                        <div>
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('block_page.form.accent_color')}</Label>
                            <div className="flex items-center gap-2 mt-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => isAdmin && setCfg({ ...cfg, accent_color: c })}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${cfg.accent_color === c ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                        style={{ background: c, borderColor: cfg.accent_color === c ? '#fff' : 'transparent' }}
                                        data-testid={`color-${c.replace('#', '')}`}
                                    />
                                ))}
                                <Input className="h-9 w-28 font-mono ml-2" value={cfg.accent_color} onChange={(e) => setCfg({ ...cfg, accent_color: e.target.value })} disabled={!isAdmin} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { k: 'show_ip', label: t('block_page.form.show_ip') },
                                { k: 'show_reason', label: t('block_page.form.show_reason') },
                                { k: 'reference_id_visible', label: t('block_page.form.reference_id_visible') },
                            ].map((item) => (
                                <div key={item.k} className="flex items-center justify-between rounded-md border border-border/70 overlay-hairline px-3 py-2">
                                    <Label className="text-xs uppercase tracking-wider">{item.label}</Label>
                                    <Switch checked={!!cfg[item.k]} onCheckedChange={(v) => setCfg({ ...cfg, [item.k]: v })} disabled={!isAdmin} data-testid={`bp-${item.k}`} />
                                </div>
                            ))}
                        </div>
                        {isAdmin && (
                            <Button onClick={save} disabled={saving} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="bp-save-button">
                                <Save className="w-4 h-4" />
                                {t('common.save')}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--surface-1))] border-border/70 overflow-hidden" data-testid="bp-preview">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><Eye className="w-4 h-4" />{t('block_page.preview')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl bg-soc bg-soc-radial border border-border/70 p-6 min-h-[420px] relative overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(600px circle at 30% -10%, ${accent}22, transparent 60%)` }} />
                            <div className="relative">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center border mb-4"
                                    style={{ background: `${accent}25`, borderColor: `${accent}55` }}
                                >
                                    <ShieldOff className="w-6 h-6" style={{ color: accent }} />
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">{cfg.organization}</div>
                                <div className="text-2xl font-semibold mt-1 tracking-tight">{cfg.headline}</div>
                                <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{cfg.message}</p>
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    {cfg.show_ip && <div className="rounded border border-border/70 bg-[hsl(var(--surface-2))] p-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{t('block_page.public.your_ip')}</div><div className="font-mono text-xs mt-1">203.0.113.45</div></div>}
                                    {cfg.reference_id_visible && <div className="rounded border border-border/70 bg-[hsl(var(--surface-2))] p-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{t('block_page.public.reference')}</div><div className="font-mono text-xs mt-1" style={{ color: accent }}>A7B2C9D</div></div>}
                                    <div className="rounded border border-border/70 bg-[hsl(var(--surface-2))] p-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{t('block_page.public.timestamp')}</div><div className="font-mono text-xs mt-1">{new Date().toLocaleTimeString()}</div></div>
                                </div>
                                {cfg.contact_email && <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/70">✉ <span className="font-mono">{cfg.contact_email}</span></div>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
