import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    FileSpreadsheet, AlertCircle,
    Sparkles, Check, X, ArrowRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from '../../types.d';

export interface FileGenConfig {
    customerId: string | null;
    rate10: number;
    rate20: number;
    rateExcess10: number;
    splitRates10?: {
        enabled: boolean;
        threshold: number;
        rate1: number;
        rate2: number;
    };
    splitRates20?: {
        enabled: boolean;
        threshold: number;
        rate1: number;
        rate2: number;
    };
    descriptionColIdx: number;
    quantityColIdx: number;
    resultColIdx?: number;
}

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

export function InvoiceGenerationDialog({
    isOpen,
    onClose,
    fileGenConfigs,
    onUpdateConfig,
    uniqueMatchValues,
    customers,
    outputFileHeaders,
    outputFilePath,
    groupTotals,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customerProjections: _customerProjections,
    onCreateCustomer,
    onGenerate,
    onGenerateSummary,
    isGenerating
}: InvoiceGenerationDialogProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1); // Step 1: Global, Step 2: Customers

    // Update internal configurations when props change
    // Reset Step on Open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
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

    const isAllGroupsReady = uniqueMatchValues.every(val => fileGenConfigs[val]?.customerId);
    const isConfigComplete = isGlobalReady && isAllGroupsReady;

    const activeConfig = selectedId ? fileGenConfigs[selectedId] : undefined;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content Container */}
            <div className="relative w-full max-w-5xl h-[85vh] overflow-hidden rounded-2xl border border-white/20 bg-background/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">

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
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
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
                                        <label className="text-sm font-medium">Description Column <span className="text-destructive">*</span></label>
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
                                        <label className="text-sm font-medium">Quantity Column <span className="text-destructive">*</span></label>
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
                                        <label className="text-sm font-medium">Group/Target Column <span className="text-destructive">*</span></label>
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
                        /* STEP 2: CUSTOMER ASSIGNMENT */
                        <div className="flex h-full">
                            {/* Sidebar: Matched Customers List */}
                            <div className="w-1/3 border-r border-white/10 bg-secondary/5 flex flex-col backdrop-blur-sm">
                                <div className="p-4 border-b border-white/10 bg-white/5">
                                    <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                                        Matched Customers
                                        <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 min-w-[1.5rem] flex items-center justify-center">
                                            {uniqueMatchValues.length}
                                        </Badge>
                                    </h3>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-3 space-y-2">
                                        {uniqueMatchValues.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground text-sm italic">
                                                No groups found yet. Ensure the "Group/Target Column" is selected correctly.
                                            </div>
                                        ) : (
                                            uniqueMatchValues.map(val => {
                                                const isValid = !!fileGenConfigs[val]?.customerId;
                                                const total = groupTotals[val]?.total || 0;
                                                const isSelected = selectedId === val;

                                                return (
                                                    <button
                                                        key={val}
                                                        onClick={() => setSelectedId(val)}
                                                        className={cn(
                                                            "w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 relative overflow-hidden group border shadow-sm",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                                                                : isValid
                                                                    ? "bg-card hover:bg-accent hover:text-accent-foreground border-border/50 text-foreground"
                                                                    : "bg-destructive/5 hover:bg-destructive/10 border-destructive/20 text-destructive"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="font-bold truncate pr-2 tracking-tight">{val}</span>
                                                            {isValid ? (
                                                                <div className={cn(
                                                                    "rounded-full p-0.5",
                                                                    isSelected ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-500"
                                                                )}>
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                                            )}
                                                        </div>
                                                        <div className={cn(
                                                            "flex gap-3 text-[10px] font-mono",
                                                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                                        )}>
                                                            <span className="flex items-center gap-1">
                                                                <span className="opacity-70">Total:</span>
                                                                <span className="font-semibold">{Math.round(total).toLocaleString()}</span>
                                                            </span>
                                                        </div>
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Right Panel: Detail Config */}
                            <div className="flex-1 flex flex-col bg-background/50">
                                {activeConfig && selectedId ? (
                                    <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                            <div>
                                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                                    {selectedId}
                                                </h3>
                                                <p className="text-sm text-muted-foreground mt-1">Configure invoicing details for this group.</p>
                                            </div>
                                            <Badge variant="outline" className="text-xs px-2 py-1 font-mono">
                                                Total Qty: {groupTotals[selectedId]?.total.toLocaleString()}
                                            </Badge>
                                        </div>

                                        <div className="space-y-6">

                                            {/* Customer Selection */}
                                            <div className="space-y-4">
                                                {/* Logic: If already linked, show minimal UI. Else show full selector. */}
                                                {!activeConfig.customerId ? (
                                                    <>
                                                        <h3 className="text-lg font-semibold">1. Select Customer <span className="text-destructive">*</span></h3>
                                                        <div className="flex gap-3">
                                                            <select
                                                                className={cn(
                                                                    "flex-1 h-11 rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                                    !activeConfig.customerId ? "border-destructive text-destructive font-medium" : "border-input"
                                                                )}
                                                                value={activeConfig.customerId || ''}
                                                                onChange={(e) => onUpdateConfig(selectedId, { customerId: e.target.value })}
                                                            >
                                                                <option value="">Select a customer...</option>
                                                                {customers.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                            <Button variant="outline" size="lg" onClick={onCreateCustomer}>
                                                                New Customer
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20 border border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm text-muted-foreground uppercase tracking-wider text-[10px]">Linked Customer</div>
                                                                <div className="font-semibold text-lg">
                                                                    {customers.find(c => c.id === activeConfig.customerId)?.name || 'Unknown'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-muted-foreground hover:text-foreground hover:bg-white/5"
                                                            onClick={() => onUpdateConfig(selectedId, { customerId: null })}
                                                        >
                                                            Change
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rate Configuration */}
                                            <div className="space-y-4 pt-4 border-t border-white/10">
                                                <h3 className="text-lg font-semibold">2. Rate Configuration</h3>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* 10mm Card */}
                                                    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                                                        <div className="flex items-center gap-3 pb-2 border-b">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">10</div>
                                                            <div className="font-medium">10mm Gabbro</div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium uppercase text-muted-foreground">Base Rate</label>
                                                            <Input
                                                                type="number"
                                                                className="font-mono"
                                                                value={activeConfig.rate10}
                                                                onChange={(e) => onUpdateConfig(selectedId, { rate10: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </div>

                                                        {/* Split Pricing Toggle */}
                                                        <div className="pt-2">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`split10-${selectedId}`}
                                                                    className="h-4 w-4"
                                                                    checked={activeConfig.splitRates10?.enabled || false}
                                                                    onChange={(e) => {
                                                                        const enabled = e.target.checked;
                                                                        const currentSplit = activeConfig.splitRates10 || { threshold: 0, rate1: 0, rate2: 0, enabled: false };
                                                                        if (enabled && currentSplit.threshold === 0) {
                                                                            currentSplit.threshold = groupTotals[selectedId]?.t10 || 0;
                                                                        }
                                                                        onUpdateConfig(selectedId, { splitRates10: { ...currentSplit, enabled } });
                                                                    }}
                                                                />
                                                                <label htmlFor={`split10-${selectedId}`} className="text-sm font-medium cursor-pointer">
                                                                    Enable Split Pricing
                                                                </label>
                                                            </div>

                                                            {activeConfig.splitRates10?.enabled && (
                                                                <div className="pl-4 border-l-2 border-blue-100 space-y-3">
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs text-muted-foreground">First Tier Quantity (MT)</label>
                                                                        <Input
                                                                            type="number" className="h-8 text-sm"
                                                                            value={activeConfig.splitRates10.threshold}
                                                                            onChange={(e) => onUpdateConfig(selectedId, { splitRates10: { ...activeConfig.splitRates10!, threshold: parseFloat(e.target.value) || 0 } })}
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs text-muted-foreground">Rate 1</label>
                                                                            <Input
                                                                                type="number" className="h-8 text-sm"
                                                                                value={activeConfig.splitRates10.rate1}
                                                                                onChange={(e) => onUpdateConfig(selectedId, { splitRates10: { ...activeConfig.splitRates10!, rate1: parseFloat(e.target.value) || 0 } })}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs text-muted-foreground">Rate 2</label>
                                                                            <Input
                                                                                type="number" className="h-8 text-sm"
                                                                                value={activeConfig.splitRates10.rate2}
                                                                                onChange={(e) => onUpdateConfig(selectedId, { splitRates10: { ...activeConfig.splitRates10!, rate2: parseFloat(e.target.value) || 0 } })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 20mm Card */}
                                                    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                                                        <div className="flex items-center gap-3 pb-2 border-b">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">20</div>
                                                            <div className="font-medium">20mm Gabbro</div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium uppercase text-muted-foreground">Base Rate</label>
                                                            <Input
                                                                type="number"
                                                                className="font-mono"
                                                                value={activeConfig.rate20}
                                                                onChange={(e) => onUpdateConfig(selectedId, { rate20: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </div>

                                                        {/* Split Pricing Toggle 20mm */}
                                                        <div className="pt-2">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`split20-${selectedId}`}
                                                                    className="h-4 w-4"
                                                                    checked={activeConfig.splitRates20?.enabled || false}
                                                                    onChange={(e) => {
                                                                        const enabled = e.target.checked;
                                                                        const currentSplit = activeConfig.splitRates20 || { threshold: 0, rate1: 0, rate2: 0, enabled: false };
                                                                        if (enabled && currentSplit.threshold === 0) {
                                                                            currentSplit.threshold = groupTotals[selectedId]?.t20 || 0;
                                                                        }
                                                                        onUpdateConfig(selectedId, { splitRates20: { ...currentSplit, enabled } });
                                                                    }}
                                                                />
                                                                <label htmlFor={`split20-${selectedId}`} className="text-sm font-medium cursor-pointer">
                                                                    Enable Split Pricing
                                                                </label>
                                                            </div>

                                                            {activeConfig.splitRates20?.enabled && (
                                                                <div className="pl-4 border-l-2 border-indigo-100 space-y-3">
                                                                    <div className="space-y-1">
                                                                        <label className="text-xs text-muted-foreground">First Tier Quantity (MT)</label>
                                                                        <Input
                                                                            type="number" className="h-8 text-sm"
                                                                            value={activeConfig.splitRates20.threshold}
                                                                            onChange={(e) => onUpdateConfig(selectedId, { splitRates20: { ...activeConfig.splitRates20!, threshold: parseFloat(e.target.value) || 0 } })}
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs text-muted-foreground">Rate 1</label>
                                                                            <Input
                                                                                type="number" className="h-8 text-sm"
                                                                                value={activeConfig.splitRates20.rate1}
                                                                                onChange={(e) => onUpdateConfig(selectedId, { splitRates20: { ...activeConfig.splitRates20!, rate1: parseFloat(e.target.value) || 0 } })}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-xs text-muted-foreground">Rate 2</label>
                                                                            <Input
                                                                                type="number" className="h-8 text-sm"
                                                                                value={activeConfig.splitRates20.rate2}
                                                                                onChange={(e) => onUpdateConfig(selectedId, { splitRates20: { ...activeConfig.splitRates20!, rate2: parseFloat(e.target.value) || 0 } })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(() => {
                                                    // Calculate Excess 10mm
                                                    // 1. Get Historical Data
                                                    let h10 = 0;
                                                    let h20 = 0;
                                                    const currentCustomer = customers.find(c => c.id === activeConfig.customerId);
                                                    if (currentCustomer) {
                                                        h10 = currentCustomer.total10mm || 0;
                                                        h20 = currentCustomer.total20mm || 0;
                                                    }

                                                    // 2. Get Current Batch Data
                                                    const c10 = groupTotals[selectedId]?.t10 || 0;
                                                    const c20 = groupTotals[selectedId]?.t20 || 0;

                                                    // 3. Cumulative
                                                    const total10 = h10 + c10;
                                                    const total20 = h20 + c20;
                                                    const grandTotal = total10 + total20;

                                                    // 4. Excess Check ( > 40% of total)
                                                    const allowed10 = grandTotal * 0.40;
                                                    const cumExcess = Math.max(0, total10 - allowed10);

                                                    // 5. Deduct Historical Excess (already accounted/paid)
                                                    const histTotal = h10 + h20;
                                                    const histAllowed10 = histTotal * 0.40;
                                                    const histExcess = Math.max(0, h10 - histAllowed10);

                                                    // 6. Chargeable Excess in this batch
                                                    // Floating point precision fix
                                                    const excessQty = Math.max(0, cumExcess - histExcess);
                                                    const showExcess = excessQty > 0.001; // Tolerance

                                                    if (!showExcess) return null;

                                                    return (
                                                        <div className="space-y-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-sm font-medium flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                                                    <AlertCircle className="w-4 h-4" />
                                                                    Excess 10mm Rate (&gt;40%)
                                                                </label>
                                                                <Badge variant="outline" className="border-orange-500/20 text-orange-600 bg-orange-500/10">
                                                                    {excessQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} Tons Excess
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <span className="bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input text-sm text-muted-foreground">QAR</span>
                                                                <Input
                                                                    type="number"
                                                                    className="rounded-l-none"
                                                                    value={activeConfig.rateExcess10 || 0}
                                                                    onChange={(e) => onUpdateConfig(selectedId, { rateExcess10: parseFloat(e.target.value) || 0 })}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Applied to {excessQty.toFixed(2)} tons of 10mm exceeding the 40% allowance.
                                                            </p>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mb-4">
                                            <ArrowRight className="w-8 h-8 opacity-50" />
                                        </div>
                                        <p>Select a customer to configure</p>
                                    </div>
                                )}
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

                    {step === 1 ? (
                        <Button
                            onClick={() => setStep(2)}
                            disabled={!isGlobalReady}
                            className="bg-primary/90 hover:bg-primary"
                        >
                            Next: Assign Customers <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                onGenerate();
                                if (onGenerateSummary) onGenerateSummary();
                            }}
                            disabled={isGenerating || !isConfigComplete}
                            className={cn(
                                "min-w-[180px] font-bold shadow-lg transition-all",
                                isConfigComplete
                                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/20"
                                    : "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Generate Documents
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div >
    );
}
