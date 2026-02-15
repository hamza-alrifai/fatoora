import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Invoice, InvoiceItem } from '@/types';
import { calculateAmount } from '@/utils/calculations';
import { recalculateInvoiceTotals } from '@/utils/invoice-item-utils';

export interface SplitState {
    itemId: string;
    firstQty: number;
    firstRate: number;
    secondRate: number;
}

const EXCESS_10MM_ID = 'excess-10mm-charge';

export function useInvoiceItems(
    invoice: Invoice,
    setInvoice: (invoice: Invoice) => void
) {
    const [splitStates, setSplitStates] = useState<Record<string, SplitState>>({});

    // --- Derived State for Excess Calculation ---
    const { regularItems, hasExcess10mm, excessQty } = useMemo(() => {
        const regularItems = invoice.items.filter(i => !i.id.includes('excess') && !i.description.toLowerCase().includes('excess'));

        const total10mm = regularItems
            .filter(i => i.type === '10mm' || i.description.toLowerCase().includes('10mm'))
            .reduce((acc, i) => acc + i.quantity, 0);

        const total20mm = regularItems
            .filter(i => i.type === '20mm' || i.description.toLowerCase().includes('20mm'))
            .reduce((acc, i) => acc + i.quantity, 0);

        const totalQty = total10mm + total20mm;
        const ratio10mm = totalQty > 0 ? (total10mm / totalQty) * 100 : 0;
        const hasExcess10mm = ratio10mm > 40;
        const excessQty = hasExcess10mm ? Math.round((total10mm - totalQty * 0.4) * 100) / 100 : 0;

        return { regularItems, hasExcess10mm, excessQty };
    }, [invoice.items]);

    // --- Effect: Handle Excess Item Logic ---
    useEffect(() => {
        const existingIndex = invoice.items.findIndex(i => i.id === EXCESS_10MM_ID);
        const firstRegular10mm = regularItems.find(i => i.type === '10mm' || i.description.toLowerCase().includes('10mm'));
        const defaultRate = firstRegular10mm?.unitPrice || 0;

        if (hasExcess10mm && excessQty > 0) {
            const excessAmount = calculateAmount(excessQty, defaultRate);

            if (existingIndex === -1) {
                if (defaultRate <= 0) return;
                const newItems = [
                    ...invoice.items,
                    {
                        id: EXCESS_10MM_ID,
                        description: 'Excess 10mm (>40%)',
                        quantity: excessQty,
                        unitPrice: defaultRate,
                        amount: excessAmount,
                        type: '10mm' as const
                    }
                ];
                setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
                return;
            }

            const existing = invoice.items[existingIndex];
            if (!existing) return;

            const needsUpdate =
                Math.abs(existing.quantity - excessQty) > 0.01 ||
                Math.abs(existing.unitPrice - defaultRate) > 0.01 ||
                Math.abs(existing.amount - excessAmount) > 0.01;

            if (needsUpdate) {
                const newItems = invoice.items.map((item, index) =>
                    index === existingIndex
                        ? { ...item, quantity: excessQty, unitPrice: defaultRate, amount: excessAmount }
                        : item
                );
                setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
            }
        } else if (!hasExcess10mm && existingIndex !== -1) {
            const newItems = invoice.items.filter((_, index) => index !== existingIndex);
            setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
        }
    }, [excessQty, hasExcess10mm, invoice, regularItems, setInvoice]);

    // --- Helper: Update Invoice with Splits ---
    const updateInvoiceWithSplits = useCallback((splits: Record<string, SplitState>) => {
        const baseItemsMap = new Map<string, InvoiceItem>();

        invoice.items.forEach(item => {
            if (item.id.includes('-split-')) {
                const baseId = item.id.replace(/-split-[12]$/, '');
                const existingBase = baseItemsMap.get(baseId);

                if (existingBase) {
                    existingBase.quantity += item.quantity;
                } else {
                    baseItemsMap.set(baseId, {
                        ...item,
                        id: baseId,
                        description: item.description.replace(/ \(Rate [12]\)$/, ''),
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        amount: item.amount
                    });
                }
            } else {
                if (!baseItemsMap.has(item.id)) {
                    baseItemsMap.set(item.id, { ...item });
                }
            }
        });

        const newItems: InvoiceItem[] = [];

        baseItemsMap.forEach((item, itemId) => {
            const split = splits[itemId];
            if (split) {
                const secondQty = Math.max(0, item.quantity - split.firstQty);
                newItems.push({
                    ...item,
                    id: `${itemId}-split-1`,
                    quantity: split.firstQty,
                    unitPrice: split.firstRate,
                    amount: Math.round(split.firstQty * split.firstRate * 100) / 100,
                    description: `${item.description} (Rate 1)`,
                });
                newItems.push({
                    ...item,
                    id: `${itemId}-split-2`,
                    quantity: secondQty,
                    unitPrice: split.secondRate,
                    amount: Math.round(secondQty * split.secondRate * 100) / 100,
                    description: `${item.description} (Rate 2)`,
                });
            } else {
                newItems.push(item);
            }
        });

        setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
    }, [invoice, setInvoice]);

    // --- Action: Toggle Split ---
    const toggleSplit = useCallback((item: InvoiceItem) => {
        const itemId = item.id;
        const isSplit = invoice.items.some(i => i.id === `${itemId}-split-1`);

        if (isSplit) {
            // Remove split
            const newSplitStates = { ...splitStates };
            delete newSplitStates[itemId];
            setSplitStates(newSplitStates);

            const split1 = invoice.items.find(i => i.id === `${itemId}-split-1`);
            const split2 = invoice.items.find(i => i.id === `${itemId}-split-2`);

            if (split1 && split2) {
                const mergedQty = split1.quantity + split2.quantity;
                const mergedItem: InvoiceItem = {
                    ...split1,
                    id: itemId,
                    quantity: mergedQty,
                    unitPrice: split1.unitPrice,
                    amount: Math.round(mergedQty * split1.unitPrice * 100) / 100,
                    description: split1.description.replace(' (Rate 1)', ''),
                };

                const newItems = invoice.items
                    .filter(i => !i.id.startsWith(`${itemId}-split-`))
                    .concat(mergedItem);

                setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
            }
        } else {
            // Enable split
            const newSplit: SplitState = {
                itemId,
                firstQty: Math.round(item.quantity / 2 * 100) / 100,
                firstRate: item.unitPrice,
                secondRate: item.unitPrice,
            };
            const newSplitStates = { ...splitStates, [itemId]: newSplit };
            setSplitStates(newSplitStates);
            updateInvoiceWithSplits(newSplitStates);
        }
    }, [invoice.items, splitStates, setSplitStates, updateInvoiceWithSplits, setInvoice]);

    // --- Derived: Display Items ---
    const displayItems = useMemo(() => {
        const existingExcess = invoice.items.find(i => i.id === EXCESS_10MM_ID);
        const item10mm = invoice.items.find(i => !i.id.includes('excess') && (i.type === '10mm' || i.description.toLowerCase().includes('10mm')));
        const defaultRate = item10mm?.unitPrice || 0;

        if (hasExcess10mm) {
            if (existingExcess) {
                if (Math.abs(existingExcess.quantity - excessQty) > 0.01) {
                    return invoice.items.map(i =>
                        i.id === EXCESS_10MM_ID
                            ? { ...i, quantity: excessQty, amount: Math.round(excessQty * i.unitPrice * 100) / 100 }
                            : i
                    );
                }
                return invoice.items;
            } else if (defaultRate > 0) {
                return [...invoice.items, {
                    id: EXCESS_10MM_ID,
                    description: 'Excess 10mm (>40%)',
                    quantity: excessQty,
                    unitPrice: defaultRate,
                    amount: Math.round(excessQty * defaultRate * 100) / 100,
                    type: '10mm' as const
                }];
            }
        } else if (existingExcess) {
            return invoice.items.filter(i => i.id !== EXCESS_10MM_ID);
        }

        return invoice.items;
    }, [invoice.items, hasExcess10mm, excessQty]); // Added dependencies

    // --- Action: Update Item Description ---
    const onUpdateDescription = useCallback((index: number, newDescription: string) => {
        const newItems = [...invoice.items];
        newItems[index] = { ...newItems[index], description: newDescription };
        setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
    }, [invoice, setInvoice]);

    // --- Action: Update Item Quantity or Rate ---
    const onUpdateItem = useCallback((index: number, field: 'quantity' | 'unitPrice', value: number) => {
        const item = invoice.items[index];
        const isExcess = item.id === EXCESS_10MM_ID || item.description.includes('Excess');
        const isSplitItem = item.id.includes('-split-');

        // Handle Unit Price Update
        if (field === 'unitPrice') {
            const amount = calculateAmount(item.quantity, value);

            // Excess Item Logic
            if (isExcess) {
                const excessItem: InvoiceItem = { ...item, unitPrice: value, amount };
                const existingIndex = invoice.items.findIndex(i => i.id === EXCESS_10MM_ID);
                if (existingIndex >= 0) {
                    const newItems = [...invoice.items];
                    newItems[existingIndex] = excessItem;
                    setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
                } else {
                    setInvoice(recalculateInvoiceTotals({ ...invoice, items: [...invoice.items, excessItem] }));
                }
                return;
            }

            const newItems = [...invoice.items];
            newItems[index] = { ...item, unitPrice: value, amount };

            // Split Logic Update (Preserve rates)
            if (isSplitItem) {
                const baseId = item.id.replace(/-split-[12]$/, '');
                const existingSplit = splitStates[baseId];
                if (existingSplit) {
                    const newSplitStates = {
                        ...splitStates,
                        [baseId]: {
                            ...existingSplit,
                            firstRate: item.id.endsWith('-split-1') ? value : existingSplit.firstRate,
                            secondRate: item.id.endsWith('-split-2') ? value : existingSplit.secondRate
                        }
                    };
                    setSplitStates(newSplitStates);
                }
            }

            setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
            return;
        }

        // Handle Quantity Update
        if (field === 'quantity') {
            const newItems = [...invoice.items];

            if (isSplitItem) {
                const baseId = item.id.replace(/-split-[12]$/, '');
                const isSplit1 = item.id.endsWith('-split-1');
                const split1 = invoice.items.find(i => i.id === `${baseId}-split-1`);
                const split2 = invoice.items.find(i => i.id === `${baseId}-split-2`);

                if (split1 && split2) {
                    const totalQty = split1.quantity + split2.quantity;

                    if (isSplit1) {
                        const newSplit2Qty = Math.max(0, totalQty - value);
                        const split2Index = invoice.items.findIndex(i => i.id === split2.id);
                        newItems[index] = { ...item, quantity: value, amount: calculateAmount(value, item.unitPrice) };
                        newItems[split2Index] = { ...split2, quantity: newSplit2Qty, amount: calculateAmount(newSplit2Qty, split2.unitPrice) };

                        const existingSplit = splitStates[baseId];
                        if (existingSplit) {
                            setSplitStates({ ...splitStates, [baseId]: { ...existingSplit, firstQty: value } });
                        }
                    } else {
                        const newSplit1Qty = Math.max(0, totalQty - value);
                        const split1Index = invoice.items.findIndex(i => i.id === split1.id);
                        newItems[index] = { ...item, quantity: value, amount: calculateAmount(value, item.unitPrice) };
                        newItems[split1Index] = { ...split1, quantity: newSplit1Qty, amount: calculateAmount(newSplit1Qty, split1.unitPrice) };

                        const existingSplit = splitStates[baseId];
                        if (existingSplit) {
                            setSplitStates({ ...splitStates, [baseId]: { ...existingSplit, firstQty: newSplit1Qty } });
                        }
                    }
                }
            } else {
                const amount = calculateAmount(value, item.unitPrice);
                newItems[index] = { ...item, quantity: value, amount };
            }

            setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
        }

    }, [invoice, setInvoice, splitStates, setSplitStates]);

    return {
        displayItems,
        splitStates,
        setSplitStates,
        toggleSplit,
        onUpdateItem,
        onUpdateDescription,
        hasExcess10mm,
        EXCESS_10MM_ID
    };
}
