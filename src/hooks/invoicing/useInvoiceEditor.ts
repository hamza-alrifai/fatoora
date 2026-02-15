import { useState, useEffect, useCallback } from 'react';
import type { Invoice, Customer, BankingDetails } from '@/types';
import { sanitizeAndConsolidateItems, recalculateInvoiceTotals } from '@/utils/invoice-item-utils';

interface UseInvoiceEditorProps {
    initialInvoice: Invoice;
    onSave: (invoice: Invoice) => void;
}

export function useInvoiceEditor({ initialInvoice, onSave }: UseInvoiceEditorProps) {
    const [invoice, setInvoice] = useState<Invoice>(() => ({
        ...initialInvoice,
        items: initialInvoice.items.map(item => ({
            ...item,
            quantity: Math.round(item.quantity * 100) / 100,
            amount: Math.round(item.amount * 100) / 100
        }))
    }));
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);

    // Invoice is locked if it's not a draft
    const isLocked = invoice.status !== 'draft';

    useEffect(() => {
        setInvoice(sanitizeAndConsolidateItems(initialInvoice));
    }, [initialInvoice]);

    useEffect(() => {
        loadCustomers();
        loadBankingDetails();
    }, []);

    // Sync customer details when customers list loads (to update old drafts)
    useEffect(() => {
        if (invoice.to.customerId && customers.length > 0) {
            const customer = customers.find(c => c.id === invoice.to.customerId);
            if (customer) {
                // Check if we need to update to avoid infinite loops (simple equality check)
                const needsUpdate =
                    invoice.to.name !== customer.name ||
                    invoice.to.address !== customer.address ||
                    invoice.to.phone !== (customer.phone || '') ||
                    invoice.to.email !== (customer.email || '');

                if (needsUpdate) {
                    console.log('Auto-syncing customer details from DB...');
                    setInvoice(prev => ({
                        ...prev,
                        to: {
                            ...prev.to,
                            name: customer.name,
                            address: customer.address,
                            email: customer.email || '',
                            phone: customer.phone || ''
                        }
                    }));
                }
            }
        }
    }, [customers, invoice.to.customerId, invoice.to.name, invoice.to.address, invoice.to.phone, invoice.to.email]);

    const loadBankingDetails = async () => {
        const result = await window.electron.getBankingDetails();
        if (result.success && result.data) {
            setBankingDetails(result.data);
        }
    };

    const loadCustomers = async () => {
        try {
            console.log('Fetching customers...');
            const result = await window.electron.getCustomers();
            console.log('Customers fetch result:', result);
            if (result.success && result.customers) {
                setCustomers(result.customers);
            }
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    };

    const handleChange = useCallback((field: keyof Invoice, value: any) => {
        if (isLocked) return; // Prevent changes to locked invoices
        setInvoice(prev => ({ ...prev, [field]: value }));
    }, [isLocked]);

    const handleSave = useCallback(() => {
        onSave(recalculateInvoiceTotals(invoice));
    }, [invoice, onSave]);

    return {
        invoice,
        setInvoice,
        customers,
        bankingDetails,
        isLocked,
        handleChange,
        handleSave,
        loadCustomers // Exposed if manual reload needed
    };
}
