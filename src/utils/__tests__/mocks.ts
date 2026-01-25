/**
 * Mock data for testing
 * Provides consistent test fixtures for customers, invoices, and products
 */

import type { Customer, Invoice, InvoiceItem, Product } from '@/types';

export const mockCustomer: Customer = {
    id: 'cust-001',
    name: 'Test Company LLC',
    email: 'test@company.com',
    phone: '+974 1234 5678',
    address: 'Building 1, Street 2, Zone 3, Doha, Qatar',
    total20mm: 0,
    total10mm: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockCustomers: Customer[] = [
    mockCustomer,
    {
        id: 'cust-002',
        name: 'Another Business',
        email: 'info@another.com',
        phone: '+974 9876 5432',
        address: 'Tower A, Road B, Area C',
        total20mm: 0,
        total10mm: 0,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
    },
];

export const mockInvoiceItem: InvoiceItem = {
    id: 'item-001',
    description: 'Gabbro 10mm',
    quantity: 100,
    unitPrice: 25,
    amount: 2500,
    type: '10mm',
};

export const mockInvoice: Invoice = {
    id: 'inv-001',
    number: '1001',
    date: '2026-01-15',
    dueDate: '2026-02-15',
    status: 'draft',
    from: {
        name: 'My Company',
        address: '123 Business St',
        phone: '+974 1111 2222',
        email: 'billing@mycompany.com',
    },
    to: {
        customerId: 'cust-001',
        name: 'Test Company LLC',
        email: 'test@company.com',
        phone: '+974 1234 5678',
        address: 'Building 1, Street 2, Zone 3, Doha, Qatar',
    },
    items: [
        mockInvoiceItem,
        {
            id: 'item-002',
            description: 'Gabbro 20mm',
            quantity: 50,
            unitPrice: 30,
            amount: 1500,
            type: '20mm',
        },
    ],
    subtotal: 4000,
    tax: 0,
    total: 4000,
    currency: 'QAR',
    notes: '',
    paymentTerms: 'Net 30',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
};

export const mockProduct: Product = {
    id: 'prod-001',
    name: 'Gabbro 10mm',
    type: '10mm',
    rate: 25,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockProducts: Product[] = [
    mockProduct,
    {
        id: 'prod-002',
        name: 'Gabbro 20mm',
        type: '20mm',
        rate: 30,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    },
];

/**
 * Create a deep clone of mock data for isolated tests
 */
export function cloneMockCustomer(overrides?: Partial<Customer>): Customer {
    return { ...mockCustomer, ...overrides };
}

export function cloneMockInvoice(overrides?: Partial<Invoice>): Invoice {
    return {
        ...mockInvoice,
        items: mockInvoice.items.map(item => ({ ...item })),
        to: { ...mockInvoice.to },
        from: { ...mockInvoice.from },
        ...overrides,
    };
}
