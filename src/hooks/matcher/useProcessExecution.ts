import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Customer } from "../../types";
import type { FileConfig } from '@/hooks/matcher/useFileSelection';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import { detectColumns } from '@/utils/column-detection';

export function useProcessExecution() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);
    const [outputFilePath, setOutputFilePath] = useState<string | null>(null);
    const [matchedRows, setMatchedRows] = useState<Array<{ sourceFile: string; data: any[]; rowNumber: number }>>([]);

    const executeMatching = useCallback(async (params: {
        masterConfig: FileConfig;
        targetConfigs: FileConfig[];
        customers: Customer[];
        fileGenConfigs: Record<string, FileGenConfig>;
        noMatchLabel: string;
        onStatsUpdate: (stats: any, perFileStats: any) => void;
        onSuccess: (targetMatchMap: Record<string, string>, masterResultColIndex: number, customerStats: Record<string, any>, unmatchedCount: number) => void;
    }) => {
        const { masterConfig, targetConfigs, customers, fileGenConfigs, noMatchLabel, onStatsUpdate, onSuccess } = params;

        if (!masterConfig.filePath) return;

        // ask for file save path instead of output directory
        const defaultName = 'output.xlsx';
        const saveResult = await window.electron.saveFileDialog(defaultName);

        if (saveResult.canceled || !saveResult.filePath) return;

        const savePath = saveResult.filePath;

        setIsProcessing(true);

        try {
            // First, validate all target files have a resolvable customer
            const targetMatchMap: Record<string, string> = {};

            for (const t of targetConfigs) {
                const config = fileGenConfigs[t.filePath!];
                let resolvedLabel = t.matchLabel || null;

                // STRICT VALIDATION: Even if local state says "Vessel", ensure it is a real registered customer.
                let validCustomer = null;

                if (resolvedLabel) {
                    validCustomer = customers.find(c => c?.name === resolvedLabel);
                }

                if (!validCustomer && config && config.customerId) {
                    validCustomer = customers.find(c => c?.id === config.customerId);
                }

                if (!validCustomer) {
                    console.error(`[Matcher Error] Could not identify a valid customer for file: ${t.fileName}. resolvedLabel: ${resolvedLabel}`);
                    toast.error(`Could not identify a valid mapped customer for "${t.fileName}". Please select a Matched Customer in the dropdown.`);
                    setIsProcessing(false);
                    return; // Abort processing
                }

                targetMatchMap[t.filePath!] = validCustomer?.name || 'Unknown';
            }

            const detected = detectColumns(masterConfig.headers || []);
            const masterQuantityColIndex = detected.quantityColumn ?? -1;
            const masterDescriptionColIndex = detected.descriptionColumn ?? -1;

            const res = await window.electron.processExcelFiles({
                masterPath: masterConfig.filePath,
                targetPaths: targetConfigs.map(t => t.filePath!),
                masterColIndices: [masterConfig.overrideIdColumn!],
                masterResultColIndex: masterConfig.overrideResultColumn!,
                masterQuantityColIndex,
                masterDescriptionColIndex,
                targetMatchColIndices: Object.fromEntries(targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn!]])),
                targetMatchStrings: targetMatchMap,
                matchSentence: '',
                noMatchSentence: noMatchLabel,
                outputPath: savePath,
                masterRowRange: masterConfig.suggestedRowRange,
                targetRowRanges: Object.fromEntries(targetConfigs.filter(t => t.suggestedRowRange).map(t => [t.filePath!, t.suggestedRowRange!])),
            });

            if (res.success) {
                onStatsUpdate(res.stats, res.perFileStats);
                if (res.matchedRows) setMatchedRows(res.matchedRows);
                if (res.unmatchedPath) setUnmatchedPath(res.unmatchedPath);

                setOutputFilePath(savePath);

                toast.success('Matching completed!');
                onSuccess(targetMatchMap, res.masterResultColIndex ?? -1, res.customerStats || {}, res.stats?.unmatchedMasterRows || 0);
            } else {
                toast.error(res.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Processing error:', error);
            toast.error('An unexpected error occurred during processing.');
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleOpenUnmatched = useCallback(() => {
        if (unmatchedPath) {
            window.electron.openFile(unmatchedPath);
        }
    }, [unmatchedPath]);

    return {
        isProcessing,
        unmatchedPath,
        setUnmatchedPath,
        outputFilePath,
        matchedRows,
        setMatchedRows,
        executeMatching,
        handleOpenUnmatched
    };
}
