import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    variant?: 'default' | 'compact';
}

export function EmptyState({ 
    title, 
    description, 
    icon, 
    action, 
    className,
    variant = 'default'
}: EmptyStateProps) {
    const isCompact = variant === 'compact';
    
    return (
        <div className={cn(
            'flex items-center justify-center animate-in',
            isCompact ? 'min-h-[180px] py-8' : 'min-h-[320px] py-12',
            className
        )}>
            <div className="flex max-w-md flex-col items-center gap-5 text-center px-6">
                {icon && (
                    <div className={cn(
                        "rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-muted-foreground shadow-sm",
                        isCompact ? "w-14 h-14" : "w-16 h-16"
                    )}>
                        {icon}
                    </div>
                )}

                <div className="space-y-2">
                    <h3 className={cn(
                        "font-bold text-foreground tracking-tight",
                        isCompact ? "text-lg" : "text-xl"
                    )}>
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                            {description}
                        </p>
                    )}
                </div>

                {action && <div className="pt-3">{action}</div>}
            </div>
        </div>
    );
}
