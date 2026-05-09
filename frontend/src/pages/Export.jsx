import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, Copy, Check, Download, ShieldCheck, ShieldOff, History, Undo2, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

function CodeBlock({ code, copyKey }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            toast.success('Copiado!');
            setTimeout(() => setCopied(false), 1600);
        } catch {}
    };
    return (
        <div className="relative rounded-xl border border-border/70 bg-[hsl(var(--surface-2))] overflow-hidden">
            <Button size="sm" variant="ghost" onClick={copy} className="absolute right-2 top-2 z-10 gap-1 h-8 bg-[hsl(var(--surface-1))] border border-border" data-testid={`code-copy-button-${copyKey}`}>
                {copied ? <Check className="w-3.5 h-3.5 text-[hsl(var(--ok))]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'OK' : 'Copy'}
            </Button>
            <ScrollArea className="max-h-[600px]">
                <pre className="font-mono text-xs leading-5 p-4 whitespace-pre overflow-x-auto" data-testid={`export-${copyKey}-preview`}>
                    {code}
                </pre>
            </ScrollArea>
        </div>
    );
}

export default function Export() {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();
    const [nft, setNft] = useState('');
    const [ipt, setIpt] = useState('');
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);
    const [confirmApply, setConfirmApply] = useState(false);
    const [confirmRollback, setConfirmRollback] = useState(false);
    const [applying, setApplying] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [n, i, s] = await Promise.all([
                api.get('/export/nftables', { responseType: 'text' }),
                api.get('/export/iptables', { responseType: 'text' }),
                api.get('/apply/status'),
            ]);
            setNft(typeof n.data === 'string' ? n.data : String(n.data));
            setIpt(typeof i.data === 'string' ? i.data : String(i.data));
            setStatus(s.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const download = (filename, text) => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const doApply = async () => {
        setApplying(true);
        try {
            const { data } = await api.post('/apply/nftables');
            toast.success(t('apply.applied_success'));
            setConfirmApply(false);
            load();
        } catch (e) {
            const detail = e?.response?.data?.detail;
            toast.error(typeof detail === 'string' ? detail : (detail?.error || t('common.error')));
        } finally {
            setApplying(false);
        }
    };

    const doRollback = async () => {
        setApplying(true);
        try {
            const { data } = await api.post('/apply/rollback');
            toast.success(t('apply.rollback_success'));
            setConfirmRollback(false);
            load();
        } catch (e) {
            const detail = e?.response?.data?.detail;
            toast.error(typeof detail === 'string' ? detail : (detail?.error || t('common.error')));
        } finally {
            setApplying(false);
        }
    };

    const applyEnabled = !!status?.apply_enabled;
    const lastApply = status?.last_apply;
    const backups = status?.backups || [];

    return (
        <div data-testid="export-page">
            <PageHeader icon={FileDown} title={t('export.title')} subtitle={t('export.subtitle')} />

            {/* Apply panel */}
            <Card className={`mb-4 border-2 ${applyEnabled ? 'border-[hsl(var(--bad))]/40 bg-[hsl(var(--bad))]/5' : 'border-border/70 bg-[hsl(var(--surface-1))]'}`} data-testid="apply-panel">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${applyEnabled ? 'bg-[hsl(var(--bad))]/15 border-[hsl(var(--bad))]/40 text-[hsl(var(--bad))]' : 'bg-[hsl(var(--info))]/15 border-[hsl(var(--info))]/30 text-[hsl(var(--info))]'}`}>
                                {applyEnabled ? <Zap className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="text-sm font-semibold">
                                    {applyEnabled ? t('apply.real_mode') : t('apply.simulation_mode')}
                                    <Badge variant="outline" className={`ml-2 text-[10px] uppercase ${applyEnabled ? 'bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30' : 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-[hsl(var(--info))]/30'}`}>
                                        {applyEnabled ? 'REAL' : 'SIM'}
                                    </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 max-w-2xl">
                                    {applyEnabled ? t('apply.real_mode_hint') : t('apply.simulation_mode_hint')}
                                </div>
                                {lastApply && (
                                    <div className="text-[11px] font-mono text-muted-foreground mt-2 flex items-center gap-2">
                                        <History className="w-3 h-3" />
                                        {t('apply.last_apply')}: {new Date(lastApply.ts).toLocaleString()} {lastApply.user && <>· <span className="text-foreground/80">{lastApply.user}</span></>}
                                        {lastApply.ok ? <Badge className="bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))] border border-[hsl(var(--ok))]/30 text-[10px]">OK</Badge> : <Badge variant="outline" className="bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/30 text-[10px]">FAILED</Badge>}
                                    </div>
                                )}
                            </div>
                        </div>
                        {applyEnabled && isAdmin && (
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    onClick={() => setConfirmRollback(true)}
                                    variant="outline"
                                    className="gap-2"
                                    disabled={backups.length === 0}
                                    data-testid="apply-rollback-button"
                                >
                                    <Undo2 className="w-4 h-4" />
                                    {t('apply.rollback')}
                                </Button>
                                <Button
                                    onClick={() => setConfirmApply(true)}
                                    className="gap-2 bg-[hsl(var(--bad))] hover:bg-[hsl(var(--bad))]/90 text-white"
                                    data-testid="apply-now-button"
                                >
                                    <Zap className="w-4 h-4" />
                                    {t('apply.apply_now')}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground font-mono mb-4"># {t('export.hint')}</div>

            <Tabs defaultValue="nft" className="w-full">
                <TabsList className="bg-[hsl(var(--surface-2))] border border-border">
                    <TabsTrigger value="nft" data-testid="tab-nftables">nftables.conf</TabsTrigger>
                    <TabsTrigger value="ipt" data-testid="tab-iptables">iptables.sh</TabsTrigger>
                </TabsList>
                <TabsContent value="nft" className="mt-4">
                    <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold">{t('export.nftables')}</CardTitle>
                            <Button onClick={() => download('nftables.conf', nft)} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="config-download-button-nftables">
                                <Download className="w-4 h-4" />
                                {t('export.download_nftables')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loading ? <div className="text-xs text-muted-foreground py-12 text-center">{t('common.loading')}</div> : <CodeBlock code={nft} copyKey="nftables" />}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="ipt" className="mt-4">
                    <Card className="bg-[hsl(var(--surface-1))] border-border/70">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-semibold">{t('export.iptables')}</CardTitle>
                            <Button onClick={() => download('iptables.sh', ipt)} className="gap-2 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))]" data-testid="config-download-button-iptables">
                                <Download className="w-4 h-4" />
                                {t('export.download_iptables')}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {loading ? <div className="text-xs text-muted-foreground py-12 text-center">{t('common.loading')}</div> : <CodeBlock code={ipt} copyKey="iptables" />}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {applyEnabled && backups.length > 0 && (
                <Card className="bg-[hsl(var(--surface-1))] border-border/70 mt-4" data-testid="apply-backups-card">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4" />{t('apply.backups')} ({backups.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {backups.map((b) => (
                                <div key={b.path} className="px-4 py-2.5 flex items-center justify-between text-xs font-mono">
                                    <div className="text-muted-foreground">{b.name}</div>
                                    <div className="text-muted-foreground/80">{(b.size / 1024).toFixed(1)} KB · {new Date(b.mtime).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Apply confirmation */}
            <Dialog open={confirmApply} onOpenChange={setConfirmApply}>
                <DialogContent className="bg-[hsl(var(--surface-1))] border-border" data-testid="apply-confirm-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[hsl(var(--warn))]" />{t('apply.confirm_title')}</DialogTitle>
                        <DialogDescription>{t('apply.confirm_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="rounded-md border border-[hsl(var(--warn))]/30 bg-[hsl(var(--warn))]/10 p-3 text-xs text-[hsl(var(--warn))]">
                        {t('apply.confirm_warning')}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmApply(false)} disabled={applying}>{t('common.cancel')}</Button>
                        <Button onClick={doApply} disabled={applying} className="gap-2 bg-[hsl(var(--bad))] hover:bg-[hsl(var(--bad))]/90 text-white" data-testid="apply-confirm-button">
                            <Zap className="w-4 h-4" />
                            {applying ? t('apply.applying') : t('apply.apply_now')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rollback confirmation */}
            <Dialog open={confirmRollback} onOpenChange={setConfirmRollback}>
                <DialogContent className="bg-[hsl(var(--surface-1))] border-border" data-testid="rollback-confirm-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Undo2 className="w-5 h-5" />{t('apply.rollback_confirm_title')}</DialogTitle>
                        <DialogDescription>{t('apply.rollback_confirm_description')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmRollback(false)} disabled={applying}>{t('common.cancel')}</Button>
                        <Button onClick={doRollback} disabled={applying} className="gap-2" data-testid="rollback-confirm-button">
                            <Undo2 className="w-4 h-4" />
                            {applying ? t('apply.applying') : t('apply.rollback')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
