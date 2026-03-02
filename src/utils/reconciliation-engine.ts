import type { Customer } from '@/types';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import type { BackendCustomerStat } from '@/types/electron';

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    type: '10mm' | '20mm' | 'other';
}

export interface ReconciliationResult {
    // Data per customer (for Invoicing & 10mm/20mm stats)
    customerStats: Record<string, {
        customer: Customer;
        totalAmount: number;
        total10mm: number;
        total20mm: number;
        trips10mm: number;
        trips20mm: number;
        items: InvoiceItem[]; // Ready for invoice generation
    }>;

    // Data per matched group (for Matcher UI & Executive Summary)
    groupStats: Record<string, {
        groupName: string;
        assignedCustomer: Customer | null;
        totalQuantity: number;
        total10mm: number;
        total20mm: number;
        trips10mm: number;
        trips20mm: number;
        rows: any[]; // Deprecated - rows not returned from backend stats
    }>;

    // Unmatched data stats
    unmatchedStats: {
        count: number;
        rows: any[]; // Deprecated - rows not returned from backend stats
    };

    // Global stats
    totalQuantity: number;
    total10mm: number;
    total20mm: number;
}

export interface BuildParams {
    backendStats: Record<string, BackendCustomerStat>;
    unmatchedCount: number;
    fileGenConfigs: Record<string, FileGenConfig>;
    customers: Customer[];
}

export function buildReconciliationResult(params: BuildParams): ReconciliationResult {
    const { backendStats, unmatchedCount, fileGenConfigs, customers } = params;

    const result: ReconciliationResult = {
        customerStats: {},
        groupStats: {},
        unmatchedStats: { count: unmatchedCount, rows: [] },
        totalQuantity: 0,
        total10mm: 0,
        total20mm: 0
    };

    console.log('--- Building Reconciliation from Backend ---');
    console.log('Backend Stats keys:', Object.keys(backendStats));

    // Iterate over backend stats. Keys are match strings (group names)
    for (const [groupName, stat] of Object.entries(backendStats)) {
        // 1. Resolve Customer for this group
        let groupConfig = fileGenConfigs[groupName];
        if (!groupConfig) {
            // Try fuzzy match if exact name isn't there
            const foundKey = Object.keys(fileGenConfigs).find(key => {
                const cleanKey = key.toLowerCase().replace(/\.(xlsx|xls|csv)$/, '').trim();
                const cleanGroup = groupName.toLowerCase().replace(/\.(xlsx|xls|csv)$/, '').trim();
                return cleanKey.includes(cleanGroup) || cleanGroup.includes(cleanKey);
            });
            if (foundKey) groupConfig = fileGenConfigs[foundKey];
        }

        let assignedCustomer: Customer | null = null;
        if (groupConfig?.customerId) {
            assignedCustomer = customers.find(c => c.id === groupConfig.customerId) || null;
        }

        // 2. Build Group Stats
        result.groupStats[groupName] = {
            groupName,
            assignedCustomer,
            totalQuantity: stat.totalQuantity,
            total10mm: stat.total10mm,
            total20mm: stat.total20mm,
            trips10mm: stat.trips10mm,
            trips20mm: stat.trips20mm,
            rows: [] // Removed row tracking since backend accumulates values directly
        };

        // 3. Accumulate Global Stats
        result.totalQuantity = Math.round((result.totalQuantity + stat.totalQuantity) * 100) / 100;
        result.total10mm = Math.round((result.total10mm + stat.total10mm) * 100) / 100;
        result.total20mm = Math.round((result.total20mm + stat.total20mm) * 100) / 100;

        // 4. Build Customer Stats if assigned
        if (assignedCustomer) {
            const customerId = assignedCustomer.id;
            if (!result.customerStats[customerId]) {
                result.customerStats[customerId] = {
                    customer: assignedCustomer,
                    totalAmount: 0,
                    total10mm: 0,
                    total20mm: 0,
                    trips10mm: 0,
                    trips20mm: 0,
                    items: []
                };
            }

            const cStat = result.customerStats[customerId];
            cStat.total10mm = Math.round((cStat.total10mm + stat.total10mm) * 100) / 100;
            cStat.total20mm = Math.round((cStat.total20mm + stat.total20mm) * 100) / 100;
            cStat.trips10mm += stat.trips10mm;
            cStat.trips20mm += stat.trips20mm;

            // Merge items
            for (const item of stat.items) {
                const existingItem = cStat.items.find(i => i.description === item.description && i.type === item.type);
                if (existingItem) {
                    existingItem.quantity = Math.round((existingItem.quantity + item.quantity) * 100) / 100;
                } else {
                    cStat.items.push({
                        id: crypto.randomUUID(),
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: 0,
                        amount: 0,
                        type: item.type
                    });
                }
            }
        }
    }

    return result;
}
