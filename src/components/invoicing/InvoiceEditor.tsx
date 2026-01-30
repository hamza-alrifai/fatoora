import { useState, useEffect } from 'react';
import type { Invoice, Customer, BankingDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2, Printer, Receipt } from 'lucide-react';
import { calculateAmount, calculateSubtotal } from '@/utils/calculations';
import { InvoiceIssueDialog } from './InvoiceIssueDialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


interface InvoiceEditorProps {
    invoice: Invoice;
    onSave: (invoice: Invoice) => void;
    onCancel: () => void;
    onDelete: () => void;
    onGeneratePDF: (invoice: Invoice) => void;
}

export function InvoiceEditor({ invoice: initialInvoice, onSave, onDelete, onGeneratePDF }: InvoiceEditorProps) {
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
    const [showIssueDialog, setShowIssueDialog] = useState(false);

    useEffect(() => {
        // Sanitize and Consolidate Items on Load
        const sanitizeItems = (inv: Invoice) => {
            const items20mm = inv.items.filter(i => i.description.toLowerCase().includes('20mm'));
            const items10mm = inv.items.filter(i => i.description.toLowerCase().includes('10mm'));

            const merged20mm = items20mm.reduce((acc, curr) => ({
                ...acc,
                quantity: acc.quantity + curr.quantity,
                amount: acc.amount + curr.amount
            }), { id: 'fixed-20', description: 'Gabbro 20mm', quantity: 0, unitPrice: items20mm[0]?.unitPrice || 0, amount: 0, type: '20mm' });

            // Recalculate amount using utility for consistent rounding
            if (merged20mm.quantity > 0 && merged20mm.unitPrice > 0) {
                merged20mm.amount = calculateAmount(merged20mm.quantity, merged20mm.unitPrice);
            }

            const merged10mm = items10mm.reduce((acc, curr) => ({
                ...acc,
                quantity: acc.quantity + curr.quantity,
                amount: acc.amount + curr.amount
            }), { id: 'fixed-10', description: 'Gabbro 10mm', quantity: 0, unitPrice: items10mm[0]?.unitPrice || 0, amount: 0, type: '10mm' });

            if (merged10mm.quantity > 0 && merged10mm.unitPrice > 0) {
                merged10mm.amount = calculateAmount(merged10mm.quantity, merged10mm.unitPrice);
            }

            const cleanList = [merged20mm, merged10mm];

            return recalculateTotals({ ...inv, items: cleanList });
        };

        setInvoice(sanitizeItems(initialInvoice));
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
    }, [customers, invoice.to.customerId]);

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

    const handleChange = (field: keyof Invoice, value: any) => {
        setInvoice(prev => ({ ...prev, [field]: value }));
    };



    const handleSave = () => {
        // Recalculate totals before saving to ensure consistency
        onSave(recalculateTotals(invoice));
    };

    const recalculateTotals = (inv: Invoice): Invoice => {
        const subtotal = calculateSubtotal(inv.items);
        return {
            ...inv,
            subtotal,
            tax: 0,
            total: subtotal
        };
    };



    // Layout: Strict WYSIWYG (Exact match to InvoicePrintView)
    return (
        <div className="w-full h-full flex flex-col items-center bg-gray-100/50 overflow-y-auto relative pb-20">

            {/* Floating Action Toolbar */}
            <div className="sticky top-6 z-50 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-black/5 mb-8 print:hidden">
                <div className="flex items-center gap-3 pr-4 border-r border-black/5">
                    <span className="font-bold text-sm text-foreground">
                        {invoice.number === 'DRAFT' ? 'New Invoice' : invoice.number}
                    </span>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="uppercase text-[10px] h-5">
                        {invoice.status}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    {invoice.id && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this invoice?')) onDelete();
                                }}
                                className="h-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onGeneratePDF(invoice)}
                                className="h-8"
                            >
                                <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
                            </Button>
                        </>
                    )}

                    <Button onClick={handleSave} variant="default" size="sm" className="h-8 shadow-sm">
                        <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                    </Button>

                    {invoice.status === 'draft' && (
                        <Button
                            onClick={() => setShowIssueDialog(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 shadow-sm"
                            size="sm"
                        >
                            <Receipt className="w-3.5 h-3.5 mr-1.5" /> Issue
                        </Button>
                    )}
                </div>
            </div>

            {/* A4 Paper Canvas (Exact styles from PrintView) */}
            <div
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    backgroundColor: '#ffffff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                    color: '#1d1d1f',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
                className="print:shadow-none print:m-0"
            >
                {/* Header Image */}
                <div style={{ width: '100%', flexShrink: 0 }}>
                    <img src="/src/assets/images/invoice-header.png" alt="Header" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>

                {/* Content Body */}
                <div style={{ flex: 1, padding: '24px 40px', display: 'flex', flexDirection: 'column' }}>

                    {/* Invoice Details Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px 24px',
                        marginBottom: '24px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid #e5e5e5'
                    }}>
                        {/* Invoice No */}
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Invoice No.
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
                                {invoice.number === 'DRAFT' ? '---' : invoice.number}
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Date
                            </div>
                            <Input
                                type="date"
                                value={invoice.date.split('T')[0]}
                                onChange={(e) => handleChange('date', new Date(e.target.value).toISOString())}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full cursor-pointer"
                                style={{ fontSize: '13px', color: '#1d1d1f', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Due Date */}
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Due Date
                            </div>
                            <Input
                                type="date"
                                value={invoice.dueDate ? invoice.dueDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('dueDate', new Date(e.target.value).toISOString())}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full cursor-pointer"
                                style={{ fontSize: '13px', color: '#1d1d1f', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* LPO No */}
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                LPO No.
                            </div>
                            <Input
                                value={invoice.lpoNo || ''}
                                onChange={(e) => handleChange('lpoNo', e.target.value)}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full placeholder:text-gray-300 cursor-text"
                                placeholder="-"
                                style={{ fontSize: '13px', color: '#1d1d1f', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* LPO Date */}
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                LPO Date
                            </div>
                            <Input
                                type="date"
                                value={invoice.lpoDate ? invoice.lpoDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('lpoDate', e.target.value)}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full text-gray-500 focus:text-black cursor-pointer"
                                style={{ fontSize: '13px', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Commercial Offer Ref */}
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Commercial Offer Ref
                            </div>
                            <Input
                                value={invoice.commercialOfferRef || ''}
                                onChange={(e) => handleChange('commercialOfferRef', e.target.value)}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full placeholder:text-gray-300 cursor-text"
                                placeholder="-"
                                style={{ fontSize: '13px', color: '#1d1d1f', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Commercial Offer Date */}
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Commercial Offer Date
                            </div>
                            <Input
                                type="date"
                                value={invoice.commercialOfferDate ? invoice.commercialOfferDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('commercialOfferDate', e.target.value)}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full text-gray-500 focus:text-black cursor-pointer"
                                style={{ fontSize: '13px', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>

                    {/* Main Content Split */}
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px', marginBottom: '32px' }}>

                        {/* Left: Banking & Terms */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            {/* Payment Terms */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '4px' }}>
                                    Payment Terms
                                </div>
                                <Input
                                    value={invoice.paymentTerms || ''}
                                    onChange={(e) => handleChange('paymentTerms', e.target.value)}
                                    className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full cursor-text"
                                    placeholder="Payment due within 30 days."
                                    style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.4, fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* Banking Details */}
                            {bankingDetails && (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '8px' }}>
                                        Beneficiary Details
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
                                        <span style={{ fontWeight: 500, color: '#333' }}>Beneficiary:</span> <span>{bankingDetails.beneficiaryName}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>Bank:</span> <span>{bankingDetails.beneficiaryBank}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>Branch:</span> <span>{bankingDetails.branch}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>IBAN:</span> <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{bankingDetails.ibanNo}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>SWIFT:</span> <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{bankingDetails.swiftCode}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Bill To */}
                        <div style={{ paddingLeft: '20px', borderLeft: '1px solid #eee' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '8px' }}>
                                Billed To
                            </div>
                            <div style={{ marginBottom: '4px', fontSize: '15px', fontWeight: 700, color: '#1d1d1f' }}>
                                {invoice.to.name || 'Select Customer...'}
                            </div>
                            <div style={{ lineHeight: 1.5, fontSize: '13px', color: '#6e6e73' }}>
                                <div>{invoice.to.address || 'No Address'}</div>
                                {invoice.to.phone && (
                                    <div className="flex items-center gap-1">
                                        <span>Tel:</span>
                                        <span>{invoice.to.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table Description */}
                    <div style={{ marginBottom: '16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f5f5f7' }}>
                                    <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '120px', borderBottom: '1px solid #d2d2d7' }}>
                                        Description
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '100px', borderBottom: '1px solid #d2d2d7' }}>
                                        Qty (Tons)
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '60px', borderBottom: '1px solid #d2d2d7' }}>
                                        Mix %
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '90px', borderBottom: '1px solid #d2d2d7' }}>
                                        Rate
                                    </th>
                                    <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', width: '100px', borderBottom: '1px solid #d2d2d7' }}>
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, index) => {
                                    const isExcess = item.description.includes('Excess');
                                    const totalQty = invoice.items.reduce((acc, i) => acc + i.quantity, 0);

                                    return (
                                        <tr key={item.id || index} className="group hover:bg-gray-50 transition-colors">
                                            <td style={{ padding: '8px 8px', borderBottom: '1px solid #e8e8ed', position: 'relative' }}>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            const newItems = [...invoice.items];
                                                            newItems[index] = { ...item, description: e.target.value };
                                                            setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                                        }}
                                                        className={cn(
                                                            "p-1 h-auto border-none bg-transparent",
                                                            "hover:bg-blue-50/50 hover:text-blue-700 hover:shadow-sm",
                                                            "focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md focus:scale-[1.01]",
                                                            "transition-all duration-200 ease-out -mx-1 rounded-md w-full font-medium cursor-text",
                                                            isExcess ? "text-orange-600" : "text-[#1d1d1f]"
                                                        )}
                                                        style={{ fontSize: '12px', fontFamily: 'inherit' }}
                                                    />

                                                    {/* Hover Controls */}
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white shadow-sm border rounded px-1">
                                                        <button
                                                            onClick={() => {
                                                                const newItems = invoice.items.filter((_, i) => i !== index);
                                                                setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                                            }}
                                                            className="p-1 hover:text-red-500 text-gray-400"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                        <div className="h-3 w-px bg-gray-200" />
                                                        <button
                                                            onClick={() => {
                                                                const newItems = [...invoice.items];
                                                                let newDesc = item.description;
                                                                if (!newDesc.includes('Excess')) {
                                                                    newDesc += ' Excess';
                                                                } else {
                                                                    newDesc = newDesc.replace(/Excess/g, '').trim();
                                                                }
                                                                newItems[index] = { ...item, description: newDesc };
                                                                setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                                            }}
                                                            className={cn(
                                                                "p-1 text-[9px] font-bold uppercase tracking-wider",
                                                                isExcess ? "text-orange-500" : "text-gray-400 hover:text-orange-500"
                                                            )}
                                                            title="Toggle Penalty"
                                                        >
                                                            {isExcess ? 'Penalty On' : 'Penalty'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', borderBottom: '1px solid #e8e8ed' }}>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const newItems = [...invoice.items];
                                                        const amount = Math.round(val * item.unitPrice * 100) / 100;
                                                        newItems[index] = { ...item, quantity: val, amount };
                                                        setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                                    }}
                                                    className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md text-right w-full cursor-text"
                                                    style={{ fontSize: '12px', color: '#6e6e73', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#6e6e73', borderBottom: '1px solid #e8e8ed', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                                                {totalQty > 0 ? ((item.quantity / totalQty) * 100).toFixed(1) + '%' : '-'}
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', borderBottom: '1px solid #e8e8ed' }}>
                                                <Input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const newItems = [...invoice.items];
                                                        const amount = Math.round(item.quantity * val * 100) / 100;
                                                        newItems[index] = { ...item, unitPrice: val, amount };
                                                        setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                                    }}
                                                    className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md text-right w-full cursor-text"
                                                    style={{ fontSize: '12px', color: '#6e6e73', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#1d1d1f', fontWeight: 500, borderBottom: '1px solid #e8e8ed', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                                                {(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Section */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ minWidth: '250px', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '32px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b' }}>
                                    Total Due
                                </span>
                                <span style={{ fontSize: '20px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                    <span style={{ fontSize: '12px', color: '#86868b', marginRight: '4px' }}>
                                        {invoice.currency}
                                    </span>
                                    {invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Image */}
                <div style={{ width: '100%', flexShrink: 0, marginTop: 'auto' }}>
                    <img src="/src/assets/images/invoice-footer.png" alt="Footer" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
            </div>

            <InvoiceIssueDialog
                isOpen={showIssueDialog}
                onClose={() => setShowIssueDialog(false)}
                onConfirm={async () => {
                    const issuedInvoice = {
                        ...invoice,
                        status: 'issued' as const,
                        date: new Date().toISOString()
                    };
                    onSave(issuedInvoice);
                    setShowIssueDialog(false);
                    onGeneratePDF(issuedInvoice);
                }}
                invoiceNumber={invoice.number}
                invoiceTotal={invoice.total}
                currency={invoice.currency}
            />
        </div>
    );
}
