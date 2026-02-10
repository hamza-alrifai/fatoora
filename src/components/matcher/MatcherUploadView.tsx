import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Files, Loader2, Upload, Plus, ArrowRight, FileSpreadsheet, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { FileAnalysis } from '../../types.d';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

interface MatcherUploadViewProps {
    masterConfig: FileConfig | null;
    targetConfigs: FileConfig[];
    isAnalyzing: boolean;
    handleSelectMaster: () => void;
    handleSelectTargets: () => void;
    removeTarget: (index: number) => void;
    onContinue: () => void;
}

export default function MatcherUploadView({
    masterConfig,
    targetConfigs,
    isAnalyzing,
    handleSelectMaster,
    handleSelectTargets,
    removeTarget,
    onContinue,
}: MatcherUploadViewProps) {
    const canContinue = !!masterConfig && targetConfigs.length > 0;

    return (
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 py-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 text-primary font-semibold">
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                    Upload Files
                </div>
                <div className="w-8 h-px bg-border" />
                <div className="flex items-center gap-1.5 opacity-40">
                    <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
                    Configure
                </div>
                <div className="w-8 h-px bg-border" />
                <div className="flex items-center gap-1.5 opacity-40">
                    <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                    Process
                </div>
            </div>

            {/* Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                {/* Master File Card */}
                <div
                    onClick={handleSelectMaster}
                    className={cn(
                        "group relative cursor-pointer rounded-2xl p-8 transition-all duration-300 min-h-[220px] flex flex-col items-center justify-center",
                        "border-2 border-dashed hover:border-solid",
                        masterConfig
                            ? "bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-300 shadow-lg shadow-indigo-500/10"
                            : "bg-muted/20 border-border hover:border-indigo-400 hover:bg-indigo-50/30"
                    )}
                >
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
                            masterConfig
                                ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                                : "bg-muted text-muted-foreground group-hover:bg-indigo-100 group-hover:text-indigo-600"
                        )}>
                            {masterConfig ? <Check className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">
                                {masterConfig ? 'Master File Ready' : 'Upload Master File'}
                            </h3>
                            {masterConfig ? (
                                <div className="space-y-1.5">
                                    <Badge className="bg-indigo-100 text-indigo-700 border-0 max-w-[220px] truncate">{masterConfig.fileName}</Badge>
                                    <p className="text-xs text-muted-foreground">{masterConfig.dataRowCount} rows • Click to replace</p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Click to select your main Excel file</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Customer Files Card */}
                <div
                    onClick={handleSelectTargets}
                    className={cn(
                        "group relative cursor-pointer rounded-2xl p-8 transition-all duration-300 min-h-[220px] flex flex-col items-center justify-center",
                        "border-2 border-dashed hover:border-solid",
                        targetConfigs.length > 0
                            ? "bg-gradient-to-br from-indigo-50/80 to-indigo-100/40 border-indigo-200 shadow-lg shadow-indigo-500/10"
                            : "bg-muted/20 border-border hover:border-indigo-300 hover:bg-indigo-50/20"
                    )}
                >
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
                            targetConfigs.length > 0
                                ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                                : "bg-muted text-muted-foreground group-hover:bg-indigo-100 group-hover:text-indigo-600"
                        )}>
                            {targetConfigs.length > 0 ? <Files className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">
                                {targetConfigs.length > 0 ? `${targetConfigs.length} Customer File${targetConfigs.length > 1 ? 's' : ''}` : 'Add Customer Files'}
                            </h3>
                            {targetConfigs.length > 0 ? (
                                <p className="text-sm text-muted-foreground">Click to add more files</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Click to select customer Excel files</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isAnalyzing && (
                <div className="flex items-center justify-center gap-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Analyzing files...</span>
                </div>
            )}

            {/* Uploaded files list */}
            {targetConfigs.length > 0 && (
                <div className="w-full space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Customer Files</p>
                    <div className="space-y-1.5">
                        {targetConfigs.map((target, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50/50 border border-indigo-200/50"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <FileSpreadsheet className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span className="text-sm font-medium text-indigo-800 truncate">{target.fileName}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">{target.dataRowCount} rows</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeTarget(idx); }}
                                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Continue Button */}
            <div className="pt-2">
                <Button
                    size="lg"
                    disabled={!canContinue || isAnalyzing}
                    onClick={onContinue}
                    className={cn(
                        "min-w-48 gap-2 font-bold transition-all",
                        canContinue && !isAnalyzing && "shadow-lg shadow-primary/20"
                    )}
                >
                    Continue to Configuration
                    <ArrowRight className="w-4 h-4" />
                </Button>
                {!canContinue && !isAnalyzing && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        {!masterConfig ? 'Upload a master file to continue' : 'Add at least one customer file'}
                    </p>
                )}
            </div>
        </div>
    );
}
