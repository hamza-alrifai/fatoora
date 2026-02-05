/**
 * Custom hook for managing Invoice workspace state
 * Handles invoice loading, editing, and deletion
 */

import { useState, useEffect, useCallback } from 'react';

export interface Invoice {
    id: string;
    number: string;
    date: string;
    status: 'draft' | 'issued' | 'paid' | 'overdue';
    from: {
        name: string;
        address: string;
        email: string;
        phone: string;
    };
    to: {
        customerId?: string;
        name: string;
        address: string;
        email: string;
        phone: string;
    };
    items: Array<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
}

export function useInvoiceState() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadInvoices = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const res = await window.electron.getInvoices();
            if (res.success && res.invoices) {
                setInvoices(res.invoices as Invoice[]);
            } else {
                setError(res.error || 'Failed to load invoices');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveInvoice = useCallback(async (invoice: Invoice) => {
        try {
            const res = await window.electron.saveInvoice(invoice);
            if (res.success) {
                await loadInvoices();
                return { success: true, id: res.id };
            }
            return { success: false, error: res.error };
        } catch (err) {
            return { 
                success: false, 
                error: err instanceof Error ? err.message : 'Unknown error' 
            };
        }
    }, [loadInvoices]);

    const deleteInvoice = useCallback(async (id: string) => {
        try {
            const res = await window.electron.deleteInvoice(id);
            if (res.success) {
                await loadInvoices();
                return { success: true };
            }
            return { success: false, error: res.error };
        } catch (err) {
            return { 
                success: false, 
                error: err instanceof Error ? err.message : 'Unknown error' 
            };
        }
    }, [loadInvoices]);

    const generatePDF = useCallback(async (invoice: Invoice, appUrl: string) => {
        try {
            const res = await window.electron.generateSecureInvoice(invoice, appUrl);
            return { success: res.success, error: res.error };
        } catch (err) {
            return { 
                success: false, 
                error: err instanceof Error ? err.message : 'Unknown error' 
            };
        }
    }, []);

    useEffect(() => {
        loadInvoices();
        
        // Listen for background service updates
        const handleInvoicesUpdated = () => {
            console.log('[Frontend] Received invoices-updated event, reloading...');
            loadInvoices();
        };
        
        // Add listener for background service updates
        if (window.electron?.on) {
            window.electron.on('invoices-updated', handleInvoicesUpdated);
        }
        
        // Cleanup
        return () => {
            if (window.electron?.removeListener) {
                window.electron.removeListener('invoices-updated', handleInvoicesUpdated);
            }
        };
    }, [loadInvoices]);

    return {
        invoices,
        isLoading,
        error,
        loadInvoices,
        saveInvoice,
        deleteInvoice,
        generatePDF,
    };
}
