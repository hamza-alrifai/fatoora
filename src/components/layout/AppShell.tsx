import React from 'react';
import { cn } from '@/lib/utils';
import {
    Users,
    FileSpreadsheet,
    Sun,
    Moon,
    Package,
    Settings,
    Receipt,
    PanelLeftClose,
    PanelLeftOpen,
    LayoutDashboard
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
}

interface AppShellProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tabId: string) => void;
    isDarkMode: boolean;
    onThemeToggle: () => void;
}

export function AppShell({ children, activeTab, onTabChange, isDarkMode, onThemeToggle }: AppShellProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'matcher', label: 'Matcher', icon: FileSpreadsheet },
        { id: 'invoicing', label: 'Invoices', icon: Receipt },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/30">
                {/* Sidebar */}
                <aside
                    className={cn(
                        "flex-shrink-0 flex flex-col glass border-r z-20 transition-all duration-300 ease-in-out relative",
                        isCollapsed ? "w-[80px]" : "w-[280px]"
                    )}
                >
                    {/* Drag Region */}
                    <div className="h-6 w-full shrink-0" style={{ WebkitAppRegion: 'drag' } as any} />

                    {/* Logo Area */}
                    <div className={cn("px-6 pb-6 transition-all duration-300", isCollapsed ? "px-4" : "px-6")}>
                        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                            <div className="min-w-[40px] w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/10 shrink-0">
                                <span className="text-white font-bold text-xl">F</span>
                            </div>
                            <div className={cn("overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
                                <h1 className="font-bold text-lg tracking-tight whitespace-nowrap">Fatoora</h1>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold whitespace-nowrap">Enterprise</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            const ButtonContent = (
                                <button
                                    onClick={() => onTabChange(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                        isActive
                                            ? "bg-primary/10 text-primary shadow-inner shadow-primary/5"
                                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                                        isCollapsed ? "justify-center" : "justify-start"
                                    )}
                                >
                                    {isActive && (
                                        <div className={cn(
                                            "absolute bg-primary rounded-full shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all",
                                            isCollapsed ? "inset-2 opacity-10" : "left-0 top-0 bottom-0 w-1 opacity-100"
                                        )} />
                                    )}
                                    <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                    <span className={cn("transition-all duration-300 whitespace-nowrap", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                                        {item.label}
                                    </span>
                                </button>
                            );

                            if (isCollapsed) {
                                return (
                                    <Tooltip key={item.id}>
                                        <TooltipTrigger asChild>
                                            {ButtonContent}
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-medium bg-popover/80 backdrop-blur-md">
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return <React.Fragment key={item.id}>{ButtonContent}</React.Fragment>;
                        })}
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-4 mt-auto border-t border-white/5 space-y-2">
                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all group",
                                isCollapsed ? "justify-center" : "justify-start"
                            )}
                        >
                            {isCollapsed ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <PanelLeftClose className="w-5 h-5 shrink-0" />}
                            <span className={cn("transition-all duration-300 whitespace-nowrap", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                                Collapse Sidebar
                            </span>
                        </button>

                        <button
                            onClick={onThemeToggle}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all",
                                isCollapsed ? "justify-center" : "justify-start"
                            )}
                        >
                            {isDarkMode ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
                            <span className={cn("transition-all duration-300 whitespace-nowrap", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 block")}>
                                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                            </span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col min-w-0 relative transition-all duration-300">


                    <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                        {/* Background blob animation */}
                        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

                        <div className="relative h-full w-full animate-in fade-in zoom-in-95 duration-300">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}
