import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Customer } from '../../types.d';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import { parseQuantitySafe } from '@/utils/quantity-parser';

export function useMatcherInvoiceGeneration(params: {
    outputFileHeaders: Array<{ name: string; index: number }>;
    outputFileData: any[][];
    fileGenConfigs: Record<string, FileGenConfig>;
    setFileGenConfigs: (configs: Record<string, FileGenConfig>) => void;
    uniqueMatchValues: string[];
    setUniqueMatchValues: (values: string[]) => void;
    setGroupTotals: (totals: Record<string, { total: number; t10: number; t20: number }>) => void;
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
        uniqueMatchValues,
        setUniqueMatchValues,
        setGroupTotals,
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
        if (outputFileData.length === 0) {
            toast.error('No output file data available. Run Process Files first.');
            return;
        }

        const outputHeaders = outputFileHeaders.map(h => h.name);
        const lastColIdx = outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1;
        const resultColIdx = fileGenConfigs['output']?.resultColIdx ?? lastColIdx;

        const newConfigs: Record<string, FileGenConfig> = {
            output:
                fileGenConfigs['output'] ||
                ({
                    customerId: null,
                    descriptionColIdx: -1,
                    quantityColIdx: -1,
                    resultColIdx: -1,
                } satisfies FileGenConfig),
        };

        targetConfigs.forEach(t => {
            if (!t.filePath) return;
            newConfigs[t.filePath] =
                fileGenConfigs[t.filePath] ||
                ({
                    customerId: null,
                    descriptionColIdx: -1,
                    quantityColIdx: -1,
                } satisfies FileGenConfig);
        });

        const totals: Record<string, { total: number; t10: number; t20: number }> = {};

        const outputHeadersLower = outputHeaders.map(h => h.toLowerCase());
        let qIdx = outputHeadersLower.findIndex(h => h.includes('net') && h.includes('weight'));
        if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('weight'));
        if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('qty'));

        if (resultColIdx !== -1 && outputFileData.length > 0) {
            const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';
            const unique = new Set<string>();

            outputFileData.slice(1).forEach(row => {
                const val = String(row[resultColIdx] || '').trim();
                if (!val || val.toLowerCase() === 'not matched' || val === noMatchLabel || val === headerName) return;

                unique.add(val);

                let quantity = 0;
                if (qIdx !== -1 && qIdx < row.length) {
                    quantity = parseQuantitySafe(row[qIdx]);
                }

                const fullRow = row.join(' ').toLowerCase();
                const is20 = fullRow.includes('20mm');
                const is10 = fullRow.includes('10mm');

                if (!totals[val]) totals[val] = { total: 0, t10: 0, t20: 0 };
                totals[val].total += quantity;
                if (is10) totals[val].t10 += quantity;
                if (is20) totals[val].t20 += quantity;
            });

            setGroupTotals(totals);

            const sorted = Array.from(unique).sort();
            setUniqueMatchValues(sorted);

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

            sorted.forEach(groupName => {
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
        }

        setFileGenConfigs(newConfigs);
        setIsCustomerDialogOpen(true);
    }, [fileGenConfigs, noMatchLabel, outputFileData, outputFileHeaders, setFileGenConfigs, setGroupTotals, setUniqueMatchValues, targetConfigs]);

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

        const participatingGroups = uniqueMatchValues.filter(val => fileGenConfigs[val]?.customerId);
        if (participatingGroups.length === 0 && !outputConfig.customerId) {
            toast.error('Assign a customer to at least one matched group.');
            return;
        }

        setIsCustomerDialogOpen(false);
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
    }, [customers, executiveSummaryReady, fileGenConfigs, noMatchLabel, onAutoExportSummary, onInvoicesGenerated, outputFileData, outputFileHeaders, uniqueMatchValues]);

    return {
        isCustomerDialogOpen,
        setIsCustomerDialogOpen,
        isGeneratingInvoices,
        prepareGeneration,
        updateFileConfig,
        confirmGeneration,
    };
}
