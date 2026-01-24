import { useState, useEffect } from 'react';
import type { Invoice, Customer, BankingDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Save, Trash2, Printer, Receipt } from 'lucide-react';


interface InvoiceEditorProps {
    invoice: Invoice;
    onSave: (invoice: Invoice) => void;
    onCancel: () => void;
    onDelete: () => void;
    onGeneratePDF: (invoice: Invoice) => void;
}

export function InvoiceEditor({ invoice: initialInvoice, onSave, onDelete, onGeneratePDF }: InvoiceEditorProps) {
    const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);

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

            // Recalculate amount based on total qty if price exists (to fix potential math errors in DB)
            if (merged20mm.quantity > 0 && merged20mm.unitPrice > 0) {
                merged20mm.amount = merged20mm.quantity * merged20mm.unitPrice;
            }

            const merged10mm = items10mm.reduce((acc, curr) => ({
                ...acc,
                quantity: acc.quantity + curr.quantity,
                amount: acc.amount + curr.amount
            }), { id: 'fixed-10', description: 'Gabbro 10mm', quantity: 0, unitPrice: items10mm[0]?.unitPrice || 0, amount: 0, type: '10mm' });

            if (merged10mm.quantity > 0 && merged10mm.unitPrice > 0) {
                merged10mm.amount = merged10mm.quantity * merged10mm.unitPrice;
            }

            const cleanList = [merged20mm, merged10mm];

            return recalculateTotals({ ...inv, items: cleanList });
        };

        setInvoice(sanitizeItems(initialInvoice));
    }, [initialInvoice.id]);

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
        // Ensure we only save the clean items
        onSave(invoice);
    };

    const recalculateTotals = (inv: Invoice): Invoice => {
        const subtotal = inv.items.reduce((sum, item) => sum + item.amount, 0);
        return {
            ...inv,
            subtotal,
            tax: 0,
            total: subtotal
        };
    };



    return (
        <div className="w-full max-w-[1200px] relative mx-auto pb-48 pt-6">
            {/* Action Bar (Floating) */}
            <div className="fixed bottom-8 right-8 flex items-center gap-2 z-50 p-2 bg-background/80 backdrop-blur-md rounded-full shadow-2xl border border-white/10 print:hidden transition-all hover:scale-105">
                {invoice.id && (
                    <>
                        <Button variant="ghost" size="icon" onClick={onDelete} className="rounded-full w-10 h-10 hover:bg-red-500/20 hover:text-red-400 text-muted-foreground/70 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onGeneratePDF(invoice)} className="rounded-full w-10 h-10 hover:bg-blue-500/20 hover:text-blue-400 text-muted-foreground/70 hover:text-blue-500">
                            <Printer className="w-4 h-4" />
                        </Button>
                        <div className="w-[1px] h-4 bg-white/10 mx-1" />
                    </>
                )}
                {invoice.status === 'draft' && (
                    <Button
                        onClick={() => {
                            if (window.confirm("Mark as ISSUED and download PDF?\n\nThis will assume the invoice is finalized.")) {
                                const issuedInvoice = { ...invoice, status: 'issued' as const };
                                setInvoice(issuedInvoice);
                                onSave(issuedInvoice);
                                onGeneratePDF(issuedInvoice);
                            }
                        }}
                        className="rounded-full px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 mr-2"
                    >
                        <Receipt className="w-4 h-4 mr-2" /> Issue & Print
                    </Button>
                )}
                <Button onClick={handleSave} className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
            </div>

            {/* Main Editor Card */}
            <Card className="min-h-[1100px] w-full bg-card/40 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden rounded-xl print:shadow-none print:bg-white print:border-none">
                {/* Header Decoration */}
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70" />

                <div className="p-12 space-y-12 pb-32">
                    {/* Top Header: Brand & Invoice Info */}
                    <div className="flex justify-between items-start">
                        {/* Brand */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/10">
                                    <span className="text-white font-bold text-2xl">F</span>
                                </div>
                                <div>
                                    <h1 className="font-bold text-2xl tracking-tight text-foreground">FATOORA</h1>
                                    <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase">Enterprise Edition</p>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Meta */}
                        <div className="text-right space-y-4">
                            <div>
                                <h2 className="text-4xl font-black text-black tracking-tight select-none">INVOICE</h2>
                                <div className="flex items-center justify-end gap-3 relative z-10">
                                    <span className="text-sm font-medium text-muted-foreground">#</span>
                                    <Input
                                        value={invoice.number}
                                        onChange={(e) => handleChange('number', e.target.value)}
                                        className="w-40 text-right font-mono text-xl font-bold bg-transparent border-none focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground/30 text-foreground"
                                        placeholder="INV-000"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                {['draft', 'issued', 'paid', 'overdue'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => handleChange('status', s)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${invoice.status === s
                                            ? s === 'paid' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                                                : s === 'issued' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30'
                                                    : s === 'overdue' ? 'bg-red-500/20 text-red-500 border-red-500/30'
                                                        : 'bg-white/10 text-foreground border-white/10'
                                            : 'text-muted-foreground border-transparent hover:bg-white/5'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Dates & Reference Bar */}
                    <div className="grid grid-cols-4 gap-6 p-6 rounded-xl bg-white/5 border border-white/5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date Issued</label>
                            <Input
                                type="date"
                                value={invoice.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                className="bg-white/5 border-white/10 focus:bg-white/10 h-10 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Due Date</label>
                            <Input
                                type="date"
                                value={invoice.dueDate || ''}
                                onChange={(e) => handleChange('dueDate', e.target.value)}
                                className="bg-white/5 border-white/10 focus:bg-white/10 h-10 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">LPO Number</label>
                            <Input
                                value={invoice.lpoNo || ''}
                                onChange={(e) => handleChange('lpoNo', e.target.value)}
                                className="bg-white/5 border-white/10 focus:bg-white/10 h-10 transition-all placeholder:text-muted-foreground/30"
                                placeholder="Optional"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Offer Ref</label>
                            <Input
                                value={invoice.commercialOfferRef || ''}
                                onChange={(e) => handleChange('commercialOfferRef', e.target.value)}
                                className="bg-white/5 border-white/10 focus:bg-white/10 h-10 transition-all placeholder:text-muted-foreground/30"
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="mb-12">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Payment Details</h3>
                            <div className="p-8 rounded-xl bg-white/5 border border-white/5 space-y-6 w-full">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Terms</label>

                                    <textarea
                                        value={invoice.paymentTerms || ''}
                                        onChange={(e) => handleChange('paymentTerms', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-md focus:bg-white/10 focus:border-primary/50 text-lg transition-all p-3 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        placeholder="e.g. Net 30, Due on Receipt"
                                    />
                                </div>
                                {bankingDetails && (
                                    <div className="pt-6 border-t border-white/5 space-y-3">
                                        <div className="text-base font-bold text-foreground">{bankingDetails.beneficiaryName}</div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div className="font-medium text-foreground/80">{bankingDetails.beneficiaryBank}</div>
                                            <div><span className="opacity-50">Branch:</span> {bankingDetails.branch}</div>
                                            <div className="font-mono mt-2 text-base"><span className="opacity-50">IBAN:</span> {bankingDetails.ibanNo}</div>
                                            <div className="font-mono"><span className="opacity-50">SWIFT:</span> {bankingDetails.swiftCode}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-white/10">
                            <div className="col-span-4">Description</div>
                            <div className="col-span-3 text-right">Qty</div>
                            <div className="col-span-2 text-right">Price</div>
                            <div className="col-span-3 text-right">Amount</div>
                        </div>

                        <div className="space-y-2">
                            {invoice.items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-center group px-4 py-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="col-span-4 relative">
                                        <Input
                                            value={item.description}
                                            onChange={(e) => {
                                                const newItems = [...invoice.items];
                                                newItems[index] = { ...item, description: e.target.value };
                                                setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                            }}
                                            className={`bg-white/5 border-transparent hover:border-white/10 focus:border-primary/50 focus:bg-white/10 h-10 px-3 transition-all font-medium ${item.description.includes('Excess') ? 'text-red-400' : 'text-foreground'}`}
                                            placeholder="Item description"
                                        />
                                        {item.description.includes('Excess') && (
                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider absolute -bottom-3 left-0">Penalty Rate</span>
                                        )}
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                const newItems = [...invoice.items];
                                                newItems[index] = { ...item, quantity: val, amount: val * item.unitPrice };
                                                setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                            }}
                                            className="text-right bg-white/5 border-transparent hover:border-white/10 focus:border-primary/50 focus:bg-white/10 h-10 px-3 font-mono text-muted-foreground focus:text-foreground transition-all"
                                            step="any"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                const newItems = [...invoice.items];
                                                newItems[index] = { ...item, unitPrice: val, amount: item.quantity * val };
                                                setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                            }}
                                            className="text-right bg-white/5 border-transparent hover:border-white/10 focus:border-primary/50 focus:bg-white/10 h-10 px-3 font-mono text-muted-foreground focus:text-foreground transition-all"
                                            step="any"
                                        />
                                    </div>
                                    <div className="col-span-3 flex items-center justify-end gap-3 text-right">
                                        <span className="font-mono font-medium text-lg">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(item.amount)}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const newItems = invoice.items.filter((_, i) => i !== index);
                                                setInvoice(recalculateTotals({ ...invoice, items: newItems }));
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="border-t border-white/10 pt-8 flex justify-end">
                        <div className="w-72 space-y-3">
                            <div className="flex justify-between items-baseline pt-4">
                                <span className="font-bold text-lg">Total Due</span>
                                <span className="font-bold text-2xl font-mono text-primary">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(invoice.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
