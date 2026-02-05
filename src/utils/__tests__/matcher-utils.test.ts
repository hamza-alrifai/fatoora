import { describe, it, expect } from 'vitest';
import {
    guessColumns,
    extractUniqueValues,
    calculateMatchStats,
    isValidDataRow,
} from '../matcher-utils';
import { detectProductType } from '../product-type-utils';

describe('guessColumns', () => {
    it('finds material description column', () => {
        const headers = ['Date', 'Material Description', 'Qty', 'Total'];
        const result = guessColumns(headers);
        expect(result.descriptionColIdx).toBe(1);
    });

    it('finds quantity column with weight', () => {
        const headers = ['Item', 'Net Weight', 'Price'];
        const result = guessColumns(headers);
        expect(result.quantityColIdx).toBe(1);
    });

    it('finds qty column', () => {
        const headers = ['Description', 'Qty', 'Rate'];
        const result = guessColumns(headers);
        expect(result.quantityColIdx).toBe(1);
    });

    it('defaults to 0 for description if not found', () => {
        const headers = ['A', 'B', 'C'];
        const result = guessColumns(headers);
        expect(result.descriptionColIdx).toBe(0);
    });

    it('returns -1 for quantity if not found', () => {
        const headers = ['A', 'B', 'C'];
        const result = guessColumns(headers);
        expect(result.quantityColIdx).toBe(-1);
    });
});

describe('extractUniqueValues', () => {
    const data = [
        ['Header', 'Values'],
        ['Row1', 'CompanyA'],
        ['Row2', 'CompanyB'],
        ['Row3', 'CompanyA'],
        ['Row4', 'CompanyC'],
    ];

    it('extracts unique values from column', () => {
        const result = extractUniqueValues(data, 1);
        expect(result).toEqual(['CompanyA', 'CompanyB', 'CompanyC']);
    });

    it('skips header by default', () => {
        const result = extractUniqueValues(data, 1);
        expect(result).not.toContain('Values');
    });

    it('excludes specified values', () => {
        const result = extractUniqueValues(data, 1, { excludeValues: ['CompanyA'] });
        expect(result).not.toContain('CompanyA');
        expect(result).toContain('CompanyB');
    });

    it('returns sorted array', () => {
        const unsortedData = [
            ['H'],
            ['Zebra'],
            ['Apple'],
            ['Mango'],
        ];
        const result = extractUniqueValues(unsortedData, 0);
        expect(result).toEqual(['Apple', 'Mango', 'Zebra']);
    });
});

describe('detectProductType', () => {
    it('detects 20mm', () => {
        expect(detectProductType('Gabbro 20mm Aggregate')).toBe('20mm');
    });

    it('detects 10mm', () => {
        expect(detectProductType('Gabbro 10mm')).toBe('10mm');
    });

    it('returns other for unknown', () => {
        expect(detectProductType('Sand')).toBe('other');
    });

    it('is case insensitive', () => {
        expect(detectProductType('GABBRO 20MM')).toBe('20mm');
    });
});

describe('calculateMatchStats', () => {
    it('calculates percentage correctly', () => {
        const stats = calculateMatchStats(100, 75);
        expect(stats.matched).toBe(75);
        expect(stats.unmatched).toBe(25);
        expect(stats.percentage).toBe(75);
    });

    it('handles 100% match', () => {
        const stats = calculateMatchStats(50, 50);
        expect(stats.percentage).toBe(100);
    });

    it('handles 0 total rows', () => {
        const stats = calculateMatchStats(0, 0);
        expect(stats.percentage).toBe(0);
    });
});

describe('isValidDataRow', () => {
    const headerRow = ['ID', 'Description', 'Qty'];

    it('rejects header row', () => {
        expect(isValidDataRow(['ID', 'Description', 'Qty'], headerRow)).toBe(false);
    });

    it('rejects total rows', () => {
        expect(isValidDataRow(['', 'Total', '100'], headerRow)).toBe(false);
        expect(isValidDataRow(['Grand Total', '', '500'], headerRow)).toBe(false);
    });

    it('rejects empty rows', () => {
        expect(isValidDataRow([], headerRow)).toBe(false);
        expect(isValidDataRow(['', '', ''], headerRow)).toBe(false);
    });

    it('accepts valid data rows', () => {
        expect(isValidDataRow(['T001', 'Gabbro 10mm', '50'], headerRow)).toBe(true);
    });
});
