import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Split } from 'lucide-react';
import type { Invoice } from '@/types';

interface InvoiceItemsTableProps {
    invoice: Invoice;
    setInvoice: (invoice: Invoice) => void;
    isLocked?: boolean;
}

const EXCESS_10MM_ID = 'excess-10mm-charge';

import { useInvoiceItems } from '@/hooks/invoicing/useInvoiceItems';

export function InvoiceItemsTable({ invoice, setInvoice, isLocked = false }: InvoiceItemsTableProps) {
    const {
        displayItems,
        splitStates,
        // setSplitStates, // Exposed if needed for direct manipulation, though hook handles main logic
        toggleSplit,
        hasExcess10mm,
        // EXCESS_10MM_ID // Imported from hook? No, we can keep const or import.
        // Actually let's import the ID if we need it for comparison
        onUpdateItem,
        onUpdateDescription
    } = useInvoiceItems(invoice, setInvoice);


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
                                            onChange={(e) => onUpdateDescription(index, e.target.value)}
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
                                            onChange={(e) => onUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                                        onChange={(e) => onUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
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
