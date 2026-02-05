import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Users, Search, Mail, Phone } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toast } from 'sonner';
import type { Customer, Invoice } from '@/types';
import { CustomerSheet } from './CustomerSheet';



export function CustomerWorkspace() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
    const [searchQuery, setSearchQuery] = useState('');



    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (selectedCustomer?.id && isSheetOpen) {
            loadCustomerInvoices(selectedCustomer.id);
        }
    }, [selectedCustomer?.id, isSheetOpen]);

    const loadCustomers = async () => {
        setIsLoading(true);
        const result = await window.electron.getCustomers();
        if (result.success && result.customers) {
            setCustomers(result.customers);
        } else {
            toast.error('Failed to load customers');
        }
        setIsLoading(false);
    };

    const loadCustomerInvoices = async (customerId: string) => {
        const result = await window.electron.getInvoices();
        if (result.success && result.invoices) {
            const related = result.invoices.filter(inv => inv.to.customerId === customerId);
            setCustomerInvoices(related);
        }
    };

    const handleCreateNew = () => {
        const newCustomer: Customer = {
            id: '',
            name: 'New Customer',
            address: '',
            email: '',
            phone: '',
            total20mm: 0,
            total10mm: 0,
            createdAt: '',
            updatedAt: ''
        };
        setSelectedCustomer(newCustomer);
        setIsSheetOpen(true);
    };

    const handleSave = async (customer: Customer) => {
        // Validation
        if (!customer.name.trim()) {
            toast.error("Name is required");
            return;
        }

        const result = await window.electron.saveCustomer(customer);
        if (result.success) {
            toast.success('Customer saved successfully');
            await loadCustomers();
            if (result.id) {
                if (!customer.id) {
                    setSelectedCustomer({ ...customer, id: result.id });
                }
            }
        } else {
            toast.error(result.error || 'Failed to save');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure? This cannot be undone.')) {
            const result = await window.electron.deleteCustomer(id);
            if (result.success) {
                toast.success('Customer deleted');
                loadCustomers();
                setIsSheetOpen(false);
                setSelectedCustomer(null);
            } else {
                toast.error(result.error);
            }
        }
    };





    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalCustomers = customers.length;

    return (
        <div className="h-full bg-background overflow-y-auto">
            <div className="max-w-[1600px] mx-auto px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
                            <p className="text-sm text-muted-foreground">Manage your customer database</p>
                        </div>
                    </div>
                    <Button onClick={handleCreateNew} className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Customer
                    </Button>
                </div>

                {/* Stats Card */}
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-white shadow-xl shadow-orange-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <span className="text-orange-100 font-medium">Total Customers</span>
                            </div>
                            <div className="text-3xl font-bold">{totalCustomers}</div>
                        </div>
                    </div>
                </div>

                {/* Customer List */}
                <Card className="overflow-hidden">
                    <div className="p-5 border-b border-border/50 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search customers..."
                                className="pl-11"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <LoadingState label="Loading customers…" />
                        ) : filteredCustomers.length === 0 ? (
                            <EmptyState
                                title="No customers yet"
                                description="Add your first customer to start creating invoices"
                                icon={<Users className="h-8 w-8" />}
                                action={
                                    <Button onClick={handleCreateNew} variant="soft" className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Add Customer
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="divide-y divide-border/50">
                                {filteredCustomers.map((cust) => (
                                    <div
                                        key={cust.id}
                                        className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedCustomer(cust);
                                            setIsSheetOpen(true);
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                                                <span className="text-lg font-bold text-orange-600">
                                                    {cust.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="font-semibold">{cust.name}</div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    {cust.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            {cust.email}
                                                        </span>
                                                    )}
                                                    {cust.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {cust.phone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-right">
                                            <div>
                                                <div className="text-xs text-muted-foreground">10mm</div>
                                                <div className="font-mono font-semibold">{(cust.total10mm || 0).toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground">20mm</div>
                                                <div className="font-mono font-semibold">{(cust.total20mm || 0).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <CustomerSheet
                isOpen={isSheetOpen}
                customer={selectedCustomer}
                invoices={customerInvoices}
                onClose={() => {
                    setIsSheetOpen(false);
                    setSelectedCustomer(null);
                }}
                onSave={handleSave}
                onDelete={(id) => handleDelete(id)}
            />
        </div>
    );
}
