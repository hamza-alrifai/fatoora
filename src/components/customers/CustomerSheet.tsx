import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet } from '@/components/ui/sheet';
import { Trash2, User, Phone, Mail, Calculator, AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Customer, Invoice } from '@/types';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CustomerSheetProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onSave: (customer: Customer) => void;
    onDelete: (id: string) => void;
    invoices: Invoice[];
}

export function CustomerSheet({ isOpen, onClose, customer, onSave, onDelete, invoices }: CustomerSheetProps) {
    const [formData, setFormData] = useState<Customer | null>(null);

    useEffect(() => {
        if (customer) {
            setFormData({ ...customer });
        }
    }, [customer, isOpen]);

    if (!formData) return null;

    const handleSave = () => {
        if (formData) {
            onSave(formData);
        }
    };

    const calculateRatio = (c: Customer) => {
        const t20 = Number(c.total20mm) || 0;
        const t10 = Number(c.total10mm) || 0;
        const total = t20 + t10;
        if (total === 0) return { ratio20: 0, ratio10: 0, needed20: 0, needed10: 0, status: 'neutral' };

        const ratio20 = t20 / total;
        let needed20 = 0;
        let needed10 = 0;
        let status = 'optimal';

        if (ratio20 < 0.60) {
            needed20 = (0.6 * total - t20) / 0.4;
            status = 'warning';
        } else if (ratio20 > 0.60) {
            needed10 = (t20 - 0.6 * total) / 0.6;
            status = 'warning';
        }

        return {
            ratio20: ratio20 * 100,
            ratio10: (1 - ratio20) * 100,
            needed20: Math.max(0, Math.ceil(needed20)),
            needed10: Math.max(0, Math.ceil(needed10)),
            status
        };
    };

    const stats = calculateRatio(formData);

    return (
        <Sheet isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-full bg-background sm:max-w-md w-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                                {formData.name ? formData.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">
                                {formData.id ? 'Edit Customer' : 'New Customer'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {formData.id ? `ID: ${formData.id.substring(0, 8)}` : 'Add details'}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="details" className="w-full">
                        <div className="px-6 pt-4">
                            <TabsList className="w-full grid grid-cols-3 mb-6">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="stats" disabled={!formData.id}>Stats</TabsTrigger>
                                <TabsTrigger value="history" disabled={!formData.id}>
                                    History
                                    {invoices.length > 0 && (
                                        <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                            {invoices.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="px-6 pb-6">
                            <TabsContent value="details" className="mt-0 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Company or Individual Name"
                                            className="h-10"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="pl-9 h-10"
                                                    placeholder="name@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="phone"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="pl-9 h-10"
                                                    placeholder="+974..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address">Billing Address</Label>
                                        <textarea
                                            id="address"
                                            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Street address, PO Box..."
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="stats" className="mt-0 space-y-6">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                            <Calculator className="w-4 h-4 text-primary" />
                                            Material Usage
                                        </CardTitle>
                                        <CardDescription>Track total consumption in tons</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground font-medium uppercase">20mm Total</span>
                                            <div className="flex items-baseline gap-1">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-lg font-bold p-0 border-0 shadow-none focus-visible:ring-0 w-full"
                                                    value={formData.total20mm}
                                                    onChange={(e) => setFormData({ ...formData, total20mm: Number(e.target.value) })}
                                                />
                                                <span className="text-xs text-muted-foreground">tons</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground font-medium uppercase">10mm Total</span>
                                            <div className="flex items-baseline gap-1">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-lg font-bold p-0 border-0 shadow-none focus-visible:ring-0 w-full"
                                                    value={formData.total10mm}
                                                    onChange={(e) => setFormData({ ...formData, total10mm: Number(e.target.value) })}
                                                />
                                                <span className="text-xs text-muted-foreground">tons</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">Mix Ratio</span>
                                        <Badge variant={stats.status === 'warning' ? "destructive" : "secondary"}>
                                            {stats.status === 'warning' ? 'Optimization Needed' : 'Optimal'}
                                        </Badge>
                                    </div>

                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                        <div style={{ width: `${stats.ratio20}%` }} className="bg-primary h-full" />
                                        <div style={{ width: `${stats.ratio10}%` }} className="bg-muted-foreground/30 h-full" />
                                    </div>

                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> 20mm ({stats.ratio20.toFixed(0)}%)</span>
                                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /> 10mm ({stats.ratio10.toFixed(0)}%)</span>
                                    </div>

                                    {(stats.needed20 > 0 || stats.needed10 > 0) && (
                                        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 p-3 rounded-lg text-sm flex gap-3 items-start">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>
                                                Add <strong>{stats.needed20 > 0 ? stats.needed20.toLocaleString() : stats.needed10.toLocaleString()} tons</strong> of {stats.needed20 > 0 ? '20mm' : '10mm'} to reach 60/40 ratio.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="mt-0">
                                {invoices.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <p>No invoices found</p>
                                    </div>
                                ) : (
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[80px]">#</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {invoices.map((inv) => (
                                                    <TableRow key={inv.id}>
                                                        <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {format(new Date(inv.date), 'MMM d, yyyy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                                {inv.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-xs">
                                                            {(inv.total || 0).toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/20 flex justify-between items-center">
                    {formData.id && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(formData.id)}
                            className="text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} className="min-w-[100px]">Save</Button>
                    </div>
                </div>
            </div>
        </Sheet>
    );
}
