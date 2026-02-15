import type { Customer } from '@/types';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import { detectProductType } from './product-type-utils';
import { parseQuantitySafe } from './quantity-parser';

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
        rows: any[]; // Rows belonging to this group
    }>;

    // Unmatched data stats
    unmatchedStats: {
        count: number;
        rows: any[];
    };

    // Global stats
    totalQuantity: number;
    total10mm: number;
    total20mm: number;
}

export interface CalculationParams {
    outputFileHeaders: Array<{ name: string; index: number }>;
    outputFileData: any[][];
    fileGenConfigs: Record<string, FileGenConfig>;
    noMatchLabel: string;
    customers: Customer[];
}

export function calculateReconciliationStats(params: CalculationParams): ReconciliationResult {
    const { outputFileHeaders, outputFileData, fileGenConfigs, noMatchLabel, customers } = params;

    // Initialize result structure
    const result: ReconciliationResult = {
        customerStats: {},
        groupStats: {},
        unmatchedStats: { count: 0, rows: [] },
        totalQuantity: 0,
        total10mm: 0,
        total20mm: 0
    };

    // 1. Identify Key Columns
    console.log('--- Calculation Engine Start ---');
    console.log('Files Config:', fileGenConfigs);
    console.log('Customers count:', customers.length);

    const outputConfig = fileGenConfigs['output'];

    // Result Column (Where "Matched - GroupName" is)
    const resultColIdx = outputConfig?.resultColIdx ??
        (outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1);

    // Quantity Column
    let qtyIdx = outputConfig?.quantityColIdx ?? -1;
    if (qtyIdx === -1) {
        const outputHeadersLower = outputFileHeaders.map(h => h.name.toLowerCase());
        qtyIdx = outputHeadersLower.findIndex(h => h.includes('net') && h.includes('weight'));
        if (qtyIdx === -1) qtyIdx = outputHeadersLower.findIndex(h => h.includes('weight'));
        if (qtyIdx === -1) qtyIdx = outputHeadersLower.findIndex(h => h.includes('qty'));
    }

    // Description Column
    const descIdx = outputConfig?.descriptionColIdx ?? 0;

    // 2. Iterate and Aggregate
    const dataRows = outputFileData.slice(1); // Skip header

    if (resultColIdx === -1 || qtyIdx === -1) {
        // If we valid columns aren't found, we can't calculate much, but we return empty result to avoid crash
        return result;
    }

    const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';

    dataRows.forEach((row, idx) => {
        if (!row || row.length === 0) return;

        const matchValueOriginal = String(row[resultColIdx] || '').trim();
        const matchValueLower = matchValueOriginal.toLowerCase();

        // Check if unmatched
        if (!matchValueOriginal ||
            matchValueLower === 'not matched' ||
            matchValueOriginal === noMatchLabel ||
            matchValueOriginal === headerName) {

            // Only count as unmatched if it's explicitly 'not matched' or the label
            if (matchValueLower === 'not matched' || matchValueOriginal === noMatchLabel) {
                result.unmatchedStats.count++;
                result.unmatchedStats.rows.push(row);
            }
            return;
        }

        // It is a Matched Row
        const groupName = matchValueOriginal;

        // --- Group Stats ---
        if (!result.groupStats[groupName]) {
            // Find config by checking if the key (file path) contains the group name (filename)
            // or if the group name contains the key (less likely but possible)
            let groupConfig = fileGenConfigs[groupName];

            if (!groupConfig) {
                console.log('Trying to find config for:', groupName);
                const foundKey = Object.keys(fileGenConfigs).find(key => {
                    const cleanKey = key.toLowerCase().replace(/\.(xlsx|xls|csv)$/, '').trim();
                    const cleanGroup = groupName.toLowerCase().replace(/\.(xlsx|xls|csv)$/, '').trim();
                    const match = cleanKey.includes(cleanGroup) || cleanGroup.includes(cleanKey);
                    if (match) console.log('MATCH FOUND:', key);
                    return match;
                });
                if (foundKey) {
                    groupConfig = fileGenConfigs[foundKey];
                }
            }

            if (groupConfig) {
                console.log('Config Found:', groupConfig);
            } else {
                console.log('NO CONFIG FOUND for:', groupName);
                console.log('Available Config Keys:', Object.keys(fileGenConfigs));
            }

            const customer = groupConfig?.customerId ? customers.find(c => c.id === groupConfig.customerId) : null;

            // Fallback: If no customer assigned, DO NOT create a dummy customer with group name.
            // This prevents "Vessel one 2026" from appearing as a customer name.
            if (!customer) {
                // We leave customer as null.
                // The UI will show "Unassigned" or handle matched groups without customers separately.
            }

            result.groupStats[groupName] = {
                groupName,
                assignedCustomer: customer || null,
                totalQuantity: 0,
                total10mm: 0,
                total20mm: 0,
                rows: []
            };
        }

        const groupStat = result.groupStats[groupName];
        groupStat.rows.push(row);

        // Extract Data
        const quantity = qtyIdx !== -1 && qtyIdx < row.length
            ? parseQuantitySafe(row[qtyIdx])
            : 0;

        const description = String(row[descIdx] || `Item ${idx + 1}`);
        const fullRowText = row.map((cell: any) => String(cell || '').trim()).join(' ').toLowerCase();
        const type = detectProductType(description, fullRowText);

        // Update Group Totals
        groupStat.totalQuantity += quantity;
        if (type === '10mm') groupStat.total10mm += quantity;
        if (type === '20mm') groupStat.total20mm += quantity;

        // --- Customer Stats (if assigned) ---
        if (groupStat.assignedCustomer) {
            const customerId = groupStat.assignedCustomer.id;

            if (!result.customerStats[customerId]) {
                result.customerStats[customerId] = {
                    customer: groupStat.assignedCustomer,
                    totalAmount: 0,
                    total10mm: 0,
                    total20mm: 0,
                    trips10mm: 0,
                    trips20mm: 0,
                    items: []
                };
            }

            const custStat = result.customerStats[customerId];
            const rate = 0; // Default rate, can be enhanced to pull from customer config if needed

            // Aggregating Invoice Items
            // Check if item with same description already exists to merge
            const existingItem = custStat.items.find(i => i.description === description);

            if (existingItem) {
                existingItem.quantity = Math.round((existingItem.quantity + quantity) * 100) / 100;
                existingItem.amount = Math.round(existingItem.quantity * existingItem.unitPrice * 100) / 100;
            } else {
                custStat.items.push({
                    id: crypto.randomUUID(),
                    description: description,
                    quantity: quantity,
                    unitPrice: rate,
                    amount: Math.round(quantity * rate * 100) / 100,
                    type: type
                });
            }

            // Update Customer Totals
            if (type === '10mm') {
                custStat.total10mm += quantity;
                custStat.trips10mm += 1;
            }
            if (type === '20mm') {
                custStat.total20mm += quantity;
                custStat.trips20mm += 1;
            }
        }

        // Update Global Totals
        result.totalQuantity += quantity;
        if (type === '10mm') result.total10mm += quantity;
        if (type === '20mm') result.total20mm += quantity;
    });

    // Final Rounding for display cleanups
    Object.values(result.groupStats).forEach(stat => {
        stat.totalQuantity = Math.round(stat.totalQuantity * 100) / 100;
        stat.total10mm = Math.round(stat.total10mm * 100) / 100;
        stat.total20mm = Math.round(stat.total20mm * 100) / 100;
    });

    Object.values(result.customerStats).forEach(stat => {
        stat.total10mm = Math.round(stat.total10mm * 100) / 100;
        stat.total20mm = Math.round(stat.total20mm * 100) / 100;
    });

    return result;
}
