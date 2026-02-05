import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Check, FileSpreadsheet, Files, Loader2, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

interface MatcherResultsViewProps {
    stats: Stats | null;
    executiveSummary: any[] | null;
    perFileStats: FileStats[] | null;
    targetConfigs: any[];
    isGeneratingInvoices: boolean;
    handlePrepareGeneration: () => void;
    handleOpenUnmatched: () => void;
}

export default function MatcherResultsView({
    stats,
    executiveSummary,
    perFileStats,
    targetConfigs,
    isGeneratingInvoices,
    handlePrepareGeneration,
    handleOpenUnmatched
}: MatcherResultsViewProps) {
    // Calculate total rows processed
    const totalRows = perFileStats?.reduce((sum, file) => sum + file.total, 0) || 0;
    
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Check className="w-64 h-64" />
                </div>
                <div className="relative z-10 p-8 md:p-10">
                    <div className="flex flex-col md:flex-row justify-between gap-8 items-start md:items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                    <Check className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold text-white">
                                    Reconciliation Complete
                                </h1>
                            </div>
                            <p className="text-emerald-100 text-sm">
                                Successfully processed {totalRows.toLocaleString()} rows • {stats?.unmatchedMasterRows || 0} unmatched items
                            </p>
                        </div>

                        {stats && executiveSummary && (
                            <div className="flex gap-6 bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                                <div className="space-y-1">
                                    <p className="text-xs text-emerald-200 uppercase font-bold tracking-wider">Match Rate</p>
                                    <p className="text-3xl font-bold font-mono">
                                        {stats.matchPercentage}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="col-span-1 md:col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <CardContent className="p-8 relative z-10 flex flex-col items-center text-center h-full">
                        <div className="p-4 bg-primary/10 text-primary rounded-2xl mb-6 group-hover:scale-110 transition-transform shadow-sm">
                            <Files className="w-10 h-10" />
                        </div>
                        <h3 className="text-3xl font-bold mb-3">What's Next?</h3>
                        <div className="space-y-4 mb-8 max-w-lg">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary font-bold text-sm">1</span>
                                </div>
                                <span className="text-lg">Generate <strong>Invoices</strong> for matched items</span>
                            </div>
                            {stats?.unmatchedMasterRows && stats.unmatchedMasterRows > 0 && (
                                <div className="flex items-center gap-3 text-orange-600">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                        <span className="text-orange-600 font-bold text-sm">!</span>
                                    </div>
                                    <span className="text-lg">Review <strong>{stats.unmatchedMasterRows} unmatched</strong> items</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4 items-center justify-center flex-wrap">
                            <Button
                                size="lg"
                                className="max-w-sm text-lg font-bold shadow-lg shadow-primary/20 h-12 px-8"
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
                            {stats?.unmatchedMasterRows && stats.unmatchedMasterRows > 0 && (
                                <Button
                                    size="lg"
                                    className="max-w-sm bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold shadow-lg shadow-orange-500/20 h-12 px-8 transition-all duration-200"
                                    onClick={handleOpenUnmatched}
                                    disabled={isGeneratingInvoices}
                                >
                                    <Download className="w-5 h-5 mr-2" />
                                    Review Unmatched
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {perFileStats && perFileStats.length > 0 && (
                    <Card className="md:col-span-3 bg-card/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                                File Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {perFileStats.map((file, idx) => {
                                    const config = targetConfigs.find(t => t.filePath === file.filePath);
                                    const displayName = config?.matchLabel || file.fileName;

                                    return (
                                        <div key={idx} className="bg-background border rounded-lg p-3 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-0.5 max-w-[70%]">
                                                    <div className="font-medium text-sm truncate" title={file.fileName}>
                                                        {displayName}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {file.matched.toLocaleString()} / {file.total.toLocaleString()} rows
                                                    </div>
                                                </div>
                                                <Badge variant={file.percentage >= 90 ? 'success' : file.percentage >= 70 ? 'warning' : 'destructive'} className="ml-2">
                                                    {file.percentage}%
                                                </Badge>
                                            </div>
                                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full",
                                                        file.percentage >= 90 ? "bg-success" :
                                                            file.percentage >= 70 ? "bg-warning" : "bg-destructive"
                                                    )}
                                                    style={{ width: `${file.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                            </div>
        </div>
    );
}
