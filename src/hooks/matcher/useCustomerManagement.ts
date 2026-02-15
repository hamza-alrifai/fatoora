import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Customer } from '../../types.d';
import type { CustomerData } from '@/components/customers/CustomerCreationDialog';

export function useCustomerManagement() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    // Track which target file index triggered the creation flow
    const [creatingCustomerForTargetIndex, setCreatingCustomerForTargetIndex] = useState<number | null>(null);

    const loadCustomers = useCallback(async () => {
        try {
            const res = await window.electron.getCustomers();
            if (res.success && res.customers) {
                setCustomers(res.customers);
            }
        } catch (error) {
            console.error("Failed to load customers:", error);
            toast.error("Failed to load customers");
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    const handleCreateCustomer = useCallback(
        async (data: CustomerData, onSuccess?: (newCustomer: Customer) => void) => {
            if (!data.name.trim()) {
                toast.error('Customer name is required');
                return;
            }

            const newCustomer: Customer = {
                id: '',
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                total20mm: 0,
                total10mm: 0,
                createdAt: '',
                updatedAt: '',
            };

            const result = await window.electron.saveCustomer(newCustomer);
            if (result.success && result.id) {
                toast.success('Customer created!');
                await loadCustomers(); // Refresh list

                // Perform any specific success actions (like updating a target label)
                if (onSuccess) {
                    onSuccess({ ...newCustomer, id: result.id });
                }

                setIsCustomerDialogOpen(false);
                setIsCreatingCustomer(false);
            } else {
                toast.error(result.error || 'Failed to create customer');
            }
        },
        [loadCustomers]
    );

    return {
        customers,
        loadCustomers,
        isCustomerDialogOpen,
        setIsCustomerDialogOpen,
        isCreatingCustomer,
        setIsCreatingCustomer,
        creatingCustomerForTargetIndex,
        setCreatingCustomerForTargetIndex,
        handleCreateCustomer
    };
}
