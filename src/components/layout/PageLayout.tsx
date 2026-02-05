import React from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

interface PageLayoutProps {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    breadcrumb?: React.ReactNode;
    fullWidth?: boolean;
}

export function PageLayout({
    title,
    description,
    actions,
    children,
    className,
    contentClassName,
    breadcrumb,
    fullWidth = false,
}: PageLayoutProps) {
    return (
        <div className={cn(
            'h-full bg-background',
            fullWidth ? 'px-6 py-6' : 'page-container',
            className
        )}>
            {title && (
                <PageHeader 
                    title={title} 
                    description={description}
                    breadcrumb={breadcrumb}
                >
                    {actions}
                </PageHeader>
            )}

            <div className={cn('section-spacing flex-1 min-h-0', contentClassName)}>
                {children}
            </div>
        </div>
    );
}
