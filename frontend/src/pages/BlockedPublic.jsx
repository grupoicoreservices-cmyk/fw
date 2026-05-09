import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldOff, AlertTriangle, Mail, ExternalLink, Clock, Globe, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function BlockedPublic() {
    const { t, i18n } = useTranslation();
    const { isDark, toggle: toggleTheme } = useTheme();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = 'Acesso bloqueado';
        fetch(`${BACKEND_URL}/api/block-page/`)
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                if (d.config?.title) document.title = d.config.title;
            })
            .catch((e) => setError(String(e)));
    }, []);

    const cfg = data?.config || {};
    const visitor = data?.visitor || {};
    const accent = cfg.accent_color || '#f87171';

    return (
        <div className="min-h-screen bg-soc bg-soc-radial flex items-center justify-center p-6 relative overflow-hidden" data-testid="blocked-public-page">
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(900px circle at 30% -10%, ${accent}22, transparent 50%)` }} />

            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="relative w-full max-w-2xl glass rounded-2xl p-8 md:p-12"
            >
                <div
                    className="absolute -top-px left-1/2 -translate-x-1/2 h-1 rounded-b-full"
                    style={{ width: 120, background: accent, boxShadow: `0 0 24px ${accent}` }}
                />

                <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center border"
                            style={{ background: `${accent}20`, borderColor: `${accent}55` }}
                        >
                            <ShieldOff className="w-7 h-7" style={{ color: accent }} />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">{cfg.organization || 'Firewall Console'}</div>
                            <div className="text-2xl md:text-3xl font-semibold mt-1 tracking-tight">{cfg.headline || t('block_page.public.default_reason')}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded p-1.5"
                            data-testid="blocked-theme-toggle"
                            aria-label="theme toggle"
                        >
                            {isDark ? <Sun className="w-3.5 h-3.5 text-[hsl(var(--warn))]" /> : <Moon className="w-3.5 h-3.5 text-[hsl(var(--info))]" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => i18n.changeLanguage(i18n.language?.startsWith('en') ? 'pt' : 'en')}
                            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 font-mono"
                            data-testid="blocked-language-toggle"
                        >
                            {i18n.language?.startsWith('en') ? 'EN' : 'PT'}
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-base text-foreground/80 leading-relaxed">
                    {cfg.message}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="blocked-visitor-info">
                    {cfg.show_ip !== false && (
                        <div className="rounded-lg border border-border/70 bg-[hsl(var(--surface-2))] p-3">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Globe className="w-3 h-3" />{t('block_page.public.your_ip')}</div>
                            <div className="font-mono text-sm mt-1.5">{visitor.ip || '—'}</div>
                        </div>
                    )}
                    {cfg.reference_id_visible !== false && (
                        <div className="rounded-lg border border-border/70 bg-[hsl(var(--surface-2))] p-3">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><AlertTriangle className="w-3 h-3" />{t('block_page.public.reference')}</div>
                            <div className="font-mono text-sm mt-1.5" style={{ color: accent }}>{visitor.reference_id || '—'}</div>
                        </div>
                    )}
                    <div className="rounded-lg border border-border/70 bg-[hsl(var(--surface-2))] p-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Clock className="w-3 h-3" />{t('block_page.public.timestamp')}</div>
                        <div className="font-mono text-sm mt-1.5">{visitor.timestamp ? new Date(visitor.timestamp).toLocaleString() : '—'}</div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {cfg.contact_email && (
                        <a href={`mailto:${cfg.contact_email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="blocked-contact">
                            <Mail className="w-4 h-4" />
                            <span>{t('block_page.public.contact')}: <span className="font-mono text-foreground">{cfg.contact_email}</span></span>
                        </a>
                    )}
                    {cfg.support_url && (
                        <a href={cfg.support_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[hsl(var(--info))] hover:underline" data-testid="blocked-support">
                            <ExternalLink className="w-4 h-4" />
                            {t('block_page.public.support')}
                        </a>
                    )}
                </div>
            </motion.div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                {cfg.organization || 'Firewall Console'} · access denied
            </div>
        </div>
    );
}
