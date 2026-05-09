import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function PageHeader({ icon: Icon, title, subtitle, action, testId }) {
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6" data-testid={testId || 'page-header'}>
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className="w-10 h-10 rounded-lg bg-[hsl(var(--info))]/15 border border-[hsl(var(--info))]/25 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[hsl(var(--info))]" />
                    </div>
                )}
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" data-testid="page-title">{title}</h1>
                    {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

export function SectionCard({ children, className }) {
    return (
        <Card className={cn('bg-[hsl(var(--surface-1))] border-border/70 shadow-[0_10px_30px_hsl(0_0%_0%/0.35)]', className)}>
            <CardContent className="p-0">{children}</CardContent>
        </Card>
    );
}

export function EmptyState({ icon: Icon, title, hint }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6" data-testid="empty-state">
            {Icon && (
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--surface-2))] border border-border/70 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
            )}
            <div className="font-medium">{title}</div>
            {hint && <div className="text-xs text-muted-foreground mt-1 max-w-md">{hint}</div>}
        </div>
    );
}
