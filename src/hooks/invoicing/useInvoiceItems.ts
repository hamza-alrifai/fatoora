import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Invoice, InvoiceItem, Customer } from '@/types';
import { calculateAmount } from '@/utils/calculations';
import { recalculateInvoiceTotals } from '@/utils/invoice-item-utils';
import { calculatePricingModifiers } from '@/utils/pricing-utils';

export function useInvoiceItems(
    invoice: Invoice,
    setInvoice: (invoice: Invoice) => void,
    customer?: Customer | null
) {

    // --- Action: Update Item Description ---
    const onUpdateDescription = useCallback((id: string, newDescription: string) => {
        const itemIndex = invoice.items.findIndex(i => i.id === id);
        if (itemIndex >= 0) {
            const newItems = [...invoice.items];
            newItems[itemIndex] = { ...newItems[itemIndex], description: newDescription };
            setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
        }
    }, [invoice, setInvoice]);

    // --- Action: Update Item Quantity or Rate ---
    const onUpdateItem = useCallback((id: string, field: 'quantity' | 'unitPrice', value: number) => {
        const itemIndex = invoice.items.findIndex(i => i.id === id);
        if (itemIndex >= 0) {
            const item = invoice.items[itemIndex];
            const newItems = [...invoice.items];

            if (field === 'unitPrice') {
                const amount = calculateAmount(item.quantity, value);
                newItems[itemIndex] = { ...item, unitPrice: value, amount };
            } else if (field === 'quantity') {
                const amount = calculateAmount(value, item.unitPrice);
                newItems[itemIndex] = { ...item, quantity: value, amount };
            }

            const newManualSplits = invoice.manualSplits;
            setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems, manualSplits: newManualSplits }));
        } else if (id === 'excess-10mm-surcharge') {
            // Excess modifier rate edit — save the rate override on the invoice
            if (field === 'unitPrice') {
                setInvoice(recalculateInvoiceTotals({ ...invoice, excessPenaltyRate: value }));
            }
        } else if (invoice.manualSplits) {
            // Split modifier edit (id ends with -split-surcharge)
            const baseId = id.replace('-split-surcharge', '');
            if (invoice.manualSplits[baseId]) {
                const currentSplit = invoice.manualSplits[baseId];
                const newManualSplits = { ...invoice.manualSplits };
                if (field === 'quantity') {
                    newManualSplits[baseId] = { ...currentSplit, splitQty: value };
                } else if (field === 'unitPrice') {
                    newManualSplits[baseId] = { ...currentSplit, splitRate: value };
                }
                setInvoice(recalculateInvoiceTotals({ ...invoice, manualSplits: newManualSplits }));
            }
        }
    }, [invoice, setInvoice]);

    // --- Action: Toggle Split ---
    const toggleSplit = useCallback((item: InvoiceItem) => {
        if (!item.id) return;

        const newManualSplits = { ...(invoice.manualSplits || {}) };

        if (newManualSplits[item.id]) {
            delete newManualSplits[item.id];
        } else {
            newManualSplits[item.id] = {
                splitQty: Math.floor(item.quantity / 2),
                baseRate: item.unitPrice,
                splitRate: item.unitPrice + 1
            };
        }

        setInvoice(recalculateInvoiceTotals({ ...invoice, manualSplits: newManualSplits }));
    }, [invoice, setInvoice]);

    // Build display items: base items + dynamically generated modifiers (splits + excess)
    const displayItems = useMemo(() => {
        if (!invoice.items) return [];

        // Strip ALL dynamic modifiers from persisted array (splits + excess)
        const baseItems = invoice.items.filter(i =>
            !i.id?.endsWith('-split-surcharge') && i.id !== 'excess-10mm-surcharge'
        );

        const pricingCustomer: Customer = customer || {
            id: invoice.to.customerId || '',
            name: invoice.to.name,
            address: invoice.to.address,
            total10mm: 0,
            total20mm: 0,
            createdAt: '',
            updatedAt: ''
        };

        const dynamicModifiers = calculatePricingModifiers(
            baseItems, pricingCustomer, invoice.manualSplits,
            invoice.disableExcessPricing, invoice.excessPenaltyRate
        );

        // Weave split modifiers right below their base items
        const wovenItems: InvoiceItem[] = [];
        baseItems.forEach(item => {
            const splitMod = dynamicModifiers.find(mod => mod.id === `${item.id}-split-surcharge`);

            // DESTRUCTIVE SPLIT: reduce base quantity by split amount
            if (invoice.manualSplits && invoice.manualSplits[item.id!]) {
                const splitQty = invoice.manualSplits[item.id!].splitQty;
                const reducedQty = Math.max(0, item.quantity - splitQty);
                wovenItems.push({ ...item, quantity: reducedQty, amount: calculateAmount(reducedQty, item.unitPrice) });
            } else {
                wovenItems.push(item);
            }

            if (splitMod) {
                wovenItems.push({ ...splitMod, description: item.description });
            }
        });

        // Append non-split modifiers (excess penalty) at the bottom
        const excessModifiers = dynamicModifiers.filter(m => !m.id?.endsWith('-split-surcharge'));

        return [...wovenItems, ...excessModifiers];
    }, [invoice.items, invoice.manualSplits, invoice.to, invoice.disableExcessPricing, invoice.excessPenaltyRate, customer]);

    // Whether an excess modifier row exists
    const hasExcess = displayItems.some(item => item.id === 'excess-10mm-surcharge');

    // Sync invoice totals with displayItems (includes dynamic modifiers)
    const displaySubtotal = useMemo(() => {
        return Math.round(displayItems.reduce((sum, item) => sum + (item.amount || 0), 0) * 100) / 100;
    }, [displayItems]);

    // Use ref to avoid stale closure when syncing totals
    const invoiceRef = useRef(invoice);
    invoiceRef.current = invoice;

    useEffect(() => {
        if (displaySubtotal !== invoiceRef.current.subtotal) {
            setInvoice({
                ...invoiceRef.current,
                subtotal: displaySubtotal,
                total: displaySubtotal
            });
        }
    }, [displaySubtotal, setInvoice]);

    return {
        displayItems,
        hasExcess,
        onUpdateItem,
        onUpdateDescription,
        toggleSplit,
        manualSplits: invoice.manualSplits || {}
    };
}
