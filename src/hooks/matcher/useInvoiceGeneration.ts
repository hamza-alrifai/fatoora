import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Customer } from '../../types.d';
import type { FileGenConfig } from '@/hooks/useMatcherState';

export function useInvoiceGeneration() {
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);

    // This hook mainly wraps the logic to call the utility, managing the loading state
    const generateInvoices = useCallback(async (params: {
        outputFileHeaders: any[];
        outputFileData: any[];
        fileGenConfigs: Record<string, FileGenConfig>;
        reconciliationResult: any;
        noMatchLabel: string;
        customers: Customer[];
        onSuccess: () => void;
    }) => {
        const { outputFileHeaders, outputFileData, fileGenConfigs, reconciliationResult, noMatchLabel, customers, onSuccess } = params;

        const outputConfig = fileGenConfigs['output'];
        if (!outputConfig) {
            toast.error('Output file configuration missing.');
            return;
        }

        const participatingGroups = Object.keys(reconciliationResult.groupStats).filter(val => fileGenConfigs[val]?.customerId);
        if (participatingGroups.length === 0 && !outputConfig.customerId) {
            toast.error('Please assign a customer to at least one matched group.');
            return;
        }

        if (outputConfig.quantityColIdx === -1) {
            toast.warning('Quantity column not selected. Invoice quantities might be 0.');
        }

        setIsGeneratingInvoices(true);

        try {
            const { generateInvoicesFromReconciliation } = await import('@/utils/invoice-generation-utils');
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

            const { successCount, failCount } = result;

            if (successCount > 0) {
                toast.success(`${successCount} invoice(s) generated successfully!`);
                onSuccess();
            } else if (failCount > 0) {
                toast.error('Failed to generate invoices.');
            } else {
                toast.info('No matching rows found for the selected customers.');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred during generation.');
        } finally {
            setIsGeneratingInvoices(false);
        }
    }, []);

    return {
        isGeneratingInvoices,
        generateInvoices,
    };
}
