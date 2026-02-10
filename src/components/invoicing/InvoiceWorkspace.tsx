import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, ArrowLeft, Calendar, TrendingUp, Clock, AlertCircle, ChevronDown, Plus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
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





    const handleCreateNew = () => {
        const newInvoice: Invoice = {
            id: crypto.randomUUID(),
            number: `INV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'draft',
            from: { name: '', address: '', phone: '', email: '' },
            to: { name: '', address: '', phone: '', email: '' },
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0,
            currency: 'SAR',
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setSelectedInvoice(newInvoice);
        setIsEditorOpen(true);
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



    const [statusFilter, setStatusFilter] = useState('all');

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.to.name.toLowerCase().includes(searchQuery.toLowerCase());

        if (statusFilter === 'all') return matchesSearch;
        return matchesSearch && inv.status === statusFilter;
    });

    const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);

    const pendingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'overdue').length;
    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

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

    return (
        <div className="h-full bg-background overflow-y-auto relative">
            <div className="min-h-full flex flex-col">
                <TopBar
                    title="Invoices"
                    subtitle="View, edit, and print invoices"
                    icon={Receipt}
                    iconColor="from-indigo-500 to-indigo-600"
                    searchProps={{
                        value: searchQuery,
                        onChange: (e) => setSearchQuery(e.target.value),
                        placeholder: "Search invoice # or client..."
                    }}
                    actions={
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <select
                                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="draft">Draft</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
                            </div>
                            <Button onClick={handleCreateNew} className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Invoice
                            </Button>
                        </div>
                    }
                />

                <div className="p-5 space-y-5">
                    {/* Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Revenue Card */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/90 to-indigo-600/90 p-6 text-white shadow-xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/10">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-indigo-50 text-xs font-semibold">
                                        Total Revenue
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold tracking-tight">
                                            {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="text-lg font-medium text-indigo-100/70">QAR</span>
                                    </div>
                                    <p className="text-indigo-100/70 text-sm">All time revenue</p>
                                </div>
                            </div>
                        </div>

                        {/* Pending Card */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/90 to-amber-600/90 p-6 text-white shadow-xl shadow-amber-500/10 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/10">
                                        <Clock className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-amber-50 text-xs font-semibold">
                                        Pending
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold tracking-tight">
                                            {pendingInvoices}
                                        </span>
                                        <span className="text-lg font-medium text-amber-100/70">invoices</span>
                                    </div>
                                    <p className="text-amber-100/70 text-sm">Awaiting payment</p>
                                </div>
                            </div>
                        </div>

                        {/* Overdue Card */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/90 to-rose-600/90 p-6 text-white shadow-xl shadow-rose-500/10 hover:shadow-2xl hover:shadow-rose-500/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/10">
                                        <AlertCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-rose-50 text-xs font-semibold">
                                        Overdue
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold tracking-tight">
                                            {overdueInvoices}
                                        </span>
                                        <span className="text-lg font-medium text-rose-100/70">invoices</span>
                                    </div>
                                    <p className="text-rose-100/70 text-sm">Action required</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice List */}
                    <Card className="overflow-hidden border-border/40 shadow-sm">

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
        </div>
    );
}
