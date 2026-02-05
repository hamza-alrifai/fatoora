import type { Customer } from '../../types.d';
import { useState, useEffect } from 'react';
import { GlassDialog } from '@/components/ui/glass-dialog';
import { Button } from '@/components/ui/button';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ColumnMapperProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileType: 'master' | 'target'; // 'master' = Site Log, 'target' = Delivery Note
    fileName: string;
    headers: { index: number; name: string }[];
    previewData: any[][];

    // Customers for dropdown
    customers?: Customer[];

    // Initial / Current selections
    initialIdCol?: number;
    initialResultCol?: number; // Only for Site Log
    initialMatchLabel?: string; // Only for Delivery Note

    onConfirm: (idCol: number, resultCol?: number, matchLabel?: string) => void;
}

export function ColumnMapper({
    open,
    onOpenChange,
    fileType,
    fileName,
    headers,
    previewData,
    customers = [],
    initialIdCol = -1,
    initialResultCol = -1,
    initialMatchLabel = '',
    onConfirm
}: ColumnMapperProps) {
    const [idCol, setIdCol] = useState<number>(initialIdCol);
    const [resultCol, setResultCol] = useState<number>(initialResultCol);
    const [matchLabel, setMatchLabel] = useState<string>(initialMatchLabel);

    // Reset state when dialog opens with new props
    useEffect(() => {
        setIdCol(initialIdCol);
        setResultCol(initialResultCol);
        setMatchLabel(initialMatchLabel);
        setMatchLabel(initialMatchLabel);
    }, [open, initialIdCol, initialResultCol, initialMatchLabel, fileName]);

    const handleConfirm = () => {
        onConfirm(idCol, resultCol, matchLabel);
        // Parent controls closing or chaining
    };

    const isReady = idCol !== -1 && (fileType === 'master' ? resultCol !== -1 : (fileType === 'target' && !!matchLabel));

    // Helper to render select options
    const renderSelectOptions = () => (
        <>
            <option value="-1">Select Column...</option>
            {headers.map(h => (
                <option key={h.index} value={h.index}>
                    {h.name || `Column ${h.index + 1}`}
                </option>
            ))}
        </>
    );

    return (
        <GlassDialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={`Map Columns`}
            description={
                <span>
                    Please confirm the columns for <span className="font-extrabold text-xl text-foreground break-all">{fileName ? fileName : 'the selected file'}</span>.
                </span>
            }
            className="max-w-5xl"
        >
            <div className="space-y-8 py-4">

                {/* Configuration Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-2xl bg-white/5 border border-white/10">

                    {/* ID Column Selection */}
                    <div className="space-y-3">
                        <label className="text-lg font-bold text-foreground flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-base font-bold">1</span>
                            {fileType === 'master' ? 'Ticket Number Column' : 'Description / Material Column'} <span className="text-destructive">*</span>
                        </label>
                        <select
                            value={idCol}
                            onChange={(e) => setIdCol(Number(e.target.value))}
                            className={cn(
                                "w-full bg-background/50 border rounded-xl h-12 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm",
                                idCol === -1 ? "border-destructive text-destructive" : "border-white/10"
                            )}
                        >
                            {renderSelectOptions()}
                        </select>
                    </div>

                    {/* Result Column Selection (Only for Master) */}
                    {fileType === 'master' && (
                        <div className="space-y-3">
                            <label className="text-lg font-bold text-foreground flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 text-base font-bold">2</span>
                                Customer Name Column <span className="text-destructive">*</span>
                            </label>
                            <select
                                value={resultCol}
                                onChange={(e) => setResultCol(Number(e.target.value))}
                                className={cn(
                                    "w-full bg-background/50 border rounded-xl h-12 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm",
                                    resultCol === -1 ? "border-destructive text-destructive" : "border-white/10"
                                )}
                            >
                                {renderSelectOptions()}
                            </select>
                        </div>
                    )}

                    {/* Customer Selection (Only for Target) */}
                    {fileType === 'target' && (
                        <div className="space-y-3">
                            <label className="text-lg font-bold text-foreground flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 text-base font-bold">2</span>
                                Matches Customer Label <span className="text-destructive">*</span>
                            </label>
                            <select
                                value={matchLabel}
                                onChange={(e) => setMatchLabel(e.target.value)}
                                className={cn(
                                    "w-full bg-background/50 border rounded-xl h-12 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm",
                                    !matchLabel ? "border-destructive text-destructive font-medium" : "border-white/10"
                                )}
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                                <option disabled>──────────</option>
                                <option value="___NEW___">+ Create New Customer</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Data Preview */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">File Preview (First 20 Rows)</Label>
                        <Badge variant="outline" className="text-xs py-1 h-6">
                            {headers.length} Columns Found
                        </Badge>
                    </div>
                    <div className="rounded-lg border bg-card shadow-sm overflow-hidden relative">
                        <div className="h-[300px] overflow-auto relative">
                            <table className="w-full caption-bottom text-sm">
                                <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                                    <TableRow className="hover:bg-transparent border-b border-border text-foreground">
                                        {headers.slice(0, 20).map(h => (
                                            <TableHead key={h.index} className={cn(
                                                "whitespace-nowrap h-10 text-sm font-bold px-4 py-2",
                                                h.index === idCol ? "!text-yellow-900 !bg-yellow-200 !border-b-4 !border-yellow-600 !font-bold" : "",
                                                h.index === resultCol ? "!text-yellow-900 !bg-yellow-200 !border-b-4 !border-yellow-600 !font-bold" : ""
                                            )}>
                                                <div className="flex items-center gap-2">
                                                    {h.name}
                                                    {h.index === resultCol && <Badge variant="outline" className="!text-[10px] !px-1.5 !py-0.5 !h-5 !leading-none !border-yellow-600 !text-yellow-800 !bg-yellow-100 !font-bold">Result</Badge>}
                                                </div>
                                            </TableHead>
                                        ))}
                                        {headers.length > 20 && <TableHead className="text-sm italic text-muted-foreground px-4">+{headers.length - 20} more...</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.slice(0, 20).map((row, rIdx) => (
                                        <TableRow key={rIdx} className="hover:bg-muted/50 border-b border-border last:border-0 transition-colors">
                                            {headers.slice(0, 20).map(h => (
                                                <TableCell key={h.index} className={cn(
                                                    "py-3 px-4 font-mono text-sm whitespace-nowrap text-foreground/80",
                                                    h.index === idCol ? "!text-yellow-900 !font-bold !bg-yellow-100" : "",
                                                    h.index === resultCol ? "!text-yellow-900 !font-bold !bg-yellow-100" : ""
                                                )}>
                                                    {String(row[h.index] || '')}
                                                </TableCell>
                                            ))}
                                            {headers.length > 20 && <TableCell className="text-muted-foreground/30">...</TableCell>}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} className="text-base">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isReady}
                        size="lg"
                        className={cn(
                            "gap-2 font-bold transition-all text-base px-8",
                            isReady ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" : "opacity-50 cursor-not-allowed"
                        )}
                    >
                        Confirm <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>
        </GlassDialog>
    );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={className}>{children}</div>;
}
