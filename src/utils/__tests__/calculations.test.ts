import { describe, it, expect } from 'vitest';
import {
    calculateAmount,
    calculateSubtotal,
    calculateTax,
    calculateTotal,
    parseNumericInput,
} from '../calculations';

describe('calculateAmount', () => {
    it('calculates correctly for simple values', () => {
        expect(calculateAmount(10, 25)).toBe(250);
    });

    it('rounds to 2 decimal places', () => {
        expect(calculateAmount(10.333, 25.5)).toBe(263.49);
    });

    it('handles decimals correctly', () => {
        expect(calculateAmount(1.1, 1.1)).toBe(1.21);
    });

    it('returns 0 for NaN quantity', () => {
        expect(calculateAmount(NaN, 10)).toBe(0);
    });

    it('returns 0 for NaN price', () => {
        expect(calculateAmount(10, NaN)).toBe(0);
    });

    it('handles zero values', () => {
        expect(calculateAmount(0, 100)).toBe(0);
        expect(calculateAmount(100, 0)).toBe(0);
    });

    it('handles negative values', () => {
        expect(calculateAmount(-5, 10)).toBe(-50);
    });
});

describe('calculateSubtotal', () => {
    it('sums multiple items correctly', () => {
        const items = [{ amount: 100 }, { amount: 50.5 }, { amount: 25.25 }];
        expect(calculateSubtotal(items)).toBe(175.75);
    });

    it('returns 0 for empty array', () => {
        expect(calculateSubtotal([])).toBe(0);
    });

    it('handles NaN amounts in items', () => {
        const items = [{ amount: 100 }, { amount: NaN }, { amount: 50 }];
        expect(calculateSubtotal(items)).toBe(150);
    });

    it('handles single item', () => {
        expect(calculateSubtotal([{ amount: 99.99 }])).toBe(99.99);
    });
});

describe('calculateTax', () => {
    it('calculates 5% tax correctly', () => {
        expect(calculateTax(1000, 0.05)).toBe(50);
    });

    it('rounds tax to 2 decimal places', () => {
        expect(calculateTax(99.99, 0.05)).toBe(5);
    });

    it('handles 0% tax rate', () => {
        expect(calculateTax(1000, 0)).toBe(0);
    });

    it('returns 0 for NaN inputs', () => {
        expect(calculateTax(NaN, 0.05)).toBe(0);
        expect(calculateTax(1000, NaN)).toBe(0);
    });
});

describe('calculateTotal', () => {
    it('sums subtotal and tax', () => {
        expect(calculateTotal(1000, 50)).toBe(1050);
    });

    it('rounds to 2 decimal places', () => {
        expect(calculateTotal(99.99, 4.999)).toBe(104.99);
    });

    it('handles NaN inputs', () => {
        expect(calculateTotal(NaN, 50)).toBe(50);
        expect(calculateTotal(1000, NaN)).toBe(1000);
    });
});

describe('parseNumericInput', () => {
    it('parses valid string numbers', () => {
        expect(parseNumericInput('123.45')).toBe(123.45);
    });

    it('returns 0 for empty string', () => {
        expect(parseNumericInput('')).toBe(0);
    });

    it('returns 0 for non-numeric strings', () => {
        expect(parseNumericInput('abc')).toBe(0);
    });

    it('passes through valid numbers', () => {
        expect(parseNumericInput(42)).toBe(42);
    });

    it('returns 0 for NaN number input', () => {
        expect(parseNumericInput(NaN)).toBe(0);
    });

    it('handles negative numbers', () => {
        expect(parseNumericInput('-25.5')).toBe(-25.5);
    });
});
