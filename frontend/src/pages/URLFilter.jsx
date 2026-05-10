import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Filter,
    Plus,
    Edit3,
    Trash2,
    RefreshCcw,
    Power,
    PowerOff,
    Save,
    X,
    Globe,
    ChevronDown,
    ChevronRight,
    AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader, EmptyState } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_FORM = {
    name: '',
    enabled: true,
    source: 'any',
    action: 'block',
    description: '',
};

function ActionBadge({ action }) {
    if (action === 'redirect') {
        return (
            <Badge
                variant="outline"
                className="text-[10px] uppercase font-semibold bg-[hsl(var(--warn))]/15 text-[hsl(var(--warn))] border-[hsl(var(--warn))]/40"
            >
                REDIRECT
            </Badge>
        );
    }
    return (
        <Badge
            variant="outline"
            className="text-[10px] uppercase font-semibold bg-[hsl(var(--bad))]/15 text-[hsl(var(--bad))] border-[hsl(var(--bad))]/40"
        >
            BLOCK
        </Badge>
    );
}

function fmtDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function FilterCard({ item, onEdit, onToggle, onDelete, onResolve, isAdmin }) {
    const [expanded, setExpanded] = useState(false);
    const ipsCount = (item.resolved_ips || []).length;
    const domainsCount = (item.domains || []).length;

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card
                className={`bg-card border-border ${item.enabled ? '' : 'opacity-70'}`}
                data-testid={`url-filter-card-${item.id}`}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                                <Filter className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <CardTitle className="text-base font-semibold truncate flex items-center gap-2">
                                    {item.name}
                                    <ActionBadge action={item.action} />
                                </CardTitle>
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {item.description || <span className="italic">—</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-semibold ${
                                    item.enabled
                                        ? 'bg-[hsl(var(--ok))]/15 text-[hsl(var(--ok))] border-[hsl(var(--ok))]/40'
                                        : 'bg-muted text-muted-foreground border-border'
                                }`}
                                data-testid={`url-filter-status-${item.id}`}
                            >
                                {item.enabled ? 'ATIVO' : 'INATIVO'}
                            </Badge>
                            {isAdmin && (
                                <>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => onResolve(item)}
                                        title="Reresolver agora"
                                        data-testid={`url-filter-resolve-${item.id}`}
                                    >
                                        <RefreshCcw className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => onEdit(item)}
                                        data-testid={`url-filter-edit-${item.id}`}
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => onToggle(item)}
                                        data-testid={`url-filter-toggle-${item.id}`}
                                    >
                                        {item.enabled ? (
                                            <Power className="w-3.5 h-3.5" />
                                        ) : (
                                            <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />
                                        )}
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-[hsl(var(--bad))]"
                                        onClick={() => onDelete(item)}
                                        data-testid={`url-filter-delete-${item.id}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-md border border-border bg-secondary/40 p-2">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte</div>
                            <div className="font-mono text-sm truncate">{item.source || 'any'}</div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/40 p-2">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Domínios</div>
                            <div className="font-mono text-sm">{domainsCount}</div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/40 p-2">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">IPs Resolvidos</div>
                            <div className="font-mono text-sm text-primary">{ipsCount}</div>
                        </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Globe className="w-3 h-3" />
                        Última resolução: <span className="font-mono text-foreground">{fmtDate(item.last_resolved_at)}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                        data-testid={`url-filter-expand-${item.id}`}
                    >
                        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {expanded ? 'Ocultar' : 'Ver'} domínios e IPs
                    </button>

                    {expanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                    Domínios ({domainsCount})
                                </div>
                                <div className="rounded-md border border-border bg-secondary/30 p-2 max-h-40 overflow-y-auto space-y-0.5">
                                    {(item.domains || []).length === 0 ? (
                                        <div className="text-[11px] text-muted-foreground italic">Nenhum domínio</div>
                                    ) : (
                                        (item.domains || []).map((d) => (
                                            <div key={d} className="font-mono text-[11px]">
                                                {d}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                    IPs Resolvidos ({ipsCount})
                                </div>
                                <div className="rounded-md border border-border bg-secondary/30 p-2 max-h-40 overflow-y-auto space-y-0.5">
                                    {ipsCount === 0 ? (
                                        <div className="text-[11px] text-muted-foreground italic">
                                            Nenhum IP resolvido ainda
                                        </div>
                                    ) : (
                                        (item.resolved_ips || []).map((ip) => (
                                            <div key={ip} className="font-mono text-[11px] text-primary">
                                                {ip}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function URLFilter() {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();
    const { data, refresh } = usePolling(async () => (await api.get('/url-filter/')).data, [], 5000);
    const items = data || [];

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [domainsText, setDomainsText] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        document.title = `${t('app_name')} — ${t('nav.url_filter')}`;
    }, [t]);

    const openCreate = () => {
        setEditing(null);
        setForm(DEFAULT_FORM);
        setDomainsText('');
        setOpen(true);
    };

    const openEdit = (it) => {
        setEditing(it);
        setForm({
            name: it.name || '',
            enabled: !!it.enabled,
            source: it.source || 'any',
            action: it.action || 'block',
            description: it.description || '',
        });
        setDomainsText((it.domains || []).join('\n'));
        setOpen(true);
    };

    const save = async () => {
        const domains = domainsText
            .split(/[\n,;\s]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        if (!form.name.trim()) {
            toast.error('Informe um nome');
            return;
        }
        if (domains.length === 0) {
            toast.error('Informe ao menos um domínio');
            return;
        }
        setBusy(true);
        try {
            const payload = { ...form, domains };
            if (editing) {
                await api.put(`/url-filter/${editing.id}`, payload);
            } else {
                await api.post('/url-filter/', payload);
            }
            toast.success(t('common.saved'));
            setOpen(false);
            refresh && refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (it) => {
        if (!window.confirm(`${t('common.delete')} ${it.name}?`)) return;
        try {
            await api.delete(`/url-filter/${it.id}`);
            toast.success(t('common.deleted'));
            refresh && refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    const toggle = async (it) => {
        try {
            await api.patch(`/url-filter/${it.id}/toggle`);
            toast.success(t('common.saved'));
            refresh && refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    const resolve = async (it) => {
        try {
            const { data } = await api.post(`/url-filter/${it.id}/resolve`);
            toast.success(`Resolvidos ${data.count} IP(s) para ${it.name}`);
            refresh && refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    const resolveAll = async () => {
        try {
            const { data } = await api.post('/url-filter/resolve-all');
            toast.success(`Atualizados ${data.updated} filtros · ${data.total_ips} IPs no total`);
            refresh && refresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || t('common.error'));
        }
    };

    const totalIps = items.reduce((sum, it) => sum + (it.resolved_ips?.length || 0), 0);
    const activeCount = items.filter((it) => it.enabled).length;

    return (
        <div data-testid="url-filter-page">
            <PageHeader
                icon={Filter}
                title={t('url_filter.title')}
                subtitle={t('url_filter.subtitle')}
                action={
                    isAdmin && (
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={resolveAll}
                                variant="outline"
                                className="gap-2"
                                data-testid="url-filter-resolve-all"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                {t('url_filter.resolve_all')}
                            </Button>
                            <Button
                                onClick={openCreate}
                                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                                data-testid="url-filter-create-button"
                            >
                                <Plus className="w-4 h-4" />
                                {t('url_filter.new')}
                            </Button>
                        </div>
                    )
                }
            />

            {/* Summary metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Filtros totais
                        </div>
                        <div className="text-3xl font-bold mt-1" data-testid="url-filter-total">
                            {items.length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Filtros ativos
                        </div>
                        <div className="text-3xl font-bold mt-1 text-[hsl(var(--ok))]" data-testid="url-filter-active">
                            {activeCount}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardContent className="p-4">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            IPs bloqueados (total)
                        </div>
                        <div className="text-3xl font-bold mt-1 text-primary" data-testid="url-filter-ips-total">
                            {totalIps}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            {items.length === 0 ? (
                <Card className="bg-card border-border">
                    <EmptyState
                        icon={Filter}
                        title={t('url_filter.empty_title')}
                        hint={t('url_filter.empty_hint')}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {items.map((it) => (
                        <FilterCard
                            key={it.id}
                            item={it}
                            onEdit={openEdit}
                            onToggle={toggle}
                            onDelete={remove}
                            onResolve={resolve}
                            isAdmin={isAdmin}
                        />
                    ))}
                </div>
            )}

            {/* Create / Edit Sheet */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    className="w-full sm:max-w-xl bg-card border-border overflow-y-auto"
                    data-testid="url-filter-sheet"
                >
                    <SheetHeader>
                        <SheetTitle>
                            {editing ? `${t('common.edit')} — ${editing.name}` : t('url_filter.new')}
                        </SheetTitle>
                        <SheetDescription>{t('url_filter.subtitle')}</SheetDescription>
                    </SheetHeader>
                    <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    {t('common.name')}
                                </Label>
                                <Input
                                    className="h-9 mt-1"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Bloqueio Redes Sociais"
                                    data-testid="url-filter-name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {t('url_filter.action')}
                                    </Label>
                                    <Select
                                        value={form.action}
                                        onValueChange={(v) => setForm({ ...form, action: v })}
                                    >
                                        <SelectTrigger className="h-9 mt-1" data-testid="url-filter-action">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="block">Block</SelectItem>
                                            <SelectItem value="redirect">Redirect</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {t('url_filter.source')}
                                    </Label>
                                    <Input
                                        className="h-9 font-mono mt-1"
                                        value={form.source}
                                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                                        placeholder="any · 192.168.1.0/24 · alias"
                                        data-testid="url-filter-source"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    {t('url_filter.domains')}
                                </Label>
                                <Textarea
                                    className="font-mono mt-1 min-h-[140px]"
                                    value={domainsText}
                                    onChange={(e) => setDomainsText(e.target.value)}
                                    placeholder={'facebook.com\ninstagram.com\ntiktok.com'}
                                    data-testid="url-filter-domains"
                                />
                                <div className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1.5">
                                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                    {t('url_filter.domains_hint')}
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                    {t('common.description')}
                                </Label>
                                <Input
                                    className="h-9 mt-1"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    data-testid="url-filter-description"
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2.5">
                                <Label className="text-xs uppercase tracking-wider">{t('common.enabled')}</Label>
                                <Switch
                                    checked={form.enabled}
                                    onCheckedChange={(v) => setForm({ ...form, enabled: v })}
                                    data-testid="url-filter-enabled"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setOpen(false)} className="gap-2">
                                <X className="w-4 h-4" />
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={save}
                                disabled={busy}
                                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                                data-testid="url-filter-save-button"
                            >
                                <Save className="w-4 h-4" />
                                {busy ? t('common.loading') : t('common.save')}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
