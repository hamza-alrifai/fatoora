import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Customer } from '../../types.d';
import type { FileConfig } from '@/hooks/matcher/useFileSelection';
import type { FileGenConfig } from '@/hooks/useMatcherState';

export function useProcessExecution() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);
    const [outputFilePath, setOutputFilePath] = useState<string | null>(null);
    const [matchedRows, setMatchedRows] = useState<Array<{ sourceFile: string; data: any[]; rowNumber: number }>>([]);
    const [outputFileHeaders, setOutputFileHeaders] = useState<any[]>([]);
    const [outputFileData, setOutputFileData] = useState<any[]>([]);

    const executeMatching = useCallback(async (params: {
        masterConfig: FileConfig;
        targetConfigs: FileConfig[];
        customers: Customer[];
        fileGenConfigs: Record<string, FileGenConfig>;
        noMatchLabel: string;
        onStatsUpdate: (stats: any, perFileStats: any) => void;
        onSuccess: () => void;
    }) => {
        const { masterConfig, targetConfigs, customers, fileGenConfigs, noMatchLabel, onStatsUpdate, onSuccess } = params;

        if (!masterConfig.filePath) return;

        // ask for FOLDER instead of file
        const result = await window.electron.openDirectoryDialog();
        if (result.canceled || result.filePaths.length === 0) return;

        const baseDir = result.filePaths[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const matchedDir = `${baseDir}/Matched Files`;
        const defaultName = masterConfig.fileName?.replace('.xlsx', '') || 'updated';
        const savePath = `${matchedDir}/${defaultName}_${timestamp}.xlsx`;

        setIsProcessing(true);

        try {
            const res = await window.electron.processExcelFiles({
                masterPath: masterConfig.filePath,
                targetPaths: targetConfigs.map(t => t.filePath!),
                masterColIndices: [masterConfig.overrideIdColumn!],
                masterResultColIndex: masterConfig.overrideResultColumn!,
                targetMatchColIndices: Object.fromEntries(targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn!]])),
                targetMatchStrings: Object.fromEntries(targetConfigs.map(t => {
                    const config = fileGenConfigs[t.filePath!];
                    let label = t.matchLabel || 'Matched';
                    if (config && config.customerId) {
                        const customer = customers.find(c => c.id === config.customerId);
                        if (customer) {
                            label = customer.name;
                        }
                    }
                    return [t.filePath!, label];
                })),
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

                // Analyze output file immediately
                const outputAnalysis = await window.electron.analyzeExcelFile(savePath);
                if (outputAnalysis.success && outputAnalysis.headers) {
                    setOutputFileHeaders(outputAnalysis.headers);
                }

                const outputPreview = await window.electron.readExcelPreview(savePath);
                if (outputPreview.success && outputPreview.data) {
                    setOutputFileData(outputPreview.data);
                }

                toast.success('Matching completed!');
                onSuccess();
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
        outputFileHeaders,
        outputFileData,
        executeMatching,
        handleOpenUnmatched
    };
}
