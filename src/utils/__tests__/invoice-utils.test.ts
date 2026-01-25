import { describe, it, expect } from 'vitest';
import {
    aggregateItems,
    recalculateInvoiceTotals,
    validateInvoice,
    canIssueInvoice,
    isValidInvoiceNumber,
} from '../invoice-utils';
import { cloneMockInvoice, mockInvoiceItem } from './mocks';
import type { InvoiceItem } from '@/types';

describe('aggregateItems', () => {
    it('combines items with same description and rate', () => {
        const items: InvoiceItem[] = [
            { id: '1', description: 'Gabbro 10mm', quantity: 50, unitPrice: 25, amount: 1250, type: '10mm' },
            { id: '2', description: 'Gabbro 10mm', quantity: 30, unitPrice: 25, amount: 750, type: '10mm' },
        ];

        const result = aggregateItems(items);

        expect(result).toHaveLength(1);
        expect(result[0].quantity).toBe(80);
        expect(result[0].amount).toBe(2000);
    });

    it('keeps items with different rates separate', () => {
        const items: InvoiceItem[] = [
            { id: '1', description: 'Gabbro 10mm', quantity: 50, unitPrice: 25, amount: 1250, type: '10mm' },
            { id: '2', description: 'Gabbro 10mm', quantity: 30, unitPrice: 30, amount: 900, type: '10mm' },
        ];

        const result = aggregateItems(items);

        expect(result).toHaveLength(2);
    });

    it('handles empty array', () => {
        expect(aggregateItems([])).toEqual([]);
    });

    it('properly rounds amounts', () => {
        const items: InvoiceItem[] = [
            { id: '1', description: 'Test', quantity: 10.333, unitPrice: 25.5, amount: 0, type: '10mm' },
        ];

        const result = aggregateItems(items);

        expect(result[0].amount).toBe(263.49);
    });
});

describe('recalculateInvoiceTotals', () => {
    it('calculates subtotal from items', () => {
        const invoice = cloneMockInvoice();
        invoice.items = [
            { ...mockInvoiceItem, amount: 1000 },
            { ...mockInvoiceItem, id: '2', amount: 500 },
        ];

        const result = recalculateInvoiceTotals(invoice);

        expect(result.subtotal).toBe(1500);
        expect(result.total).toBe(1500);
    });

    it('includes tax in total', () => {
        const invoice = cloneMockInvoice();
        invoice.items = [{ ...mockInvoiceItem, amount: 1000 }];
        invoice.tax = 50;

        const result = recalculateInvoiceTotals(invoice);

        expect(result.subtotal).toBe(1000);
        expect(result.total).toBe(1050);
    });
});

describe('validateInvoice', () => {
    it('returns empty array for valid invoice', () => {
        const invoice = cloneMockInvoice();
        expect(validateInvoice(invoice)).toEqual([]);
    });

    it('requires customer name', () => {
        const invoice = cloneMockInvoice();
        invoice.to.name = '';

        const errors = validateInvoice(invoice);

        expect(errors).toContain('Customer name is required');
    });

    it('requires invoice date', () => {
        const invoice = cloneMockInvoice();
        invoice.date = '';

        const errors = validateInvoice(invoice);

        expect(errors).toContain('Invoice date is required');
    });

    it('requires at least one item', () => {
        const invoice = cloneMockInvoice();
        invoice.items = [];

        const errors = validateInvoice(invoice);

        expect(errors).toContain('At least one line item is required');
    });

    it('validates item quantities', () => {
        const invoice = cloneMockInvoice();
        invoice.items[0].quantity = 0;

        const errors = validateInvoice(invoice);

        expect(errors.some(e => e.includes('Quantity must be greater than 0'))).toBe(true);
    });

    it('rejects negative total', () => {
        const invoice = cloneMockInvoice();
        invoice.total = -100;

        const errors = validateInvoice(invoice);

        expect(errors).toContain('Invoice total cannot be negative');
    });
});

describe('canIssueInvoice', () => {
    it('returns true for valid draft with positive total', () => {
        const invoice = cloneMockInvoice();
        invoice.status = 'draft';

        expect(canIssueInvoice(invoice)).toBe(true);
    });

    it('returns false for non-draft invoices', () => {
        const invoice = cloneMockInvoice();
        invoice.status = 'issued';

        expect(canIssueInvoice(invoice)).toBe(false);
    });

    it('returns false for zero total', () => {
        const invoice = cloneMockInvoice();
        invoice.status = 'draft';
        invoice.total = 0;

        expect(canIssueInvoice(invoice)).toBe(false);
    });

    it('returns false for invalid invoice', () => {
        const invoice = cloneMockInvoice();
        invoice.status = 'draft';
        invoice.to.name = '';

        expect(canIssueInvoice(invoice)).toBe(false);
    });
});

describe('isValidInvoiceNumber', () => {
    it('accepts numeric strings', () => {
        expect(isValidInvoiceNumber('1001')).toBe(true);
        expect(isValidInvoiceNumber('123456')).toBe(true);
    });

    it('rejects DRAFT', () => {
        expect(isValidInvoiceNumber('DRAFT')).toBe(false);
    });

    it('rejects empty strings', () => {
        expect(isValidInvoiceNumber('')).toBe(false);
    });

    it('rejects non-numeric strings', () => {
        expect(isValidInvoiceNumber('INV-001')).toBe(false);
        expect(isValidInvoiceNumber('abc')).toBe(false);
    });
});
