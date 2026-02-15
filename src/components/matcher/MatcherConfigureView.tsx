import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Sparkles, ArrowLeft, Database, Wand2, CheckCircle2, Settings2, ArrowRight, User } from 'lucide-react';
import type { FileAnalysis, Customer } from '../../types.d';
import { GlassDialog } from '@/components/ui/glass-dialog';
import { SheetPreview } from '@/components/SheetPreview';
import { FileConfigurationCard } from './FileConfigurationCard';
import { guessCustomer } from '@/utils/customer-matching';

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
    // Preview dialog state
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
    const [previewSheets, setPreviewSheets] = useState<string[]>([]);
    const [previewSelectedSheet, setPreviewSelectedSheet] = useState<string | undefined>();
    const [previewLabel, setPreviewLabel] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const openPreview = (filePath: string, fileName: string, sheets: string[] = [], selectedSheet: string = '') => {
        setPreviewFilePath(filePath);
        setPreviewLabel(fileName);
        setPreviewSheets(sheets);
        setPreviewSelectedSheet(selectedSheet || sheets[0]);
        setPreviewDialogOpen(true);
    };

    if (!masterConfig) return null;

    const updateTarget = (index: number, updates: Partial<FileConfig>) => {
        setTargetConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
    };

    const handleSheetChange = async (isMaster: boolean, index: number, newSheet: string) => {
        const currentConfig = isMaster ? masterConfig : targetConfigs[index];
        if (!currentConfig || !currentConfig.filePath) return;

        try {
            const result = await window.electron.analyzeExcelFile(currentConfig.filePath, newSheet);
            if (result.success) {
                const newConfig = {
                    ...currentConfig,
                    ...result,
                    selectedSheet: newSheet,
                    overrideIdColumn: undefined, // Reset selection
                    idColumn: undefined, // Reset auto-detected ID column
                    overrideResultColumn: isMaster ? undefined : currentConfig.overrideResultColumn
                };

                if (isMaster) {
                    setMasterConfig(newConfig);
                } else {
                    setTargetConfigs(prev => prev.map((c, i) => i === index ? newConfig : c));
                }
            }
        } catch (error) {
            console.error("Failed to change sheet", error);
        }
    };

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Step indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-4">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">1</div>
                        Upload Files
                    </div>
                    <div className="w-8 h-px bg-border" />
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

                {/* SMART SUMMARY VIEW */}
                {isReady && !showAdvanced ? (
                    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <Card className="border-emerald-200 bg-emerald-50/30">
                            <CardContent className="p-6 space-y-6">
                                <div className="text-center space-y-1.5">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-foreground">Ready to Process</h2>
                                    <p className="text-sm text-muted-foreground">
                                        We've detected all necessary columns.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                                        <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-foreground">Master File</h4>
                                            <p className="text-xs text-muted-foreground truncate">{masterConfig.fileName}</p>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                                        <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-foreground">Customer Files</h4>
                                            <p className="text-xs text-muted-foreground">{targetConfigs.length} files linked</p>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                </div>

                                <Button
                                    size="lg"
                                    onClick={handleProcess}
                                    disabled={isProcessing}
                                    className="w-full font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Start Processing
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="text-center">
                            <button
                                onClick={() => setShowAdvanced(true)}
                                className="text-sm text-muted-foreground hover:text-indigo-600 hover:underline inline-flex items-center gap-1 transition-colors"
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                Advanced Settings
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ADVANCED / DETAILED VIEW */
                    <div className="grid lg:grid-cols-3 gap-6 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Master File Config */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Database className="w-4 h-4" />
                                        Master File
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        {isReady && (
                                            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(false)} className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                                Simple View
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={onBack} className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800">
                                            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                                            Back to Upload
                                        </Button>
                                    </div>
                                </div>

                                <FileConfigurationCard
                                    config={masterConfig}
                                    isMaster={true}
                                    onSheetChange={(val) => handleSheetChange(true, 0, val)}
                                    onIdColumnChange={(val) => setMasterConfig(prev => prev ? { ...prev, overrideIdColumn: val } : null)}
                                    onResultColumnChange={(val) => setMasterConfig(prev => prev ? { ...prev, overrideResultColumn: val } : null)}
                                    onPreview={() => masterConfig.filePath && openPreview(
                                        masterConfig.filePath,
                                        masterConfig.fileName || 'Master File',
                                        masterConfig.sheets || [],
                                        masterConfig.selectedSheet || ''
                                    )}
                                />
                            </div>

                            {/* Target Files Config */}
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Customer Files ({targetConfigs.length})
                                </h2>

                                <div className="space-y-3">
                                    {targetConfigs.map((target, idx) => (
                                        <FileConfigurationCard
                                            key={idx}
                                            config={target}
                                            index={idx}
                                            isMaster={false}
                                            customers={customers}
                                            guessCustomer={guessCustomer}
                                            onSheetChange={(val) => handleSheetChange(false, idx, val)}
                                            onIdColumnChange={(val) => updateTarget(idx, { overrideIdColumn: val })}
                                            onMatchCustomerChange={(val) => updateTarget(idx, { matchLabel: val })}
                                            onRemove={() => removeTarget(idx)}
                                            onPreview={() => target.filePath && openPreview(
                                                target.filePath,
                                                target.fileName || 'Customer File',
                                                target.sheets || [],
                                                target.selectedSheet || ''
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div >

                        {/* Sidebar / Actions */}
                        <div className="lg:col-span-1" >
                            <div className="sticky top-6 space-y-4">
                                <Card className="border-border/60 bg-muted/30 shadow-sm">
                                    <CardContent className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="space-y-2">
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
                                                "w-full h-12 text-base font-semibold shadow-sm transition-all duration-200",
                                                isReady && !isProcessing
                                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
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
                                                    <Wand2 className="w-5 h-5 mr-2" />
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
                                                        {(masterConfig.overrideIdColumn === undefined || masterConfig.overrideIdColumn === -1) && <li>Select Main File Ticket No.</li>}
                                                        {targetConfigs.some(t => !t.overrideIdColumn || t.overrideIdColumn === -1) && <li>Set Ticket No. for all customer files</li>}
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
                )}
            </div>

            {/* Sheet Preview Dialog */}
            <GlassDialog
                isOpen={previewDialogOpen}
                onClose={() => setPreviewDialogOpen(false)}
                title={`Preview: ${previewLabel}`}
                size="xl"
            >
                <div className="h-[600px]">
                    <SheetPreview
                        filePath={previewFilePath}
                        label={previewLabel}
                        selectedCols={null}
                        onColumnSelect={() => { }}  // Read-only preview
                        sheets={previewSheets}
                        selectedSheet={previewSelectedSheet}
                        onSheetChange={(sheetName) => setPreviewSelectedSheet(sheetName)}
                    />
                </div>
            </GlassDialog>
        </>
    );
}
