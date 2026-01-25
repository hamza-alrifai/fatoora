import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Plus, Loader2, User, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer, Invoice } from '@/types';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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

    // Calculate aggregated stats
    const totalCustomers = customers.length;
    const totalVolume = customers.reduce((acc, c) => acc + (c.total20mm || 0) + (c.total10mm || 0), 0);

    return (
        <div className="flex flex-col h-full w-full bg-background/50 p-6 space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/40 border-none shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCustomers}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/40 border-none shadow-sm backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalVolume.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">tons</span></div>
                    </CardContent>
                </Card>
                <div className="flex items-end justify-end gap-2">
                    <Button
                        size="lg"
                        className="h-10 px-6 rounded-lg shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all"
                        onClick={handleCreateNew}
                    >
                        <Plus className="w-5 h-5 mr-2" /> New Customer
                    </Button>
                </div>
            </div>

            {/* Main Table Area */}
            <Card className="flex-1 border-none shadow-lg bg-card/30 backdrop-blur-md overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search customers..."
                            className="pl-9 bg-background/50 border-white/10 focus:bg-background/80 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <User className="w-12 h-12 mb-4 opacity-20" />
                            <p>No customers found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/20 sticky top-0 backdrop-blur-md z-10">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Volume (20mm)</TableHead>
                                    <TableHead>Volume (10mm)</TableHead>


                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.map((customer) => {

                                    return (
                                        <TableRow
                                            key={customer.id}
                                            className="cursor-pointer hover:bg-white/5 border-white/5 group"
                                            onClick={() => {
                                                setSelectedCustomer(customer);
                                                setIsSheetOpen(true);
                                            }}
                                        >
                                            <TableCell>
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-md">
                                                    {customer.name.substring(0, 2)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{customer.name}</div>
                                                <div className="text-xs text-muted-foreground">{customer.email || 'No email'}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-muted-foreground">
                                                {customer.total20mm?.toLocaleString() || 0}
                                            </TableCell>
                                            <TableCell className="font-mono text-muted-foreground">
                                                {customer.total10mm?.toLocaleString() || 0}
                                            </TableCell>


                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>

            {/* Editing Sheet */}
            {/* Editing Sheet */}
            <CustomerSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                customer={selectedCustomer}
                onSave={handleSave}
                onDelete={handleDelete}
                invoices={customerInvoices}
            />


        </div>
    );
}
