import React from 'react';
import { cn } from '@/lib/utils';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TopBarProps {
    title: string;
    subtitle?: string;
    icon?: React.ElementType;
    iconColor?: string; // e.g., "from-indigo-500 to-indigo-600"
    actions?: React.ReactNode;
    searchProps?: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
    };
    className?: string;
}

export function TopBar({
    title,
    subtitle,
    icon: Icon,
    iconColor = "from-indigo-500 to-indigo-600",
    actions,
    searchProps,
    className
}: TopBarProps) {
    return (
        <header className={cn("px-6 py-5 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30", className)}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    {Icon && (
                        <div className={cn(
                            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg shadow-indigo-500/10",
                            iconColor
                        )}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                        {subtitle && (
                            <p className="text-sm text-muted-foreground mt-0.5 font-medium">{subtitle}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {searchProps && (
                        <div className="relative w-full md:w-64 lg:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder={searchProps.placeholder || "Search..."}
                                className="pl-9 bg-muted/50 border-transparent hover:bg-muted focus:bg-background transition-all duration-200"
                                value={searchProps.value}
                                onChange={searchProps.onChange}
                            />
                        </div>
                    )}
                    {actions}
                </div>
            </div>
        </header>
    );
}
