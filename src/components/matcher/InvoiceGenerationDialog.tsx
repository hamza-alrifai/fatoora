import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import {
    FileSpreadsheet,
    Sparkles, Check, X, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from '../../types.d';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import { detectColumns } from '@/utils/column-detection';
import type { ReconciliationResult } from '@/utils/reconciliation-engine';
import { generateExecutiveSummaryExcel } from '@/utils/executive-summary-generator';
import { toast } from 'sonner';

interface InvoiceGenerationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    fileGenConfigs: Record<string, FileGenConfig>;
    onUpdateConfig: (fileName: string, updates: Partial<FileGenConfig>) => void;
    reconciliationResult: ReconciliationResult;
    customers: Customer[];
    outputFileHeaders: { name: string; index: number }[];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customerProjections: Record<string, { t10: number, t20: number }>;
    onCreateCustomer: () => void;
    onGenerate: () => void;

    isGenerating: boolean;
}

export default function InvoiceGenerationDialog({
    isOpen,
    onClose,
    fileGenConfigs,
    onUpdateConfig,
    reconciliationResult,
    customers,
    outputFileHeaders,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customerProjections: _customerProjections,
    onGenerate,

    isGenerating
}: InvoiceGenerationDialogProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [invoicesGenerated, setInvoicesGenerated] = useState(false);


    // Update internal configurations when props change
    // Auto-detect columns & Auto-assign customers on Open
    useEffect(() => {
        if (isOpen) {
            setInvoicesGenerated(false);


            // 1. Auto-detect columns for Output file if not set
            const currentOutputConfig = fileGenConfigs['output'];
            const needsConfig = !currentOutputConfig ||
                currentOutputConfig.descriptionColIdx === -1 ||
                currentOutputConfig.quantityColIdx === -1;

            if (needsConfig && outputFileHeaders.length > 0) {
                const detected = detectColumns(outputFileHeaders);

                // Construct updates
                const updates: Partial<FileGenConfig> = {};
                if (currentOutputConfig?.descriptionColIdx === -1 && detected.descriptionColumn !== undefined) {
                    updates.descriptionColIdx = detected.descriptionColumn;
                }
                if (currentOutputConfig?.quantityColIdx === -1 && detected.quantityColumn !== undefined) {
                    updates.quantityColIdx = detected.quantityColumn;
                }
                if ((currentOutputConfig?.resultColIdx === -1 || currentOutputConfig?.resultColIdx === undefined) && detected.resultColumn !== undefined) {
                    updates.resultColIdx = detected.resultColumn;
                } else if (currentOutputConfig?.resultColIdx === -1) {
                    // Fallback to last column if result column not detected but also not set
                    updates.resultColIdx = outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1;
                }

                if (Object.keys(updates).length > 0) {
                    onUpdateConfig('output', updates);
                }
            }

            // 2. Auto-match customers
            const groups = Object.keys(reconciliationResult.groupStats);
            groups.forEach(groupName => {
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
    }, [isOpen, outputFileHeaders, reconciliationResult, customers, fileGenConfigs, onUpdateConfig]);

    // Initialize Selection if needed
    useEffect(() => {
        const groups = Object.keys(reconciliationResult.groupStats);
        if (isOpen && groups.length > 0 && !selectedId) {
            setSelectedId(groups[0]);
        }
    }, [isOpen, reconciliationResult, selectedId]);


    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Helper to calculate readiness
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
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-white/20 bg-background/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Generate Documents
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure output columns and generate your invoices or reports.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Configuration Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-indigo-600">
                            <FileSpreadsheet className="w-4 h-4" />
                            Map Columns
                        </h3>

                        <div className="bg-secondary/5 border border-border/50 rounded-xl p-5 space-y-4">
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Customer Grouping Column <span className="text-destructive">*</span></label>
                                <select
                                    className={cn(
                                        "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        (fileGenConfigs['output']?.resultColIdx ?? -1) === -1 ? "border-destructive text-destructive" : "border-input"
                                    )}
                                    value={fileGenConfigs['output']?.resultColIdx ?? -1}
                                    onChange={(e) => {
                                        const newVal = parseInt(e.target.value);
                                        onUpdateConfig('output', { resultColIdx: newVal });
                                        setSelectedId(null);
                                    }}
                                >
                                    <option value={-1}>Select Column...</option>
                                    {outputFileHeaders.map(h => (
                                        <option key={h.index} value={h.index}>{h.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Gabbro Type (10mm/20mm) <span className="text-destructive">*</span></label>
                                    <select
                                        className={cn(
                                            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                                    <label className="text-sm font-medium">Net Weight / Quantity <span className="text-destructive">*</span></label>
                                    <select
                                        className={cn(
                                            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                            </div>
                        </div>
                    </div>

                    {/* Actions Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-indigo-600">
                                <Sparkles className="w-4 h-4" />
                                Actions
                            </h3>
                            {!isGlobalReady && (
                                <Badge variant="destructive" className="text-xs">
                                    Configure columns first
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Generate Invoices Button */}
                            <button
                                onClick={async () => {
                                    if (invoicesGenerated) return;
                                    onGenerate();
                                    setInvoicesGenerated(true);
                                }}
                                disabled={isGenerating || !isGlobalReady}
                                className={cn(
                                    "group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left",
                                    invoicesGenerated
                                        ? "bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-400"
                                        : "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/20",
                                    (isGenerating || !isGlobalReady) && "opacity-50 cursor-not-allowed filter grayscale"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md transition-all",
                                    invoicesGenerated
                                        ? "bg-emerald-500 shadow-emerald-500/30"
                                        : "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 group-hover:scale-110"
                                )}>
                                    {isGenerating ? (
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    ) : invoicesGenerated ? (
                                        <Check className="w-5 h-5 text-white" />
                                    ) : (
                                        <FileSpreadsheet className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <h3 className="text-base font-bold text-emerald-900 mb-1">
                                    {isGenerating ? 'Generating...' : invoicesGenerated ? 'Invoices Generated!' : 'Generate Invoices'}
                                </h3>
                                <p className="text-sm text-emerald-700/70">
                                    Create invoices for all matched customers
                                </p>
                            </button>

                            {/* Download Executive Summary Button */}
                            <button
                                onClick={async () => {
                                    try {
                                        await generateExecutiveSummaryExcel(reconciliationResult);
                                        toast.success("Executive Summary downloaded successfully!");
                                    } catch (error) {
                                        console.error(error);
                                        toast.error("Failed to download Executive Summary");
                                    }
                                }}
                                disabled={!isGlobalReady}
                                className={cn(
                                    "group relative p-5 rounded-2xl border-2 transition-all duration-300 text-left",
                                    "bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20",
                                    !isGlobalReady && "opacity-50 cursor-not-allowed filter grayscale"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-md transition-all",
                                    "bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/30 group-hover:scale-110"
                                )}>
                                    <FileSpreadsheet className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-base font-bold text-indigo-900 mb-1">
                                    Download Summary
                                </h3>
                                <p className="text-sm text-indigo-700/70">
                                    Get a detailed Excel report of all matches
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
