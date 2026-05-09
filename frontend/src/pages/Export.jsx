import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, Copy, Check, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import api, { API_BASE } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

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
        <div className="relative rounded-xl border border-border/70 bg-black/40 overflow-hidden">
            <Button size="sm" variant="ghost" onClick={copy} className="absolute right-2 top-2 z-10 gap-1 h-8 bg-[hsl(var(--surface-2))] border border-border" data-testid={`code-copy-button-${copyKey}`}>
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
    const [nft, setNft] = useState('');
    const [ipt, setIpt] = useState('');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [n, i] = await Promise.all([
                api.get('/export/nftables', { responseType: 'text' }),
                api.get('/export/iptables', { responseType: 'text' }),
            ]);
            setNft(typeof n.data === 'string' ? n.data : String(n.data));
            setIpt(typeof i.data === 'string' ? i.data : String(i.data));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

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

    return (
        <div data-testid="export-page">
            <PageHeader icon={FileDown} title={t('export.title')} subtitle={t('export.subtitle')} />

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
        </div>
    );
}
