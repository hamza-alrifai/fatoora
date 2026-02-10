import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Receipt, CalendarClock, TrendingUp, Clock, CheckCircle2, ArrowUpRight, LayoutDashboard } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
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
        <div className="h-full bg-background overflow-y-auto relative">
            <div className="min-h-full flex flex-col">
                <TopBar
                    title="Dashboard"
                    subtitle="Overview of your business performance"
                    icon={LayoutDashboard}
                    iconColor="from-indigo-500 to-indigo-600"
                />

                <div className="p-6 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Revenue Card */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 p-6 text-white shadow-xl shadow-emerald-500/10 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/10">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-emerald-50 text-xs font-semibold">
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        +12% this month
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-emerald-50/80 text-sm font-medium uppercase tracking-wider">Total Revenue</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold tracking-tight">
                                            {isLoading ? "..." : (stats.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="text-lg font-medium text-emerald-100/70">QAR</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customers Card */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/90 to-indigo-600/90 p-6 text-white shadow-xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/10">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-indigo-50 text-xs font-semibold">
                                        Active Clients
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-indigo-50/80 text-sm font-medium uppercase tracking-wider">Total Customers</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold tracking-tight">
                                            {isLoading ? "..." : stats.customers}
                                        </span>
                                        <span className="text-lg font-medium text-indigo-100/70">Clients</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Outstanding Card */}
                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/90 to-amber-600/90 p-6 text-white shadow-xl shadow-amber-500/10 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            <div className="relative">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/10">
                                        <Clock className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-amber-50 text-xs font-semibold">
                                        {stats.activeInvoices} Pending
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-amber-50/80 text-sm font-medium uppercase tracking-wider">Outstanding Amount</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold tracking-tight">
                                            {isLoading ? "..." : (stats.outstanding || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                        <span className="text-lg font-medium text-amber-100/70">QAR</span>
                                    </div>
                                </div>
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
        </div>
    );
}
