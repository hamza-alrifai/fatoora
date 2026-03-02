/**
 * Shared invoice utilities for the Electron main process.
 */

export function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

export function extractDateString(dateValue: string): string {
    if (!dateValue) return '';
    return String(dateValue).split('T')[0];
}

export function isInvoiceOverdue(dueDate: string, today: string = getTodayString()): boolean {
    const dueDateStr = extractDateString(dueDate);
    if (!dueDateStr) return false;
    return today > dueDateStr;
}
