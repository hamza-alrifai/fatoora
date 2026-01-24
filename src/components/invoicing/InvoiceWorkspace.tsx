import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Receipt, Search, ArrowLeft, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice } from '@/types';
import { InvoiceEditor } from './InvoiceEditor';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";


export function InvoiceWorkspace() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Load invoices on mount
    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        setIsLoading(true);
        const result = await window.electron.getInvoices();
        if (result.success && result.invoices) {
            setInvoices(result.invoices);
        } else {
            toast.error('Failed to load invoices');
        }
        setIsLoading(false);
    };





    const handleEdit = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsEditorOpen(true);
    };

    const handleSave = async (invoice: Invoice) => {
        const result = await window.electron.saveInvoice(invoice);
        if (result.success) {
            toast.success('Invoice saved');
            await loadInvoices();
            setIsEditorOpen(false); // Close editor on save? Or stay to keep editing? Let's close for flow.
            setSelectedInvoice(null);
        } else {
            toast.error(result.error || 'Failed to save');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this invoice?')) {
            const result = await window.electron.deleteInvoice(id);
            if (result.success) {
                toast.success('Invoice deleted');
                loadInvoices();
                if (selectedInvoice?.id === id) {
                    setIsEditorOpen(false);
                    setSelectedInvoice(null);
                }
            } else {
                toast.error(result.error);
            }
        }
    };



    const handleGeneratePDF = async (invoice: Invoice) => {
        const toastId = toast.loading('Generating PDF...');
        try {
            const appUrl = window.location.origin + window.location.pathname;
            const result = await window.electron.generateSecureInvoice(invoice, appUrl);

            if (result.success) {
                toast.success('PDF saved successfully', { id: toastId });
            } else {
                toast.error(`PDF generation failed: ${result.error}`, { id: toastId });
            }
        } catch (err) {
            console.error(err);
            toast.error('Unexpected error occurred', { id: toastId });
        }
    };



    const filteredInvoices = invoices.filter(inv =>
        inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.to.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalRevenue = invoices.reduce((acc, inv) => acc + inv.total, 0);

    const pendingInvoices = invoices.filter(i => i.status !== 'paid').length;

    // EDITOR MODE
    if (isEditorOpen && selectedInvoice) {
        return (
            <div className="h-full flex flex-col bg-muted/10">
                <div className="relative flex-1 overflow-auto p-8 flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditorOpen(false)}
                        className="absolute top-4 left-4 h-8 z-20 text-muted-foreground hover:text-foreground hover:bg-white/50"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                    </Button>
                    <InvoiceEditor
                        invoice={selectedInvoice}
                        onSave={handleSave}
                        onCancel={() => setIsEditorOpen(false)}
                        onDelete={() => handleDelete(selectedInvoice.id)}
                        onGeneratePDF={handleGeneratePDF}
                    />
                </div>
            </div>
        );
    }

    // LIST MODE
    return (
        <div className="flex flex-col h-full w-full bg-background/50 p-6 space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/40 border-none shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Total Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-muted-foreground">QAR</span></div>
                    </CardContent>
                </Card>
                <Card className="bg-card/40 border-none shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Active Invoices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingInvoices} <span className="text-sm font-normal text-muted-foreground">pending</span></div>
                    </CardContent>
                </Card>

            </div>

            {/* Main Table Area */}
            <Card className="flex-1 border-none shadow-lg bg-card/30 backdrop-blur-md overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search invoice # or client..."
                            className="pl-9 bg-background/50 border-white/10 focus:bg-background/80 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Receipt className="w-12 h-12 mb-4 opacity-20" />
                            <p>No invoices found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/20 sticky top-0 backdrop-blur-md z-10">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead>Number</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>

                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.map((inv) => (
                                    <TableRow
                                        key={inv.id}
                                        className="cursor-pointer hover:bg-white/5 border-white/5 group"
                                        onClick={() => handleEdit(inv)}
                                    >
                                        <TableCell className="font-mono text-primary font-medium">
                                            {inv.number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{inv.to.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(inv.date), 'MMM d, yyyy')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} {inv.currency}
                                        </TableCell>
                                        <TableCell>
                                            <span className={
                                                inv.status === 'paid' ? "text-green-500 text-xs font-bold uppercase" :
                                                    inv.status === 'overdue' ? "text-red-500 text-xs font-bold uppercase" :
                                                        inv.status === 'issued' ? "text-blue-500 text-xs font-bold uppercase" :
                                                            "text-muted-foreground text-xs font-bold uppercase"
                                            }>
                                                {inv.status}
                                            </span>
                                        </TableCell>

                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
}
