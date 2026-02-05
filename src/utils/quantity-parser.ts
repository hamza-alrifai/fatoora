/**
 * Quantity parsing utilities
 * Consolidates all quantity extraction logic
 */

/**
 * Parse a quantity value from various cell value formats
 * Handles numbers, strings with formatting, and edge cases
 * 
 * @param value - Raw cell value from Excel or input
 * @returns Parsed quantity as number, 0 if invalid
 */
export function parseQuantity(value: unknown): number {
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }

    if (typeof value === 'string') {
        const cleaned = value.replace(/[,\s]/g, '').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
}

/**
 * Parse quantity with validation and sanity checks
 * Returns 0 for suspiciously large values that might be errors
 */
export function parseQuantitySafe(value: unknown, maxValue = 1_000_000): number {
    const qty = parseQuantity(value);
    
    if (qty > maxValue) {
        console.warn(`Quantity ${qty} exceeds max ${maxValue}, treating as invalid`);
        return 0;
    }
    
    return roundQuantity(qty);
}

/**
 * Round quantity to 2 decimal places
 */
export function roundQuantity(value: number): number {
    return Math.round(value * 100) / 100;
}
