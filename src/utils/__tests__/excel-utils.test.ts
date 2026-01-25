import { describe, it, expect } from 'vitest';
import {
    normalizeValue,
    isValidId,
    scoreHeader,
    findBestColumn,
    parseQuantity,
    isFooterRow,
} from '../excel-utils';

describe('normalizeValue', () => {
    it('handles strings', () => {
        expect(normalizeValue('  HELLO  ')).toBe('hello');
    });

    it('handles numbers', () => {
        expect(normalizeValue(123)).toBe('123');
    });

    it('handles null/undefined', () => {
        expect(normalizeValue(null)).toBe('');
        expect(normalizeValue(undefined)).toBe('');
    });
});

describe('isValidId', () => {
    it('accepts valid ticket numbers', () => {
        expect(isValidId('T123456')).toBe(true);
        expect(isValidId('ABC-001')).toBe(true);
        expect(isValidId('12345')).toBe(true);
    });

    it('rejects empty values', () => {
        expect(isValidId('')).toBe(false);
        expect(isValidId(null)).toBe(false);
    });

    it('rejects header keywords', () => {
        expect(isValidId('Ticket')).toBe(false);
        expect(isValidId('ID')).toBe(false);
        expect(isValidId('Number')).toBe(false);
    });
});

describe('scoreHeader', () => {
    it('gives exact match highest score', () => {
        expect(scoreHeader('ticket', 'id')).toBe(100);
        expect(scoreHeader('description', 'description')).toBe(100);
        expect(scoreHeader('qty', 'quantity')).toBe(100);
    });

    it('gives partial match medium score', () => {
        expect(scoreHeader('ticket number', 'id')).toBe(50);
        expect(scoreHeader('item description', 'description')).toBe(50);
    });

    it('returns 0 for no match', () => {
        expect(scoreHeader('xyz', 'id')).toBe(0);
        expect(scoreHeader('foobar', 'quantity')).toBe(0);
    });
});

describe('findBestColumn', () => {
    it('finds ID column', () => {
        const headers = ['Date', 'Ticket #', 'Description', 'Qty'];
        expect(findBestColumn(headers, 'id')).toBe(1);
    });

    it('finds description column', () => {
        const headers = ['ID', 'Item Description', 'Quantity'];
        expect(findBestColumn(headers, 'description')).toBe(1);
    });

    it('finds quantity column', () => {
        const headers = ['Ticket', 'Material', 'Tons', 'Rate'];
        expect(findBestColumn(headers, 'quantity')).toBe(2);
    });

    it('returns -1 when no match', () => {
        const headers = ['A', 'B', 'C'];
        expect(findBestColumn(headers, 'id')).toBe(-1);
    });
});

describe('parseQuantity', () => {
    it('handles numbers directly', () => {
        expect(parseQuantity(123.45)).toBe(123.45);
    });

    it('parses string numbers', () => {
        expect(parseQuantity('123.45')).toBe(123.45);
    });

    it('handles comma-formatted numbers', () => {
        expect(parseQuantity('1,234.56')).toBe(1234.56);
    });

    it('handles strings with units', () => {
        expect(parseQuantity('100 tons')).toBe(100);
    });

    it('returns 0 for invalid values', () => {
        expect(parseQuantity('abc')).toBe(0);
        expect(parseQuantity(NaN)).toBe(0);
        expect(parseQuantity(null)).toBe(0);
    });
});

describe('isFooterRow', () => {
    it('detects total rows', () => {
        expect(isFooterRow(['', 'Total', '1000'])).toBe(true);
        expect(isFooterRow(['Grand Total', '', '5000'])).toBe(true);
    });

    it('detects subtotal rows', () => {
        expect(isFooterRow(['Sub Total', '500'])).toBe(true);
        expect(isFooterRow(['Subtotal:', '500'])).toBe(true);
    });

    it('rejects normal rows', () => {
        expect(isFooterRow(['T123', 'Gabbro 10mm', '50'])).toBe(false);
        expect(isFooterRow(['ABC', 'Description', '100'])).toBe(false);
    });
});
