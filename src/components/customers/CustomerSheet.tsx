import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet } from '@/components/ui/sheet';
import { Save, Trash2, User, Phone, Mail, Calculator, AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Customer, Invoice } from '@/types';
import { format } from 'date-fns';

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
            <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-muted/5 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 pt-0.5">
                        <h2 className="text-lg font-bold tracking-tight mb-0.5">{formData.id ? 'Edit Customer' : 'New Customer'}</h2>
                        <p className="text-sm text-muted-foreground line-clamp-1">{formData.id ? `ID: ${formData.id.substring(0, 8)}...` : 'Add a new client to your database'}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 -mt-2 -mr-2">
                        <X className="w-5 h-5 opacity-70" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="details" className="w-full">

                        <div className="px-4 mb-2">
                            <TabsList className="w-full justify-start bg-white/5 p-1 rounded-lg h-9 border border-white/5">
                                <TabsTrigger
                                    value="details"
                                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md h-full px-4 text-sm font-medium transition-all"
                                >
                                    Details
                                </TabsTrigger>
                                {formData.id && (
                                    <>
                                        <TabsTrigger
                                            value="stats"
                                            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md h-full px-4 text-sm font-medium transition-all"
                                        >
                                            Usage Stats
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="history"
                                            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md h-full px-4 text-sm font-medium transition-all"
                                        >
                                            Invoices <Badge variant="secondary" className="ml-2 h-5 px-1.5 min-w-[1.25rem] bg-white/10 text-foreground">{invoices.length}</Badge>
                                        </TabsTrigger>
                                    </>
                                )}
                            </TabsList>
                        </div>

                        <div className="p-4">
                            <TabsContent value="details" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                            Full Name
                                        </label>
                                        <div className="relative group">
                                            <Input
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="bg-muted/30 border-white/5 focus:bg-background h-9 px-3 transition-all group-hover:border-white/10"
                                                placeholder="Company or Individual Name"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-muted-foreground">Email Address</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="pl-10 bg-muted/30 border-white/5 focus:bg-background h-9 transition-all group-hover:border-white/10"
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-muted-foreground">Phone Number</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="pl-10 bg-muted/30 border-white/5 focus:bg-background h-9 transition-all group-hover:border-white/10"
                                                    placeholder="+974 ..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Billing Address</label>
                                        <textarea
                                            className="w-full min-h-[80px] rounded-lg border border-white/5 bg-muted/30 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus:bg-background focus:ring-1 focus:ring-primary transition-all resize-none"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Street address, PO Box, etc."
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="stats" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-gradient-to-br from-card/50 to-muted/20 rounded-xl p-4 border border-white/5 space-y-5">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Calculator className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">Material Usage</h3>
                                            <p className="text-xs text-muted-foreground">Track 10mm vs 20mm consumption</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-background/40 border border-white/5 hover:bg-background/60 transition-colors">
                                            <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Total 20mm</div>
                                            <div className="flex items-baseline gap-2">
                                                <Input
                                                    type="number"
                                                    className="text-xl font-bold bg-transparent border-none p-0 h-auto shadow-none focus-visible:ring-0 w-full font-mono tracking-tight"
                                                    value={formData.total20mm}
                                                    onChange={(e) => setFormData({ ...formData, total20mm: Number(e.target.value) })}
                                                />
                                                <span className="text-sm font-medium text-muted-foreground">tons</span>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background/40 border border-white/5 hover:bg-background/60 transition-colors">
                                            <div className="text-xs font-medium uppercase text-muted-foreground mb-2">Total 10mm</div>
                                            <div className="flex items-baseline gap-2">
                                                <Input
                                                    type="number"
                                                    className="text-xl font-bold bg-transparent border-none p-0 h-auto shadow-none focus-visible:ring-0 w-full font-mono tracking-tight"
                                                    value={formData.total10mm}
                                                    onChange={(e) => setFormData({ ...formData, total10mm: Number(e.target.value) })}
                                                />
                                                <span className="text-sm font-medium text-muted-foreground">tons</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Ratio Analysis */}
                                    <div className="pt-6 border-t border-dashed border-white/10 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium flex items-center gap-2">
                                                Efficiency Balance
                                            </span>
                                            <Badge
                                                variant={stats.status === 'warning' ? 'outline' : 'default'}
                                                className={`capitalize px-3 py-1 ${stats.status === 'warning' ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30'}`}
                                            >
                                                {stats.status === 'warning' ? 'Optimization Needed' : 'Optimal Balance'}
                                            </Badge>
                                        </div>

                                        {/* Visual Bar */}
                                        <div className="space-y-2">
                                            <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden flex ring-1 ring-white/5">
                                                <div style={{ width: `${stats.ratio20}%` }} className="bg-indigo-500 h-full transition-all duration-1000 ease-out" />
                                                <div style={{ width: `${stats.ratio10}%` }} className="bg-slate-400 h-full transition-all duration-1000 ease-out" />
                                            </div>
                                            <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
                                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> 20mm ({stats.ratio20.toFixed(1)}%)</span>
                                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /> 10mm ({stats.ratio10.toFixed(1)}%)</span>
                                            </div>
                                        </div>

                                        {(stats.needed20 > 0 || stats.needed10 > 0) && (
                                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex gap-4 text-sm text-amber-500">
                                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold mb-1">Optimization Suggestion</p>
                                                    <p className="opacity-90 leading-relaxed">
                                                        To reach optimal ratio (60/40), add <strong className="text-amber-400">{stats.needed20 > 0 ? stats.needed20.toLocaleString() : stats.needed10.toLocaleString()} tons</strong> of {stats.needed20 > 0 ? '20mm' : '10mm'}.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-3">
                                    {invoices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-white/5">
                                            <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center mb-3">
                                                <Calculator className="w-6 h-6 opacity-20" />
                                            </div>
                                            <p>No invoices generated yet</p>
                                            <p className="text-xs opacity-50">Invoices will appear here once created</p>
                                        </div>
                                    ) : (
                                        invoices.map(inv => (
                                            <div key={inv.id} className="group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-card/40 hover:bg-card/80 transition-all cursor-default">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center font-mono text-xs font-bold text-indigo-500">
                                                        INV
                                                    </div>
                                                    <div>
                                                        <div className="font-mono font-medium text-sm group-hover:text-primary transition-colors">{inv.number}</div>
                                                        <div className="text-xs text-muted-foreground">{format(new Date(inv.date), 'MMM d, yyyy')}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(inv.total)}</div>
                                                    <Badge variant="secondary" className={`text-[10px] h-5 mt-1 capitalize ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        inv.status === 'overdue' ? 'bg-rose-500/10 text-rose-500' : ''
                                                        }`}>{inv.status}</Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-muted/5 flex justify-between items-center mt-auto backdrop-blur-md">
                    {formData.id && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(formData.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <Button variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5">Cancel</Button>
                        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </div>
                </div>
            </div>
        </Sheet>
    );
}
