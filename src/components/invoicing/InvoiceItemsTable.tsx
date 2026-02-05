import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculateAmount } from '@/utils/calculations';
import { recalculateInvoiceTotals } from '@/utils/invoice-item-utils';
import { cn } from '@/lib/utils';
import { Split } from 'lucide-react';
import type { Invoice, InvoiceItem } from '@/types';

interface InvoiceItemsTableProps {
    invoice: Invoice;
    setInvoice: (invoice: Invoice) => void;
    isLocked?: boolean;
}

interface SplitState {
    itemId: string;
    firstQty: number;
    firstRate: number;
    secondRate: number;
}

const EXCESS_10MM_ID = 'excess-10mm-charge';

export function InvoiceItemsTable({ invoice, setInvoice, isLocked = false }: InvoiceItemsTableProps) {
    const [splitStates, setSplitStates] = useState<Record<string, SplitState>>({});

    // Calculate 10mm percentage for excess detection (excluding excess items)
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
            if (!existing) {
                return;
            }

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

    // Get items to display - add excess row if needed
    const displayItems = (() => {
        const existingExcess = invoice.items.find(i => i.id === EXCESS_10MM_ID);
        const item10mm = invoice.items.find(i => !i.id.includes('excess') && (i.type === '10mm' || i.description.toLowerCase().includes('10mm')));
        const defaultRate = item10mm?.unitPrice || 0;
        
        if (hasExcess10mm) {
            if (existingExcess) {
                // Update existing excess quantity if different
                if (Math.abs(existingExcess.quantity - excessQty) > 0.01) {
                    return invoice.items.map(i => 
                        i.id === EXCESS_10MM_ID 
                            ? { ...i, quantity: excessQty, amount: Math.round(excessQty * i.unitPrice * 100) / 100 }
                            : i
                    );
                }
                return invoice.items;
            } else if (defaultRate > 0) {
                // Add new excess row
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
            // Remove excess if no longer needed
            return invoice.items.filter(i => i.id !== EXCESS_10MM_ID);
        }
        
        return invoice.items;
    })();

    const toggleSplit = (item: InvoiceItem) => {
        const itemId = item.id;
        // Check if this item is already split (look for split items)
        const isSplit = invoice.items.some(i => i.id === `${itemId}-split-1`);
        
        if (isSplit) {
            // Remove split - merge back to single item
            const newSplitStates = { ...splitStates };
            delete newSplitStates[itemId];
            setSplitStates(newSplitStates);
            
            // Find the split items and merge them back
            const split1 = invoice.items.find(i => i.id === `${itemId}-split-1`);
            const split2 = invoice.items.find(i => i.id === `${itemId}-split-2`);
            
            if (split1 && split2) {
                const mergedQty = split1.quantity + split2.quantity;
                const mergedItem: InvoiceItem = {
                    ...split1,
                    id: itemId,
                    quantity: mergedQty,
                    unitPrice: split1.unitPrice, // Use first rate as default
                    amount: Math.round(mergedQty * split1.unitPrice * 100) / 100,
                    description: split1.description.replace(' (Rate 1)', ''),
                };
                
                const newItems = invoice.items
                    .filter(i => !i.id.startsWith(`${itemId}-split-`))
                    .concat(mergedItem);
                
                setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
            }
        } else {
            // Enable split - default to 50/50
            const newSplit: SplitState = {
                itemId,
                firstQty: Math.round(item.quantity / 2 * 100) / 100,
                firstRate: item.unitPrice,
                secondRate: item.unitPrice,
            };
            const newSplitStates = {
                ...splitStates,
                [itemId]: newSplit
            };
            setSplitStates(newSplitStates);
            updateInvoiceWithSplits(newSplitStates);
        }
    };

    
    const updateInvoiceWithSplits = (splits: Record<string, SplitState>) => {
        // First, reconstruct base items from current invoice items
        // This handles cases where items are already split
        const baseItemsMap = new Map<string, InvoiceItem>();
        
        invoice.items.forEach(item => {
            if (item.id.includes('-split-')) {
                // This is a split item, reconstruct the base item
                const baseId = item.id.replace(/-split-[12]$/, '');
                const existingBase = baseItemsMap.get(baseId);
                
                if (existingBase) {
                    // Merge quantities from both split parts
                    existingBase.quantity += item.quantity;
                } else {
                    // Create base item from first split part
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
                // Regular item, add as-is if not already present
                if (!baseItemsMap.has(item.id)) {
                    baseItemsMap.set(item.id, { ...item });
                }
            }
        });
        
        // Now apply splits to the base items
        const newItems: InvoiceItem[] = [];
        
        baseItemsMap.forEach((item, itemId) => {
            const split = splits[itemId];
            if (split) {
                const secondQty = Math.max(0, item.quantity - split.firstQty);
                
                // Create first split item
                newItems.push({
                    ...item,
                    id: `${itemId}-split-1`,
                    quantity: split.firstQty,
                    unitPrice: split.firstRate,
                    amount: Math.round(split.firstQty * split.firstRate * 100) / 100,
                    description: `${item.description} (Rate 1)`,
                });
                
                // Create second split item
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
    };


    return (
        <div style={{ marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f5f5f7' }}>
                        <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '140px', borderBottom: '1px solid #d2d2d7' }}>
                            Description
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '90px', borderBottom: '1px solid #d2d2d7' }}>
                            Qty (Tons)
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '50px', borderBottom: '1px solid #d2d2d7' }}>
                            Mix %
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '80px', borderBottom: '1px solid #d2d2d7' }}>
                            Rate
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '90px', borderBottom: '1px solid #d2d2d7' }}>
                            Amount
                        </th>
                        <th style={{ textAlign: 'center', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '50px', borderBottom: '1px solid #d2d2d7' }}>
                            Split
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {displayItems.map((item, index) => {
                        const isExcess = item.id === EXCESS_10MM_ID || item.description.includes('Excess');
                        const isSplitItem = item.id.includes('-split-');
                        const is10mm = !isSplitItem && !isExcess && (item.type === '10mm' || item.description.toLowerCase().includes('10mm'));
                        const itemTotalQty = invoice.items.reduce((acc, i) => acc + i.quantity, 0);
                        const isRate2 = item.id.endsWith('-split-2');
                        // Show split button for regular items and first split item (to allow removal)
                        const canShowSplitButton = !item.id.includes('excess') && (!isSplitItem || item.id.endsWith('-split-1'));
                        const baseItemId = isSplitItem ? item.id.replace(/-split-[12]$/, '') : item.id;
                        const isCurrentlySplit = invoice.items.some(i => i.id === `${baseItemId}-split-1`);

                        return (
                            <tr key={item.id || index} className={cn(
                                "transition-colors",
                                isSplitItem && "bg-blue-50/40",
                                isRate2 && "bg-orange-50/40",
                                isExcess && "bg-orange-50/40 border-l-4 border-l-orange-400"
                            )}>
                                <td style={{ padding: '8px 8px', borderBottom: '1px solid #e8e8ed', position: 'relative' }}>
                                    <div className="flex items-center gap-2">
                                        {isExcess && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-200 text-orange-800 border border-orange-300">
                                                EXCESS
                                            </span>
                                        )}
                                        <Input
                                            value={item.description}
                                            onChange={(e) => {
                                                const newItems = [...invoice.items];
                                                newItems[index] = { ...item, description: e.target.value };
                                                setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
                                            }}
                                            disabled={isLocked}
                                            className={cn(
                                                "p-1 h-auto border-none bg-transparent",
                                                "hover:bg-blue-50/50 hover:text-blue-700 hover:shadow-sm",
                                                "focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md",
                                                "transition-all duration-200 ease-out -mx-1 rounded-md w-full cursor-text",
                                                "disabled:opacity-70 disabled:cursor-not-allowed font-normal",
                                                "!text-[14px]",
                                                isExcess ? "text-orange-600" : "text-[#1d1d1f]",
                                                is10mm && hasExcess10mm && "text-orange-600",
                                                isRate2 && "text-orange-600"
                                            )}
                                            style={{ fontFamily: 'inherit' }}
                                        />
                                    </div>
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', borderBottom: '1px solid #e8e8ed' }}>
                                    {isExcess ? (
                                        <div className="text-orange-700 font-medium" style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums', padding: '4px 0' }}>
                                            {item.quantity.toFixed(2)}
                                        </div>
                                    ) : (
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newItems = [...invoice.items];
                                                
                                                // If this is a split item, adjust the other split's quantity
                                            if (isSplitItem) {
                                                const baseId = item.id.replace(/-split-[12]$/, '');
                                                const isSplit1 = item.id.endsWith('-split-1');
                                                const split1 = invoice.items.find(i => i.id === `${baseId}-split-1`);
                                                const split2 = invoice.items.find(i => i.id === `${baseId}-split-2`);
                                                
                                                if (split1 && split2) {
                                                    const totalQty = split1.quantity + split2.quantity;
                                                    
                                                    if (isSplit1) {
                                                        // Changing split-1, adjust split-2
                                                        const newSplit2Qty = Math.max(0, totalQty - val);
                                                        const split2Index = invoice.items.findIndex(i => i.id === split2.id);
                                                        newItems[index] = { ...item, quantity: val, amount: calculateAmount(val, item.unitPrice) };
                                                        newItems[split2Index] = { ...split2, quantity: newSplit2Qty, amount: calculateAmount(newSplit2Qty, split2.unitPrice) };
                                                        
                                                        // Update splitStates
                                                        const existingSplit = splitStates[baseId];
                                                        if (existingSplit) {
                                                            setSplitStates({
                                                                ...splitStates,
                                                                [baseId]: { ...existingSplit, firstQty: val }
                                                            });
                                                        }
                                                    } else {
                                                        // Changing split-2, adjust split-1
                                                        const newSplit1Qty = Math.max(0, totalQty - val);
                                                        const split1Index = invoice.items.findIndex(i => i.id === split1.id);
                                                        newItems[index] = { ...item, quantity: val, amount: calculateAmount(val, item.unitPrice) };
                                                        newItems[split1Index] = { ...split1, quantity: newSplit1Qty, amount: calculateAmount(newSplit1Qty, split1.unitPrice) };
                                                        
                                                        // Update splitStates
                                                        const existingSplit = splitStates[baseId];
                                                        if (existingSplit) {
                                                            setSplitStates({
                                                                ...splitStates,
                                                                [baseId]: { ...existingSplit, firstQty: newSplit1Qty }
                                                            });
                                                        }
                                                    }
                                                }
                                            } else {
                                                // Regular item, just update quantity
                                                const amount = calculateAmount(val, item.unitPrice);
                                                newItems[index] = { ...item, quantity: val, amount };
                                            }
                                            
                                            setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
                                            }}
                                            disabled={isLocked}
                                            className={cn(
                                                "p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md text-right w-full cursor-text",
                                                "disabled:opacity-70 disabled:cursor-not-allowed font-normal",
                                                "!text-[14px]",
                                                isRate2 && "text-orange-600"
                                            )}
                                            style={{ color: isRate2 ? undefined : '#6e6e73', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                                        />
                                    )}
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', color: '#6e6e73', borderBottom: '1px solid #e8e8ed', fontSize: '14px', fontVariantNumeric: 'tabular-nums', fontWeight: 400 }}>
                                    {itemTotalQty > 0 ? ((item.quantity / itemTotalQty) * 100).toFixed(1) + '%' : '-'}
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', borderBottom: '1px solid #e8e8ed' }}>
                                    <Input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const amount = calculateAmount(item.quantity, val);
                                            
                                            // Handle excess item - add to invoice if not already there, otherwise update
                                            if (isExcess) {
                                                const excessItem: InvoiceItem = {
                                                    ...item,
                                                    unitPrice: val,
                                                    amount
                                                };
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
                                            const actualIndex = invoice.items.findIndex(i => i.id === item.id);
                                            if (actualIndex >= 0) {
                                                newItems[actualIndex] = { ...item, unitPrice: val, amount };
                                            }
                                            
                                            // If this is a split item, update splitStates to preserve the rate
                                            if (isSplitItem) {
                                                const baseId = item.id.replace(/-split-[12]$/, '');
                                                const existingSplit = splitStates[baseId];
                                                if (existingSplit) {
                                                    const newSplitStates = {
                                                        ...splitStates,
                                                        [baseId]: {
                                                            ...existingSplit,
                                                            firstRate: item.id.endsWith('-split-1') ? val : existingSplit.firstRate,
                                                            secondRate: item.id.endsWith('-split-2') ? val : existingSplit.secondRate
                                                        }
                                                    };
                                                    setSplitStates(newSplitStates);
                                                }
                                            }
                                            
                                            setInvoice(recalculateInvoiceTotals({ ...invoice, items: newItems }));
                                        }}
                                        disabled={isLocked}
                                        className={cn(
                                            "p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md text-right w-full cursor-text",
                                            "disabled:opacity-70 disabled:cursor-not-allowed font-normal",
                                            "!text-[14px]",
                                            isRate2 && "text-orange-600"
                                        )}
                                        style={{ color: isRate2 ? undefined : '#6e6e73', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                                    />
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', color: isRate2 ? '#ea580c' : '#1d1d1f', fontWeight: 400, borderBottom: '1px solid #e8e8ed', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                    {(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'center', borderBottom: '1px solid #e8e8ed' }}>
                                    {canShowSplitButton && !isLocked && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                // Find the base item to toggle
                                                const baseItem = invoice.items.find(i => i.id === baseItemId || i.id === `${baseItemId}-split-1`);
                                                if (baseItem) {
                                                    toggleSplit({ ...baseItem, id: baseItemId });
                                                }
                                            }}
                                            className={cn(
                                                "h-7 w-7 p-0",
                                                isCurrentlySplit ? "text-blue-600 bg-blue-100 hover:bg-blue-200" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                            )}
                                            title={isCurrentlySplit ? "Remove split pricing" : "Enable split pricing"}
                                        >
                                            <Split className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Split Pricing Legend */}
            {Object.keys(splitStates).length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                    <span className="font-semibold">Split Pricing:</span>
                    <span className="ml-1">
                        Divide quantity into two parts with different rates. Blue row = first portion, Orange row = second portion. 
                        Second quantity auto-adjusts to match total.
                    </span>
                </div>
            )}
        </div>
    );
}
