import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Receipt, Activity, CalendarClock, AlertCircle } from 'lucide-react';
import type { Invoice } from '@/types';
import { format } from 'date-fns';

export function Dashboard() {
    const [stats, setStats] = useState({
        revenue: 0,
        customers: 0,
        outstanding: 0,
        activeInvoices: 0
    });
    const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [invResult, custResult] = await Promise.all([
                window.electron.getInvoices(),
                window.electron.getCustomers()
            ]);

            if (invResult.success && invResult.invoices) {
                const invoices = invResult.invoices;
                setAllInvoices(invoices);

                // Calculate Stats
                const revenue = invoices.reduce((acc, inv) => acc + inv.total, 0);
                const outstanding = invoices
                    .filter(inv => inv.status !== 'paid' && inv.status !== 'draft')
                    .reduce((acc, inv) => acc + inv.total, 0);
                const activeInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'draft').length;

                // Recent Invoices (Last 5)
                const sorted = [...invoices].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
                setRecentInvoices(sorted.slice(0, 5));

                setStats(prev => ({
                    ...prev,
                    revenue,
                    outstanding,
                    activeInvoices
                }));
            }

            if (custResult.success && custResult.customers) {
                setStats(prev => ({
                    ...prev,
                    customers: custResult.customers?.length || 0
                }));
            }

        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background/50 p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Overview of your business performance.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-sm hover:bg-card/60 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <span className="text-sm font-normal text-muted-foreground ml-1">QAR</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            +20.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-sm hover:bg-card/60 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Customers
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? "..." : stats.customers}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total client base
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-sm hover:bg-card/60 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Outstanding Balance
                        </CardTitle>
                        <Activity className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <span className="text-sm font-normal text-muted-foreground ml-1">QAR</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.activeInvoices} unpaid invoices
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Screen */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card/30 border-white/5 backdrop-blur-sm shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-primary" />
                            Recent Invoices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-muted/10">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="w-[100px]">Invoice</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : recentInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48">
                                            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                                                <div className="p-4 bg-secondary/50 rounded-full">
                                                    <Receipt className="w-8 h-8 text-muted-foreground/50" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">No invoices generated yet</div>
                                                    <div className="text-xs text-muted-foreground mt-1">Create your first invoice to see it here.</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recentInvoices.map((inv) => (
                                        <TableRow key={inv.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-mono font-medium">{inv.number === 'DRAFT' ? 'Processing...' : inv.number}</TableCell>
                                            <TableCell>{inv.to.name}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {format(new Date(inv.date), 'MMM d, yyyy')}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {inv.total.toLocaleString()} <span className="text-xs text-muted-foreground">QAR</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant="secondary"
                                                    className={`
                                                        capitalize text-[10px] 
                                                        ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            inv.status === 'overdue' ? 'bg-red-500/10 text-red-500' :
                                                                'bg-blue-500/10 text-blue-500'}
                                                    `}
                                                >
                                                    {inv.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Date-Based Aging Card */}
                <Card className="col-span-3 bg-card/30 border-white/5 backdrop-blur-sm shadow-lg flex flex-col h-[600px]">
                    <CardHeader className="pb-2 flex-none">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CalendarClock className="w-5 h-5 text-indigo-500" />
                            Invoice Aging (Issuance)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pr-2 space-y-6 pt-4 custom-scrollbar">
                        {isLoading ? (
                            <div className="text-center text-muted-foreground text-sm">Loading overdue list...</div>
                        ) : stats.activeInvoices === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                                <div className="p-3 bg-emerald-500/10 rounded-full">
                                    <AlertCircle className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div className="text-sm font-medium text-emerald-500">All caught up!</div>
                                <div className="text-xs text-muted-foreground">No overdue invoices.</div>
                            </div>
                        ) : (() => {
                            // Helper to determine bucket
                            const getBucket = (days: number) => {
                                if (days <= 30) return '0 - 30 Days';
                                if (days <= 60) return '31 - 60 Days';
                                if (days <= 90) return '61 - 90 Days';
                                return '90+ Days';
                            };

                            // Get Aging Invoices (Issuance Based)
                            const agingInvoices = allInvoices
                                .filter(inv => inv.status !== 'paid' && inv.status !== 'draft')
                                .map(inv => {
                                    // Age based on Issuance Date (inv.date)
                                    const issueDate = new Date(inv.date);
                                    const diffTime = new Date().getTime() - issueDate.getTime();
                                    const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                    return { ...inv, daysOverdue: ageDays, bucket: getBucket(ageDays) };
                                });

                            // Calculate stats per bucket
                            const buckets = ['0 - 30 Days', '31 - 60 Days', '61 - 90 Days', '90+ Days'];
                            const groupedInvoices = buckets.map(bucket => {
                                const invoices = agingInvoices.filter(inv => inv.bucket === bucket).sort((a, b) => b.daysOverdue - a.daysOverdue);
                                const total = invoices.reduce((acc, inv) => acc + inv.total, 0);
                                return { bucket, invoices, total };
                            });

                            if (agingInvoices.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                                        <div className="p-3 bg-emerald-500/10 rounded-full">
                                            <AlertCircle className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <div className="text-sm font-medium text-emerald-500">All caught up!</div>
                                        <div className="text-xs text-muted-foreground">No overdue invoices found.</div>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-8">
                                    {groupedInvoices.map(({ bucket, invoices, total }) => {
                                        if (invoices.length === 0) return null;

                                        return (
                                            <div key={bucket} className="space-y-3">
                                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                    <h4 className="text-sm font-semibold text-muted-foreground">{bucket}</h4>
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        Total: <span className="text-foreground font-semibold">{total.toLocaleString()}</span> QAR
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {invoices.map(inv => (
                                                        <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`
                                                                    flex flex-col items-center justify-center w-8 h-8 rounded shrink-0 border transition-colors
                                                                    ${bucket === '90+ Days' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                                        bucket === '61 - 90 Days' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                                                                            bucket === '31 - 60 Days' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                                                'bg-blue-500/10 border-blue-500/20 text-blue-500'}
                                                                `}>
                                                                    <span className="text-[10px] font-bold">{inv.daysOverdue}</span>
                                                                    <span className="text-[6px] uppercase leading-none opacity-70">Days</span>
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-sm font-medium truncate max-w-[120px]" title={inv.to.name}>{inv.to.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground font-mono">{inv.number === 'DRAFT' ? 'Gen...' : inv.number}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <div className="text-sm font-mono font-medium">{inv.total.toLocaleString()}</div>
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    {inv.dueDate ? format(new Date(inv.dueDate), 'MMM d') : 'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
