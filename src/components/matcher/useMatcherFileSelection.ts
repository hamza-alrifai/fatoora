import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { MatcherFileConfig, MappingTarget } from './matcher-types';

export function useMatcherFileSelection(params: {
    masterConfig: MatcherFileConfig | null;
    setMasterConfig: (cfg: MatcherFileConfig | null) => void;
    targetConfigs: MatcherFileConfig[];
    setTargetConfigs: (updater: (prev: MatcherFileConfig[]) => MatcherFileConfig[]) => void;
    onRequestCreateCustomerForTarget: (targetIndex: number) => void;
}) {
    const {
        masterConfig,
        setMasterConfig,
        targetConfigs,
        setTargetConfigs,
        onRequestCreateCustomerForTarget,
    } = params;

    const [mapperOpen, setMapperOpen] = useState(false);
    const [mappingTarget, setMappingTarget] = useState<MappingTarget | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyzeFile = useCallback(async (filePath: string): Promise<MatcherFileConfig | null> => {
        const result = await window.electron.analyzeExcelFile(filePath);
        if (!result.success) {
            toast.error(`Failed to analyze: ${result.error}`);
            return null;
        }

        const previewRes = await window.electron.readExcelPreview(filePath);

        return {
            ...result,
            ...result,
            matchLabel: undefined,
            preview: previewRes.success ? previewRes.data : undefined,
        } as MatcherFileConfig;
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
    }, [analyzeFile, setMasterConfig]);

    const handleSelectTargets = useCallback(async () => {
        const res = await window.electron.openFileDialog({
            multiple: true,
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        });

        if (!res.canceled && res.filePaths.length > 0) {
            setIsAnalyzing(true);

            const configs: MatcherFileConfig[] = [];
            for (const filePath of res.filePaths) {
                const config = await analyzeFile(filePath);
                if (config) configs.push(config);
            }

            const startIndex = targetConfigs.length;
            setTargetConfigs(prev => [...prev, ...configs]);

            setIsAnalyzing(false);

            if (configs.length > 0) {
                setMappingTarget({ type: 'target', index: startIndex });
                setMapperOpen(true);
            }
        }
    }, [analyzeFile, setTargetConfigs, targetConfigs.length]);

    const removeTarget = useCallback(
        (index: number) => {
            setTargetConfigs(prev => prev.filter((_, i) => i !== index));
        },
        [setTargetConfigs]
    );

    const handleConfirmMapping = useCallback(
        (idCol: number, resultCol?: number, matchLabel?: string) => {
            if (!mappingTarget) return;

            if (mappingTarget.type === 'master') {
                setMasterConfig(
                    masterConfig
                        ? {
                              ...masterConfig,
                              overrideIdColumn: idCol,
                              overrideResultColumn: resultCol,
                          }
                        : null
                );
            } else {
                if (matchLabel === '___NEW___') {
                    onRequestCreateCustomerForTarget(mappingTarget.index);
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
                if (nextIndex < targetConfigs.length) {
                    setMappingTarget({ type: 'target', index: nextIndex });
                    return;
                }
            }

            setMapperOpen(false);
            setMappingTarget(null);
        },
        [mappingTarget, masterConfig, onRequestCreateCustomerForTarget, setMasterConfig, setTargetConfigs, targetConfigs.length]
    );

    const isReady =
        masterConfig?.overrideIdColumn !== undefined &&
        masterConfig?.overrideIdColumn !== -1 &&
        masterConfig?.overrideResultColumn !== undefined &&
        masterConfig?.overrideResultColumn !== -1 &&
        targetConfigs.length > 0 &&
        targetConfigs.every(t => t.overrideIdColumn !== undefined && t.overrideIdColumn !== -1 && !!t.matchLabel);

    return {
        mapperOpen,
        setMapperOpen,
        mappingTarget,
        setMappingTarget,
        isAnalyzing,
        handleSelectMaster,
        handleSelectTargets,
        removeTarget,
        handleConfirmMapping,
        isReady,
    };
}
