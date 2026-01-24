import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileAnalysis, Customer } from '../../types.d';
import { GlassDialog } from '@/components/ui/glass-dialog';
import {
    FileSpreadsheet,
    FolderOpen,
    Check,
    RefreshCw,
    Loader2,
    Sparkles,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Files,
    Zap,
    Settings2,
    Download,
    Eye,
    ExternalLink,
    Receipt,
    Plus,
    Trash2,
} from 'lucide-react';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

interface MatcherWorkspaceProps {
    currentStep: 'configure' | 'done';
    onStepChange: (step: 'configure' | 'done') => void;
}

export function MatcherWorkspace({ currentStep, onStepChange }: MatcherWorkspaceProps) {
    // Local state for DATA, but step is now controlled
    const [masterConfig, setMasterConfig] = useState<FileConfig | null>(null);
    const [targetConfigs, setTargetConfigs] = useState<FileConfig[]>([]);
    const [noMatchLabel, setNoMatchLabel] = useState('Not Matched');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);
    const [unmatchedPreview, setUnmatchedPreview] = useState<any[][] | null>(null);
    const [showUnmatchedPreview, setShowUnmatchedPreview] = useState(false);
    const [_matchedRows, setMatchedRows] = useState<Array<{ sourceFile: string; data: any[]; rowNumber: number; }>>([]); // eslint-disable-line @typescript-eslint/no-unused-vars;
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);

    // Customer Selection State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

    // Per-File Generation Configuration
    type FileGenConfig = {
        customerId: string | null;
        rate10: number;
        rate20: number;
        descriptionColIdx: number;
        quantityColIdx: number;
        resultColIdx?: number;
    };
    const [fileGenConfigs, setFileGenConfigs] = useState<Record<string, FileGenConfig>>({});

    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    // Track which file we are creation a customer FOR (index in targetConfigs)
    const [creatingCustomerForTargetIndex, setCreatingCustomerForTargetIndex] = useState<number | null>(null);

    const [newCustomerData, setNewCustomerData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const [stats, setStats] = useState<{
        totalMasterRows: number;
        matchedMasterRows: number;
        unmatchedMasterRows: number;
        matchPercentage: number;
    } | null>(null);
    const [perFileStats, setPerFileStats] = useState<Array<{
        fileName: string;
        filePath: string;
        total: number;
        matched: number;
        percentage: number;
    }> | null>(null);

    // Output file state (for invoice generation)
    const [outputFilePath, setOutputFilePath] = useState<string | null>(null);
    const [outputFileHeaders, setOutputFileHeaders] = useState<Array<{ index: number; name: string }>>([]);
    const [outputFileData, setOutputFileData] = useState<any[][] | []>([]);
    const [uniqueMatchValues, setUniqueMatchValues] = useState<string[]>([]);

    // Sync local step with prop if needed, or just use prop. We use prop `currentStep`.

    // Load customers on mount
    useEffect(() => {
        loadCustomers();
    }, []);

    // ... (analyzeFile, handleSelectMaster, etc. - keep as is)

    // Run matching
    const analyzeFile = async (filePath: string): Promise<FileConfig | null> => {
        const result = await window.electron.analyzeExcelFile(filePath);
        if (!result.success) {
            toast.error(`Failed to analyze: ${result.error}`);
            return null;
        }
        return {
            ...result,
            matchLabel: result.suggestedMatchLabel,
        } as FileConfig;
    };

    const handleSelectMaster = async () => {
        const res = await window.electron.openFileDialog({
            multiple: false,
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
        });
        if (!res.canceled && res.filePaths.length > 0) {
            setIsAnalyzing(true);
            const config = await analyzeFile(res.filePaths[0]);
            setMasterConfig(config);
            setIsAnalyzing(false);
        }
    };

    const handleSelectTargets = async () => {
        const res = await window.electron.openFileDialog({
            multiple: true,
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
        });
        if (!res.canceled && res.filePaths.length > 0) {
            setIsAnalyzing(true);
            const configs: FileConfig[] = [];
            for (const filePath of res.filePaths) {
                const config = await analyzeFile(filePath);
                if (config) configs.push(config);
            }
            setTargetConfigs(configs);
            setIsAnalyzing(false);
        }
    };

    const removeTarget = (index: number) => {
        setTargetConfigs(prev => prev.filter((_, i) => i !== index));
    };

    const updateTargetLabel = (index: number, label: string) => {
        setTargetConfigs(prev => prev.map((c, i) =>
            i === index ? { ...c, matchLabel: label } : c
        ));
    };

    const isReady = masterConfig?.idColumn &&
        masterConfig?.resultColumn &&
        targetConfigs.length > 0 &&
        targetConfigs.every(t => t.idColumn);

    const handleProcess = async () => {
        if (!masterConfig?.filePath || !isReady) return;

        const defaultName = masterConfig.fileName?.replace('.xlsx', '_updated.xlsx') || 'updated.xlsx';
        const saveResult = await window.electron.saveFileDialog(defaultName);
        if (saveResult.canceled || !saveResult.filePath) return;

        setIsProcessing(true);

        const res = await window.electron.processExcelFiles({
            masterPath: masterConfig.filePath,
            targetPaths: targetConfigs.map(t => t.filePath!),
            masterColIndices: [masterConfig.overrideIdColumn ?? masterConfig.idColumn!.index],
            masterResultColIndex: masterConfig.overrideResultColumn ?? masterConfig.resultColumn!.index,
            targetMatchColIndices: Object.fromEntries(
                targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn ?? t.idColumn!.index]])
            ),
            targetMatchStrings: Object.fromEntries(
                targetConfigs.map(t => [t.filePath!, t.matchLabel || 'Matched'])
            ),
            matchSentence: "",
            noMatchSentence: noMatchLabel,
            outputPath: saveResult.filePath,
            masterRowRange: masterConfig.suggestedRowRange,
            targetRowRanges: Object.fromEntries(
                targetConfigs.filter(t => t.suggestedRowRange).map(t => [t.filePath!, t.suggestedRowRange!])
            ),
        });

        setIsProcessing(false);

        if (res.success) {
            if (res.stats) setStats(res.stats);
            if (res.perFileStats) setPerFileStats(res.perFileStats);
            if (res.matchedRows) setMatchedRows(res.matchedRows);
            if (res.unmatchedPath) {
                setUnmatchedPath(res.unmatchedPath);
                const previewRes = await window.electron.readExcelPreview(res.unmatchedPath);
                if (previewRes.success && previewRes.data) {
                    setUnmatchedPreview(previewRes.data.slice(0, 50));
                }
            }

            // Store output file info for invoice generation
            setOutputFilePath(saveResult.filePath);
            const outputAnalysis = await window.electron.analyzeExcelFile(saveResult.filePath);
            if (outputAnalysis.success && outputAnalysis.headers) {
                setOutputFileHeaders(outputAnalysis.headers);
            }
            const outputPreview = await window.electron.readExcelPreview(saveResult.filePath);
            if (outputPreview.success && outputPreview.data) {
                setOutputFileData(outputPreview.data);
            }

            onStepChange('done');
            toast.success('Matching completed!');
        } else {
            toast.error(res.error || 'Processing failed');
        }
    };

    const loadCustomers = async () => {
        setIsLoadingCustomers(true);
        const res = await window.electron.getCustomers();
        if (res.success && res.customers) {
            setCustomers(res.customers);
        }
        setIsLoadingCustomers(false);
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerData.name.trim()) {
            toast.error("Customer name is required");
            return;
        }

        const newCustomer: Customer = {
            id: '', // Backend assigns
            name: newCustomerData.name,
            email: newCustomerData.email,
            phone: newCustomerData.phone,
            address: newCustomerData.address,
            total20mm: 0,
            total10mm: 0,
            createdAt: '',
            updatedAt: ''
        };

        const result = await window.electron.saveCustomer(newCustomer);
        if (result.success && result.id) {
            toast.success("Customer created!");
            await loadCustomers();

            // If we were creating this for a specific target file (label assignment), auto-select it
            if (creatingCustomerForTargetIndex !== null) {
                updateTargetLabel(creatingCustomerForTargetIndex, newCustomer.name);
                setCreatingCustomerForTargetIndex(null);
            }

            setIsCreatingCustomer(false);
            setNewCustomerData({ name: '', email: '', phone: '', address: '' });
        } else {
            toast.error(result.error || "Failed to create customer");
        }
    };

    // Helper: Guess columns for default
    const guessColumns = (headers: string[]) => {
        const lower = headers.map(h => h.toLowerCase());

        let d = lower.findIndex(h => h.includes('material') && h.includes('description'));
        if (d === -1) d = lower.findIndex(h => h.includes('description'));
        if (d === -1) d = lower.findIndex(h => h.includes('material'));
        if (d === -1) d = 0;

        let q = lower.findIndex(h => h.includes('net') && h.includes('weight'));
        if (q === -1) q = lower.findIndex(h => h.includes('weight'));
        if (q === -1) q = lower.findIndex(h => h.includes('qty'));
        if (q === -1) q = lower.findIndex(h => h.includes('quantity'));

        return { descriptionColIdx: d, quantityColIdx: q };
    };

    const scanUniqueValues = (colIdx: number) => {
        if (colIdx === -1 || !outputFileData.length) return;

        // Get Header Name relative to the output file headers state
        // outputFileHeaders stores {index, name}
        const headerName = outputFileHeaders.find(h => h.index === colIdx)?.name || '';

        const unique = new Set<string>();
        // Skip header
        const dataRows = outputFileData.slice(1);

        dataRows.forEach(row => {
            const val = String(row[colIdx] || '').trim();
            // Filter out empty, "not matched", and THE HEADER ITSELF if it appears in data
            if (val &&
                val.toLowerCase() !== 'not matched' &&
                val !== noMatchLabel &&
                val !== headerName) {
                unique.add(val);
            }
        });

        const sorted = Array.from(unique).sort();
        setUniqueMatchValues(sorted);

        // Initialize configs for these values
        setFileGenConfigs(prev => {
            const next = { ...prev };

            // Helper to find existing config from Target list to migrate settings
            const findBestMatchConfig = (groupName: string) => {
                // Try to find a target file where fileName or filePath contains 'groupName' or vice versa
                const groupLower = groupName.toLowerCase();
                const target = targetConfigs.find(t => {
                    const fName = (t.fileName || '').toLowerCase();
                    const fPath = (t.filePath || '').toLowerCase();
                    // Check inclusion both ways for robustness
                    return fName === groupLower ||
                        fName.includes(groupLower) ||
                        groupLower.includes(fName) ||
                        fPath.includes(groupLower);
                });

                if (target && target.filePath && prev[target.filePath]) {
                    return prev[target.filePath];
                }
                return null;
            };

            sorted.forEach(val => {
                if (!next[val]) {
                    // Try to migrate from existing target file configs
                    const existing = findBestMatchConfig(val);

                    next[val] = {
                        customerId: existing?.customerId || null,
                        rate10: existing?.rate10 || 0,
                        rate20: existing?.rate20 || 0,
                        descriptionColIdx: 0, // Not used for groups
                        quantityColIdx: 0     // Not used for groups
                    };
                }
            });
            return next;
        });

        if (sorted.length > 0) {
            toast.info(`Found ${sorted.length} unique groups (${sorted.join(', ')}).`);
        }
    };

    const handlePrepareGeneration = async () => {
        if (outputFileData.length === 0) {
            toast.error("No output file data available. Please run matching first.");
            return;
        }

        // Load products to get default rates
        let defaultRate10 = 0;
        let defaultRate20 = 0;
        const productRes = await window.electron.getProducts();
        if (productRes.success && productRes.products) {
            const p10 = productRes.products.find((p: any) => p.type === '10mm');
            const p20 = productRes.products.find((p: any) => p.type === '20mm');
            if (p10) defaultRate10 = p10.rate;
            if (p20) defaultRate20 = p20.rate;
        }

        // Create config for OUTPUT file
        const outputHeaders = outputFileHeaders.map(h => h.name);
        const outputGuessed = guessColumns(outputHeaders);

        const newConfigs: Record<string, FileGenConfig> = {
            // Output file config (for master file invoicing)
            'output': fileGenConfigs['output'] || {
                customerId: null,
                rate10: defaultRate10,
                rate20: defaultRate20,
                descriptionColIdx: outputGuessed.descriptionColIdx,
                quantityColIdx: outputGuessed.quantityColIdx
            }
        };

        // Also create configs for each TARGET file (original behavior)
        targetConfigs.forEach(tConfig => {
            const filePath = tConfig.filePath!;
            const headers = tConfig.headers?.map(h => h.name) || [];
            const guessed = guessColumns(headers);

            newConfigs[filePath] = fileGenConfigs[filePath] || {
                customerId: null,
                rate10: defaultRate10,
                rate20: defaultRate20,
                descriptionColIdx: guessed.descriptionColIdx,
                quantityColIdx: guessed.quantityColIdx
            };
        });

        setFileGenConfigs(newConfigs);

        loadCustomers();
        setIsCustomerDialogOpen(true);
    };

    const updateFileConfig = (filePath: string, updates: Partial<FileGenConfig>) => {
        setFileGenConfigs(prev => ({
            ...prev,
            [filePath]: { ...prev[filePath], ...updates }
        }));
    };
    const handleConfirmGeneration = async () => {
        // 1. Get configurations
        const outputConfig = fileGenConfigs['output'];
        if (!outputConfig) {
            toast.error("Output file configuration missing.");
            return;
        }

        // 2. Initial Checks
        const participatingGroups = uniqueMatchValues.filter(val => fileGenConfigs[val]?.customerId);
        if (participatingGroups.length === 0 && !outputConfig.customerId) {
            toast.error("Please assign a customer to at least one matched group.");
            return;
        }

        setIsCustomerDialogOpen(false);
        setIsGeneratingInvoices(true);

        try {
            // 3. Prepare Data Structures
            // Use Map for aggregation to consolidate items
            const invoiceItemsByCustomer: Record<string, Map<string, any>> = {};
            const customerTotals: Record<string, { t10: number, t20: number }> = {};

            // Get Column Indices
            const descIdx = outputConfig.descriptionColIdx ?? 0;
            const qtyIdx = outputConfig.quantityColIdx ?? -1;
            const resultIdx = outputConfig.resultColIdx ?? (outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1);

            if (qtyIdx === -1) {
                toast.warning("Quantity column not selected. Invoice quantities might be 0.");
            }

            // 4. Iterate Output File Rows
            const dataRows = outputFileData.slice(1); // Skip header

            dataRows.forEach((row, idx) => {
                if (!row || row.length === 0) return;

                // A. Determine Match Value (Group)
                const matchValue = String(row[resultIdx] || '').trim();
                // We use the exact string match as captured in uniqueMatchValues
                if (!matchValue || matchValue.toLowerCase() === 'not matched' || matchValue === noMatchLabel) return;

                // B. Find Config for this value
                const groupConfig = fileGenConfigs[matchValue];

                if (!groupConfig || !groupConfig.customerId) return;

                const customerId = groupConfig.customerId;

                // C. Extract Item Data
                const description = String(row[descIdx] || `Item ${idx + 1}`);
                const fullRowText = row.map((cell: any) => String(cell || '').trim()).join(' ').toLowerCase();

                // Rate / Type Logic
                let rate = 0;
                let type: '10mm' | '20mm' | 'other' = 'other';
                const descLower = description.toLowerCase();

                const effectiveRate10 = groupConfig.rate10 ?? 0;
                const effectiveRate20 = groupConfig.rate20 ?? 0;

                if (descLower.includes('20mm') || fullRowText.includes('20mm')) {
                    rate = effectiveRate20;
                    type = '20mm';
                } else if (descLower.includes('10mm') || fullRowText.includes('10mm')) {
                    rate = effectiveRate10;
                    type = '10mm';
                }

                // Quantity
                let quantity = 0;
                if (qtyIdx !== -1 && qtyIdx < row.length) {
                    const rawVal = row[qtyIdx];
                    let parsed = 0;
                    if (typeof rawVal === 'number') parsed = rawVal;
                    else if (typeof rawVal === 'string') parsed = parseFloat(rawVal.replace(/[^0-9.]/g, ''));

                    if (!isNaN(parsed) && parsed > 0) quantity = parsed;
                }
                if (quantity > 100000) quantity = 0; // Sanity

                // D. Add to List with Aggregation
                if (!invoiceItemsByCustomer[customerId]) {
                    invoiceItemsByCustomer[customerId] = new Map();
                    customerTotals[customerId] = { t10: 0, t20: 0 };
                }

                const key = `${description}|${rate}`;
                const customerMap = invoiceItemsByCustomer[customerId];

                if (customerMap.has(key)) {
                    const existing = customerMap.get(key);
                    existing.quantity += quantity;
                    existing.amount = existing.quantity * existing.unitPrice;
                } else {
                    customerMap.set(key, {
                        id: crypto.randomUUID(),
                        description: description,
                        quantity: quantity,
                        unitPrice: rate,
                        amount: quantity * rate,
                        type: type
                    });
                }

                if (type === '10mm') customerTotals[customerId].t10 += quantity;
                if (type === '20mm') customerTotals[customerId].t20 += quantity;
            });

            // 5. Generate Invoices
            let successCount = 0;
            let failCount = 0;

            for (const [custId, itemMap] of Object.entries(invoiceItemsByCustomer)) {
                const items = Array.from(itemMap.values());
                if (items.length === 0) continue;

                const customer = customers.find(c => c.id === custId);
                if (!customer) continue;

                // Update Customer Totals
                const totals = customerTotals[custId];
                if (totals.t10 > 0 || totals.t20 > 0) {
                    const updatedCustomer = {
                        ...customer,
                        total10mm: (customer.total10mm || 0) + totals.t10,
                        total20mm: (customer.total20mm || 0) + totals.t20,
                    };
                    await window.electron.saveCustomer(updatedCustomer);
                }

                // Create Invoice
                const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
                const tax = subtotal * 0.05;

                const newInvoice: any = {
                    id: crypto.randomUUID(),
                    number: `INV-${Date.now().toString().slice(-6)}`,
                    date: new Date().toISOString(),
                    status: 'draft', // Type assertion via :any handled
                    from: {
                        name: 'My Business',
                        address: '123 Business Rd',
                        email: 'billing@example.com',
                        phone: '+1234567890'
                    },
                    to: {
                        customerId: customer.id,
                        name: customer.name,
                        address: customer.address,
                        email: customer.email || ''
                    },
                    items: items,
                    subtotal: subtotal,
                    tax: tax,
                    total: subtotal + tax,
                    currency: 'QAR',
                    notes: `Generated from Matching`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const result = await window.electron.saveInvoice(newInvoice);
                if (result.success) successCount++;
                else failCount++;
            }

            if (successCount > 0) {
                toast.success(`${successCount} invoice(s) generated successfully!`);
                if (loadCustomers) loadCustomers();
            } else if (failCount > 0) {
                toast.error("Failed to generate invoices.");
            } else {
                toast.info("No matching rows found for the selected customers.");
            }

        } catch (error) {
            console.error(error);
            toast.error("An error occurred during generation.");
        } finally {
            setIsGeneratingInvoices(false);
        }
    };




    const handleOpenUnmatched = () => {
        if (unmatchedPath) {
            window.electron.openFile(unmatchedPath);
        }
    };

    const handleShowInFolder = () => {
        if (unmatchedPath) {
            window.electron.showInFolder(unmatchedPath);
        }
    };

    const reset = () => {
        setMasterConfig(null);
        setTargetConfigs([]);
        setNoMatchLabel('Not Matched');
        setShowAdvanced(false);
        setStats(null);
        setPerFileStats(null);
        setMatchedRows([]); // Clear matched rows
        setUnmatchedPath(null);
        setUnmatchedPreview(null);
        setShowUnmatchedPreview(false);
        // Clear output file state
        setOutputFilePath(null);
        setOutputFileHeaders([]);
        setOutputFileData([]);
        setFileGenConfigs({});
        onStepChange('configure'); // Use Prop
    };

    const getConfidenceColor = (confidence?: string) => {
        if (confidence === 'high') return 'text-success';
        if (confidence === 'medium') return 'text-warning';
        return 'text-muted-foreground';
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Main Content only - Sidebar removed */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/30">
                    <h2 className="font-semibold text-foreground">
                        {currentStep === 'configure' ? 'Configure & Run' : 'Results'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Generate Invoice Button in Results Step */}
                        {currentStep === 'done' && outputFileData.length > 0 && (
                            <Button
                                size="sm"
                                onClick={handlePrepareGeneration}
                                disabled={isGeneratingInvoices}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {isGeneratingInvoices ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Receipt className="w-4 h-4 mr-2" />
                                        Generate Invoices
                                    </>
                                )}
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    </div>
                </header>

                {/* Customer Selection Dialog */}
                <GlassDialog
                    isOpen={isCustomerDialogOpen}
                    onClose={() => {
                        setIsCustomerDialogOpen(false);
                        setIsCreatingCustomer(false);
                        setNewCustomerData({ name: '', email: '', phone: '', address: '' });
                    }}
                    title={isCreatingCustomer ? "Create New Customer" : "Generation Settings"}
                    description={isCreatingCustomer ? "Enter customer details below." : "Assign customers and rates to each file."}
                    className="max-w-3xl"
                >
                    <div className="space-y-4">
                        {isCreatingCustomer ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                                {/* SAME CREATION FORM AS BEFORE */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Name *</label>
                                    <Input
                                        value={newCustomerData.name}
                                        onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                        placeholder="Business Name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Email</label>
                                    <Input
                                        value={newCustomerData.email}
                                        onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Phone</label>
                                    <Input
                                        value={newCustomerData.phone}
                                        onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                        placeholder="+974 ..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Address</label>
                                    <Input
                                        value={newCustomerData.address}
                                        onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                        placeholder="Building, Street, Zone"
                                    />
                                </div>
                                <div className="flex justify-end pt-2 gap-2">
                                    <Button variant="ghost" onClick={() => setIsCreatingCustomer(false)}>
                                        Back to List
                                    </Button>
                                    <Button onClick={handleCreateCustomer}>
                                        Save & Return
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-[500px]">
                                {isLoadingCustomers ? (
                                    <div className="flex items-center justify-center flex-1">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                        {/* OUTPUT MASTER FILE SECTION */}
                                        {fileGenConfigs['output'] && (
                                            <>
                                                <div className="mb-2">
                                                    <h3 className="text-sm font-semibold text-foreground mb-1">Output Master File</h3>
                                                    <p className="text-xs text-muted-foreground">Configure invoice generation from the matched output file</p>
                                                </div>
                                                <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                                            <FileSpreadsheet className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="font-medium text-sm flex-1 truncate">
                                                            {outputFilePath ? outputFilePath.split(/[\\/]/).pop() : 'Output File'}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Description Column</label>
                                                            <select
                                                                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus:border-primary"
                                                                value={fileGenConfigs['output'].descriptionColIdx ?? -1}
                                                                onChange={(e) => updateFileConfig('output', { descriptionColIdx: parseInt(e.target.value) })}
                                                            >
                                                                <option value={-1}>Select Column...</option>
                                                                {outputFileHeaders.map(h => (
                                                                    <option key={h.index} value={h.index}>{h.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Quantity Column</label>
                                                            <select
                                                                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus:border-primary"
                                                                value={fileGenConfigs['output'].quantityColIdx ?? -1}
                                                                onChange={(e) => updateFileConfig('output', { quantityColIdx: parseInt(e.target.value) })}
                                                            >
                                                                <option value={-1}>Select Column...</option>
                                                                {outputFileHeaders.map(h => (
                                                                    <option key={h.index} value={h.index}>{h.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2 space-y-1 border-t border-border/50 pt-2 mt-2">
                                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Results/Match Column (File Name)</label>
                                                            <select
                                                                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus:border-primary"
                                                                value={fileGenConfigs['output'].resultColIdx ?? (outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1)}
                                                                onChange={(e) => { const idx = parseInt(e.target.value); updateFileConfig('output', { resultColIdx: idx }); scanUniqueValues(idx); }}
                                                            >
                                                                <option value={-1}>Select Column...</option>
                                                                {outputFileHeaders.map(h => (
                                                                    <option key={h.index} value={h.index}>{h.name}</option>
                                                                ))}
                                                            </select>
                                                            <p className="text-[10px] text-muted-foreground">Select the column containing the matched file names (usually the last column)</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                {targetConfigs.length > 0 && (
                                                    <div className="flex items-center gap-3 py-2">
                                                        <div className="flex-1 h-px bg-border"></div>
                                                        <span className="text-xs text-muted-foreground font-medium">Target Files</span>
                                                        <div className="flex-1 h-px bg-border"></div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {/* TARGET FILES SECTION */}
                                        {uniqueMatchValues.length > 0 && (
                                            <div className="flex items-center gap-3 py-2">
                                                <div className="flex-1 h-px bg-border"></div>
                                                <span className="text-xs text-muted-foreground font-medium">Matched Groups</span>
                                                <div className="flex-1 h-px bg-border"></div>
                                            </div>
                                        )}
                                        {uniqueMatchValues.map((matchVal) => {
                                            const config = fileGenConfigs[matchVal];
                                            if (!config) return null;

                                            return (
                                                <div key={matchVal} className="p-4 rounded-xl border bg-card/50 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center">
                                                            <Files className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="font-medium text-sm flex-1 truncate">{matchVal}</div>
                                                        <Badge variant={config.customerId ? "default" : "outline"} className="text-[10px]">
                                                            {config.customerId ? 'Ready' : 'Incomplete'}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Customer</label>
                                                            <select
                                                                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm focus:border-primary"
                                                                value={config.customerId || ''}
                                                                onChange={(e) => updateFileConfig(matchVal, { customerId: e.target.value })}
                                                            >
                                                                <option value="">Select Customer...</option>
                                                                {customers.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Rate 10mm</label>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        className="h-9 px-2 text-right font-mono"
                                                                        placeholder="0.00"
                                                                        value={config.rate10 || ''}
                                                                        onChange={(e) => updateFileConfig(matchVal, { rate10: parseFloat(e.target.value) })}
                                                                    />
                                                                    <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">QAR</span>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-medium text-muted-foreground uppercase">Rate 20mm</label>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        className="h-9 px-2 text-right font-mono"
                                                                        placeholder="0.00"
                                                                        value={config.rate20 || ''}
                                                                        onChange={(e) => updateFileConfig(matchVal, { rate20: parseFloat(e.target.value) })}
                                                                    />
                                                                    <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">QAR</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex justify-between pt-4 mt-2 border-t border-border/50 bg-background/50 z-10">
                                    <Button variant="outline" size="sm" onClick={() => setIsCreatingCustomer(true)}>
                                        <Plus className="w-4 h-4 mr-2" /> New Customer
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" onClick={() => setIsCustomerDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleConfirmGeneration} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                            Generate Invoices (Batch)
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </GlassDialog>

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {currentStep === 'configure' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                {/* File Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Master File */}
                                    <Card
                                        className={cn(
                                            "cursor-pointer transition-all hover:border-primary/50",
                                            masterConfig && "border-success/50"
                                        )}
                                        onClick={handleSelectMaster}
                                    >
                                        <CardContent className="pt-6">
                                            <div className="flex flex-col items-center text-center space-y-3">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                                    masterConfig ? "bg-success text-white" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    {masterConfig ? <Check className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                                                </div>
                                                {masterConfig ? (
                                                    <div className="font-medium truncate max-w-full">{masterConfig.fileName}</div>
                                                ) : (
                                                    <div>
                                                        <div className="font-medium">Master File</div>
                                                        <div className="text-sm text-muted-foreground">Click to select</div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Target Files */}
                                    <Card
                                        className={cn(
                                            "cursor-pointer transition-all hover:border-primary/50",
                                            targetConfigs.length > 0 && "border-success/50"
                                        )}
                                        onClick={handleSelectTargets}
                                    >
                                        <CardContent className="pt-6">
                                            <div className="flex flex-col items-center text-center space-y-3">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                                    targetConfigs.length > 0 ? "bg-success text-white" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    {targetConfigs.length > 0 ? <Files className="w-6 h-6" /> : <FolderOpen className="w-6 h-6" />}
                                                </div>
                                                {targetConfigs.length > 0 ? (
                                                    <div className="font-medium">{targetConfigs.length} Target File{targetConfigs.length !== 1 ? 's' : ''}</div>
                                                ) : (
                                                    <div>
                                                        <div className="font-medium">Target Files</div>
                                                        <div className="text-sm text-muted-foreground">Click to select</div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Loading indicator */}
                                {isAnalyzing && (
                                    <div className="flex items-center justify-center gap-2 py-4">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span className="text-sm text-muted-foreground">Analyzing files...</span>
                                    </div>
                                )}

                                {/* Auto-Config Summary */}
                                {masterConfig && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-primary" />
                                                    Matching Configuration
                                                </CardTitle>
                                                <Badge variant="secondary" className="text-xs">
                                                    {masterConfig.dataRowCount} rows
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Master Config */}
                                            <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Master: {masterConfig.fileName}</span>
                                                    <Check className="w-4 h-4 text-success" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-muted-foreground">ID Column:</span>
                                                        <span className={cn("font-mono", getConfidenceColor(masterConfig.idColumn?.confidence))}>
                                                            {masterConfig.idColumn?.name || 'Not found'}
                                                        </span>
                                                        {masterConfig.idColumn?.confidence === 'high' && (
                                                            <Badge variant="default" className="text-[10px] px-1 py-0">auto</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-muted-foreground">Output:</span>
                                                        <span className="font-mono">
                                                            {masterConfig.resultColumn?.isNew ? '(New Column)' : masterConfig.resultColumn?.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column Names Display */}


                                            {/* Target Configs */}
                                            {targetConfigs.map((target, idx) => (
                                                <div key={idx} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium truncate flex-1">{target.fileName}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                            onClick={(e) => { e.stopPropagation(); removeTarget(idx); }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-muted-foreground w-8">ID:</span>
                                                            <select
                                                                className="flex-1 h-8 rounded-md border border-input bg-background/50 px-2 text-xs focus:border-primary"
                                                                value={target.overrideIdColumn ?? -1}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    setTargetConfigs(prev => prev.map((c, i) =>
                                                                        i === idx ? { ...c, overrideIdColumn: val === -1 ? undefined : val } : c
                                                                    ));
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <option value={-1}>
                                                                    Auto ({target.idColumn?.name || 'None'})
                                                                </option>
                                                                {target.headers?.map(h => (
                                                                    <option key={h.index} value={h.index}>{h.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <label className="text-muted-foreground w-10">Label:</label>
                                                            <div className="flex-1">
                                                                <select
                                                                    className="w-full h-8 rounded-md border border-input bg-background/50 px-2 text-xs focus:border-primary"
                                                                    value={target.matchLabel || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (val === '___NEW___') {
                                                                            setCreatingCustomerForTargetIndex(idx);
                                                                            setIsCreatingCustomer(true);
                                                                            setIsCustomerDialogOpen(true);
                                                                        } else {
                                                                            updateTargetLabel(idx, val);
                                                                        }
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <option value="">Select Customer...</option>
                                                                    {customers.map(c => (
                                                                        <option key={c.id} value={c.name}>{c.name}</option>
                                                                    ))}
                                                                    <option disabled>──────────</option>
                                                                    <option value="___NEW___">+ Create New Customer</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* No-match label */}
                                            <div className="flex items-center gap-3 text-sm">
                                                <span className="text-muted-foreground">No match label:</span>
                                                <Input
                                                    className="h-8 w-40"
                                                    value={noMatchLabel}
                                                    onChange={(e) => setNoMatchLabel(e.target.value)}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Advanced Options Toggle */}
                                {masterConfig && (
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                        Advanced Options
                                        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                )}

                                {/* Advanced Options Panel */}
                                {showAdvanced && masterConfig && (
                                    <Card className="border-dashed">
                                        <CardHeader>
                                            <CardTitle className="text-sm">Override Auto-Detection</CardTitle>
                                            <CardDescription className="text-xs">
                                                Manually select columns if the auto-detection was incorrect.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Master ID Column</label>
                                                    <select
                                                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                        value={masterConfig.overrideIdColumn ?? masterConfig.idColumn?.index ?? ''}
                                                        onChange={(e) => setMasterConfig(prev => prev ? {
                                                            ...prev,
                                                            overrideIdColumn: e.target.value ? parseInt(e.target.value) : undefined
                                                        } : null)}
                                                    >
                                                        {masterConfig.headers?.map(h => (
                                                            <option key={h.index} value={h.index}>{h.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Output Column</label>
                                                    <select
                                                        className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                        value={masterConfig.overrideResultColumn ?? masterConfig.resultColumn?.index ?? ''}
                                                        onChange={(e) => setMasterConfig(prev => prev ? {
                                                            ...prev,
                                                            overrideResultColumn: e.target.value ? parseInt(e.target.value) : undefined
                                                        } : null)}
                                                    >
                                                        {masterConfig.headers?.map(h => (
                                                            <option key={h.index} value={h.index}>{h.name}</option>
                                                        ))}
                                                        <option value={masterConfig.headers?.length || 0}>(New Column)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Run Button */}
                                <div className="flex justify-end pt-4">
                                    <Button
                                        size="lg"
                                        disabled={!isReady || isProcessing}
                                        onClick={handleProcess}
                                        className="min-w-40"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4 mr-2" />
                                                Run Matching
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Ready status */}
                                {!isReady && masterConfig && (
                                    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                                        <AlertCircle className="w-4 h-4" />
                                        {!masterConfig.idColumn && 'Master ID column not detected. '}
                                        {targetConfigs.length === 0 && 'Select target files. '}
                                        {targetConfigs.some(t => !t.idColumn) && 'Some targets missing ID column.'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Results Step */}
                        {currentStep === 'done' && (
                            <div className="max-w-3xl mx-auto space-y-8">
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center mx-auto">
                                        <Check className="w-10 h-10 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-foreground">Matching Complete!</h1>
                                        <p className="text-muted-foreground mt-2">Your master file has been updated.</p>
                                    </div>
                                </div>

                                {stats && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="text-center">
                                            <CardContent className="pt-6">
                                                <p className="text-3xl font-bold">{stats.totalMasterRows}</p>
                                                <p className="text-xs text-muted-foreground uppercase mt-1">Rows Scanned</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="text-center bg-success/10 border-success/30">
                                            <CardContent className="pt-6">
                                                <p className="text-3xl font-bold text-success">{stats.matchedMasterRows}</p>
                                                <p className="text-xs text-muted-foreground uppercase mt-1">Matches</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="text-center bg-destructive/10 border-destructive/30">
                                            <CardContent className="pt-6">
                                                <p className="text-3xl font-bold text-destructive">{stats.unmatchedMasterRows}</p>
                                                <p className="text-xs text-muted-foreground uppercase mt-1">Unmatched</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="text-center bg-primary/10 border-primary/30">
                                            <CardContent className="pt-6">
                                                <p className="text-3xl font-bold text-primary">{stats.matchPercentage}%</p>
                                                <p className="text-xs text-muted-foreground uppercase mt-1">Rate</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {perFileStats && perFileStats.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Per-File Results</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {perFileStats.map((fileStat, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex flex-col">
                                                            <span className="truncate font-medium">{fileStat.fileName}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {fileStat.matched} / {fileStat.total} rows matched
                                                            </span>
                                                        </div>
                                                        <Badge variant={fileStat.percentage >= 80 ? 'success' : fileStat.percentage >= 50 ? 'warning' : 'destructive'}>
                                                            {fileStat.percentage}%
                                                        </Badge>
                                                    </div>
                                                    <Progress value={fileStat.percentage} className={cn(
                                                        fileStat.percentage >= 80 ? '[&>div]:bg-success' :
                                                            fileStat.percentage >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                                                    )} />
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Unmatched Preview */}
                                {unmatchedPath && stats && stats.unmatchedMasterRows > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                                    Unmatched Rows ({stats.unmatchedMasterRows})
                                                </CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setShowUnmatchedPreview(!showUnmatchedPreview)}>
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        {showUnmatchedPreview ? 'Hide' : 'Preview'}
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={handleOpenUnmatched}>
                                                        <Download className="w-4 h-4 mr-1" />
                                                        Open File
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={handleShowInFolder}>
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        {showUnmatchedPreview && unmatchedPreview && (
                                            <CardContent>
                                                <div className="border rounded-lg overflow-hidden">
                                                    <div className="max-h-64 overflow-auto">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-secondary sticky top-0">
                                                                <tr>
                                                                    {unmatchedPreview[0]?.map((header: any, idx: number) => (
                                                                        <th key={idx} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b">
                                                                            {String(header || `Col ${idx + 1}`)}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {unmatchedPreview.slice(1).map((row, rIdx) => (
                                                                    <tr key={rIdx} className="border-b last:border-0 hover:bg-secondary/50">
                                                                        {row.map((cell: any, cIdx: number) => (
                                                                            <td key={cIdx} className="px-2 py-1.5 font-mono truncate max-w-32">
                                                                                {cell !== undefined && cell !== null ? String(cell) : ''}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {unmatchedPreview.length >= 50 && (
                                                        <div className="px-3 py-2 bg-secondary/50 text-xs text-muted-foreground text-center">
                                                            Showing first 50 rows. Open file for complete data.
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                )}

                                <div className="flex justify-center">
                                    <Button size="lg" variant="outline" onClick={reset}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        New Match
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
