import type { Customer } from '@/types';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import { detectProductType } from './product-type-utils';
import { parseQuantitySafe } from './quantity-parser';

import type { ReconciliationResult } from './reconciliation-engine';

export interface InvoiceGenerationParams {
    outputFileHeaders: Array<{ name: string; index: number }>;
    outputFileData: any[][];
    fileGenConfigs: Record<string, FileGenConfig>;
    reconciliationResult: ReconciliationResult;
    matchValues: string[];
    noMatchLabel: string;
    customers: Customer[];
}

export interface InvoiceGenerationResult {
    invoices: any[];
    customerUpdates: Array<{ customer: Customer; totals: { t10: number; t20: number } }>;
    successCount: number;
    failCount: number;
}

export async function generateInvoicesFromReconciliation(
    params: InvoiceGenerationParams,
    saveInvoice: (invoice: any) => Promise<{ success: boolean }>,
    saveCustomer: (customer: Customer) => Promise<{ success: boolean }>
): Promise<InvoiceGenerationResult> {
    const { outputFileHeaders, outputFileData, fileGenConfigs, noMatchLabel, customers } = params;

    const outputConfig = fileGenConfigs['output'];
    if (!outputConfig) {
        throw new Error("Output file configuration missing");
    }

    const invoiceItemsByCustomer: Record<string, Map<string, any>> = {};
    const customerTotals: Record<string, { t10: number, t20: number }> = {};

    const descIdx = outputConfig.descriptionColIdx ?? 0;
    const qtyIdx = outputConfig.quantityColIdx ?? -1;
    const resultIdx = outputConfig.resultColIdx ?? (outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1);

    const dataRows = outputFileData.slice(1);

    dataRows.forEach((row, idx) => {
        if (!row || row.length === 0) return;

        const matchValue = String(row[resultIdx] || '').trim();
        if (!matchValue || matchValue.toLowerCase() === 'not matched' || matchValue === noMatchLabel) return;

        const groupConfig = fileGenConfigs[matchValue];
        if (!groupConfig || !groupConfig.customerId) return;

        const customerId = groupConfig.customerId;
        const description = String(row[descIdx] || `Item ${idx + 1}`);
        const fullRowText = row.map((cell: any) => String(cell || '').trim()).join(' ').toLowerCase();
        const type = detectProductType(description, fullRowText);
        const rate = 0;

        const quantity = qtyIdx !== -1 && qtyIdx < row.length
            ? parseQuantitySafe(row[qtyIdx])
            : 0;

        if (!invoiceItemsByCustomer[customerId]) {
            invoiceItemsByCustomer[customerId] = new Map();
            customerTotals[customerId] = { t10: 0, t20: 0 };
        }

        const key = description;
        const customerMap = invoiceItemsByCustomer[customerId];

        if (customerMap.has(key)) {
            const existing = customerMap.get(key);
            existing.quantity = Math.round((existing.quantity + quantity) * 100) / 100;
            existing.amount = Math.round(existing.quantity * existing.unitPrice * 100) / 100;
        } else {
            customerMap.set(key, {
                id: crypto.randomUUID(),
                description: description,
                quantity: quantity,
                unitPrice: rate,
                amount: Math.round(quantity * rate * 100) / 100,
                type: type
            });
        }

        if (type === '10mm') customerTotals[customerId].t10 += quantity;
        if (type === '20mm') customerTotals[customerId].t20 += quantity;
    });

    const invoices: any[] = [];
    const customerUpdates: Array<{ customer: Customer; totals: { t10: number; t20: number } }> = [];
    let successCount = 0;
    let failCount = 0;

    for (const [custId, itemMap] of Object.entries(invoiceItemsByCustomer)) {
        const items = Array.from(itemMap.values());
        if (items.length === 0) continue;

        const customer = customers.find(c => c.id === custId);
        if (!customer) continue;

        const totals = customerTotals[custId];
        if (totals.t10 > 0 || totals.t20 > 0) {
            const updatedCustomer = {
                ...customer,
                total10mm: (customer.total10mm || 0) + totals.t10,
                total20mm: (customer.total20mm || 0) + totals.t20,
            };
            await saveCustomer(updatedCustomer);
            customerUpdates.push({ customer: updatedCustomer, totals });
        }

        const finalItems = items;

        const subtotal = 0;
        const tax = 0;

        const newInvoice: any = {
            id: crypto.randomUUID(),
            number: 'DRAFT',
            date: new Date().toISOString(),
            status: 'draft',
            from: {
                name: 'My Business',
                address: '123 Business Rd',
                email: 'billing@example.com',
                phone: '+1234567890'
            },
            to: {
                customerId: customer.id,
                name: customer.name,
                address: customer.address || '',
                email: customer.email || '',
                phone: customer.phone || ''
            },
            items: finalItems,
            subtotal: subtotal,
            tax: tax,
            total: subtotal + tax,
            currency: 'QAR',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        invoices.push(newInvoice);
        const result = await saveInvoice(newInvoice);
        if (result.success) successCount++;
        else failCount++;
    }

    return {
        invoices,
        customerUpdates,
        successCount,
        failCount
    };
}
