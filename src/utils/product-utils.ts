/**
 * Product business logic utilities
 */

import type { Product } from '@/types';

/**
 * Validate product data before saving
 */
export function validateProduct(product: Partial<Product>): string[] {
    const errors: string[] = [];

    if (!product.name?.trim()) {
        errors.push('Product name is required');
    }

    if (product.rate !== undefined && product.rate < 0) {
        errors.push('Rate cannot be negative');
    }

    if (product.type && !['10mm', '20mm', 'other'].includes(product.type)) {
        errors.push('Invalid product type');
    }

    return errors;
}

/**
 * Get display color class for product type
 */
export function getProductTypeColor(type: string): string {
    if (type === '20mm') return 'bg-primary/20 text-primary';
    if (type === '10mm') return 'bg-slate-400/20 text-slate-400';
    return 'bg-secondary text-muted-foreground';
}

/**
 * Find product by type
 */
export function findProductByType(products: Product[], type: '10mm' | '20mm'): Product | undefined {
    return products.find(p => p.type === type);
}

/**
 * Get default products configuration
 */
export function getDefaultProducts(): Partial<Product>[] {
    return [
        { name: '20mm Gabbro', description: 'Gabbro aggregate 20mm', rate: 0, type: '20mm' },
        { name: '10mm Gabbro', description: 'Gabbro aggregate 10mm', rate: 0, type: '10mm' },
    ];
}

/**
 * Calculate product rate with markup
 */
export function calculatePriceWithMarkup(baseRate: number, markupPercent: number): number {
    const markup = baseRate * (markupPercent / 100);
    return Math.round((baseRate + markup) * 100) / 100;
}

/**
 * Filter products by search query
 */
export function filterProducts(products: Product[], query: string): Product[] {
    if (!query.trim()) return products;

    const lowerQuery = query.toLowerCase();
    return products.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery)
    );
}
