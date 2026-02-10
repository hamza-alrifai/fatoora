import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Search, ArrowLeft, Calendar, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { GlassAlertDialog } from '@/components/ui/glass-alert-dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Invoice } from '@/types';
import { InvoiceEditor } from './InvoiceEditor';
import { format } from 'date-fns';

interface InvoiceWorkspaceProps {
    onNavigate?: (module: string) => void;
}

export function InvoiceWorkspace({ onNavigate }: InvoiceWorkspaceProps) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
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
        setInvoiceToDelete(id);
    };

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;

        const result = await window.electron.deleteInvoice(invoiceToDelete);
        if (result.success) {
            toast.success('Invoice deleted');
            loadInvoices();
            if (selectedInvoice?.id === invoiceToDelete) {
                setIsEditorOpen(false);
                setSelectedInvoice(null);
            }
        } else {
            toast.error(result.error);
        }
        setInvoiceToDelete(null);
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

    const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);

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
                        onDelete={() => handleDelete(selectedInvoice.id)}
                        onGeneratePDF={handleGeneratePDF}
                    />
                </div>
            </div>
        );
    }

    // LIST MODE
    return (
        <div className="h-full bg-background overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-5 py-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <Receipt className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Invoices</h1>
                            <p className="text-sm text-muted-foreground">View, edit, and print invoices</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-5">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white shadow-lg shadow-indigo-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <span className="text-indigo-200 font-medium">Total Revenue</span>
                            </div>
                            <div className="text-2xl font-bold">{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-indigo-200">QAR</span></div>
                        </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-lg shadow-amber-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span className="text-amber-100 font-medium">Pending</span>
                            </div>
                            <div className="text-2xl font-bold">{pendingInvoices} <span className="text-sm font-normal text-amber-200">invoices</span></div>
                        </div>
                    </div>
                </div>

                {/* Invoice List */}
                <Card className="overflow-hidden">
                    <div className="p-3 border-b border-border/50 flex items-center gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoice # or client..."
                                className="pl-11"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <LoadingState label="Loading invoices…" />
                        ) : filteredInvoices.length === 0 ? (
                            <EmptyState
                                title="No invoices yet"
                                description="Use Process Files to generate invoices"
                                icon={<Receipt className="h-8 w-8" />}
                                action={
                                    onNavigate ? (
                                        <Button onClick={() => onNavigate('matcher')} variant="soft">
                                            Go to Process Files
                                        </Button>
                                    ) : null
                                }
                            />
                        ) : (
                            <div className="divide-y divide-border/50">
                                {filteredInvoices.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => handleEdit(inv)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                                <span className="font-mono text-xs font-bold text-muted-foreground">
                                                    {inv.number.slice(-3)}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="font-semibold">{inv.to.name}</div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(inv.date), 'MMM d, yyyy')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="font-bold">{(inv.total || 0).toLocaleString()}</div>
                                                <div className="text-xs text-muted-foreground">{inv.currency}</div>
                                            </div>
                                            <Badge
                                                variant={
                                                    inv.status === 'paid' ? 'success' :
                                                    inv.status === 'overdue' ? 'destructive' :
                                                    inv.status === 'issued' ? 'info' : 'muted'
                                                }
                                                className="capitalize"
                                            >
                                                {inv.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <GlassAlertDialog
                isOpen={!!invoiceToDelete}
                onClose={() => setInvoiceToDelete(null)}
                onConfirm={confirmDelete}
                title="Delete Invoice"
                description="Are you sure you want to delete this invoice? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
