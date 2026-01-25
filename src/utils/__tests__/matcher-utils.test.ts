import { describe, it, expect } from 'vitest';
import {
    guessColumns,
    extractUniqueValues,
    detectProductType,
    getRateForType,
    calculateMatchStats,
    aggregateQuantities,
    isValidDataRow,
    generateExecutiveSummary,
} from '../matcher-utils';

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

describe('getRateForType', () => {
    it('returns rate for 10mm', () => {
        expect(getRateForType('10mm', 25, 30)).toBe(25);
    });

    it('returns rate for 20mm', () => {
        expect(getRateForType('20mm', 25, 30)).toBe(30);
    });

    it('returns 0 for other', () => {
        expect(getRateForType('other', 25, 30)).toBe(0);
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

describe('aggregateQuantities', () => {
    it('groups by description and rate', () => {
        const items = [
            { description: 'Gabbro 10mm', quantity: 50, rate: 25 },
            { description: 'Gabbro 10mm', quantity: 30, rate: 25 },
            { description: 'Gabbro 20mm', quantity: 20, rate: 30 },
        ];

        const result = aggregateQuantities(items);

        expect(result.size).toBe(2);
        expect(result.get('Gabbro 10mm|25')?.quantity).toBe(80);
        expect(result.get('Gabbro 20mm|30')?.quantity).toBe(20);
    });

    it('handles empty array', () => {
        const result = aggregateQuantities([]);
        expect(result.size).toBe(0);
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

describe('generateExecutiveSummary', () => {
    const headers = ['ID', 'Desc', 'Qty', 'Customer'];
    const data = [
        headers,
        ['1', 'Gabbro 10mm', '100', 'Customer A'], // 10mm for A
        ['2', 'Gabbro 20mm', '50', 'Customer A'],  // 20mm for A
        ['3', 'Gabbro 10mm', '200', 'Customer B'], // 10mm for B
        ['4', 'Sand', '50', 'Customer B'],         // Other for B
        ['5', 'Gabbro 20mm', '100', 'Customer A'], // More 20mm for A
        ['6', 'Gabbro 10mm', '10', ''],            // Invalid customer
    ];

    // Rate 10mm = 25, Rate 20mm = 30

    it('generates summary for customers', () => {
        // ID=0, Desc=1, Qty=2, Customer=3
        const result = generateExecutiveSummary(data, 3, 2, 1, 25, 30);

        expect(result).toHaveLength(2);

        // Check Customer A
        const custA = result.find(c => c.name === 'Customer A');
        expect(custA).toBeDefined();
        expect(custA?.total10mm).toBe(100);
        expect(custA?.total20mm).toBe(150); // 50 + 100
        expect(custA?.ticketCount).toBe(3);
        expect(custA?.amount10mm).toBe(2500); // 100 * 25
        expect(custA?.amount20mm).toBe(4500); // 150 * 30
        expect(custA?.totalAmount).toBe(7000); // 2500 + 4500

        // Check Customer B
        const custB = result.find(c => c.name === 'Customer B');
        expect(custB).toBeDefined();
        expect(custB?.total10mm).toBe(200);
        expect(custB?.totalOther).toBe(50);
        expect(custB?.ticketCount).toBe(2);
    });
});
