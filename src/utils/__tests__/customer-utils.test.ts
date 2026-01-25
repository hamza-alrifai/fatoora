import { describe, it, expect } from 'vitest';
import {
    getCustomerInvoices,
    canDeleteCustomer,
    calculateCustomerRevenue,
    validateCustomer,
    isValidEmail,
    isValidPhone,
} from '../customer-utils';
import { cloneMockInvoice, mockCustomer } from './mocks';

describe('getCustomerInvoices', () => {
    it('returns invoices for a customer', () => {
        const invoices = [
            cloneMockInvoice({ id: '1', to: { ...cloneMockInvoice().to, customerId: 'cust-001' } }),
            cloneMockInvoice({ id: '2', to: { ...cloneMockInvoice().to, customerId: 'cust-002' } }),
            cloneMockInvoice({ id: '3', to: { ...cloneMockInvoice().to, customerId: 'cust-001' } }),
        ];

        const result = getCustomerInvoices('cust-001', invoices);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('1');
        expect(result[1].id).toBe('3');
    });

    it('returns empty array if no invoices found', () => {
        const invoices = [
            cloneMockInvoice({ to: { ...cloneMockInvoice().to, customerId: 'cust-002' } }),
        ];

        expect(getCustomerInvoices('cust-001', invoices)).toEqual([]);
    });
});

describe('canDeleteCustomer', () => {
    it('allows deletion when no invoices linked', () => {
        const result = canDeleteCustomer('cust-001', []);

        expect(result.canDelete).toBe(true);
        expect(result.reason).toBeUndefined();
    });

    it('blocks deletion when invoices exist', () => {
        const invoices = [
            cloneMockInvoice({ to: { ...cloneMockInvoice().to, customerId: 'cust-001' } }),
        ];

        const result = canDeleteCustomer('cust-001', invoices);

        expect(result.canDelete).toBe(false);
        expect(result.linkedCount).toBe(1);
        expect(result.reason).toContain('1 invoice(s)');
    });
});

describe('calculateCustomerRevenue', () => {
    it('sums invoice totals', () => {
        const invoices = [
            cloneMockInvoice({ total: 1000, to: { ...cloneMockInvoice().to, customerId: 'cust-001' } }),
            cloneMockInvoice({ total: 500.5, to: { ...cloneMockInvoice().to, customerId: 'cust-001' } }),
        ];

        expect(calculateCustomerRevenue('cust-001', invoices)).toBe(1500.5);
    });

    it('returns 0 for no invoices', () => {
        expect(calculateCustomerRevenue('cust-001', [])).toBe(0);
    });
});

describe('validateCustomer', () => {
    it('returns empty array for valid customer', () => {
        expect(validateCustomer(mockCustomer)).toEqual([]);
    });

    it('requires customer name', () => {
        const errors = validateCustomer({ name: '' });
        expect(errors).toContain('Customer name is required');
    });

    it('validates email format', () => {
        const errors = validateCustomer({ name: 'Test', email: 'invalid-email' });
        expect(errors).toContain('Invalid email format');
    });

    it('accepts valid email', () => {
        const errors = validateCustomer({ name: 'Test', email: 'test@example.com' });
        expect(errors).not.toContain('Invalid email format');
    });
});

describe('isValidEmail', () => {
    it('accepts valid emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('rejects invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('@no-local.com')).toBe(false);
        expect(isValidEmail('no-at-sign.com')).toBe(false);
    });
});

describe('isValidPhone', () => {
    it('accepts valid phone numbers', () => {
        expect(isValidPhone('+974 1234 5678')).toBe(true);
        expect(isValidPhone('12345678')).toBe(true);
        expect(isValidPhone('+1-555-123-4567')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
        expect(isValidPhone('123')).toBe(false);
        expect(isValidPhone('abc')).toBe(false);
    });
});
