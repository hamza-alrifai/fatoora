import { useEffect } from 'react';
import type { Customer } from '../../types.d';
import type { FileConfig } from './useFileSelection'; // Assuming FileConfig is exported or shared
import { detectColumns } from '@/utils/column-detection';
import { guessCustomer } from '@/utils/customer-matching';

export function useAutoDetection(params: {
    masterConfig: FileConfig | null;
    targetConfigs: FileConfig[];
    customers: Customer[];
    setMasterConfig: React.Dispatch<React.SetStateAction<FileConfig | null>>;
    setTargetConfigs: React.Dispatch<React.SetStateAction<FileConfig[]>>;
}) {
    const { masterConfig, targetConfigs, customers, setMasterConfig, setTargetConfigs } = params;

    useEffect(() => {
        // Master Config Auto-detection
        if (masterConfig && masterConfig.headers && (masterConfig.overrideIdColumn === undefined || masterConfig.overrideResultColumn === undefined)) {
            // Use backend-detected ID column index if available, otherwise try frontend heuristic
            let suggestedIdIndex = masterConfig.idColumn?.index;
            if (suggestedIdIndex === undefined) {
                const detected = detectColumns(masterConfig.headers);
                suggestedIdIndex = detected.idColumn;
            }

            setMasterConfig(prev => {
                if (!prev) return null;
                // Only update if changes are needed to avoid infinite loops if referential identity changes
                // But simplified here: reliance on dependency array
                if (prev.overrideIdColumn === suggestedIdIndex && prev.overrideResultColumn === -1) {
                    return prev;
                }

                return {
                    ...prev,
                    overrideIdColumn: prev.overrideIdColumn ?? suggestedIdIndex,
                    overrideResultColumn: prev.overrideResultColumn ?? -1
                };
            });
        }

        // Target Config Auto-detection (Columns + Customer Name)
        if (targetConfigs.length > 0) {
            setTargetConfigs(prev => {
                let anyChanges = false;
                const newConfigs = prev.map(config => {
                    const updates: Partial<FileConfig> = {};
                    let hasUpdates = false;

                    // 1. Auto-detect ID Column
                    if (config.headers && config.overrideIdColumn === undefined) {
                        let suggestedIdIndex = config.idColumn?.index;
                        if (suggestedIdIndex === undefined) {
                            const detected = detectColumns(config.headers);
                            suggestedIdIndex = detected.idColumn;
                        }

                        if (suggestedIdIndex !== undefined) {
                            updates.overrideIdColumn = suggestedIdIndex;
                            hasUpdates = true;
                        }
                    }

                    // 2. Auto-detect Customer from Filename
                    if (!config.matchLabel && customers.length > 0) {
                        const guessedCustomer = guessCustomer(config.fileName || '', customers);
                        if (guessedCustomer) {
                            updates.matchLabel = guessedCustomer;
                            hasUpdates = true;
                        }
                    }

                    if (hasUpdates) {
                        anyChanges = true;
                        return { ...config, ...updates };
                    }
                    return config;
                });

                return anyChanges ? newConfigs : prev;
            });
        }
    }, [masterConfig?.headers, targetConfigs.length, customers, setMasterConfig, setTargetConfigs]);
    // Note: dependency on masterConfig.headers (ref comparison) might handle updates. 
    // targetConfigs.length is safe but if content changes without length change, might miss re-run.
    // Ideally we depend on a revision counter or hash, but length + manual trigger is often enough for "upload new file".
}
