/**
 * Customer business logic utilities
 */

import type { Customer, Invoice } from '@/types';

/**
 * Check if a customer has any linked invoices
 * @param customerId - The customer ID to check
 * @param invoices - Array of all invoices
 * @returns Array of invoices linked to this customer
 */
export function getCustomerInvoices(customerId: string, invoices: Invoice[]): Invoice[] {
    return invoices.filter(inv => inv.to?.customerId === customerId);
}

/**
 * Check if a customer can be safely deleted
 * @param customerId - The customer ID
 * @param invoices - Array of all invoices
 * @returns Object with canDelete boolean and reason if not
 */
export function canDeleteCustomer(
    customerId: string,
    invoices: Invoice[]
): { canDelete: boolean; reason?: string; linkedCount?: number } {
    const linked = getCustomerInvoices(customerId, invoices);

    if (linked.length > 0) {
        return {
            canDelete: false,
            reason: `Cannot delete: ${linked.length} invoice(s) are linked to this customer`,
            linkedCount: linked.length,
        };
    }

    return { canDelete: true };
}

/**
 * Calculate total revenue from a customer
 */
export function calculateCustomerRevenue(customerId: string, invoices: Invoice[]): number {
    const customerInvoices = getCustomerInvoices(customerId, invoices);
    const total = customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    return Math.round(total * 100) / 100;
}

/**
 * Validate customer data before saving
 */
export function validateCustomer(customer: Partial<Customer>): string[] {
    const errors: string[] = [];

    if (!customer.name?.trim()) {
        errors.push('Customer name is required');
    }

    if (customer.email && !isValidEmail(customer.email)) {
        errors.push('Invalid email format');
    }

    if (customer.phone && !isValidPhone(customer.phone)) {
        errors.push('Invalid phone format');
    }

    return errors;
}

/**
 * Simple email validation
 */
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Simple phone validation (allows various formats)
 */
export function isValidPhone(phone: string): boolean {
    // Allow digits, spaces, dashes, parentheses, plus sign
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^\+?[\d]{6,15}$/.test(cleaned);
}
