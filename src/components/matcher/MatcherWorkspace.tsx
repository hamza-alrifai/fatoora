import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileAnalysis, Customer } from '../../types.d';
import { Loader2, RefreshCw, FileSpreadsheet } from 'lucide-react';

import { useMatcherState, type FileGenConfig } from '@/hooks/useMatcherState';
import { parseQuantitySafe } from '@/utils/quantity-parser';
import { ColumnMapper } from './ColumnMapper';
import type { CustomerData } from '@/components/customers/CustomerCreationDialog';

const MatcherConfigureView = lazy(() => import('./MatcherConfigureView'));
const MatcherResultsView = lazy(() => import('./MatcherResultsView'));
const InvoiceGenerationDialog = lazy(() => import('./InvoiceGenerationDialog'));
const CustomerCreationDialog = lazy(() => import('@/components/customers/CustomerCreationDialog'));

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
    // Use custom hook for state management with persistence
    const matcherState = useMatcherState(onStepChange);
    const {
        masterConfig,
        setMasterConfig,
        targetConfigs,
        setTargetConfigs,
        outputFilePath,
        setOutputFilePath,
        noMatchLabel,
        setNoMatchLabel,
        stats,
        setStats,
        perFileStats,
        setPerFileStats,
        fileGenConfigs,
        setFileGenConfigs,
        outputFileHeaders,
        setOutputFileHeaders,
        outputFileData,
        setOutputFileData,
        executiveSummary,
        setExecutiveSummary,
        groupTotals,
        setGroupTotals,
        uniqueMatchValues,
        setUniqueMatchValues,
        isHydrated,
        reset,
    } = matcherState;

    // UX State (not persisted)
    const [mapperOpen, setMapperOpen] = useState(false);
    const [mappingTarget, setMappingTarget] = useState<{ type: 'master' | 'target', index: number } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);
    const [_matchedRows, setMatchedRows] = useState<Array<{ sourceFile: string; data: any[]; rowNumber: number; }>>([]); // eslint-disable-line @typescript-eslint/no-unused-vars;
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);

    // Customer Selection State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

    // Customer creation state (not persisted)
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [creatingCustomerForTargetIndex, setCreatingCustomerForTargetIndex] = useState<number | null>(null);

    // Projections for UI (Customer based)
    const [customerProjections, setCustomerProjections] = useState<Record<string, { t10: number, t20: number }>>({});

    // Derived config for summary (shared with Invoice Generation Global Settings)
    const summaryConfig = useMemo(() => fileGenConfigs['output'] || {
        customerId: null,
        descriptionColIdx: -1,
        quantityColIdx: -1,
        resultColIdx: -1
    }, [fileGenConfigs]);

    const handleGenerateSummary = useCallback(async () => {
        if (!summaryConfig.resultColIdx || summaryConfig.resultColIdx === -1) {
            toast.error("Please select a customer column");
            return;
        }

        try {
            const { generateExecutiveSummary } = await import('@/utils/executive-summary-utils');
            const summaryRows = generateExecutiveSummary({
                outputFileHeaders,
                outputFileData,
                summaryConfig,
                fileGenConfigs,
                noMatchLabel,
                customers
            });

            setExecutiveSummary(summaryRows);
            
            // Automatically export to Excel after generating
            const { exportExecutiveSummaryToExcel } = await import('@/utils/executive-summary-export');
            await exportExecutiveSummaryToExcel(summaryRows);
            toast.success("Executive Summary downloaded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate summary");
        }
    }, [summaryConfig, outputFileHeaders, outputFileData, noMatchLabel, fileGenConfigs, customers]);

    const handleExportSummary = async () => {
        if (!executiveSummary) return;

        try {
            const { exportExecutiveSummaryToExcel } = await import('@/utils/executive-summary-export');
            await exportExecutiveSummaryToExcel(executiveSummary);
            toast.success("Executive Summary downloaded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to export summary");
        }
    };
    // Note: State persistence is now handled by useMatcherState hook

    // Load customers on mount
    useEffect(() => {
        loadCustomers();
    }, []);

    // Calculate customer projections whenever configs or group totals change
    useEffect(() => {
        const proj: Record<string, { t10: number, t20: number }> = {};

        // Initialize for all customers
        customers.forEach(c => {
            proj[c.id] = { t10: c.total10mm || 0, t20: c.total20mm || 0 };
        });

        // Add current group totals based on assignments
        Object.entries(fileGenConfigs).forEach(([groupName, config]) => {
            if (config.customerId && groupTotals[groupName]) {
                const cid = config.customerId;
                if (!proj[cid]) proj[cid] = { t10: 0, t20: 0 };

                proj[cid].t10 += groupTotals[groupName].t10;
                proj[cid].t20 += groupTotals[groupName].t20;
            }
        });
        setCustomerProjections(proj);

    }, [fileGenConfigs, groupTotals, customers]);

    // Live Recalculation of Groups/Totals when Target Column changes
    useEffect(() => {
        const resultColIdx = fileGenConfigs['output']?.resultColIdx;

        if (resultColIdx !== undefined && resultColIdx !== -1 && outputFileData.length > 0) {
            // Find Qty Column index
            const outputHeadersLower = outputFileHeaders.map(h => h.name.toLowerCase());
            let qIdx = fileGenConfigs['output']?.quantityColIdx ?? -1;

            // Auto-guess if not set
            if (qIdx === -1) {
                qIdx = outputHeadersLower.findIndex(h => h.includes('net') && h.includes('weight'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('weight'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('qty'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('quantity'));
            }

            const totals: Record<string, { total: number, t10: number, t20: number }> = {};
            const unique = new Set<string>();
            const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';

            const dataRows = outputFileData.slice(1);

            dataRows.forEach(row => {
                const val = (row[resultColIdx] !== undefined && row[resultColIdx] !== null) ? String(row[resultColIdx]).trim() : '';
                // Filter out empty, "not matched", and THE HEADER ITSELF
                if (val &&
                    val.toLowerCase() !== 'not matched' &&
                    val !== noMatchLabel &&
                    val !== headerName) {
                    unique.add(val);

                    // Totals Calculation
                    let quantity = 0;
                    if (qIdx !== -1 && qIdx < row.length) {
                        quantity = parseQuantitySafe(row[qIdx]);
                    }

                    const fullRow = row.join(' ').toLowerCase();
                    let is20 = fullRow.includes('20mm');
                    let is10 = fullRow.includes('10mm');

                    if (!totals[val]) totals[val] = { total: 0, t10: 0, t20: 0 };
                    totals[val].total += quantity;
                    if (is10) totals[val].t10 += quantity;
                    if (is20) totals[val].t20 += quantity;
                }
            });

            setGroupTotals(totals);
            const sorted = Array.from(unique).sort();
            setUniqueMatchValues(sorted);
        }
    }, [fileGenConfigs['output']?.resultColIdx, outputFileData, outputFileHeaders]);

    // ... (analyzeFile, handleSelectMaster, etc. - keep as is)

    // Run matching
    const analyzeFile = async (filePath: string): Promise<FileConfig | null> => {
        const result = await window.electron.analyzeExcelFile(filePath);
        if (!result.success) {
            toast.error(`Failed to analyze: ${result.error}`);
            return null;
        }

        // Fetch Preview for Mapping
        const previewRes = await window.electron.readExcelPreview(filePath);

        return {
            ...result,
            ...result,
            // matchLabel: result.suggestedMatchLabel, // DISABLE GUESSING
            matchLabel: undefined,
            preview: previewRes.success ? previewRes.data : undefined
        } as FileConfig;
    };


    const handleConfirmMapping = (idCol: number, resultCol?: number, matchLabel?: string) => {
        if (!mappingTarget) return;

        if (mappingTarget.type === 'master') {
            setMasterConfig(prev => prev ? ({
                ...prev,
                overrideIdColumn: idCol,
                overrideResultColumn: resultCol
            }) : null);
        } else {
            // Handle new customer creation from dialog if needed
            if (matchLabel === '___NEW___') {
                setCreatingCustomerForTargetIndex(mappingTarget.index);
                setIsCreatingCustomer(true);
                setIsCustomerDialogOpen(true);
                setMapperOpen(false);
                setMappingTarget(null);
                return;
            }

            setTargetConfigs(prev => prev.map((c, i) =>
                i === mappingTarget.index ? ({
                    ...c,
                    overrideIdColumn: idCol,
                    matchLabel: matchLabel !== undefined ? matchLabel : c.matchLabel
                }) : c
            ));

            // Chain to next file if available
            const nextIndex = mappingTarget.index + 1;
            if (nextIndex < targetConfigs.length) {
                // Determine if we should pause slightly or just switch
                // React state batching handles the switch cleanly
                setMappingTarget({ type: 'target', index: nextIndex });
                // Dialog remains open
                return;
            }
        }

        setMapperOpen(false);
        setMappingTarget(null);
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

            // Trigger Mapper
            if (config) {
                setMappingTarget({ type: 'master', index: 0 });
                setMapperOpen(true);
            }
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

            const startIndex = targetConfigs.length;
            setTargetConfigs(prev => [...prev, ...configs]);
            setIsAnalyzing(false);

            // Trigger Mapper for the FIRST new file
            if (configs.length > 0) {
                setMappingTarget({ type: 'target', index: startIndex });
                setMapperOpen(true);
            }
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

    const isReady =
        (masterConfig?.overrideIdColumn !== undefined && masterConfig?.overrideIdColumn !== -1) && // Must be explicitly set and valid
        (masterConfig?.overrideResultColumn !== undefined && masterConfig?.overrideResultColumn !== -1) && // Must be explicitly set and valid
        targetConfigs.length > 0 &&
        targetConfigs.every(t => t.overrideIdColumn !== undefined && t.overrideIdColumn !== -1 && !!t.matchLabel); // Must have valid ID col AND match label

    const handleProcess = async () => {
        if (!masterConfig?.filePath || !isReady) return;

        const defaultName = masterConfig.fileName?.replace('.xlsx', '_updated.xlsx') || 'updated.xlsx';
        const saveResult = await window.electron.saveFileDialog(defaultName);
        if (saveResult.canceled || !saveResult.filePath) return;

        setIsProcessing(true);

        const res = await window.electron.processExcelFiles({
            masterPath: masterConfig.filePath,
            targetPaths: targetConfigs.map(t => t.filePath!),
            masterColIndices: [masterConfig.overrideIdColumn!],
            masterResultColIndex: masterConfig.overrideResultColumn!,
            targetMatchColIndices: Object.fromEntries(
                targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn!]])
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

    const loadCustomers = useCallback(async () => {
        const res = await window.electron.getCustomers();
        if (res.success && res.customers) {
            setCustomers(res.customers);
        }
    }, []);

    const handleCreateCustomer = async (data: CustomerData) => {
        if (!data.name.trim()) {
            toast.error("Customer name is required");
            return;
        }

        const newCustomer: Customer = {
            id: '',
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            total20mm: 0,
            total10mm: 0,
            createdAt: '',
            updatedAt: ''
        };

        const result = await window.electron.saveCustomer(newCustomer);
        if (result.success && result.id) {
            toast.success("Customer created!");
            await loadCustomers();

            if (creatingCustomerForTargetIndex !== null) {
                updateTargetLabel(creatingCustomerForTargetIndex, newCustomer.name);
                setCreatingCustomerForTargetIndex(null);
            }

            setIsCustomerDialogOpen(false);
            setIsCreatingCustomer(false);
        } else {
            toast.error(result.error || "Failed to create customer");
        }
    };


    const handlePrepareGeneration = async () => {
        if (outputFileData.length === 0) {
            toast.error("No output file data available. Please run matching first.");
            return;
        }

        // Create config for OUTPUT file
        const outputHeaders = outputFileHeaders.map(h => h.name);
        // const outputGuessed = guessColumns(outputHeaders); 
        const lastColIdx = outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1;

        // Existing or default result column
        const resultColIdx = fileGenConfigs['output']?.resultColIdx ?? lastColIdx; // Use existing if set, else guess last

        const newConfigs: Record<string, FileGenConfig> = {
            // Output file config (for master file invoicing)
            'output': fileGenConfigs['output'] || {
                customerId: null,
                descriptionColIdx: -1, // Force manual selection
                quantityColIdx: -1,    // Force manual selection
                resultColIdx: -1       // Force manual selection
            }
        };

        // Also create configs for each TARGET file (original behavior)
        targetConfigs.forEach(tConfig => {
            const filePath = tConfig.filePath!;
            // const headers = tConfig.headers?.map(h => h.name) || [];
            // const guessed = guessColumns(headers); // Disabled guessing

            newConfigs[filePath] = fileGenConfigs[filePath] || {
                customerId: null,
                descriptionColIdx: -1, // Force manual selection
                quantityColIdx: -1     // Force manual selection
            };
        });

        // Calculate Group Totals
        const totals: Record<string, { total: number, t10: number, t20: number }> = {};

        // Find Qty Column index
        const outputHeadersLower = outputHeaders.map(h => h.toLowerCase());
        let qIdx = outputHeadersLower.findIndex(h => h.includes('net') && h.includes('weight'));
        if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('weight'));
        if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('qty'));

        if (resultColIdx !== -1 && outputFileData.length > 0) {
            const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';
            const unique = new Set<string>();
            const dataRows = outputFileData.slice(1);

            dataRows.forEach(row => {
                const val = String(row[resultColIdx] || '').trim();
                // Filter out empty, "not matched", and THE HEADER ITSELF
                if (val &&
                    val.toLowerCase() !== 'not matched' &&
                    val !== noMatchLabel &&
                    val !== headerName) {
                    unique.add(val);

                    // Totals Calculation
                    let quantity = 0;
                    if (qIdx !== -1 && qIdx < row.length) {
                        quantity = parseQuantitySafe(row[qIdx]);
                    }

                    const fullRow = row.join(' ').toLowerCase();
                    let is20 = fullRow.includes('20mm');
                    let is10 = fullRow.includes('10mm');

                    if (!totals[val]) totals[val] = { total: 0, t10: 0, t20: 0 };
                    totals[val].total += quantity;
                    if (is10) totals[val].t10 += quantity;
                    if (is20) totals[val].t20 += quantity;
                }
            });

            setGroupTotals(totals);

            const sorted = Array.from(unique).sort();
            setUniqueMatchValues(sorted);

            // Generate configs for these found groups
            const findBestMatchConfig = (groupName: string) => {
                const groupLower = groupName.toLowerCase();
                const target = targetConfigs.find(t => {
                    const fName = (t.fileName || '').toLowerCase();
                    const fPath = (t.filePath || '').toLowerCase();
                    return fName === groupLower ||
                        fName.includes(groupLower) ||
                        groupLower.includes(fName) ||
                        fPath.includes(groupLower);
                });
                if (target && target.filePath && fileGenConfigs[target.filePath]) { // Check against PREV state is tricky, use newConfigs if we just added it?
                    // Actually we want to check if we have any existing preferences. 
                    // Ideally we check newConfigs[target.filePath] which effectively copies old config if it existed.
                    if (target.filePath && newConfigs[target.filePath]) return newConfigs[target.filePath];
                }
                return null;
            };

            sorted.forEach(val => {
                // If we don't already have a config for this group...
                if (!fileGenConfigs[val]) { // checking prev state
                    const existing = findBestMatchConfig(val);
                    newConfigs[val] = {
                        customerId: existing?.customerId || null,
                        descriptionColIdx: -1, // Force manual
                        quantityColIdx: -1     // Force manual
                    };
                } else {
                    // Start with existing
                    newConfigs[val] = fileGenConfigs[val];
                }
            });

            if (sorted.length > 0) {
                // optional toast, maybe too noisy on open
                // toast.info(`Found ${sorted.length} unique groups.`);
            }
        }

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
        const outputConfig = fileGenConfigs['output'];
        if (!outputConfig) {
            toast.error("Output file configuration missing.");
            return;
        }

        const participatingGroups = uniqueMatchValues.filter(val => fileGenConfigs[val]?.customerId);
        if (participatingGroups.length === 0 && !outputConfig.customerId) {
            toast.error("Please assign a customer to at least one matched group.");
            return;
        }

        if (outputConfig.quantityColIdx === -1) {
            toast.warning("Quantity column not selected. Invoice quantities might be 0.");
        }

        setIsGeneratingInvoices(true);

        try {
            const { generateInvoicesFromReconciliation } = await import('@/utils/invoice-generation-utils');
            const result = await generateInvoicesFromReconciliation(
                {
                    outputFileHeaders,
                    outputFileData,
                    fileGenConfigs,
                    uniqueMatchValues,
                    noMatchLabel,
                    customers
                },
                window.electron.saveInvoice,
                window.electron.saveCustomer
            );

            const { successCount, failCount } = result;

            if (successCount > 0) {
                toast.success(`${successCount} invoice(s) generated successfully!`);
                loadCustomers();

                if (executiveSummary && executiveSummary.length > 0) {
                    try {
                        await handleExportSummary();
                    } catch (error) {
                        console.error('Failed to auto-download Executive Summary:', error);
                        toast.warning('Invoices generated, but Executive Summary download failed.');
                    }
                }
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

    // Reset function now provided by useMatcherState hook
    const handleReset = useCallback(() => {
        reset();
        setUnmatchedPath(null);
        setMatchedRows([]);
        onStepChange('configure');
    }, [reset, onStepChange]);





    // Don't render until state is hydrated from localStorage
    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Premium Header */}
                <header className="px-8 py-6 border-b border-border/50 bg-card/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <FileSpreadsheet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">
                                    {currentStep === 'configure' ? 'Reconciliation' : 'Reconciliation Complete'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {currentStep === 'configure' 
                                        ? 'Match and reconcile your Excel files' 
                                        : 'Review results and generate invoices'}
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleReset}
                            className="gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Start Over
                        </Button>
                    </div>
                </header>

                {/* Invoice Generation Configuration Wizard */}
                {(isCustomerDialogOpen && !isCreatingCustomer) && (
                    <Suspense fallback={null}>
                        <InvoiceGenerationDialog
                            isOpen={true}
                            onClose={() => setIsCustomerDialogOpen(false)}
                            fileGenConfigs={fileGenConfigs}
                            onUpdateConfig={updateFileConfig}
                            uniqueMatchValues={uniqueMatchValues}
                            customers={customers}
                            outputFileHeaders={outputFileHeaders}
                            outputFilePath={outputFilePath}
                            groupTotals={groupTotals}
                            customerProjections={customerProjections}
                            onCreateCustomer={() => setIsCreatingCustomer(true)}
                            onGenerate={handleConfirmGeneration}
                            onGenerateSummary={handleGenerateSummary}
                            isGenerating={isGeneratingInvoices}
                        />
                    </Suspense>
                )}

                {/* Create Customer Dialog */}
                {isCreatingCustomer && (
                    <Suspense fallback={null}>
                        <CustomerCreationDialog
                            isOpen={true}
                            onClose={() => setIsCreatingCustomer(false)}
                            onSave={handleCreateCustomer}
                        />
                    </Suspense>
                )}

                {/* Column Mapper */}
                {mappingTarget && (
                    <ColumnMapper
                        open={mapperOpen}
                        onOpenChange={setMapperOpen}
                        fileType={mappingTarget.type}
                        fileName={mappingTarget.type === 'master' ? masterConfig?.fileName || '' : targetConfigs[mappingTarget.index]?.fileName || ''}
                        headers={mappingTarget.type === 'master' ? masterConfig?.headers || [] : targetConfigs[mappingTarget.index]?.headers || []}
                        previewData={mappingTarget.type === 'master' ? masterConfig?.preview || [] : targetConfigs[mappingTarget.index]?.preview || []}
                        customers={customers}
                        initialIdCol={mappingTarget.type === 'master' ? (masterConfig?.overrideIdColumn ?? -1) : (targetConfigs[mappingTarget.index]?.overrideIdColumn ?? -1)}
                        initialResultCol={mappingTarget.type === 'master' ? (masterConfig?.overrideResultColumn ?? -1) : -1}
                        initialMatchLabel={mappingTarget.type === 'target' ? targetConfigs[mappingTarget.index]?.matchLabel : undefined}
                        onConfirm={handleConfirmMapping}
                    />
                )}

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {currentStep === 'configure' && (
                            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                                <MatcherConfigureView
                                    masterConfig={masterConfig}
                                    targetConfigs={targetConfigs}
                                    noMatchLabel={noMatchLabel}
                                    isAnalyzing={isAnalyzing}
                                    isProcessing={isProcessing}
                                    isReady={isReady}
                                    setNoMatchLabel={setNoMatchLabel}
                                    setMasterConfig={setMasterConfig}
                                    handleSelectMaster={handleSelectMaster}
                                    handleSelectTargets={handleSelectTargets}
                                    removeTarget={removeTarget}
                                    setMappingTarget={setMappingTarget}
                                    setMapperOpen={setMapperOpen}
                                    handleProcess={handleProcess}
                                />
                            </Suspense>
                        )}

                        {currentStep === 'done' && (
                            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                                <MatcherResultsView
                                    stats={stats}
                                    executiveSummary={executiveSummary}
                                    perFileStats={perFileStats}
                                    targetConfigs={targetConfigs}
                                    isGeneratingInvoices={isGeneratingInvoices}
                                    handlePrepareGeneration={handlePrepareGeneration}
                                    handleOpenUnmatched={handleOpenUnmatched}
                                />
                            </Suspense>
                        )}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}

