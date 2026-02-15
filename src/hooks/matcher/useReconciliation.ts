import { useMemo, useEffect, useState } from 'react';
import type { Customer } from '../../types.d';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import { calculateReconciliationStats } from '@/utils/reconciliation-engine';

export function useReconciliation(params: {
    outputFileHeaders: any[];
    outputFileData: any[];
    fileGenConfigs: Record<string, FileGenConfig>;
    noMatchLabel: string;
    customers: Customer[];
    targetConfigs: { fileName?: string; filePath?: string }[];
    setFileGenConfigs: React.Dispatch<React.SetStateAction<Record<string, FileGenConfig>>>;
}) {
    const { outputFileHeaders, outputFileData, fileGenConfigs, noMatchLabel, customers, targetConfigs, setFileGenConfigs } = params;

    const [customerProjections, setCustomerProjections] = useState<Record<string, { t10: number; t20: number }>>({});

    const reconciliationResult = useMemo(() => {
        return calculateReconciliationStats({
            outputFileHeaders,
            outputFileData,
            fileGenConfigs,
            noMatchLabel,
            customers
        });
    }, [outputFileHeaders, outputFileData, fileGenConfigs, noMatchLabel, customers]);

    // Calculate customer projections
    useEffect(() => {
        const proj: Record<string, { t10: number; t20: number }> = {};

        customers.forEach(c => {
            proj[c.id] = { t10: c.total10mm || 0, t20: c.total20mm || 0 };
        });

        // Add potential new totals from reconciliation
        if (reconciliationResult) {
            Object.values(reconciliationResult.customerStats).forEach(stat => {
                const cid = stat.customer.id;
                if (!proj[cid]) proj[cid] = { t10: 0, t20: 0 };
                // Logic depends on whether the stats are delta or absolute. Assuming delta-ish for this context or accumulative.
                // The original code added them, so we keep that behavior.
                proj[cid].t10 += stat.total10mm;
                proj[cid].t20 += stat.total20mm;
            });
        }

        setCustomerProjections(proj);
    }, [reconciliationResult, customers]);

    // Sync discovered groups to configs
    useEffect(() => {
        if (!reconciliationResult) return;

        const groups = Object.keys(reconciliationResult.groupStats);
        let hasUpdates = false;
        const newConfigs = { ...fileGenConfigs };

        const findBestMatchConfig = (groupName: string) => {
            // Helper to match group name (filename) to target config
            const target = targetConfigs.find(t => {
                const cleanName = (s: string) => s.toLowerCase().replace(/\.(xlsx|xls|csv)$/, '').trim();
                const fName = cleanName(t.fileName || '');
                const gName = cleanName(groupName);
                return fName === gName || fName.includes(gName) || gName.includes(fName);
            });
            if (target && target.filePath && fileGenConfigs[target.filePath]) {
                return fileGenConfigs[target.filePath];
            }
            return null;
        };

        const findCustomerByName = (groupName: string) => {
            const clean = (s: string) => s.toLowerCase().replace(/\.(xlsx|xls|csv)$/, '').trim();
            const gName = clean(groupName);

            return customers.find(c => {
                const cName = clean(c.name);
                return cName === gName || cName.includes(gName) || gName.includes(cName);
            });
        };

        groups.forEach(val => {
            if (!newConfigs[val]) {
                const existing = findBestMatchConfig(val);
                const matchedCustomer = findCustomerByName(val);

                newConfigs[val] = {
                    customerId: existing?.customerId || matchedCustomer?.id || null,
                    descriptionColIdx: -1,
                    quantityColIdx: -1
                };
                hasUpdates = true;
            } else if (!newConfigs[val].customerId) {
                // Try to auto-match if customerId is missing
                const matchedCustomer = findCustomerByName(val);
                if (matchedCustomer) {
                    newConfigs[val] = { ...newConfigs[val], customerId: matchedCustomer.id };
                    hasUpdates = true;
                }
            }
        });

        if (hasUpdates) {
            setFileGenConfigs(newConfigs);
        }
    }, [reconciliationResult, customers, targetConfigs, fileGenConfigs, setFileGenConfigs]);

    return {
        reconciliationResult,
        customerProjections
    };
}
