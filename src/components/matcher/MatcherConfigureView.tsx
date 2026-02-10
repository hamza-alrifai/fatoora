import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Trash2, AlertCircle, Sparkles, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { FileAnalysis, Customer } from '../../types.d';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

interface MatcherConfigureViewProps {
    masterConfig: FileConfig | null;
    targetConfigs: FileConfig[];
    noMatchLabel: string;
    isProcessing: boolean;
    isReady: boolean;
    customers: Customer[];
    setNoMatchLabel: (label: string) => void;
    setMasterConfig: React.Dispatch<React.SetStateAction<FileConfig | null>>;
    setTargetConfigs: React.Dispatch<React.SetStateAction<FileConfig[]>>;
    removeTarget: (index: number) => void;
    handleProcess: () => void;
    onBack: () => void;
}

export default function MatcherConfigureView({
    masterConfig,
    targetConfigs,
    noMatchLabel,
    isProcessing,
    isReady,
    customers,
    setNoMatchLabel,
    setMasterConfig,
    setTargetConfigs,
    removeTarget,
    handleProcess,
    onBack,
}: MatcherConfigureViewProps) {
    if (!masterConfig) return null;

    const updateTarget = (index: number, updates: Partial<FileConfig>) => {
        setTargetConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                <div className="flex items-center gap-1.5 text-emerald-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                        <Check className="w-3 h-3" />
                    </div>
                    Upload
                </div>
                <div className="w-8 h-px bg-emerald-400" />
                <div className="flex items-center gap-1.5 text-primary font-semibold">
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                    Configure
                </div>
                <div className="w-8 h-px bg-border" />
                <div className="flex items-center gap-1.5 opacity-40">
                    <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                    Process
                </div>
            </div>

            {/* Back button */}
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground -ml-2">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Files
            </Button>

            {/* Master File Config */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50/80 to-indigo-100/30 border-b border-indigo-200/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                                <FileSpreadsheet className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-indigo-800">Master File</CardTitle>
                                <p className="text-xs text-indigo-600/70">{masterConfig.fileName}</p>
                            </div>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-700 border-0">
                            {masterConfig.dataRowCount} rows
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Ticket / ID Column</label>
                            <select
                                className={cn(
                                    "w-full h-9 rounded-lg border-2 bg-white px-3 text-sm font-medium focus:ring-4 transition-all",
                                    masterConfig.overrideIdColumn !== undefined && masterConfig.overrideIdColumn !== -1
                                        ? "border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                                        : "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                                )}
                                value={masterConfig.overrideIdColumn ?? -1}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setMasterConfig(prev => prev ? {
                                        ...prev,
                                        overrideIdColumn: val === -1 ? undefined : val
                                    } : null);
                                }}
                            >
                                <option value={-1}>Select Column...</option>
                                {masterConfig.headers?.map(h => (
                                    <option key={h.index} value={h.index}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Output / Result Column</label>
                            <select
                                className={cn(
                                    "w-full h-9 rounded-lg border-2 bg-white px-3 text-sm font-medium focus:ring-4 transition-all",
                                    masterConfig.overrideResultColumn !== undefined && masterConfig.overrideResultColumn !== -1
                                        ? "border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                                        : "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                                )}
                                value={masterConfig.overrideResultColumn ?? -1}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setMasterConfig(prev => prev ? {
                                        ...prev,
                                        overrideResultColumn: val === -1 ? undefined : val
                                    } : null);
                                }}
                            >
                                <option value={-1}>
                                    Auto ({masterConfig.resultColumn?.isNew ? 'New Column' : masterConfig.resultColumn?.name})
                                </option>
                                {masterConfig.headers?.map(h => (
                                    <option key={h.index} value={h.index}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Target Files Config */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50/60 to-indigo-100/20 border-b border-indigo-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <FileSpreadsheet className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-indigo-800">Customer Files</CardTitle>
                            <p className="text-xs text-indigo-600/70">{targetConfigs.length} file{targetConfigs.length !== 1 ? 's' : ''} to configure</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    {targetConfigs.map((target, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-indigo-50/30 border border-indigo-200/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <span className="font-semibold text-sm text-indigo-800 truncate">{target.fileName}</span>
                                    <span className="text-xs text-muted-foreground">{target.dataRowCount} rows</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-red-50"
                                    onClick={() => removeTarget(idx)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-indigo-700">Description / ID Column</label>
                                    <select
                                        className={cn(
                                            "w-full h-9 rounded-lg border-2 bg-white px-3 text-sm font-medium focus:ring-4 transition-all",
                                            target.overrideIdColumn !== undefined && target.overrideIdColumn !== -1
                                                ? "border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                                                : "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                                        )}
                                        value={target.overrideIdColumn ?? -1}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            updateTarget(idx, { overrideIdColumn: val === -1 ? undefined : val });
                                        }}
                                    >
                                        <option value={-1}>Select Column...</option>
                                        {target.headers?.map(h => (
                                            <option key={h.index} value={h.index}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-indigo-700">Customer Label</label>
                                    <select
                                        className={cn(
                                            "w-full h-9 rounded-lg border-2 bg-white px-3 text-sm font-medium focus:ring-4 transition-all",
                                            target.matchLabel
                                                ? "border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                                                : "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                                        )}
                                        value={target.matchLabel || ''}
                                        onChange={(e) => updateTarget(idx, { matchLabel: e.target.value || undefined })}
                                    >
                                        <option value="">Select Customer...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* No Match Label */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Unmatched label:</span>
                        <Input
                            className="flex-1 max-w-xs"
                            value={noMatchLabel}
                            onChange={(e) => setNoMatchLabel(e.target.value)}
                            placeholder="e.g., Not Matched"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Process Button */}
            <div className="flex flex-col items-center gap-3 pt-3 pb-3">
                <Button
                    size="xl"
                    disabled={!isReady || isProcessing}
                    onClick={handleProcess}
                    className={cn(
                        "min-w-56 gap-2 transition-transform duration-300 ease-out",
                        isReady && !isProcessing && "shadow-lg shadow-primary/20"
                    )}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Start Reconciliation
                        </>
                    )}
                </Button>

                {!isReady && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>
                            {(masterConfig.overrideIdColumn === undefined || masterConfig.overrideIdColumn === -1) && 'Select master ID column. '}
                            {(masterConfig.overrideResultColumn === undefined || masterConfig.overrideResultColumn === -1) && 'Select output column. '}
                            {targetConfigs.some(t => !t.overrideIdColumn || t.overrideIdColumn === -1) && 'Set ID columns for all files. '}
                            {targetConfigs.some(t => !t.matchLabel) && 'Assign customers to all files.'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
