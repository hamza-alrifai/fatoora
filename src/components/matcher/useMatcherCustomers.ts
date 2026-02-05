import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Customer } from '../../types.d';
import type { CustomerData } from '@/components/customers/CustomerCreationDialog';
import type { FileGenConfig } from '@/hooks/useMatcherState';

export function useMatcherCustomers(params: {
    fileGenConfigs: Record<string, FileGenConfig>;
    groupTotals: Record<string, { total: number; t10: number; t20: number }>;
    onTargetLabelUpdate: (targetIndex: number, label: string) => void;
}) {
    const { fileGenConfigs, groupTotals, onTargetLabelUpdate } = params;

    const [customers, setCustomers] = useState<Customer[]>([]);

    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [creatingCustomerForTargetIndex, setCreatingCustomerForTargetIndex] = useState<number | null>(null);

    const loadCustomers = useCallback(async () => {
        const res = await window.electron.getCustomers();
        if (res.success && res.customers) {
            setCustomers(res.customers);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    const customerProjections = useMemo(() => {
        const proj: Record<string, { t10: number; t20: number }> = {};

        customers.forEach(c => {
            proj[c.id] = { t10: c.total10mm || 0, t20: c.total20mm || 0 };
        });

        Object.entries(fileGenConfigs).forEach(([groupName, config]) => {
            if (config.customerId && groupTotals[groupName]) {
                const cid = config.customerId;
                if (!proj[cid]) proj[cid] = { t10: 0, t20: 0 };

                proj[cid].t10 += groupTotals[groupName].t10;
                proj[cid].t20 += groupTotals[groupName].t20;
            }
        });

        return proj;
    }, [customers, fileGenConfigs, groupTotals]);

    const startCreatingCustomerForTarget = useCallback((targetIndex: number) => {
        setCreatingCustomerForTargetIndex(targetIndex);
        setIsCreatingCustomer(true);
    }, []);

    const handleCreateCustomer = useCallback(
        async (data: CustomerData) => {
            if (!data.name.trim()) {
                toast.error('Customer name is required');
                return false;
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
                await loadCustomers();

                if (creatingCustomerForTargetIndex !== null) {
                    onTargetLabelUpdate(creatingCustomerForTargetIndex, newCustomer.name);
                    setCreatingCustomerForTargetIndex(null);
                }

                setIsCreatingCustomer(false);
                return true;
            }

            toast.error(result.error || 'Failed to create customer');
            return false;
        },
        [creatingCustomerForTargetIndex, loadCustomers, onTargetLabelUpdate]
    );

    return {
        customers,
        loadCustomers,
        customerProjections,
        isCreatingCustomer,
        setIsCreatingCustomer,
        startCreatingCustomerForTarget,
        handleCreateCustomer,
    };
}
