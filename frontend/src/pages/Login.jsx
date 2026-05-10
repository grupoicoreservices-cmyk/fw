import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, Mail, Loader2, Cpu, Activity, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
    const { t, i18n } = useTranslation();
    const { user, login, loading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('admin@firewall.local');
    const [password, setPassword] = useState('Admin@123');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        document.title = `${t('app_name')} — ${t('login.title')}`;
    }, [t]);

    if (user) return <Navigate to="/" replace />;

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await login(email, password);
            toast.success(t('common.success'));
            navigate('/');
        } catch (err) {
            toast.error(err?.response?.data?.detail || t('login.invalid'));
        } finally {
            setSubmitting(false);
        }
    };

    const changeLang = (lng) => lng && i18n.changeLanguage(lng);

    return (
        <div className="min-h-screen flex bg-soc bg-soc-radial relative overflow-hidden" data-testid="login-page">
            <div className="absolute top-5 right-5 z-10 flex items-center gap-2">
                <ToggleGroup
                    type="single"
                    value={i18n.language?.startsWith('en') ? 'en' : 'pt'}
                    onValueChange={changeLang}
                    className="bg-secondary border border-border rounded-md p-0.5"
                    data-testid="login-language-toggle"
                >
                    <ToggleGroupItem value="pt" className="px-2.5 h-7 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">PT</ToggleGroupItem>
                    <ToggleGroupItem value="en" className="px-2.5 h-7 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">EN</ToggleGroupItem>
                </ToggleGroup>
            </div>

            {/* Decorative left panel */}
            <div className="hidden lg:flex flex-col w-[55%] relative p-12 border-r border-border/70 overflow-hidden">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[hsl(var(--info))]/15 border border-[hsl(var(--info))]/30 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-[hsl(var(--info))]" />
                    </div>
                    <div>
                        <div className="text-lg font-semibold leading-tight">{t('app_name')}</div>
                        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{t('login.badge')}</div>
                    </div>
                </div>

                <div className="mt-auto space-y-6 max-w-xl">
                    <motion.h1
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.05]"
                    >
                        Firewall management,
                        <br />
                        <span className="text-[hsl(var(--info))]">redefined</span> for Ubuntu 24.
                    </motion.h1>
                    <p className="text-muted-foreground text-base max-w-lg">
                        {t('app_subtitle')}. Operator-first, dense data, real-time visibility, and a UI you actually enjoy using.
                    </p>
                    <div className="grid grid-cols-3 gap-3 max-w-md pt-4">
                        {[
                            { icon: Cpu, label: 'CPU', value: '18%' },
                            { icon: Wifi, label: 'WAN', value: '152 Mbps' },
                            { icon: Activity, label: 'CONNS', value: '312' },
                        ].map((m) => {
                            const Icon = m.icon;
                            return (
                                <div
                                    key={m.label}
                                    className="glass rounded-lg p-3 flex flex-col gap-1"
                                >
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                                        <Icon className="w-3.5 h-3.5" />
                                        {m.label}
                                    </div>
                                    <div className="font-mono text-base text-[hsl(var(--info))]">{m.value}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-12 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                    • SIMULATION MODE • EXPORT REAL nftables/iptables • JWT AUTH • RBAC
                </div>
            </div>

            {/* Form panel */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="w-full max-w-md"
                >
                    <div className="flex items-center gap-3 lg:hidden mb-8">
                        <div className="w-10 h-10 rounded-lg bg-[hsl(var(--info))]/15 border border-[hsl(var(--info))]/30 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-[hsl(var(--info))]" />
                        </div>
                        <div>
                            <div className="font-semibold">{t('app_name')}</div>
                            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{t('login.badge')}</div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold mb-1">{t('login.title')}</h2>
                    <p className="text-sm text-muted-foreground mb-7">{t('login.subtitle')}</p>

                    <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">{t('login.email')}</Label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="text"
                                    autoComplete="username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('login.email_placeholder')}
                                    className="pl-9 h-11 font-mono text-sm bg-[hsl(var(--surface-2))] border-border"
                                    required
                                    data-testid="login-email-input"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">{t('login.password')}</Label>
                            <div className="relative">
                                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('login.password_placeholder')}
                                    className="pl-9 h-11 font-mono text-sm bg-[hsl(var(--surface-2))] border-border"
                                    required
                                    data-testid="login-password-input"
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={submitting || loading}
                            className="w-full h-11 bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90 text-[hsl(var(--primary-foreground))] font-semibold"
                            data-testid="login-submit-button"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('login.signing_in')}
                                </>
                            ) : (
                                t('login.sign_in')
                            )}
                        </Button>
                        <div className="text-[11px] text-muted-foreground text-center pt-2 font-mono">
                            {t('login.footer_hint')}
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
