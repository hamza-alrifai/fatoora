/**
 * Invoice business logic utilities
 * Extracted for testability
 */

import type { Invoice, InvoiceItem } from '@/types';
import { calculateAmount, calculateSubtotal } from './calculations';

/**
 * Aggregate invoice items by description and rate
 * Combines items with same description and unit price
 */
export function aggregateItems(items: InvoiceItem[]): InvoiceItem[] {
    const grouped = new Map<string, InvoiceItem>();

    items.forEach(item => {
        const key = `${item.description}|${item.unitPrice}`;

        if (grouped.has(key)) {
            const existing = grouped.get(key)!;
            existing.quantity += item.quantity;
            existing.amount = calculateAmount(existing.quantity, existing.unitPrice);
        } else {
            grouped.set(key, {
                ...item,
                amount: calculateAmount(item.quantity, item.unitPrice),
            });
        }
    });

    return Array.from(grouped.values());
}

/**
 * Recalculate invoice totals from items
 */
export function recalculateInvoiceTotals(invoice: Invoice): Invoice {
    const subtotal = calculateSubtotal(invoice.items);
    const tax = invoice.tax || 0;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return {
        ...invoice,
        subtotal,
        total,
    };
}

/**
 * Validate invoice before saving
 * Returns array of validation errors (empty if valid)
 */
export function validateInvoice(invoice: Invoice): string[] {
    const errors: string[] = [];

    if (!invoice.to?.name?.trim()) {
        errors.push('Customer name is required');
    }

    if (!invoice.date) {
        errors.push('Invoice date is required');
    }

    if (invoice.items.length === 0) {
        errors.push('At least one line item is required');
    }

    invoice.items.forEach((item, index) => {
        if (item.quantity <= 0) {
            errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (item.unitPrice < 0) {
            errors.push(`Item ${index + 1}: Unit price cannot be negative`);
        }
    });

    if (invoice.total < 0) {
        errors.push('Invoice total cannot be negative');
    }

    return errors;
}

/**
 * Check if an invoice can be marked as issued
 */
export function canIssueInvoice(invoice: Invoice): boolean {
    return (
        invoice.status === 'draft' &&
        validateInvoice(invoice).length === 0 &&
        invoice.total > 0
    );
}

/**
 * Check if an invoice number is in valid format
 * Expected format: numeric string (e.g., "1001", "1002")
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
    if (!invoiceNumber || invoiceNumber === 'DRAFT') {
        return false;
    }
    return /^\d+$/.test(invoiceNumber.trim());
}
