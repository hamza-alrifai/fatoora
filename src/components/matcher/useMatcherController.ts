import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { CustomerData } from '@/components/customers/CustomerCreationDialog';
import { useMatcherState, type FileGenConfig } from '@/hooks/useMatcherState';
import { generateExecutiveSummaryExcel } from '@/utils/executive-summary-generator';
import { useCustomerManagement } from '@/hooks/matcher/useCustomerManagement';
import { useFileSelection } from '@/hooks/matcher/useFileSelection';
import { useProcessExecution } from '@/hooks/matcher/useProcessExecution';
import { useInvoiceGeneration } from '@/hooks/matcher/useInvoiceGeneration';
import { useReconciliation } from '@/hooks/matcher/useReconciliation';
import { useAutoDetection } from '@/hooks/matcher/useAutoDetection';

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
        outputFileHeaders,
        setOutputFileHeaders,
        outputFileData,
        setOutputFileData,
        reset,
        noMatchLabel,
        setOutputFilePath,
    } = matcherState;

    // --- Sub-hooks ---
    const customerMgmt = useCustomerManagement();
    const fileSelection = useFileSelection();
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

    const reconciliation = useReconciliation({
        outputFileHeaders,
        outputFileData,
        fileGenConfigs,
        noMatchLabel,
        customers: customerMgmt.customers,
        targetConfigs: fileSelection.targetConfigs,
        setFileGenConfigs
    });

    const { reconciliationResult } = reconciliation;

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
            onSuccess: () => {
                onStepChange('done');
            }
        });
    }, [fileSelection.isReady, fileSelection.masterConfig, fileSelection.targetConfigs, customerMgmt.customers, fileGenConfigs, noMatchLabel, processExec, setStats, setPerFileStats, onStepChange]);

    const handleGenerateSummary = useCallback(async () => {
        if (!reconciliationResult) return;
        try {
            await generateExecutiveSummaryExcel(reconciliationResult);
            toast.success('Executive Summary downloaded successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate summary');
        }
    }, [reconciliationResult]);

    // Update processExec state when files change (if needed) or sync specific effects if any
    // Note: The original code had side effects for auto-detecting output columns *after* processing.
    // We should ensure processExec.executeMatching updates matcherState.outputFileHeaders etc.
    // The hook `useProcessExecution` manages local state for headers/data.
    // We need to sync that back to `matcherState` or use `matcherState` in `useProcessExecution`.
    // For now, let's sync manually in an effect or pass setters to `executeMatching`.
    // I updated `executeMatching` to take setters or we use useEffect.
    // Actually, `useProcessExecution` has its own state. We should sync it up.

    if (processExec.outputFileHeaders.length > 0 && matcherState.outputFileHeaders.length === 0) {
        setOutputFileHeaders(processExec.outputFileHeaders);
    }
    if (processExec.outputFileData.length > 0 && matcherState.outputFileData.length === 0) {
        setOutputFileData(processExec.outputFileData);
    }
    // Sync output file path
    if (processExec.outputFilePath && !matcherState.outputFilePath) {
        setOutputFilePath(processExec.outputFilePath);
    }


    const handlePrepareGeneration = useCallback(async () => {
        if (!reconciliationResult) {
            toast.error('No matching results available.');
            return;
        }
        // Ensure customers are loaded
        await customerMgmt.loadCustomers();
        customerMgmt.setIsCustomerDialogOpen(true);
    }, [reconciliationResult, customerMgmt]);

    const handleConfirmGeneration = useCallback(async () => {
        await invoiceGen.generateInvoices({
            outputFileHeaders,
            outputFileData,
            fileGenConfigs,
            reconciliationResult,
            noMatchLabel,
            customers: customerMgmt.customers,
            onSuccess: () => {
                customerMgmt.loadCustomers();
                customerMgmt.setIsCustomerDialogOpen(false);
            }
        });
    }, [invoiceGen, outputFileHeaders, outputFileData, fileGenConfigs, reconciliationResult, noMatchLabel, customerMgmt]);

    const handleReset = useCallback(() => {
        reset();
        processExec.setUnmatchedPath(null);
        processExec.setMatchedRows([]);
        onStepChange('configure');
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
            customerProjections: reconciliation.customerProjections,
        },
        customers: customerMgmt.customers,
        summaryConfig,
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
            handleConfirmGeneration,
            handleOpenUnmatched: processExec.handleOpenUnmatched,
            handleReset,
            handleConfirmMapping: fileSelection.handleConfirmMapping,
        },
    };
}
