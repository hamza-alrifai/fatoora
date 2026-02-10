import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, Loader2, Trash2, AlertCircle, Sparkles, ArrowLeft, FileSpreadsheet, ChevronDown, User, Database } from 'lucide-react';
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

const CustomSelect = ({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className,
    disabled = false
}: {
    value: string | number | undefined;
    onChange: (val: string) => void;
    options: { value: string | number; label: string }[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}) => (
    <div className="relative">
        <select
            className={cn(
                "w-full h-10 rounded-xl border bg-background px-3 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                !value || value === -1 || value === "" ? "text-muted-foreground" : "text-foreground",
                className
            )}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
        >
            <option value="" disabled>{placeholder}</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
);

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
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Step indicator */}
            <div className="flex items-center gap-4 text-sm justify-center py-4">
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm shadow-emerald-100">
                        <Check className="w-3.5 h-3.5" />
                    </div>
                    Upload
                </div>
                <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-200 to-indigo-500" />
                <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md shadow-indigo-500/20">2</div>
                    Configure Columns
                </div>
                <div className="w-12 h-0.5 bg-border" />
                <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-medium">3</div>
                    Process
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {/* Master File Config */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                Master File Source
                            </h2>
                            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                                Change Files
                            </Button>
                        </div>

                        <Card className="overflow-hidden border-indigo-200/50 shadow-md shadow-indigo-500/5">
                            <CardHeader className="bg-gradient-to-r from-indigo-50/80 via-white to-white border-b border-indigo-100/50 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                            <FileSpreadsheet className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-foreground">{masterConfig.fileName}</CardTitle>
                                            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                                                <Check className="w-3 h-3" />
                                                {(masterConfig.dataRowCount ?? 0).toLocaleString()} rows detected
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 grid gap-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            Ticket / ID Column
                                        </label>
                                        <CustomSelect
                                            value={masterConfig.overrideIdColumn}
                                            onChange={(val) => {
                                                const intVal = parseInt(val);
                                                setMasterConfig(prev => prev ? {
                                                    ...prev,
                                                    overrideIdColumn: isNaN(intVal) ? undefined : intVal
                                                } : null);
                                            }}
                                            options={masterConfig.headers?.map(h => ({ value: h.index, label: h.name })) || []}
                                            placeholder="Select unique ID column..."
                                            className="border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            Output / Result Column
                                        </label>
                                        <CustomSelect
                                            value={masterConfig.overrideResultColumn}
                                            onChange={(val) => {
                                                const intVal = parseInt(val);
                                                setMasterConfig(prev => prev ? {
                                                    ...prev,
                                                    overrideResultColumn: isNaN(intVal) ? undefined : intVal
                                                } : null);
                                            }}
                                            options={[
                                                { value: -1, label: `Auto Create (${masterConfig.resultColumn?.isNew ? 'New' : masterConfig.resultColumn?.name})` },
                                                ...(masterConfig.headers?.map(h => ({ value: h.index, label: h.name })) || [])
                                            ]}
                                            placeholder="Select output..."
                                            className="border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Target Files Config */}
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Customer Files ({targetConfigs.length})
                        </h2>

                        <div className="space-y-3">
                            {targetConfigs.map((target, idx) => (
                                <Card key={idx} className="overflow-hidden border-border/60 hover:border-indigo-300/50 transition-colors shadow-sm">
                                    <div className="p-4 flex flex-col md:flex-row gap-4 md:items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-sm truncate pr-4">{target.fileName}</h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium bg-muted text-muted-foreground">
                                                            {(target.dataRowCount ?? 0).toLocaleString()} rows
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">ID Column</label>
                                                    <CustomSelect
                                                        value={target.overrideIdColumn}
                                                        onChange={(val) => {
                                                            const intVal = parseInt(val);
                                                            updateTarget(idx, { overrideIdColumn: isNaN(intVal) ? undefined : intVal });
                                                        }}
                                                        options={target.headers?.map(h => ({ value: h.index, label: h.name })) || []}
                                                        placeholder="Select ID column..."
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Customer Match</label>
                                                    <CustomSelect
                                                        value={target.matchLabel}
                                                        onChange={(val) => updateTarget(idx, { matchLabel: val || undefined })}
                                                        options={customers.map(c => ({ value: c.name, label: c.name }))}
                                                        placeholder="Select customer..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 -mr-1"
                                            onClick={() => removeTarget(idx)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar / Actions */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 space-y-4">
                        <Card className="border-border/60 bg-muted/30 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Configuration Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Files to Process</span>
                                        <span className="font-medium">{targetConfigs.length + 1}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Rows</span>
                                        <span className="font-medium">
                                            {((masterConfig.dataRowCount ?? 0) + targetConfigs.reduce((acc, t) => acc + (t.dataRowCount ?? 0), 0)).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t border-border/50 space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground">Unmatched Label</label>
                                        <Input
                                            className="h-9 bg-background"
                                            value={noMatchLabel}
                                            onChange={(e) => setNoMatchLabel(e.target.value)}
                                            placeholder="e.g., Not Matched"
                                        />
                                    </div>
                                </div>

                                <Button
                                    size="lg"
                                    disabled={!isReady || isProcessing}
                                    onClick={handleProcess}
                                    className={cn(
                                        "w-full h-12 text-base font-semibold shadow-lg transition-all duration-300",
                                        isReady && !isProcessing
                                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:to-indigo-800 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                                            : ""
                                    )}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 mr-2" />
                                            Start Processing
                                        </>
                                    )}
                                </Button>

                                {!isReady && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs flex gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-semibold">Setup Incomplete</p>
                                            <ul className="list-disc pl-3 opacity-90 space-y-0.5">
                                                {(masterConfig.overrideIdColumn === undefined || masterConfig.overrideIdColumn === -1) && <li>Select Master ID column</li>}
                                                {(masterConfig.overrideResultColumn === undefined || masterConfig.overrideResultColumn === -1) && <li>Select Output column</li>}
                                                {targetConfigs.some(t => !t.overrideIdColumn || t.overrideIdColumn === -1) && <li>Set ID columns for all files</li>}
                                                {targetConfigs.some(t => !t.matchLabel) && <li>Assign customers to all files</li>}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
