import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { CustomerData } from '@/components/customers/CustomerCreationDialog';
import { useMatcherState, type FileGenConfig } from '@/hooks/useMatcherState';
import { generateExecutiveSummaryExcel } from '@/utils/executive-summary-generator';
import { useCustomerManagement } from '@/hooks/matcher/useCustomerManagement';
import { useFileSelection } from '@/hooks/matcher/useFileSelection';
import { useProcessExecution } from '@/hooks/matcher/useProcessExecution';
import { useInvoiceGeneration } from '@/hooks/matcher/useInvoiceGeneration';
import { useAutoDetection } from '@/hooks/matcher/useAutoDetection';
import { buildReconciliationResult } from '@/utils/reconciliation-engine';

export function useMatcherController(params: {
    onStepChange: (step: 'configure' | 'upload' | 'done') => void;
}) {
    const { onStepChange } = params;
    const matcherState = useMatcherState(onStepChange);
    const {
        setStats,
        setPerFileStats,
        fileGenConfigs,
        setFileGenConfigs,
        reset,
        noMatchLabel,
        setOutputFilePath,
        reconciliationResult,
        setReconciliationResult,
    } = matcherState;

    // --- Sub-hooks ---
    const customerMgmt = useCustomerManagement();
    const fileSelection = useFileSelection({
        masterConfig: matcherState.masterConfig,
        setMasterConfig: matcherState.setMasterConfig,
        targetConfigs: matcherState.targetConfigs,
        setTargetConfigs: matcherState.setTargetConfigs
    });
    const processExec = useProcessExecution();
    const invoiceGen = useInvoiceGeneration();

    // Auto-detection logic (moved from View)
    useAutoDetection({
        masterConfig: fileSelection.masterConfig,
        targetConfigs: fileSelection.targetConfigs,
        customers: customerMgmt.customers,
        setMasterConfig: fileSelection.setMasterConfig,
        setTargetConfigs: fileSelection.setTargetConfigs
    });

    // Removed useReconciliation hook - calculations are now done in handleProcess directly

    // --- Derived State ---
    const summaryConfig = useMemo(
        () =>
            fileGenConfigs['output'] || {
                customerId: null,
                descriptionColIdx: -1,
                quantityColIdx: -1,
                resultColIdx: -1,
            },
        [fileGenConfigs]
    );

    // --- Actions ---

    const handleProcess = useCallback(async () => {
        if (!fileSelection.isReady || !fileSelection.masterConfig) return;

        await processExec.executeMatching({
            masterConfig: fileSelection.masterConfig!,
            targetConfigs: fileSelection.targetConfigs,
            customers: customerMgmt.customers,
            fileGenConfigs,
            noMatchLabel,
            onStatsUpdate: (stats, perFileStats) => {
                setStats(stats);
                setPerFileStats(perFileStats);
            },
            onSuccess: (targetMatchMap, masterResultColIndex, customerStats, unmatchedCount) => {
                const newConfigs = { ...fileGenConfigs };

                // Seed 'output' config with the exact result column written by the backend
                newConfigs['output'] = {
                    ...(newConfigs['output'] || { customerId: null }),
                    ...(masterResultColIndex >= 0 ? { resultColIdx: masterResultColIndex } : {}),
                };

                // Link each matched customer name to their customer ID
                Object.entries(targetMatchMap).forEach(([_, matchLabel]) => {
                    const customer = customerMgmt.customers.find(c => c?.name === matchLabel);
                    if (customer) {
                        newConfigs[matchLabel] = { ...(newConfigs[matchLabel] || {}), customerId: customer.id };
                    }
                });
                setFileGenConfigs(newConfigs);

                // Build reconciliation result immediately using backend stats
                const recResult = buildReconciliationResult({
                    backendStats: customerStats,
                    unmatchedCount: unmatchedCount,
                    fileGenConfigs: newConfigs,
                    customers: customerMgmt.customers,
                });
                setReconciliationResult(recResult);

                onStepChange('done');
            }
        });
    }, [fileSelection.isReady, fileSelection.masterConfig, fileSelection.targetConfigs, customerMgmt.customers, fileGenConfigs, noMatchLabel, processExec, setStats, setPerFileStats, onStepChange, setFileGenConfigs]);

    const handleGenerateSummary = useCallback(async () => {
        if (!reconciliationResult) return;
        try {
            await generateExecutiveSummaryExcel(reconciliationResult, 'Executive Summary.xlsx', customerMgmt.customers);
            toast.success('Executive Summary downloaded successfully!');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || 'Failed to generate summary');
        }
    }, [reconciliationResult]);

    // Sync output file path
    if (processExec.outputFilePath && !matcherState.outputFilePath) {
        setOutputFilePath(processExec.outputFilePath);
    }


    const handlePrepareGeneration = useCallback(async () => {
        if (!reconciliationResult) {
            toast.error('No matching results available.');
            return;
        }
        // Ensure customers are loaded then generate directly — no dialog
        await customerMgmt.loadCustomers();
        await invoiceGen.generateInvoices({
            reconciliationResult,
            customers: customerMgmt.customers,
            onSuccess: () => { customerMgmt.loadCustomers(); }
        });
    }, [reconciliationResult, customerMgmt, invoiceGen]);

    const handleReset = useCallback(() => {
        reset();
        processExec.setUnmatchedPath(null);
        processExec.setMatchedRows([]);
        onStepChange('upload');
    }, [reset, processExec, onStepChange]);

    // --- Return Combined Interface ---
    return {
        state: matcherState,
        ui: {
            // File Selection UI
            mapperOpen: fileSelection.mapperOpen,
            setMapperOpen: fileSelection.setMapperOpen,
            mappingTarget: fileSelection.mappingTarget,
            setMappingTarget: fileSelection.setMappingTarget,
            isAnalyzing: fileSelection.isAnalyzing,

            // Process UI
            isProcessing: processExec.isProcessing,
            unmatchedPath: processExec.unmatchedPath, // or from processExec
            isGeneratingInvoices: invoiceGen.isGeneratingInvoices,

            // Customer UI
            isCustomerDialogOpen: customerMgmt.isCustomerDialogOpen,
            setIsCustomerDialogOpen: customerMgmt.setIsCustomerDialogOpen,
            isCreatingCustomer: customerMgmt.isCreatingCustomer,
            setIsCreatingCustomer: customerMgmt.setIsCreatingCustomer,
        },
        customers: customerMgmt.customers,
        summaryConfig,
        masterConfig: fileSelection.masterConfig,
        targetConfigs: fileSelection.targetConfigs,
        isReady: fileSelection.isReady,
        reconciliationResult,
        actions: {
            handleGenerateSummary,
            handleExportSummary: handleGenerateSummary, // Alias
            handleSelectMaster: fileSelection.handleSelectMaster,
            handleSelectTargets: fileSelection.handleSelectTargets,
            removeTarget: fileSelection.removeTarget,
            updateTargetLabel: fileSelection.updateTargetLabel,
            handleProcess,
            handleCreateCustomer: (data: CustomerData) => customerMgmt.handleCreateCustomer(data),
            handlePrepareGeneration,
            updateFileConfig: (path: string, updates: Partial<FileGenConfig>) => setFileGenConfigs(prev => ({ ...prev, [path]: { ...prev[path], ...updates } })),
            handleOpenUnmatched: processExec.handleOpenUnmatched,
            handleReset,
            handleConfirmMapping: fileSelection.handleConfirmMapping,
        },
    };
}
