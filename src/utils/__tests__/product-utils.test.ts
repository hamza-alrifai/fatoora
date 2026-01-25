import { describe, it, expect } from 'vitest';
import {
    validateProduct,
    getProductTypeColor,
    findProductByType,
    getDefaultProducts,
    calculatePriceWithMarkup,
    filterProducts,
} from '../product-utils';
import type { Product } from '@/types';

const mockProducts: Product[] = [
    { id: '1', name: '20mm Gabbro', description: 'Large aggregate', rate: 30, type: '20mm', createdAt: '', updatedAt: '' },
    { id: '2', name: '10mm Gabbro', description: 'Small aggregate', rate: 25, type: '10mm', createdAt: '', updatedAt: '' },
    { id: '3', name: 'Custom Product', description: 'Other material', rate: 50, type: 'other', createdAt: '', updatedAt: '' },
];

describe('validateProduct', () => {
    it('returns empty array for valid product', () => {
        expect(validateProduct({ name: 'Test', rate: 25, type: '10mm' })).toEqual([]);
    });

    it('requires product name', () => {
        const errors = validateProduct({ name: '', rate: 25 });
        expect(errors).toContain('Product name is required');
    });

    it('rejects negative rate', () => {
        const errors = validateProduct({ name: 'Test', rate: -10 });
        expect(errors).toContain('Rate cannot be negative');
    });

    it('rejects invalid type', () => {
        const errors = validateProduct({ name: 'Test', type: 'invalid' as any });
        expect(errors).toContain('Invalid product type');
    });

    it('accepts valid types', () => {
        expect(validateProduct({ name: 'A', type: '10mm' })).toEqual([]);
        expect(validateProduct({ name: 'B', type: '20mm' })).toEqual([]);
        expect(validateProduct({ name: 'C', type: 'other' })).toEqual([]);
    });
});

describe('getProductTypeColor', () => {
    it('returns correct color for 20mm', () => {
        expect(getProductTypeColor('20mm')).toBe('bg-primary/20 text-primary');
    });

    it('returns correct color for 10mm', () => {
        expect(getProductTypeColor('10mm')).toBe('bg-slate-400/20 text-slate-400');
    });

    it('returns default color for other', () => {
        expect(getProductTypeColor('other')).toBe('bg-secondary text-muted-foreground');
    });
});

describe('findProductByType', () => {
    it('finds 10mm product', () => {
        const result = findProductByType(mockProducts, '10mm');
        expect(result?.name).toBe('10mm Gabbro');
    });

    it('finds 20mm product', () => {
        const result = findProductByType(mockProducts, '20mm');
        expect(result?.name).toBe('20mm Gabbro');
    });

    it('returns undefined if not found', () => {
        const result = findProductByType([], '10mm');
        expect(result).toBeUndefined();
    });
});

describe('getDefaultProducts', () => {
    it('returns two default products', () => {
        const defaults = getDefaultProducts();
        expect(defaults).toHaveLength(2);
        expect(defaults.map(p => p.type)).toContain('10mm');
        expect(defaults.map(p => p.type)).toContain('20mm');
    });
});

describe('calculatePriceWithMarkup', () => {
    it('calculates 10% markup correctly', () => {
        expect(calculatePriceWithMarkup(100, 10)).toBe(110);
    });

    it('calculates 5% markup with rounding', () => {
        expect(calculatePriceWithMarkup(99.99, 5)).toBe(104.99);
    });

    it('handles 0% markup', () => {
        expect(calculatePriceWithMarkup(50, 0)).toBe(50);
    });
});

describe('filterProducts', () => {
    it('filters by name', () => {
        const result = filterProducts(mockProducts, '20mm');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('20mm Gabbro');
    });

    it('filters by description', () => {
        const result = filterProducts(mockProducts, 'large');
        expect(result).toHaveLength(1);
    });

    it('is case insensitive', () => {
        const result = filterProducts(mockProducts, 'GABBRO');
        expect(result).toHaveLength(2);
    });

    it('returns all for empty query', () => {
        const result = filterProducts(mockProducts, '');
        expect(result).toHaveLength(3);
    });
});
