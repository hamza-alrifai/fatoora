import type { Customer } from '@/types';
import type { ReconciliationResult } from './reconciliation-engine';
import { calculatePricingModifiers } from './pricing-utils';

export interface InvoiceGenerationParams {
    reconciliationResult: ReconciliationResult;
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
    const { reconciliationResult } = params;

    const invoices: any[] = [];
    const customerUpdates: Array<{ customer: Customer; totals: { t10: number; t20: number } }> = [];
    let successCount = 0;
    let failCount = 0;

    for (const stat of Object.values(reconciliationResult.customerStats)) {
        const customer = stat.customer;
        const baseItems = stat.items;

        if (baseItems.length === 0) continue;

        const modifiers = calculatePricingModifiers(baseItems, customer);
        const allItems = [...baseItems, ...modifiers];

        if (stat.total10mm > 0 || stat.total20mm > 0) {
            const updatedCustomer = {
                ...customer,
                total10mm: Math.round(((customer.total10mm || 0) + stat.total10mm) * 100) / 100,
                total20mm: Math.round(((customer.total20mm || 0) + stat.total20mm) * 100) / 100,
            };
            await saveCustomer(updatedCustomer);
            customerUpdates.push({ customer: updatedCustomer, totals: { t10: stat.total10mm, t20: stat.total20mm } });
        }

        const subtotal = allItems.reduce((sum, item) => sum + (item.amount || 0), 0);
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
            items: allItems,
            subtotal: subtotal,
            tax: tax,
            total: subtotal + tax,
            currency: 'QAR',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        invoices.push(newInvoice);
        const result = await saveInvoice(newInvoice);

        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    return { invoices, customerUpdates, successCount, failCount };
}
