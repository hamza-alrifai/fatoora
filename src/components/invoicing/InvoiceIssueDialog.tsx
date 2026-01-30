import { GlassDialog } from '@/components/ui/glass-dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Lock, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceIssueDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    invoiceNumber: string;
    invoiceTotal: number;
    currency: string;
}

export function InvoiceIssueDialog({
    isOpen,
    onClose,
    onConfirm,
    invoiceNumber,
    invoiceTotal,
    currency
}: InvoiceIssueDialogProps) {
    return (
        <GlassDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Finalize & Issue Invoice"
            description="This will lock the invoice and generate the official PDF."
            className="max-w-md"
        >
            <div className="space-y-6 pt-2">
                {/* Summary Card */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Invoice #</span>
                        <span className="font-mono font-bold">{invoiceNumber === 'DRAFT' ? 'Auto-Generated' : invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-mono font-bold text-lg text-primary">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(invoiceTotal)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Issue Date
                        </span>
                        <span className="font-medium">{format(new Date(), 'MMM d, yyyy')}</span>
                    </div>
                </div>

                {/* Warning / Info */}
                <div className="flex gap-3 text-sm text-amber-500/90 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-tight">
                        Once issued, this invoice cannot be deleted or edited without administrator privileges.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button variant="ghost" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-500/20"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Confirm & Print
                    </Button>
                </div>
            </div>
        </GlassDialog>
    );
}
