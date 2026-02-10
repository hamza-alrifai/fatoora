import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Mail, Phone } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toast } from 'sonner';
import type { Customer, Invoice } from '@/types';
import { CustomerSheet } from './CustomerSheet';
import { TopBar } from '@/components/layout/TopBar';



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
        <div className="h-full bg-background overflow-y-auto relative">
            <div className="min-h-full flex flex-col">
                <TopBar
                    title="Customers"
                    subtitle="Manage your customer database"
                    icon={Users}
                    iconColor="from-indigo-500 to-indigo-600"
                    searchProps={{
                        value: searchQuery,
                        onChange: (e) => setSearchQuery(e.target.value),
                        placeholder: "Search customers..."
                    }}
                    actions={
                        <Button onClick={handleCreateNew} className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Customer
                        </Button>
                    }
                />

                <div className="p-5 space-y-5">
                    {/* Customer List */}
                    <Card className="overflow-hidden border-border/40 shadow-sm">
                        <div className="bg-muted/30 border-b border-border/40 px-4 py-3 flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-foreground">All Customers</h3>
                            <Badge variant="secondary" className="bg-background text-muted-foreground border-border/50">
                                Total: {totalCustomers}
                            </Badge>
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
                                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => {
                                                setSelectedCustomer(cust);
                                                setIsSheetOpen(true);
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
                                                    <span className="text-sm font-bold text-indigo-600">
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
        </div>
    );
}
