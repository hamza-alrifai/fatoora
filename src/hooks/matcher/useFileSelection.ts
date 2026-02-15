import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { FileAnalysis } from '../../types.d';

export interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
    // Add other fields as needed
}

export function useFileSelection() {
    const [masterConfig, setMasterConfig] = useState<FileConfig | null>(null);
    const [targetConfigs, setTargetConfigs] = useState<FileConfig[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Mapping mapper state
    const [mapperOpen, setMapperOpen] = useState(false);
    const [mappingTarget, setMappingTarget] = useState<{ type: 'master' | 'target'; index: number } | null>(null);

    const analyzeFile = useCallback(async (filePath: string): Promise<FileConfig | null> => {
        const result = await window.electron.analyzeExcelFile(filePath);
        if (!result.success) {
            toast.error(`Failed to analyze: ${result.error}`);
            return null;
        }

        const previewRes = await window.electron.readExcelPreview(filePath);

        return {
            ...result,
            ...result, // Intentionally spreading twice? (from original code)
            matchLabel: undefined,
            preview: previewRes.success ? previewRes.data : undefined,
            // Initialize overrides
            overrideIdColumn: undefined,
            overrideResultColumn: undefined,
        } as FileConfig;
    }, []);

    const handleSelectMaster = useCallback(async () => {
        const res = await window.electron.openFileDialog({
            multiple: false,
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        });
        if (!res.canceled && res.filePaths.length > 0) {
            setIsAnalyzing(true);
            const config = await analyzeFile(res.filePaths[0]);
            setMasterConfig(config);
            setIsAnalyzing(false);

            if (config) {
                setMappingTarget({ type: 'master', index: 0 });
                setMapperOpen(true);
            }
        }
    }, [analyzeFile]);

    const handleSelectTargets = useCallback(async () => {
        const res = await window.electron.openFileDialog({
            multiple: true,
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        });
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
        masterConfig?.overrideResultColumn !== -1 &&
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
