import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Customer } from '../../types.d';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import type { CustomerSummary } from '@/utils/executive-summary-utils';

export function useMatcherSummary(params: {
    outputFileHeaders: Array<{ name: string; index: number }>;
    outputFileData: any[][];
    summaryConfig: FileGenConfig;
    fileGenConfigs: Record<string, FileGenConfig>;
    noMatchLabel: string;
    customers: Customer[];
    executiveSummary: CustomerSummary[] | null;
    setExecutiveSummary: (rows: CustomerSummary[] | null) => void;
}) {
    const {
        outputFileHeaders,
        outputFileData,
        summaryConfig,
        fileGenConfigs,
        noMatchLabel,
        customers,
        executiveSummary,
        setExecutiveSummary,
    } = params;

    const generateSummary = useCallback(async () => {
        if (!summaryConfig.resultColIdx || summaryConfig.resultColIdx === -1) {
            toast.error('Select the customer/group column first.');
            return;
        }

        try {
            const { generateExecutiveSummary } = await import('@/utils/executive-summary-utils');
            const rows = generateExecutiveSummary({
                outputFileHeaders,
                outputFileData,
                summaryConfig,
                fileGenConfigs,
                noMatchLabel,
                customers,
            });

            setExecutiveSummary(rows);
            toast.success('Executive Summary generated');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate Executive Summary');
        }
    }, [customers, fileGenConfigs, noMatchLabel, outputFileData, outputFileHeaders, setExecutiveSummary, summaryConfig]);

    const exportSummary = useCallback(async () => {
        if (!executiveSummary || executiveSummary.length === 0) {
            toast.error('No Executive Summary to export');
            return;
        }

        try {
            const { exportExecutiveSummaryToExcel } = await import('@/utils/executive-summary-export');
            await exportExecutiveSummaryToExcel(executiveSummary);
            toast.success('Executive Summary downloaded');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export Executive Summary');
        }
    }, [executiveSummary]);

    return { generateSummary, exportSummary };
}
