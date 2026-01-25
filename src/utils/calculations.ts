/**
 * Invoice calculation utilities
 * Extracted for testability and reuse
 */

/**
 * Calculate the amount for a line item with proper rounding
 * @param quantity - The quantity of items
 * @param unitPrice - The price per unit
 * @returns The amount rounded to 2 decimal places
 */
export function calculateAmount(quantity: number, unitPrice: number): number {
    const safeQty = isNaN(quantity) ? 0 : quantity;
    const safePrice = isNaN(unitPrice) ? 0 : unitPrice;
    return Math.round(safeQty * safePrice * 100) / 100;
}

/**
 * Calculate the subtotal from an array of items
 * @param items - Array of items with amount property
 * @returns The subtotal rounded to 2 decimal places
 */
export function calculateSubtotal(items: Array<{ amount: number }>): number {
    const total = items.reduce((sum, item) => {
        const amount = isNaN(item.amount) ? 0 : item.amount;
        return sum + amount;
    }, 0);
    return Math.round(total * 100) / 100;
}

/**
 * Calculate tax amount
 * @param subtotal - The subtotal before tax
 * @param taxRate - The tax rate as a decimal (e.g., 0.05 for 5%)
 * @returns The tax amount rounded to 2 decimal places
 */
export function calculateTax(subtotal: number, taxRate: number): number {
    const safeSubtotal = isNaN(subtotal) ? 0 : subtotal;
    const safeRate = isNaN(taxRate) ? 0 : taxRate;
    return Math.round(safeSubtotal * safeRate * 100) / 100;
}

/**
 * Calculate the invoice total
 * @param subtotal - The subtotal before tax
 * @param tax - The tax amount
 * @returns The total rounded to 2 decimal places
 */
export function calculateTotal(subtotal: number, tax: number): number {
    const safeSubtotal = isNaN(subtotal) ? 0 : subtotal;
    const safeTax = isNaN(tax) ? 0 : tax;
    return Math.round((safeSubtotal + safeTax) * 100) / 100;
}

/**
 * Parse a numeric input value safely
 * @param value - The raw input value (string or number)
 * @returns A valid number or 0 if parsing fails
 */
export function parseNumericInput(value: string | number): number {
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
}
