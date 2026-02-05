/**
 * Shared invoice utilities for the Electron main process.
 */

type InvoiceItemLike = {
    description: string;
    unitPrice: number;
    quantity: number;
    amount?: number;
    type?: string;
};

const roundToTwo = (value: number): number => Math.round(value * 100) / 100;

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

export function aggregateInvoiceItems(items: InvoiceItemLike[]): InvoiceItemLike[] {
    const grouped = new Map<string, InvoiceItemLike>();

    items.forEach(item => {
        const key = `${item.description}|${item.unitPrice}`;
        if (grouped.has(key)) {
            const existing = grouped.get(key)!;
            existing.quantity += item.quantity;
            existing.amount = roundToTwo(existing.quantity * existing.unitPrice);
        } else {
            grouped.set(key, {
                ...item,
                amount: roundToTwo(item.quantity * item.unitPrice),
            });
        }
    });

    return Array.from(grouped.values());
}
