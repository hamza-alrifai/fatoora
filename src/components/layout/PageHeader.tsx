import { cn } from '@/lib/utils';
import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode; // Actions
    className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex items-center justify-between mb-8 pb-6 border-b border-border/40", className)}>
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
                {description && (
                    <p className="text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="flex items-center gap-2">
                {children}
            </div>
        </div>
    );
}
