/**
 * Custom hook for customer management
 * Provides CRUD operations with loading states
 */

import { useState, useEffect, useCallback } from 'react';
import type { Customer } from '../types.d';

export function useCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCustomers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const res = await window.electron.getCustomers();
            if (res.success && res.customers) {
                setCustomers(res.customers);
            } else {
                setError(res.error || 'Failed to load customers');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveCustomer = useCallback(async (customer: Customer) => {
        try {
            const res = await window.electron.saveCustomer(customer);
            if (res.success) {
                await loadCustomers();
                return { success: true, id: res.id };
            }
            return { success: false, error: res.error };
        } catch (err) {
            return { 
                success: false, 
                error: err instanceof Error ? err.message : 'Unknown error' 
            };
        }
    }, [loadCustomers]);

    const deleteCustomer = useCallback(async (id: string) => {
        try {
            const res = await window.electron.deleteCustomer(id);
            if (res.success) {
                await loadCustomers();
                return { success: true };
            }
            return { success: false, error: res.error };
        } catch (err) {
            return { 
                success: false, 
                error: err instanceof Error ? err.message : 'Unknown error' 
            };
        }
    }, [loadCustomers]);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    return {
        customers,
        isLoading,
        error,
        loadCustomers,
        saveCustomer,
        deleteCustomer,
    };
}
