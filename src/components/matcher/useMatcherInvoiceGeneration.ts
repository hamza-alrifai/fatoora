import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Customer } from '../../types.d';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import type { ReconciliationResult } from '@/utils/reconciliation-engine';

export function useMatcherInvoiceGeneration(params: {
    outputFileHeaders: Array<{ name: string; index: number }>;
    outputFileData: any[][];
    fileGenConfigs: Record<string, FileGenConfig>;
    setFileGenConfigs: (configs: Record<string, FileGenConfig>) => void;
    reconciliationResult: ReconciliationResult | null;
    noMatchLabel: string;
    customers: Customer[];
    onInvoicesGenerated: () => void;
    executiveSummaryReady: boolean;
    onAutoExportSummary: () => Promise<void>;
    targetConfigs: Array<{ filePath?: string | null; fileName?: string | null }>;
}) {
    const {
        outputFileHeaders,
        outputFileData,
        fileGenConfigs,
        setFileGenConfigs,
        reconciliationResult,
        noMatchLabel,
        customers,
        onInvoicesGenerated,
        executiveSummaryReady,
        onAutoExportSummary,
        targetConfigs,
    } = params;

    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);

    const prepareGeneration = useCallback(async () => {
        if (!reconciliationResult) {
            toast.error('No matching results available.');
            return;
        }

        const groups = Object.keys(reconciliationResult.groupStats);
        const newConfigs: Record<string, FileGenConfig> = {
            output: fileGenConfigs['output'] || {
                customerId: null,
                descriptionColIdx: -1,
                quantityColIdx: -1,
                resultColIdx: -1,
            },
        };

        targetConfigs.forEach(t => {
            if (!t.filePath) return;
            newConfigs[t.filePath] = fileGenConfigs[t.filePath] || {
                customerId: null,
                descriptionColIdx: -1,
                quantityColIdx: -1,
            };
        });

        const findBestMatchConfig = (groupName: string) => {
            const groupLower = groupName.toLowerCase();
            const target = targetConfigs.find(t => {
                const fName = (t.fileName || '').toLowerCase();
                const fPath = (t.filePath || '').toLowerCase();
                return fName === groupLower || fName.includes(groupLower) || groupLower.includes(fName) || fPath.includes(groupLower);
            });

            if (target?.filePath && newConfigs[target.filePath]) return newConfigs[target.filePath];
            return null;
        };

        groups.forEach(groupName => {
            if (!fileGenConfigs[groupName]) {
                const existing = findBestMatchConfig(groupName);
                newConfigs[groupName] = {
                    customerId: existing?.customerId || null,
                    descriptionColIdx: -1,
                    quantityColIdx: -1,
                };
            } else {
                newConfigs[groupName] = fileGenConfigs[groupName];
            }
        });

        setFileGenConfigs(newConfigs);
        setIsCustomerDialogOpen(true);
    }, [fileGenConfigs, reconciliationResult, setFileGenConfigs, targetConfigs]);

    const updateFileConfig = useCallback(
        (filePath: string, updates: Partial<FileGenConfig>) => {
            setFileGenConfigs({
                ...fileGenConfigs,
                [filePath]: { ...fileGenConfigs[filePath], ...updates },
            });
        },
        [fileGenConfigs, setFileGenConfigs]
    );

    const confirmGeneration = useCallback(async () => {
        const outputConfig = fileGenConfigs['output'];
        if (!outputConfig) {
            toast.error('Output file configuration missing.');
            return;
        }

        if (!reconciliationResult) return;
        const participatingGroups = Object.keys(reconciliationResult.groupStats).filter(val => fileGenConfigs[val]?.customerId);
        if (participatingGroups.length === 0 && !outputConfig.customerId) {
            toast.error('Assign a customer to at least one matched group.');
            return;
        }

        setIsCustomerDialogOpen(false);
        setIsGeneratingInvoices(true);

        try {
            const { generateInvoicesFromReconciliation } = await import('@/utils/invoice-generation-utils');
            if (!reconciliationResult) throw new Error("Reconciliation result missing");

            const result = await generateInvoicesFromReconciliation(
                {
                    outputFileHeaders,
                    outputFileData,
                    fileGenConfigs,
                    reconciliationResult,
                    matchValues: Object.keys(reconciliationResult.groupStats),
                    noMatchLabel,
                    customers,
                },
                window.electron.saveInvoice,
                window.electron.saveCustomer
            );

            if (result.successCount > 0) {
                toast.success(`${result.successCount} invoice(s) created as drafts`);
                onInvoicesGenerated();

                if (executiveSummaryReady) {
                    try {
                        await onAutoExportSummary();
                    } catch (error) {
                        console.error('Failed to auto-export Executive Summary', error);
                    }
                }
            } else if (result.failCount > 0) {
                toast.error('Failed to generate invoices.');
            } else {
                toast.info('No matching rows found for the selected customers.');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while generating invoices.');
        } finally {
            setIsGeneratingInvoices(false);
        }
    }, [customers, executiveSummaryReady, fileGenConfigs, onAutoExportSummary, onInvoicesGenerated, outputFileData, outputFileHeaders, reconciliationResult]);

    return {
        isCustomerDialogOpen,
        setIsCustomerDialogOpen,
        isGeneratingInvoices,
        prepareGeneration,
        updateFileConfig,
        confirmGeneration,
    };
}
