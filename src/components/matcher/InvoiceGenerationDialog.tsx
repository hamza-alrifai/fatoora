import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileSpreadsheet,
    Sparkles, Check, X, ArrowRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from '../../types.d';
import type { FileGenConfig } from '@/hooks/useMatcherState';

interface InvoiceGenerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    fileGenConfigs: Record<string, FileGenConfig>;
    onUpdateConfig: (fileName: string, updates: Partial<FileGenConfig>) => void;
    uniqueMatchValues: string[];
    customers: Customer[];
    outputFileHeaders: { name: string; index: number }[];
    outputFilePath: string | null;
    groupTotals: Record<string, { total: number, t10: number, t20: number }>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customerProjections: Record<string, { t10: number, t20: number }>;
    onCreateCustomer: () => void;
    onGenerate: () => void;
    onGenerateSummary?: () => void;
    isGenerating: boolean;
}

export default function InvoiceGenerationDialog({
    isOpen,
    onClose,
    fileGenConfigs,
    onUpdateConfig,
    uniqueMatchValues,
    customers,
    outputFileHeaders,
    outputFilePath,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customerProjections: _customerProjections,
    onGenerate,
    onGenerateSummary,
    isGenerating
}: InvoiceGenerationDialogProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1); // Step 1: Global, Step 2: Customers
    const [invoicesGenerated, setInvoicesGenerated] = useState(false);
    const [summaryDownloaded, setSummaryDownloaded] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    
    // Update internal configurations when props change
    // Reset Step on Open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setInvoicesGenerated(false);
            setSummaryDownloaded(false);
        }
    }, [isOpen]);

    // Initialize Selection if needed (but don't reset step)
    useEffect(() => {
        if (isOpen && uniqueMatchValues.length > 0 && !selectedId) {
            setSelectedId(uniqueMatchValues[0]);
        }
    }, [isOpen, uniqueMatchValues, selectedId]);

    
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Auto-match customers on Step 2 entry
    useEffect(() => {
        if (isOpen && step === 2) {
            uniqueMatchValues.forEach(groupName => {
                // If already configured with a customer, skip
                if (fileGenConfigs[groupName]?.customerId) return;

                // Find exact match (case-insensitive)
                const matchedCustomer = customers.find(c =>
                    c.name.trim().toLowerCase() === groupName.trim().toLowerCase()
                );

                if (matchedCustomer) {
                    onUpdateConfig(groupName, { customerId: matchedCustomer.id });
                }
            });
        }
    }, [step, isOpen, uniqueMatchValues, customers, fileGenConfigs, onUpdateConfig]);

    // Helper to calculate completion status
    const outputConfig = fileGenConfigs['output'];
    const descIdx = outputConfig?.descriptionColIdx ?? -1;
    const qtyIdx = outputConfig?.quantityColIdx ?? -1;
    const resIdx = outputConfig?.resultColIdx ?? -1;

    const isGlobalReady = descIdx !== -1 && qtyIdx !== -1 && resIdx !== -1;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content Container */}
            <div className="relative w-full max-w-5xl h-[95vh] overflow-hidden rounded-2xl border border-white/20 bg-background/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            {step === 1 ? "Step 1: Configure Columns" : "Step 2: Assign Customers"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {step === 1
                                ? "Map the essential columns from your output file."
                                : "Review matched groups and assign customers."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {step} / 2
                        </Badge>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden">
                    {step === 1 ? (
                        /* STEP 1: GLOBAL CONFIGURATION */
                        <div className="h-full overflow-y-auto p-8 pb-20 max-w-3xl mx-auto space-y-8">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-emerald-600">
                                    <FileSpreadsheet className="w-5 h-5" />
                                    Output Master File Setup
                                </h3>

                                <div className="p-4 mb-6 rounded-lg bg-secondary/10 border border-border/50 flex items-center gap-3">
                                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground/50" />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">
                                            {outputFilePath ? outputFilePath.split(/[\\/]/).pop() : 'No file loaded'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Select columns below to map data correctly</div>
                                    </div>
                                </div>

                                {/* Global Column Selectors */}
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Gabbro type (10mm/20mm) Column <span className="text-destructive">*</span></label>
                                        <select
                                            className={cn(
                                                "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                (fileGenConfigs['output']?.descriptionColIdx ?? -1) === -1 ? "border-destructive text-destructive" : "border-input"
                                            )}
                                            value={fileGenConfigs['output']?.descriptionColIdx ?? -1}
                                            onChange={(e) => onUpdateConfig('output', { descriptionColIdx: parseInt(e.target.value) })}
                                        >
                                            <option value={-1}>Select Column...</option>
                                            {outputFileHeaders.map(h => (
                                                <option key={h.index} value={h.index}>{h.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Weight Column <span className="text-destructive">*</span></label>
                                        <select
                                            className={cn(
                                                "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                (fileGenConfigs['output']?.quantityColIdx ?? -1) === -1 ? "border-destructive text-destructive" : "border-input"
                                            )}
                                            value={fileGenConfigs['output']?.quantityColIdx ?? -1}
                                            onChange={(e) => onUpdateConfig('output', { quantityColIdx: parseInt(e.target.value) })}
                                        >
                                            <option value={-1}>Select Column...</option>
                                            {outputFileHeaders.map(h => (
                                                <option key={h.index} value={h.index}>{h.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-white/10">
                                        <label className="text-sm font-medium">Customer Column <span className="text-destructive">*</span></label>
                                        <select
                                            className={cn(
                                                "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                (fileGenConfigs['output']?.resultColIdx ?? -1) === -1 ? "border-destructive text-destructive" : "border-input"
                                            )}
                                            value={fileGenConfigs['output']?.resultColIdx ?? -1}
                                            onChange={(e) => {
                                                const newVal = parseInt(e.target.value);
                                                onUpdateConfig('output', { resultColIdx: newVal });
                                                // Reset selected ID if matched groups change
                                                setSelectedId(null);
                                            }}
                                        >
                                            <option value={-1}>Select Column...</option>
                                            {outputFileHeaders.map(h => (
                                                <option key={h.index} value={h.index}>{h.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            This column is used to group rows for Invoices and the Executive Summary.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <div className="text-center mb-12">
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                                    <Check className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-3xl font-bold mb-3">Ready to Generate</h2>
                                <p className="text-muted-foreground text-lg max-w-md">
                                    Your columns are configured. Choose an action below.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                                {/* Generate Invoices Button */}
                                <button
                                    onClick={async () => {
                                        if (invoicesGenerated) return;
                                        onGenerate();
                                        setInvoicesGenerated(true);
                                    }}
                                    disabled={isGenerating}
                                    className={cn(
                                        "group relative p-8 rounded-3xl border-2 transition-all duration-300 text-left",
                                        invoicesGenerated 
                                            ? "bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-400"
                                            : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/20",
                                        isGenerating && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-all",
                                        invoicesGenerated 
                                            ? "bg-emerald-500 shadow-emerald-500/30" 
                                            : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 group-hover:scale-110"
                                    )}>
                                        {isGenerating ? (
                                            <Loader2 className="w-7 h-7 text-white animate-spin" />
                                        ) : invoicesGenerated ? (
                                            <Check className="w-7 h-7 text-white" />
                                        ) : (
                                            <FileSpreadsheet className="w-7 h-7 text-white" />
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-emerald-900 mb-2">
                                        {isGenerating ? 'Generating...' : invoicesGenerated ? 'Invoices Generated!' : 'Generate Invoices'}
                                    </h3>
                                    <p className="text-sm text-emerald-700/70">
                                        {invoicesGenerated 
                                            ? 'All invoices have been created successfully' 
                                            : 'Create invoices for all matched customers automatically'}
                                    </p>
                                </button>

                                {/* Download Executive Summary Button */}
                                <button
                                    onClick={async () => {
                                        if (summaryDownloaded || isGeneratingSummary) return;
                                        setIsGeneratingSummary(true);
                                        if (onGenerateSummary) {
                                            await onGenerateSummary();
                                        }
                                        setIsGeneratingSummary(false);
                                        setSummaryDownloaded(true);
                                    }}
                                    disabled={isGenerating || isGeneratingSummary}
                                    className={cn(
                                        "group relative p-8 rounded-3xl border-2 transition-all duration-300 text-left",
                                        summaryDownloaded 
                                            ? "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-400"
                                            : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20",
                                        (isGenerating || isGeneratingSummary) && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-all",
                                        summaryDownloaded 
                                            ? "bg-blue-500 shadow-blue-500/30" 
                                            : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30 group-hover:scale-110"
                                    )}>
                                        {isGeneratingSummary ? (
                                            <Loader2 className="w-7 h-7 text-white animate-spin" />
                                        ) : summaryDownloaded ? (
                                            <Check className="w-7 h-7 text-white" />
                                        ) : (
                                            <Sparkles className="w-7 h-7 text-white" />
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-blue-900 mb-2">
                                        {isGeneratingSummary ? 'Downloading...' : summaryDownloaded ? 'Summary Downloaded!' : 'Download Executive Summary'}
                                    </h3>
                                    <p className="text-sm text-blue-700/70">
                                        {summaryDownloaded 
                                            ? 'Executive summary has been exported successfully' 
                                            : 'Export a summary report of all reconciled data'}
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-black/5 flex justify-end gap-3 shrink-0">
                    {step === 2 && (
                        <Button variant="ghost" onClick={() => setStep(1)}>
                            Back to Columns
                        </Button>
                    )}

                    {step === 1 && (
                        <Button
                            onClick={() => setStep(2)}
                            disabled={!isGlobalReady}
                            className="bg-primary/90 hover:bg-primary"
                        >
                            Next <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
