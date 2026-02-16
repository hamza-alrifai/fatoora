import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { FileAnalysis } from "../../types";

export interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
    // Add other fields as needed
}

export interface UseFileSelectionProps {
    masterConfig: FileConfig | null;
    setMasterConfig: React.Dispatch<React.SetStateAction<FileConfig | null>>;
    targetConfigs: FileConfig[];
    setTargetConfigs: React.Dispatch<React.SetStateAction<FileConfig[]>>;
}

export function useFileSelection({
    masterConfig,
    setMasterConfig,
    targetConfigs,
    setTargetConfigs
}: UseFileSelectionProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Mapping mapper state
    const [mapperOpen, setMapperOpen] = useState(false);
    const [mappingTarget, setMappingTarget] = useState<{ type: 'master' | 'target'; index: number } | null>(null);

    const analyzeFile = useCallback(async (filePath: string): Promise<FileConfig | null> => {
        console.log(`Analyzing file: ${filePath}`);
        try {
            const result = await window.electron.analyzeExcelFile(filePath);
            console.log(`Analysis result for ${filePath}:`, result);

            if (!result.success) {
                console.error(`Analysis failed for ${filePath}:`, result.error);
                toast.error(`Failed to analyze: ${result.error}`);
                return null;
            }

            const previewRes = await window.electron.readExcelPreview(filePath);
            console.log(`Preview result for ${filePath}:`, previewRes);

            return {
                ...result,
                ...result, // Intentionally spreading twice? (from original code)
                matchLabel: undefined,
                preview: previewRes.success ? previewRes.data : undefined,
                // Initialize overrides
                overrideIdColumn: undefined,
                overrideResultColumn: undefined,
            } as FileConfig;
        } catch (error) {
            console.error(`Exception during analysis of ${filePath}:`, error);
            toast.error(`Error analyzing file: ${filePath}`);
            return null;
        }
    }, []);

    const handleSelectMaster = useCallback(async () => {
        console.log("Opening master file dialog...");
        try {
            const res = await window.electron.openFileDialog({
                multiple: false,
                filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
            });
            console.log("Master file dialog result:", res);

            if (!res.canceled && res.filePaths.length > 0) {
                setIsAnalyzing(true);
                const config = await analyzeFile(res.filePaths[0]);
                if (config) {
                    console.log("Master config created:", config);
                    setMasterConfig(config);
                    setMappingTarget({ type: 'master', index: 0 });
                    setMapperOpen(true);
                } else {
                    console.warn("Failed to create master config");
                }
                setIsAnalyzing(false);
            }
        } catch (error) {
            console.error("Error selecting master file:", error);
        }
    }, [analyzeFile]);

    const handleSelectTargets = useCallback(async () => {
        console.log("Opening target file dialog...");
        try {
            const res = await window.electron.openFileDialog({
                multiple: true,
                filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
            });
            console.log("Target file dialog result:", res);

            if (!res.canceled && res.filePaths.length > 0) {
                setIsAnalyzing(true);
                const configs: FileConfig[] = [];
                for (const filePath of res.filePaths) {
                    // Ensure duplicate files aren't added? Logic not present in original, kept simple
                    const config = await analyzeFile(filePath);
                    if (config) configs.push(config);
                }

                const startIndex = targetConfigs.length;
                setTargetConfigs(prev => [...prev, ...configs]); // Append new files
                setIsAnalyzing(false);

                if (configs.length > 0) {
                    // Trigger mapping for first new file
                    setMappingTarget({ type: 'target', index: startIndex });
                    setMapperOpen(true);
                }
            }
        } catch (error) {
            console.error("Error selecting target files:", error);
        }
    }, [analyzeFile, targetConfigs.length]); // Dependencies

    const removeTarget = useCallback((index: number) => {
        setTargetConfigs(prev => prev.filter((_, i) => i !== index));
    }, []);

    const updateTargetLabel = useCallback((index: number, label: string) => {
        setTargetConfigs(prev => prev.map((c, i) => (i === index ? { ...c, matchLabel: label } : c)));
    }, []);

    // Logic to confirm mapping from the dialog
    // Returns "shouldOpenCustomerDialog" boolean or triggers callback
    const handleConfirmMapping = useCallback(
        (idCol: number, resultCol?: number, matchLabel?: string, onNewCustomer?: (index: number) => void) => {
            if (!mappingTarget) return;

            if (mappingTarget.type === 'master') {
                setMasterConfig(prev =>
                    prev
                        ? {
                            ...prev,
                            overrideIdColumn: idCol,
                            overrideResultColumn: resultCol,
                        }
                        : null
                );
            } else {
                if (matchLabel === '___NEW___' && onNewCustomer) {
                    onNewCustomer(mappingTarget.index);
                    setMapperOpen(false);
                    setMappingTarget(null);
                    return;
                }

                setTargetConfigs(prev =>
                    prev.map((c, i) =>
                        i === mappingTarget.index
                            ? {
                                ...c,
                                overrideIdColumn: idCol,
                                matchLabel: matchLabel !== undefined ? matchLabel : c.matchLabel,
                            }
                            : c
                    )
                );

                const nextIndex = mappingTarget.index + 1;
                // If there are more targets, map the next one?
                // Note: logic in original code only auto-advanced if triggered by batch upload
                // Here we simply check if next index exists in current list
                if (nextIndex < targetConfigs.length) {
                    // Check if next target needs mapping (e.g. overrides not set)?
                    // Simplified: just open next
                    setMappingTarget({ type: 'target', index: nextIndex });
                    return;
                }
            }

            setMapperOpen(false);
            setMappingTarget(null);
        },
        [mappingTarget, targetConfigs.length]
    );

    const isReady =
        masterConfig?.overrideIdColumn !== undefined &&
        masterConfig?.overrideIdColumn !== -1 &&
        masterConfig?.overrideResultColumn !== undefined &&
        // masterConfig?.overrideResultColumn !== -1 && // Allow -1 for "Create New Column"
        targetConfigs.length > 0 &&
        targetConfigs.every(t => t.overrideIdColumn !== undefined && t.overrideIdColumn !== -1 && !!t.matchLabel);

    return {
        masterConfig,
        setMasterConfig,
        targetConfigs,
        setTargetConfigs,
        isAnalyzing,
        mapperOpen,
        setMapperOpen,
        mappingTarget,
        setMappingTarget,
        handleSelectMaster,
        handleSelectTargets,
        removeTarget,
        updateTargetLabel,
        handleConfirmMapping,
        isReady
    };
}
