import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Files, Loader2, Trash2, AlertCircle, Upload, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { FileAnalysis } from '../../types.d';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

interface MatcherConfigureViewProps {
    masterConfig: FileConfig | null;
    targetConfigs: FileConfig[];
    noMatchLabel: string;
    isAnalyzing: boolean;
    isProcessing: boolean;
    isReady: boolean;
    setNoMatchLabel: (label: string) => void;
    setMasterConfig: React.Dispatch<React.SetStateAction<FileConfig | null>>;
    handleSelectMaster: () => void;
    handleSelectTargets: () => void;
    removeTarget: (index: number) => void;
    setMappingTarget: (target: { type: 'master' | 'target'; index: number }) => void;
    setMapperOpen: (open: boolean) => void;
    handleProcess: () => void;
}

export default function MatcherConfigureView({
    masterConfig,
    targetConfigs,
    noMatchLabel,
    isAnalyzing,
    isProcessing,
    isReady,
    setNoMatchLabel,
    setMasterConfig,
    handleSelectMaster,
    handleSelectTargets,
    removeTarget,
    setMappingTarget,
    setMapperOpen,
    handleProcess
}: MatcherConfigureViewProps) {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* File Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Master File Card */}
                <div
                    onClick={handleSelectMaster}
                    className={cn(
                        "group relative cursor-pointer rounded-3xl p-8 transition-all duration-300",
                        "border-2 border-dashed hover:border-solid",
                        masterConfig 
                            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-lg shadow-emerald-500/10" 
                            : "bg-muted/30 border-border hover:border-emerald-400 hover:bg-emerald-50/50"
                    )}
                >
                    <div className="flex flex-col items-center text-center space-y-5">
                        <div className={cn(
                            "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300",
                            masterConfig 
                                ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30" 
                                : "bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-600"
                        )}>
                            {masterConfig ? <Check className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {masterConfig ? 'Master File Ready' : 'Upload Master File'}
                            </h3>
                            {masterConfig ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0">{masterConfig.fileName}</Badge>
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
                        "group relative cursor-pointer rounded-3xl p-8 transition-all duration-300",
                        "border-2 border-dashed hover:border-solid",
                        targetConfigs.length > 0 
                            ? "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300 shadow-lg shadow-violet-500/10" 
                            : "bg-muted/30 border-border hover:border-violet-400 hover:bg-violet-50/50"
                    )}
                >
                    <div className="flex flex-col items-center text-center space-y-5">
                        <div className={cn(
                            "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300",
                            targetConfigs.length > 0 
                                ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/30" 
                                : "bg-muted text-muted-foreground group-hover:bg-violet-100 group-hover:text-violet-600"
                        )}>
                            {targetConfigs.length > 0 ? <Files className="w-10 h-10" /> : <Plus className="w-10 h-10" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {targetConfigs.length > 0 ? `${targetConfigs.length} Files Added` : 'Add Customer Files'}
                            </h3>
                            {targetConfigs.length > 0 ? (
                                <Badge className="bg-violet-100 text-violet-700 border-0">Click to add more</Badge>
                            ) : (
                                <p className="text-sm text-muted-foreground">Click to select customer Excel files</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isAnalyzing && (
                <div className="flex items-center justify-center gap-3 py-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Analyzing files...</span>
                </div>
            )}

            {/* Configuration Card */}
            {masterConfig && (
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Configuration</CardTitle>
                                    <p className="text-sm text-muted-foreground">Set up column mappings</p>
                                </div>
                            </div>
                            <Badge variant="muted" className="text-sm">
                                {masterConfig?.dataRowCount} rows
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Master File Config */}
                        <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-bold text-emerald-800">{masterConfig.fileName}</span>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700 border-0">Master</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-emerald-700">ID Column</label>
                                    <select
                                        className="w-full h-11 rounded-xl border-2 border-emerald-200 bg-white px-4 text-sm font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
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
                                        {masterConfig?.headers?.map(h => (
                                            <option key={h.index} value={h.index}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-emerald-700">Output Column</label>
                                    <select
                                        className="w-full h-11 rounded-xl border-2 border-emerald-200 bg-white px-4 text-sm font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
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
                        </div>

                        {/* Target Files */}
                        {targetConfigs.map((target, idx) => (
                            <div key={idx} className="p-5 rounded-2xl bg-violet-50/50 border border-violet-200/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center text-white text-sm font-bold">
                                            {idx + 1}
                                        </div>
                                        <span className="font-bold text-violet-800">{target.fileName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 gap-2 text-violet-600 hover:bg-violet-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMappingTarget({ type: 'target', index: idx });
                                                setMapperOpen(true);
                                            }}
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Configure
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50"
                                            onClick={(e) => { e.stopPropagation(); removeTarget(idx); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-white/80 rounded-xl border border-violet-100">
                                    <div className="flex-1">
                                        <span className="text-xs text-muted-foreground">ID Column</span>
                                        <div className="font-semibold text-sm">
                                            {target.overrideIdColumn !== undefined
                                                ? (target.headers?.find(h => h.index === target.overrideIdColumn)?.name || `Col ${target.overrideIdColumn + 1}`)
                                                : <span className="text-muted-foreground">Not set</span>
                                            }
                                        </div>
                                    </div>
                                    <div className="w-px h-8 bg-violet-200" />
                                    <div className="flex-1">
                                        <span className="text-xs text-muted-foreground">Customer Label</span>
                                        <div className="font-semibold text-sm">
                                            {target.matchLabel ? (
                                                <span className="text-violet-700">{target.matchLabel}</span>
                                            ) : (
                                                <span className="text-red-500">Required</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* No Match Label */}
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/50">
                            <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Unmatched label:</span>
                            <Input
                                className="flex-1 max-w-xs"
                                value={noMatchLabel}
                                onChange={(e) => setNoMatchLabel(e.target.value)}
                                placeholder="e.g., Not Matched"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Process Button */}
            <div className="flex flex-col items-center gap-4 pt-8 pb-4">
                <Button
                    size="xl"
                    disabled={!isReady || isProcessing}
                    onClick={handleProcess}
                    className={cn(
                        "min-w-80 text-lg gap-3 transition-transform duration-300 ease-out",
                        isReady && !isProcessing && "animate-bounce-once"
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

                {!isReady && masterConfig && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                            {masterConfig.overrideIdColumn === undefined && 'Select master ID column. '}
                            {masterConfig.overrideResultColumn === undefined && 'Select output column. '}
                            {targetConfigs.length === 0 && 'Add customer files. '}
                            {targetConfigs.some(t => !t.matchLabel) && 'Configure all customer files.'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
