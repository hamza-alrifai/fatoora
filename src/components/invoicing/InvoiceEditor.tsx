import { useState, useEffect } from 'react';
import type { Invoice, Customer, BankingDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2, Printer, Receipt } from 'lucide-react';
import { sanitizeAndConsolidateItems, recalculateInvoiceTotals } from '@/utils/invoice-item-utils';
import { InvoiceIssueDialog } from './InvoiceIssueDialog';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import { Badge } from '@/components/ui/badge';


interface InvoiceEditorProps {
    invoice: Invoice;
    onSave: (invoice: Invoice) => void;
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
    
    // Invoice is locked if it's not a draft
    const isLocked = invoice.status !== 'draft';

    useEffect(() => {
        setInvoice(sanitizeAndConsolidateItems(initialInvoice));
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
        if (isLocked) return; // Prevent changes to locked invoices
        setInvoice(prev => ({ ...prev, [field]: value }));
    };



    const handleSave = () => {
        onSave(recalculateInvoiceTotals(invoice));
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
                    <Badge 
                        variant={invoice.status === 'paid' ? 'default' : invoice.status === 'issued' ? 'secondary' : 'outline'} 
                        className="uppercase text-[10px] h-5"
                    >
                        {invoice.status}
                    </Badge>
                    {isLocked && (
                        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            LOCKED
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {invoice.id && (
                        <>
                            {!isLocked && (
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
                            )}
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

                    {!isLocked && (
                        <Button onClick={handleSave} variant="outline" size="sm" className="h-8">
                            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Draft
                        </Button>
                    )}

                    {invoice.status === 'draft' && (
                        <Button
                            onClick={() => setShowIssueDialog(true)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white h-8 shadow-lg shadow-emerald-500/25 font-semibold px-4"
                            size="sm"
                        >
                            <Receipt className="w-3.5 h-3.5 mr-1.5" /> Issue Invoice
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
                    fontSize: '14px',
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
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Invoice No.
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
                                {invoice.number === 'DRAFT' ? '---' : invoice.number}
                            </div>
                        </div>

                        {/* Issue Date */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Issue Date
                            </div>
                            {invoice.status === 'draft' ? (
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#86868b', padding: '4px 0' }}>
                                    ---
                                </div>
                            ) : (
                                <Input
                                    type="date"
                                    value={invoice.date.split('T')[0]}
                                    disabled={true}
                                    className="p-1 h-auto border-none bg-transparent opacity-70 cursor-not-allowed -mx-1 rounded-md w-full !text-[14px]"
                                    style={{ color: '#1d1d1f', fontFamily: 'inherit' }}
                                    readOnly
                                />
                            )}
                        </div>

                        {/* Due Date */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Due Date
                            </div>
                            <Input
                                type="date"
                                value={invoice.dueDate ? invoice.dueDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('dueDate', new Date(e.target.value).toISOString())}
                                disabled={isLocked}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed !text-[14px]"
                                style={{ color: '#1d1d1f', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* LPO No */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                LPO No.
                            </div>
                            <Input
                                value={invoice.lpoNo || ''}
                                onChange={(e) => handleChange('lpoNo', e.target.value)}
                                disabled={isLocked}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full placeholder:text-gray-300 cursor-text disabled:opacity-70 disabled:cursor-not-allowed !text-[14px]"
                                placeholder="-"
                                style={{ color: '#1d1d1f', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* LPO Date */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                LPO Date
                            </div>
                            <Input
                                type="date"
                                value={invoice.lpoDate ? invoice.lpoDate.split('T')[0] : ''}
                                disabled={isLocked}
                                onChange={(e) => handleChange('lpoDate', e.target.value)}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full text-gray-500 focus:text-black cursor-pointer !text-[14px]"
                                style={{ fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Commercial Offer Ref */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Commercial Offer Ref
                            </div>
                            <Input
                                value={invoice.commercialOfferRef || ''}
                                onChange={(e) => handleChange('commercialOfferRef', e.target.value)}
                                disabled={isLocked}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full placeholder:text-gray-300 cursor-text disabled:opacity-70 disabled:cursor-not-allowed !text-[14px]"
                                placeholder="-"
                                style={{ color: '#1d1d1f', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Commercial Offer Date */}
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Commercial Offer Date
                            </div>
                            <Input
                                type="date"
                                value={invoice.commercialOfferDate ? invoice.commercialOfferDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('commercialOfferDate', e.target.value)}
                                disabled={isLocked}
                                className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full text-gray-500 focus:text-black cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed !text-[14px]"
                                style={{ fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>

                    {/* Main Content Split */}
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px', marginBottom: '32px' }}>

                        {/* Left: Banking & Terms */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            {/* Payment Terms */}
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '4px' }}>
                                    Payment Terms
                                </div>
                                <Input
                                    value={invoice.paymentTerms || ''}
                                    onChange={(e) => handleChange('paymentTerms', e.target.value)}
                                    disabled={isLocked}
                                    className="p-1 h-auto border-none bg-transparent hover:bg-blue-50/50 hover:text-blue-700 focus:bg-white focus:text-black focus:ring-2 focus:ring-blue-500/10 focus:shadow-md transition-all duration-200 -mx-1 rounded-md w-full cursor-text disabled:opacity-70 disabled:cursor-not-allowed !text-[14px]"
                                    placeholder="Payment due within 30 days."
                                    style={{ color: '#6e6e73', lineHeight: 1.4, fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* Banking Details */}
                            {bankingDetails && (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '8px' }}>
                                        Beneficiary Details
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
                                        <span style={{ fontWeight: 500, color: '#333' }}>Beneficiary:</span> <span>{bankingDetails.beneficiaryName}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>Bank:</span> <span>{bankingDetails.beneficiaryBank}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>Branch:</span> <span>{bankingDetails.branch}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>IBAN:</span> <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{bankingDetails.ibanNo}</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>SWIFT:</span> <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{bankingDetails.swiftCode}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Bill To */}
                        <div style={{ paddingLeft: '20px', borderLeft: '1px solid #eee' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '8px' }}>
                                Billed To
                            </div>
                            <div style={{ marginBottom: '4px', fontSize: '14px', fontWeight: 700, color: '#1d1d1f' }}>
                                {invoice.to.name || 'Select Customer...'}
                            </div>
                            <div style={{ lineHeight: 1.5, fontSize: '14px', color: '#6e6e73' }}>
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

                    <InvoiceItemsTable invoice={invoice} setInvoice={setInvoice} isLocked={isLocked} />

                    {/* Total Section */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                        <div style={{ minWidth: '250px', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '32px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b' }}>
                                    Total Due
                                </span>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                    <span style={{ fontSize: '16px', color: '#86868b', marginRight: '4px' }}>
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
