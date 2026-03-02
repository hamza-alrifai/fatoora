import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Invoice, Customer } from '@/types';
import { useInvoiceItems } from '@/hooks/invoicing/useInvoiceItems';

interface InvoiceItemsTableProps {
    invoice: Invoice;
    setInvoice: (invoice: Invoice) => void;
    isLocked?: boolean;
    customer?: Customer | null;
}

export function InvoiceItemsTable({ invoice, setInvoice, isLocked = false, customer }: InvoiceItemsTableProps) {
    const {
        displayItems,
        onUpdateItem,
        onUpdateDescription,
        toggleSplit,
        manualSplits
    } = useInvoiceItems(invoice, setInvoice, customer);

    return (
        <div style={{ marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f5f5f7' }}>
                        <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '200px', borderBottom: '1px solid #d2d2d7' }}>
                            Description
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '90px', borderBottom: '1px solid #d2d2d7' }}>
                            Qty (Tons)
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '60px', borderBottom: '1px solid #d2d2d7' }}>
                            Mix %
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '80px', borderBottom: '1px solid #d2d2d7' }}>
                            Rate
                        </th>
                        <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '100px', borderBottom: '1px solid #d2d2d7' }}>
                            Amount
                        </th>
                        {!isLocked && (
                            <th style={{ width: '40px', padding: '10px 8px', borderBottom: '1px solid #d2d2d7' }}></th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {displayItems.map((item, index) => {
                        const isModifier = item.type === 'other';
                        const isManuallySplit = !isModifier && !!manualSplits[item.id!];
                        const itemTotalQty = invoice.items.filter(i => i.type !== 'other').reduce((acc, i) => acc + i.quantity, 0);

                        return (
                            <tr key={item.id || index} className={cn(
                                "transition-colors group",
                                isModifier && "bg-orange-50/30 border-l-2 border-l-orange-400"
                            )}>
                                <td style={{ padding: '8px 8px', borderBottom: '1px solid #e8e8ed', position: 'relative' }}>
                                    <div className="flex items-center gap-2">
                                        {isModifier && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 tracking-wider">
                                                MODIFIER
                                            </span>
                                        )}
                                        <Input
                                            value={item.description}
                                            onChange={(e) => onUpdateDescription(item.id!, e.target.value)}
                                            disabled={isLocked}
                                            className={cn(
                                                "p-1 h-auto border border-dashed border-slate-300/70 bg-slate-50/50",
                                                "hover:bg-blue-50/80 hover:border-blue-400 hover:text-blue-700 hover:shadow-sm",
                                                "focus:bg-white focus:text-black focus:border-blue-500 focus:border-solid focus:ring-2 focus:ring-blue-500/10 focus:shadow-md",
                                                "transition-all duration-200 ease-out -mx-1 rounded-md w-full cursor-text",
                                                "disabled:border-transparent disabled:bg-transparent disabled:opacity-100 disabled:cursor-default font-medium",
                                                "!text-[14px]",
                                                isModifier ? "text-orange-800" : "text-[#1d1d1f]"
                                            )}
                                            style={{ fontFamily: 'inherit' }}
                                        />
                                    </div>
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', borderBottom: '1px solid #e8e8ed' }}>
                                    <Input
                                        type="number"
                                        value={item.quantity === 0 ? '' : item.quantity}
                                        onChange={(e) => onUpdateItem(item.id!, 'quantity', parseFloat(e.target.value) || 0)}
                                        disabled={isLocked || !isModifier || !item.id?.endsWith('-split-surcharge')}
                                        className={cn(
                                            "p-1 h-auto border border-dashed border-slate-300/70 bg-slate-50/50",
                                            "hover:bg-blue-50/80 hover:border-blue-400 hover:text-blue-700 hover:shadow-sm",
                                            "focus:bg-white focus:text-black focus:border-blue-500 focus:border-solid focus:ring-2 focus:ring-blue-500/10 focus:shadow-md",
                                            "transition-all duration-200 -mx-1 rounded-md text-right w-full cursor-text",
                                            "disabled:border-transparent disabled:bg-transparent disabled:opacity-100 disabled:cursor-default font-normal",
                                            "!text-[14px]",
                                            isModifier && "text-orange-700 font-medium"
                                        )}
                                        style={{ color: isModifier ? undefined : '#6e6e73', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                                    />
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', color: isModifier ? '#ea580c' : '#6e6e73', borderBottom: '1px solid #e8e8ed', fontSize: '13px', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                    {isModifier ? '—' : (itemTotalQty > 0 ? ((item.quantity / itemTotalQty) * 100).toFixed(1) + '%' : '-')}
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', borderBottom: '1px solid #e8e8ed' }}>
                                    <Input
                                        type="number"
                                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                                        onChange={(e) => onUpdateItem(item.id!, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        disabled={isLocked}
                                        className={cn(
                                            "p-1 h-auto border border-dashed border-slate-300/70 bg-slate-50/50",
                                            "hover:bg-blue-50/80 hover:border-blue-400 hover:text-blue-700 hover:shadow-sm",
                                            "focus:bg-white focus:text-black focus:border-blue-500 focus:border-solid focus:ring-2 focus:ring-blue-500/10 focus:shadow-md",
                                            "transition-all duration-200 -mx-1 rounded-md text-right w-full cursor-text",
                                            "disabled:border-transparent disabled:bg-transparent disabled:opacity-100 disabled:cursor-default font-normal",
                                            "!text-[14px]",
                                            isModifier && "text-orange-700 font-medium"
                                        )}
                                        style={{ color: isModifier ? undefined : '#6e6e73', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                                    />
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'right', color: isModifier ? '#c2410c' : '#1d1d1f', fontWeight: 600, borderBottom: '1px solid #e8e8ed', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                    {(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                {!isLocked && (
                                    <td style={{ padding: '8px 8px', textAlign: 'center', borderBottom: '1px solid #e8e8ed' }}>
                                        {!isModifier && (
                                            <button
                                                onClick={() => toggleSplit(item)}
                                                className={cn(
                                                    "px-2 py-1 rounded text-xs transition-colors",
                                                    isManuallySplit
                                                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                )}
                                                title={isManuallySplit ? "Remove Split" : "Split Line Item"}
                                            >
                                                {isManuallySplit ? "Unsplit" : "Split"}
                                            </button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
