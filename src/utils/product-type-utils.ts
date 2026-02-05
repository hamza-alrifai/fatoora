/**
 * Product type detection and handling utilities
 * Consolidates all 10mm/20mm logic in one place
 */

export type ProductType = '10mm' | '20mm' | 'other';

/**
 * Detect product type from description or row data
 * @param description - Product description text
 * @param rowData - Optional full row data for additional context
 * @returns The detected product type
 */
export function detectProductType(description: string, rowData?: string): ProductType {
    const descLower = description.toLowerCase();
    const fullText = rowData ? rowData.toLowerCase() : descLower;
    
    if (descLower.includes('20mm') || fullText.includes('20mm')) {
        return '20mm';
    }
    
    if (descLower.includes('10mm') || fullText.includes('10mm')) {
        return '10mm';
    }
    
    return 'other';
}

/**
 * Check if a product type is valid (not 'other')
 */
export function isValidProductType(type: ProductType): boolean {
    return type === '10mm' || type === '20mm';
}
