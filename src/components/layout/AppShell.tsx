import React from 'react';
import { cn } from '@/lib/utils';
import {
    Users,
    FileSpreadsheet,
    Settings,
    Receipt,
    LayoutDashboard
} from 'lucide-react';
import {
    TooltipProvider
} from "@/components/ui/tooltip";

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
}

interface AppShellProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export function AppShell({ children, activeTab, onTabChange }: AppShellProps) {
    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-indigo-500 to-indigo-600' },
        { id: 'matcher', label: 'Reconciliation', icon: FileSpreadsheet, color: 'from-indigo-500 to-indigo-600' },
        { id: 'invoicing', label: 'Invoices', icon: Receipt, color: 'from-indigo-500 to-indigo-600' },
        { id: 'customers', label: 'Customers', icon: Users, color: 'from-indigo-500 to-indigo-600' },
        { id: 'settings', label: 'Settings', icon: Settings, color: 'from-indigo-500 to-indigo-600' },
    ];

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex h-screen w-screen overflow-hidden bg-background">
                {/* Modern Sidebar */}
                <aside className="relative flex-shrink-0 flex flex-col bg-card border-r border-border/50 z-20 w-56">
                    {/* Drag Region */}
                    <div className="h-8 w-full shrink-0" style={{ WebkitAppRegion: 'drag' } as any} />

                    {/* Logo */}
                    <div className="flex items-center gap-3 px-4 pb-5">
                        <div className="animate-fade">
                            <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ fontFamily: '"Carter One", sans-serif' }}>Fatoora</h1>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 space-y-1.5">
                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 group animate-slide-in",
                                        isActive
                                            ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                                        isActive
                                            ? `bg-gradient-to-br ${item.color} shadow-lg`
                                            : "bg-muted/80 group-hover:bg-muted"
                                    )}>
                                        <Icon className={cn(
                                            "w-[18px] h-[18px] transition-colors",
                                            isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                                        )} />
                                    </div>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Subtle gradient overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                        <div className="h-full w-full">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}
