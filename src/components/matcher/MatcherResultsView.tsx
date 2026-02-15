import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, Check, FileSpreadsheet, Files, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ReconciliationResult } from '@/utils/reconciliation-engine';
import { generateExecutiveSummaryExcel } from '@/utils/executive-summary-generator';
import { toast } from 'sonner';

interface FileStats {
    filePath: string;
    fileName: string;
    total: number;
    matched: number;
    percentage: number;
}

interface Stats {
    matchPercentage: number;
    unmatchedMasterRows: number;
    totalMasterRows: number;
    matchedMasterRows: number;
}

interface MatcherResultsViewProps {
    stats: Stats | null;

    perFileStats: FileStats[] | null;
    targetConfigs: any[];
    isGeneratingInvoices: boolean;
    handlePrepareGeneration: () => void;
    handleOpenUnmatched: () => void;
    reconciliationResult: ReconciliationResult;
}

export default function MatcherResultsView({
    stats,
    perFileStats,
    targetConfigs,
    isGeneratingInvoices,
    handlePrepareGeneration,
    handleOpenUnmatched,
    reconciliationResult
}: MatcherResultsViewProps) {

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

            {/* Header Section with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Status Card */}
                <Card className="md:col-span-3 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-none shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <CheckCircle2 className="w-64 h-64 -mr-16 -mt-16" />
                    </div>
                    <CardContent className="p-8 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                        <Check className="w-5 h-5 text-white" />
                                    </div>
                                    <h1 className="text-2xl font-bold">Reconciliation Complete</h1>
                                </div>
                                <p className="text-indigo-100 max-w-xl">
                                    Successfully processed and reconciled your data. You can now generate invoices or download reports.
                                </p>
                            </div>

                            {stats && (
                                <div className="flex gap-6">
                                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm min-w-[120px]">
                                        <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Match Rate</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold">{stats.matchPercentage}%</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm min-w-[120px]">
                                        <p className="text-xs text-indigo-200 font-medium uppercase tracking-wider mb-1">Unmatched</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-bold">{stats.unmatchedMasterRows}</span>
                                            <span className="text-sm text-indigo-200">items</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Actions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-primary/10 hover:border-primary/30 transition-all shadow-md hover:shadow-lg group">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-primary">
                            <div className="p-2.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                                <Files className="w-6 h-6" />
                            </div>
                            Generate Invoices
                        </CardTitle>
                        <CardDescription>
                            Create individual invoices for each matched customer based on the reconciled data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full text-lg h-12 font-semibold shadow-lg shadow-primary/20"
                            onClick={handlePrepareGeneration}
                            disabled={isGeneratingInvoices}
                        >
                            {isGeneratingInvoices ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    Generate Invoices <ArrowRight className="ml-2 w-5 h-5" />
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-2 border-indigo-100 hover:border-indigo-300 transition-all shadow-md hover:shadow-lg group bg-indigo-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-indigo-700">
                            <div className="p-2.5 bg-indigo-100 rounded-lg group-hover:scale-110 transition-transform">
                                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                            </div>
                            Executive Summary
                        </CardTitle>
                        <CardDescription>
                            Download a comprehensive Excel report summarizing all matched groups and totals.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full text-lg h-12 font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                            onClick={async () => {
                                try {
                                    await generateExecutiveSummaryExcel(reconciliationResult);
                                    toast.success("Executive Summary downloaded!");
                                } catch (e) {
                                    console.error(e);
                                    toast.error("Failed to download summary.");
                                }
                            }}
                        >
                            Download Report <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Actions & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* File Performance List */}
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                            File Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {perFileStats && perFileStats.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {perFileStats.map((file, idx) => {
                                    const config = targetConfigs.find(t => t.filePath === file.filePath);
                                    const displayName = config?.matchLabel || file.fileName;

                                    return (
                                        <div key={idx} className="bg-muted/30 border rounded-xl p-4 transition-all hover:bg-muted/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-semibold truncate pr-2 text-sm" title={file.fileName}>
                                                    {displayName}
                                                </div>
                                                <Badge variant={file.percentage >= 90 ? 'success' : file.percentage >= 70 ? 'warning' : 'destructive'} className="shrink-0">
                                                    {file.percentage}%
                                                </Badge>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>Matched</span>
                                                    <span>{file.matched} / {file.total}</span>
                                                </div>
                                                <Progress
                                                    value={file.percentage}
                                                    className={cn("h-2",
                                                        file.percentage >= 90 ? "bg-green-100 [&>div]:bg-green-500" :
                                                            file.percentage >= 70 ? "bg-amber-100 [&>div]:bg-amber-500" : "bg-red-100 [&>div]:bg-red-500"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                No file stats available.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Unmatched Items Action */}
                {stats?.unmatchedMasterRows && stats.unmatchedMasterRows > 0 ? (
                    <Card className="shadow-sm border-amber-200 bg-amber-50/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                                <AlertTriangle className="w-5 h-5" />
                                Unmatched Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-sm text-amber-800/80">
                                    There are <strong>{stats.unmatchedMasterRows}</strong> items in the master file that didn't match any customer records.
                                </p>
                                <Button
                                    variant="outline"
                                    className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 hover:text-amber-900 bg-white"
                                    onClick={handleOpenUnmatched}
                                >
                                    Review Unmatched Items
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-sm bg-green-50/50 border-green-200">
                        <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-full min-h-[160px]">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 text-green-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="font-semibold text-green-900">All Items Matched</h3>
                            <p className="text-sm text-green-700/80 mt-1">
                                Great job! Every item in the master file has been successfully matched.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
