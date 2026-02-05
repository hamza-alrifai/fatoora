import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { parseQuantitySafe } from '@/utils/quantity-parser';
import type { MatcherFileConfig } from './matcher-types';

export function useMatcherProcessing(params: {
    masterConfig: MatcherFileConfig | null;
    targetConfigs: MatcherFileConfig[];
    noMatchLabel: string;
    onProcessed: (result: {
        stats?: any;
        perFileStats?: any;
        matchedRows?: any;
        unmatchedPath?: string;
        outputPath: string;
        outputHeaders: Array<{ name: string; index: number }>;
        outputData: any[][];
    }) => void;
}) {
    const { masterConfig, targetConfigs, noMatchLabel, onProcessed } = params;

    const [isProcessing, setIsProcessing] = useState(false);
    const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);

    const process = useCallback(async () => {
        if (!masterConfig?.filePath) return;

        const defaultName = masterConfig.fileName?.replace('.xlsx', '_updated.xlsx') || 'updated.xlsx';
        const saveResult = await window.electron.saveFileDialog(defaultName);
        if (saveResult.canceled || !saveResult.filePath) return;

        setIsProcessing(true);

        const res = await window.electron.processExcelFiles({
            masterPath: masterConfig.filePath,
            targetPaths: targetConfigs.map(t => t.filePath!),
            masterColIndices: [masterConfig.overrideIdColumn!],
            masterResultColIndex: masterConfig.overrideResultColumn!,
            targetMatchColIndices: Object.fromEntries(targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn!]])),
            targetMatchStrings: Object.fromEntries(targetConfigs.map(t => [t.filePath!, t.matchLabel || 'Matched'])),
            matchSentence: '',
            noMatchSentence: noMatchLabel,
            outputPath: saveResult.filePath,
            masterRowRange: masterConfig.suggestedRowRange,
            targetRowRanges: Object.fromEntries(targetConfigs.filter(t => t.suggestedRowRange).map(t => [t.filePath!, t.suggestedRowRange!])),
        });

        setIsProcessing(false);

        if (!res.success) {
            toast.error(res.error || 'Processing failed');
            return;
        }

        if (res.unmatchedPath) setUnmatchedPath(res.unmatchedPath);

        const outputAnalysis = await window.electron.analyzeExcelFile(saveResult.filePath);
        const outputPreview = await window.electron.readExcelPreview(saveResult.filePath);

        const outputHeaders = outputAnalysis.success && outputAnalysis.headers ? outputAnalysis.headers : [];
        const outputData = outputPreview.success && outputPreview.data ? outputPreview.data : [];

        onProcessed({
            stats: res.stats,
            perFileStats: res.perFileStats,
            matchedRows: res.matchedRows,
            unmatchedPath: res.unmatchedPath,
            outputPath: saveResult.filePath,
            outputHeaders,
            outputData,
        });

        toast.success('Files processed successfully');
    }, [masterConfig, noMatchLabel, onProcessed, targetConfigs]);

    const openUnmatched = useCallback(() => {
        if (unmatchedPath) {
            window.electron.openFile(unmatchedPath);
        }
    }, [unmatchedPath]);

    const recalcGroupTotals = useCallback((params: {
        outputFileHeaders: Array<{ name: string; index: number }>;
        outputFileData: any[][];
        resultColIdx: number;
        quantityColIdx: number;
    }) => {
        const { outputFileHeaders, outputFileData, resultColIdx, quantityColIdx } = params;

        if (resultColIdx === -1 || outputFileData.length === 0) {
            return { totals: {}, uniqueValues: [] };
        }

        const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';

        const totals: Record<string, { total: number; t10: number; t20: number }> = {};
        const unique = new Set<string>();

        outputFileData.slice(1).forEach(row => {
            const val = String(row[resultColIdx] || '').trim();
            if (!val || val.toLowerCase() === 'not matched' || val === headerName) return;

            unique.add(val);

            const quantity = quantityColIdx !== -1 && quantityColIdx < row.length ? parseQuantitySafe(row[quantityColIdx]) : 0;
            const fullRow = row.join(' ').toLowerCase();
            const is20 = fullRow.includes('20mm');
            const is10 = fullRow.includes('10mm');

            if (!totals[val]) totals[val] = { total: 0, t10: 0, t20: 0 };
            totals[val].total += quantity;
            if (is10) totals[val].t10 += quantity;
            if (is20) totals[val].t20 += quantity;
        });

        return { totals, uniqueValues: Array.from(unique).sort() };
    }, []);

    return {
        isProcessing,
        unmatchedPath,
        process,
        openUnmatched,
        recalcGroupTotals,
    };
}
