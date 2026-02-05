import { cn } from '@/lib/utils';
import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
    breadcrumb?: React.ReactNode;
}

export function PageHeader({ title, description, children, className, breadcrumb }: PageHeaderProps) {
    return (
        <div className={cn("mb-6", className)}>
            {breadcrumb && (
                <div className="mb-2 text-sm text-muted-foreground">
                    {breadcrumb}
                </div>
            )}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            {description}
                        </p>
                    )}
                </div>
                {children && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
