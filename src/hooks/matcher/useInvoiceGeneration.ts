import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Customer } from "../../types";

export function useInvoiceGeneration() {
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);

    // This hook mainly wraps the logic to call the utility, managing the loading state
    const generateInvoices = useCallback(async (params: {
        reconciliationResult: any;
        customers: Customer[];
        onSuccess: () => void;
    }) => {
        const { reconciliationResult, onSuccess } = params;

        const participatingGroups = Object.keys(reconciliationResult.groupStats);
        if (participatingGroups.length === 0) {
            toast.error('No groups found to generate invoices for.');
            return;
        }

        setIsGeneratingInvoices(true);

        try {
            const { generateInvoicesFromReconciliation } = await import('@/utils/invoice-generation-utils');
            const result = await generateInvoicesFromReconciliation(
                {
                    reconciliationResult,
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
