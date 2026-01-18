import { cn } from "@/lib/utils";
import {
    FileSpreadsheet,
    Settings2,
    CheckCircle2,
    ChevronRight,
    Upload,
    Zap,
} from "lucide-react";

type Step = 'upload' | 'select-master-match' | 'select-target-match' | 'select-master-result' | 'done';

interface SidebarProps {
    currentStep: Step;
    onStepClick: (step: Step) => void;
    masterFile: string | null;
    targetFiles: string[];
    canNavigateTo: (step: Step) => boolean;
}

const steps = [
    { id: 'upload' as Step, label: 'Files', icon: Upload, description: 'Select files' },
    { id: 'select-master-match' as Step, label: 'Master ID', icon: FileSpreadsheet, description: 'Match column' },
    { id: 'select-target-match' as Step, label: 'Target ID', icon: Settings2, description: 'Target columns' },
    { id: 'select-master-result' as Step, label: 'Output', icon: Zap, description: 'Result column' },
    { id: 'done' as Step, label: 'Results', icon: CheckCircle2, description: 'View results' },
];

export function Sidebar({ currentStep, onStepClick, masterFile, targetFiles, canNavigateTo }: SidebarProps) {
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-foreground">Excel Matcher</h1>
                        <p className="text-xs text-muted-foreground">Pro Edition</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-1">
                    {steps.map((step, index) => {
                        const isActive = step.id === currentStep;
                        const isCompleted = index < currentStepIndex;
                        const isClickable = canNavigateTo(step.id);
                        const Icon = step.icon;

                        return (
                            <li key={step.id}>
                                <button
                                    onClick={() => isClickable && onStepClick(step.id)}
                                    disabled={!isClickable}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150",
                                        isActive && "bg-primary/10 text-primary",
                                        !isActive && isCompleted && "text-muted-foreground hover:bg-secondary",
                                        !isActive && !isCompleted && !isClickable && "text-muted-foreground/50 cursor-not-allowed",
                                        !isActive && !isCompleted && isClickable && "text-muted-foreground hover:bg-secondary",
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        isActive && "bg-primary text-primary-foreground",
                                        isCompleted && !isActive && "bg-success/20 text-success",
                                        !isActive && !isCompleted && "bg-secondary text-muted-foreground",
                                    )}>
                                        {isCompleted && !isActive ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <Icon className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-medium truncate",
                                            isActive && "text-foreground",
                                        )}>
                                            {step.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                                    </div>
                                    {isActive && (
                                        <ChevronRight className="w-4 h-4 text-primary" />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Status */}
            <div className="p-4 border-t border-border">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Master</span>
                        <span className={cn(
                            "font-mono truncate max-w-[120px]",
                            masterFile ? "text-success" : "text-muted-foreground"
                        )}>
                            {masterFile ? masterFile.split('/').pop() : 'Not selected'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Targets</span>
                        <span className={cn(
                            "font-medium",
                            targetFiles.length > 0 ? "text-success" : "text-muted-foreground"
                        )}>
                            {targetFiles.length > 0 ? `${targetFiles.length} file${targetFiles.length > 1 ? 's' : ''}` : 'None'}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
