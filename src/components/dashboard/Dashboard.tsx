import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Receipt, CalendarClock, TrendingUp, Clock, CheckCircle2, ArrowUpRight, Sparkles } from 'lucide-react';
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

                const revenue = invoices.reduce((acc, inv) => acc + inv.total, 0);
                const outstanding = invoices
                    .filter(inv => inv.status !== 'paid' && inv.status !== 'draft')
                    .reduce((acc, inv) => acc + inv.total, 0);
                const activeInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'draft').length;

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
        <div className="h-full bg-background overflow-y-auto">
            <div className="max-w-[1400px] mx-auto px-5 py-5">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
                            <p className="text-sm text-muted-foreground">Here's what's happening with your business</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    {/* Revenue Card */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-lg shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1 text-emerald-200 text-sm font-medium">
                                    <ArrowUpRight className="w-4 h-4" />
                                    Revenue
                                </div>
                            </div>
                            <div className="text-2xl font-bold mb-0.5">
                                {isLoading ? "..." : (stats.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-emerald-200 text-xs font-medium">QAR Total Revenue</div>
                        </div>
                    </div>

                    {/* Customers Card */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 text-white shadow-lg shadow-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1 text-indigo-200 text-sm font-medium">
                                    <ArrowUpRight className="w-4 h-4" />
                                    Customers
                                </div>
                            </div>
                            <div className="text-2xl font-bold mb-0.5">
                                {isLoading ? "..." : stats.customers}
                            </div>
                            <div className="text-indigo-200 text-xs font-medium">Active Clients</div>
                        </div>
                    </div>

                    {/* Outstanding Card */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 text-white shadow-lg shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1 text-amber-100 text-sm font-medium">
                                    {stats.activeInvoices} pending
                                </div>
                            </div>
                            <div className="text-2xl font-bold mb-0.5">
                                {isLoading ? "..." : (stats.outstanding || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-amber-100 text-xs font-medium">QAR Outstanding</div>
                        </div>
                    </div>
                </div>

                {/* Recent Invoices & Aging */}
                <div className="grid gap-4 lg:grid-cols-5">
                    {/* Recent Invoices */}
                    <Card className="lg:col-span-3">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                                    <Receipt className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Recent Invoices</CardTitle>
                                    <p className="text-sm text-muted-foreground">Latest transactions</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-48 text-muted-foreground">
                                    <div className="animate-pulse">Loading...</div>
                                </div>
                            ) : recentInvoices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                                        <Receipt className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground">No invoices yet</div>
                                        <div className="text-sm text-muted-foreground mt-1">Create your first invoice to see it here</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {recentInvoices.map((inv, index) => (
                                        <div 
                                            key={inv.id} 
                                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-mono text-xs font-bold text-muted-foreground">
                                                    {inv.number === 'DRAFT' ? '...' : inv.number.slice(-3)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{inv.to.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {format(new Date(inv.date), 'MMM d, yyyy')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="font-bold">{(inv?.total || 0).toLocaleString()}</div>
                                                    <div className="text-xs text-muted-foreground">QAR</div>
                                                </div>
                                                <Badge
                                                    variant={
                                                        inv.status === 'paid' ? 'success' :
                                                        inv.status === 'overdue' ? 'destructive' :
                                                        'info'
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

                    {/* Invoice Aging */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md shadow-rose-500/20">
                                    <CalendarClock className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Invoice Aging</CardTitle>
                                    <p className="text-sm text-muted-foreground">Outstanding balances</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center h-48 text-muted-foreground">
                                    <div className="animate-pulse">Loading...</div>
                                </div>
                            ) : stats.activeInvoices === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-indigo-600">All caught up!</div>
                                        <div className="text-sm text-muted-foreground mt-1">No outstanding invoices</div>
                                    </div>
                                </div>
                            ) : (() => {
                                const getBucket = (days: number) => {
                                    if (days <= 30) return '0-30';
                                    if (days <= 60) return '31-60';
                                    if (days <= 90) return '61-90';
                                    return '90+';
                                };

                                const agingInvoices = allInvoices
                                    .filter(inv => inv.status !== 'paid' && inv.status !== 'draft')
                                    .map(inv => {
                                        const issueDate = new Date(inv.date);
                                        const diffTime = new Date().getTime() - issueDate.getTime();
                                        const ageDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                        return { ...inv, daysOverdue: ageDays, bucket: getBucket(ageDays) };
                                    });

                                const bucketConfig = [
                                    { key: '0-30', label: '0-30 Days', color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-600' },
                                    { key: '31-60', label: '31-60 Days', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
                                    { key: '61-90', label: '61-90 Days', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600' },
                                    { key: '90+', label: '90+ Days', color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', text: 'text-rose-600' },
                                ];

                                return (
                                    <div className="space-y-3">
                                        {bucketConfig.map(({ key, label, bg, text }) => {
                                            const bucketInvoices = agingInvoices.filter(inv => inv.bucket === key);
                                            const total = bucketInvoices.reduce((acc, inv) => acc + inv.total, 0);
                                            if (bucketInvoices.length === 0) return null;

                                            return (
                                                <div key={key} className={`${bg} rounded-xl p-4`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-sm font-semibold ${text}`}>{label}</span>
                                                        <span className={`text-xs font-medium ${text}`}>{bucketInvoices.length} invoice{bucketInvoices.length > 1 ? 's' : ''}</span>
                                                    </div>
                                                    <div className={`text-lg font-bold ${text}`}>
                                                        {total.toLocaleString()} <span className="text-sm font-medium">QAR</span>
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
        </div>
    );
}
