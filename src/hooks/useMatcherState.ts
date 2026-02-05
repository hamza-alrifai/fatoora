/**
 * Custom hook for managing Matcher workspace state with localStorage persistence
 * Extracted from MatcherWorkspace to reduce component complexity
 */

import { useState, useEffect } from 'react';
import type { FileAnalysis } from '../types.d';
import type { CustomerSummary } from '@/utils/executive-summary-utils';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

export type FileGenConfig = {
    customerId: string | null;
    descriptionColIdx: number;
    quantityColIdx: number;
    resultColIdx?: number;
};

interface MatcherState {
    masterConfig: FileConfig | null;
    targetConfigs: FileConfig[];
    outputFilePath: string | null;
    noMatchLabel: string;
    stats: {
        totalMasterRows: number;
        matchedMasterRows: number;
        unmatchedMasterRows: number;
        matchPercentage: number;
    } | null;
    perFileStats: Array<{
        fileName: string;
        filePath: string;
        total: number;
        matched: number;
        percentage: number;
    }> | null;
    fileGenConfigs: Record<string, FileGenConfig>;
    outputFileHeaders: { name: string; index: number }[];
    outputFileData: any[][];
    executiveSummary: CustomerSummary[] | null;
    groupTotals: Record<string, { total: number; t10: number; t20: number }>;
    uniqueMatchValues: string[];
}

const STORAGE_KEY = 'fatoora_matcher_state';

export function useMatcherState(onStepChange: (step: 'configure' | 'done') => void) {
    const [masterConfig, setMasterConfig] = useState<FileConfig | null>(null);
    const [targetConfigs, setTargetConfigs] = useState<FileConfig[]>([]);
    const [outputFilePath, setOutputFilePath] = useState<string | null>(null);
    const [noMatchLabel, setNoMatchLabel] = useState('Not Matched');
    const [stats, setStats] = useState<MatcherState['stats']>(null);
    const [perFileStats, setPerFileStats] = useState<MatcherState['perFileStats']>(null);
    const [fileGenConfigs, setFileGenConfigs] = useState<Record<string, FileGenConfig>>({});
    const [outputFileHeaders, setOutputFileHeaders] = useState<{ name: string; index: number }[]>([]);
    const [outputFileData, setOutputFileData] = useState<any[][]>([]);
    const [executiveSummary, setExecutiveSummary] = useState<CustomerSummary[] | null>(null);
    const [groupTotals, setGroupTotals] = useState<Record<string, { total: number; t10: number; t20: number }>>({});
    const [uniqueMatchValues, setUniqueMatchValues] = useState<string[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);

                if (data.masterConfig) setMasterConfig(data.masterConfig);
                if (data.targetConfigs) setTargetConfigs(data.targetConfigs);
                if (data.outputFilePath) setOutputFilePath(data.outputFilePath);
                if (data.noMatchLabel) setNoMatchLabel(data.noMatchLabel);
                if (data.stats) setStats(data.stats);
                if (data.perFileStats) setPerFileStats(data.perFileStats);
                if (data.fileGenConfigs) setFileGenConfigs(data.fileGenConfigs);
                if (data.outputFileHeaders) setOutputFileHeaders(data.outputFileHeaders);
                if (data.outputFileData) setOutputFileData(data.outputFileData);
                if (data.executiveSummary) setExecutiveSummary(data.executiveSummary);
                if (data.groupTotals) setGroupTotals(data.groupTotals);
                if (data.uniqueMatchValues) setUniqueMatchValues(data.uniqueMatchValues);

                if (data.stats && data.stats.totalMasterRows > 0) {
                    onStepChange('done');
                }
            }
        } catch (e) {
            console.error("Failed to load matcher state", e);
        } finally {
            setIsHydrated(true);
        }
    }, [onStepChange]);

    // Save state to localStorage on changes
    useEffect(() => {
        if (!isHydrated) return;

        try {
            const safeOutputData = (outputFileData && outputFileData.length > 5000) ? [] : outputFileData;

            const stateToSave: Partial<MatcherState> = {
                masterConfig,
                targetConfigs,
                outputFilePath,
                noMatchLabel,
                stats,
                perFileStats,
                fileGenConfigs,
                outputFileHeaders,
                outputFileData: safeOutputData,
                executiveSummary,
                groupTotals,
                uniqueMatchValues
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save matcher state", e);
        }
    }, [
        isHydrated,
        masterConfig,
        targetConfigs,
        outputFilePath,
        noMatchLabel,
        stats,
        perFileStats,
        fileGenConfigs,
        outputFileHeaders,
        outputFileData,
        executiveSummary,
        groupTotals,
        uniqueMatchValues
    ]);

    const reset = () => {
        localStorage.removeItem(STORAGE_KEY);
        setMasterConfig(null);
        setTargetConfigs([]);
        setNoMatchLabel('Not Matched');
        setStats(null);
        setPerFileStats(null);
        setOutputFilePath(null);
        setOutputFileHeaders([]);
        setOutputFileData([]);
        setFileGenConfigs({});
        setExecutiveSummary(null);
        setGroupTotals({});
        setUniqueMatchValues([]);
    };

    return {
        masterConfig,
        setMasterConfig,
        targetConfigs,
        setTargetConfigs,
        outputFilePath,
        setOutputFilePath,
        noMatchLabel,
        setNoMatchLabel,
        stats,
        setStats,
        perFileStats,
        setPerFileStats,
        fileGenConfigs,
        setFileGenConfigs,
        outputFileHeaders,
        setOutputFileHeaders,
        outputFileData,
        setOutputFileData,
        executiveSummary,
        setExecutiveSummary,
        groupTotals,
        setGroupTotals,
        uniqueMatchValues,
        setUniqueMatchValues,
        isHydrated,
        reset,
    };
}
