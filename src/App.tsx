import iconPath from './assets/icon.png';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileAnalysis } from './types.d';
import {
  FileSpreadsheet,
  FolderOpen,
  X,
  Check,
  RefreshCw,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Files,
  Zap,
  Settings2,
  CheckCircle2,
  Sun,
  Moon,
  Download,
  Eye,
  ExternalLink,
} from 'lucide-react';

type Step = 'configure' | 'done';

interface FileConfig extends FileAnalysis {
  matchLabel?: string;
  overrideIdColumn?: number;
  overrideResultColumn?: number;
}

function App() {
  const [step, setStep] = useState<Step>('configure');
  const [masterConfig, setMasterConfig] = useState<FileConfig | null>(null);
  const [targetConfigs, setTargetConfigs] = useState<FileConfig[]>([]);
  const [noMatchLabel, setNoMatchLabel] = useState('Not Matched');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);
  const [unmatchedPreview, setUnmatchedPreview] = useState<any[][] | null>(null);
  const [showUnmatchedPreview, setShowUnmatchedPreview] = useState(false);
  const [stats, setStats] = useState<{
    totalMasterRows: number;
    matchedMasterRows: number;
    unmatchedMasterRows: number;
    matchPercentage: number;
  } | null>(null);
  const [perFileStats, setPerFileStats] = useState<Array<{
    fileName: string;
    filePath: string;
    total: number;
    matched: number;
    percentage: number;
  }> | null>(null);

  // Theme toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Analyze file and return config
  const analyzeFile = async (filePath: string): Promise<FileConfig | null> => {
    const result = await window.electron.analyzeExcelFile(filePath);
    if (!result.success) {
      toast.error(`Failed to analyze: ${result.error}`);
      return null;
    }
    return {
      ...result,
      matchLabel: result.suggestedMatchLabel,
    } as FileConfig;
  };

  // Select and analyze master file
  const handleSelectMaster = async () => {
    const res = await window.electron.openFileDialog({
      multiple: false,
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
    });
    if (!res.canceled && res.filePaths.length > 0) {
      setIsAnalyzing(true);
      const config = await analyzeFile(res.filePaths[0]);
      setMasterConfig(config);
      setIsAnalyzing(false);
    }
  };

  // Select and analyze target files
  const handleSelectTargets = async () => {
    const res = await window.electron.openFileDialog({
      multiple: true,
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
    });
    if (!res.canceled && res.filePaths.length > 0) {
      setIsAnalyzing(true);
      const configs: FileConfig[] = [];
      for (const filePath of res.filePaths) {
        const config = await analyzeFile(filePath);
        if (config) configs.push(config);
      }
      setTargetConfigs(configs);
      setIsAnalyzing(false);
    }
  };

  // Remove target file
  const removeTarget = (index: number) => {
    setTargetConfigs(prev => prev.filter((_, i) => i !== index));
  };

  // Update target match label
  const updateTargetLabel = (index: number, label: string) => {
    setTargetConfigs(prev => prev.map((c, i) =>
      i === index ? { ...c, matchLabel: label } : c
    ));
  };

  // Check if ready to process
  const isReady = masterConfig?.idColumn &&
    masterConfig?.resultColumn &&
    targetConfigs.length > 0 &&
    targetConfigs.every(t => t.idColumn);

  // Run matching
  const handleProcess = async () => {
    if (!masterConfig?.filePath || !isReady) return;

    // Ask for save location
    const defaultName = masterConfig.fileName?.replace('.xlsx', '_updated.xlsx') || 'updated.xlsx';
    const saveResult = await window.electron.saveFileDialog(defaultName);
    if (saveResult.canceled || !saveResult.filePath) return;

    setIsProcessing(true);

    const res = await window.electron.processExcelFiles({
      masterPath: masterConfig.filePath,
      targetPaths: targetConfigs.map(t => t.filePath!),
      masterColIndices: [masterConfig.overrideIdColumn ?? masterConfig.idColumn!.index],
      masterResultColIndex: masterConfig.overrideResultColumn ?? masterConfig.resultColumn!.index,
      targetMatchColIndices: Object.fromEntries(
        targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn ?? t.idColumn!.index]])
      ),
      targetMatchStrings: Object.fromEntries(
        targetConfigs.map(t => [t.filePath!, t.matchLabel || 'Matched'])
      ),
      matchSentence: "",
      noMatchSentence: noMatchLabel,
      outputPath: saveResult.filePath,
      masterRowRange: masterConfig.suggestedRowRange,
      targetRowRanges: Object.fromEntries(
        targetConfigs.filter(t => t.suggestedRowRange).map(t => [t.filePath!, t.suggestedRowRange!])
      ),
    });

    setIsProcessing(false);

    if (res.success) {
      if (res.stats) setStats(res.stats);
      if (res.perFileStats) setPerFileStats(res.perFileStats);
      if (res.unmatchedPath) {
        setUnmatchedPath(res.unmatchedPath);
        // Load unmatched preview
        const previewRes = await window.electron.readExcelPreview(res.unmatchedPath);
        if (previewRes.success && previewRes.data) {
          setUnmatchedPreview(previewRes.data.slice(0, 50)); // First 50 rows
        }
      }
      setStep('done');
      toast.success('Matching completed!');
    } else {
      toast.error(res.error || 'Processing failed');
    }
  };

  // Open unmatched file in system
  const handleOpenUnmatched = () => {
    if (unmatchedPath) {
      window.electron.openFile(unmatchedPath);
    }
  };

  // Show unmatched file in folder
  const handleShowInFolder = () => {
    if (unmatchedPath) {
      window.electron.showInFolder(unmatchedPath);
    }
  };

  // Reset everything
  const reset = () => {
    setMasterConfig(null);
    setTargetConfigs([]);
    setNoMatchLabel('Not Matched');
    setShowAdvanced(false);
    setStats(null);
    setPerFileStats(null);
    setUnmatchedPath(null);
    setUnmatchedPreview(null);
    setShowUnmatchedPreview(false);
    setStep('configure');
  };

  // Get status color for confidence
  const getConfidenceColor = (confidence?: string) => {
    if (confidence === 'high') return 'text-success';
    if (confidence === 'medium') return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Toaster theme={isDarkMode ? "dark" : "light"} position="top-right" />

      {/* Sidebar - Simplified */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src={iconPath} alt="Fatoora" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="font-semibold text-foreground">Fatoora</h1>
              <p className="text-xs text-muted-foreground">Invoice Matcher</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <div className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                step === 'configure' ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  step === 'configure' ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Configure & Run</p>
                  <p className="text-xs text-muted-foreground">Upload files, auto-match</p>
                </div>
              </div>
            </li>
            <li>
              <div className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                step === 'done' ? "bg-success/10 text-success" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  step === 'done' ? "bg-success text-white" : "bg-secondary"
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Results</p>
                  <p className="text-xs text-muted-foreground">View statistics</p>
                </div>
              </div>
            </li>
          </ul>
        </nav>

        {/* Status + Theme Toggle */}
        <div className="p-4 border-t border-border space-y-4">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Master</span>
              <span className={masterConfig ? "text-success font-mono truncate max-w-24" : "text-muted-foreground"}>
                {masterConfig?.fileName || 'None'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Targets</span>
              <span className={targetConfigs.length > 0 ? "text-success" : "text-muted-foreground"}>
                {targetConfigs.length > 0 ? `${targetConfigs.length} files` : 'None'}
              </span>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Dark Mode
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/30">
          <h2 className="font-semibold text-foreground">
            {step === 'configure' ? 'Configure & Run' : 'Results'}
          </h2>
          <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </header>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {step === 'configure' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* File Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Master File */}
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      masterConfig && "border-success/50"
                    )}
                    onClick={handleSelectMaster}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          masterConfig ? "bg-success text-white" : "bg-secondary text-muted-foreground"
                        )}>
                          {masterConfig ? <Check className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                        </div>
                        {masterConfig ? (
                          <div className="font-medium truncate max-w-full">{masterConfig.fileName}</div>
                        ) : (
                          <div>
                            <div className="font-medium">Master File</div>
                            <div className="text-sm text-muted-foreground">Click to select</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Target Files */}
                  <Card
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      targetConfigs.length > 0 && "border-success/50"
                    )}
                    onClick={handleSelectTargets}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          targetConfigs.length > 0 ? "bg-success text-white" : "bg-secondary text-muted-foreground"
                        )}>
                          {targetConfigs.length > 0 ? <Files className="w-6 h-6" /> : <FolderOpen className="w-6 h-6" />}
                        </div>
                        {targetConfigs.length > 0 ? (
                          <div className="font-medium">{targetConfigs.length} Target File{targetConfigs.length !== 1 ? 's' : ''}</div>
                        ) : (
                          <div>
                            <div className="font-medium">Target Files</div>
                            <div className="text-sm text-muted-foreground">Click to select</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Loading indicator */}
                {isAnalyzing && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Analyzing files...</span>
                  </div>
                )}

                {/* Auto-Config Summary */}
                {masterConfig && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Auto-Configuration
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {masterConfig.dataRowCount} rows
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Master Config */}
                      <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Master: {masterConfig.fileName}</span>
                          <Check className="w-4 h-4 text-success" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">ID Column:</span>
                            <span className={cn("font-mono", getConfidenceColor(masterConfig.idColumn?.confidence))}>
                              {masterConfig.idColumn?.name || 'Not found'}
                            </span>
                            {masterConfig.idColumn?.confidence === 'high' && (
                              <Badge variant="default" className="text-[10px] px-1 py-0">auto</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Output:</span>
                            <span className="font-mono">
                              {masterConfig.resultColumn?.isNew ? '(New Column)' : masterConfig.resultColumn?.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Target Configs */}
                      {targetConfigs.map((target, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate flex-1">{target.fileName}</span>
                            <div className="flex items-center gap-2">
                              {target.idColumn ? (
                                <Check className="w-4 h-4 text-success" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-destructive" />
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); removeTarget(idx); }}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">ID:</span>
                              <span className={cn("font-mono", getConfidenceColor(target.idColumn?.confidence))}>
                                {target.idColumn?.name || 'Not found'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Label:</span>
                              <Input
                                className="h-6 text-xs px-2 py-0 flex-1"
                                value={target.matchLabel || ''}
                                onChange={(e) => updateTargetLabel(idx, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* No-match label */}
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">No match label:</span>
                        <Input
                          className="h-8 w-40"
                          value={noMatchLabel}
                          onChange={(e) => setNoMatchLabel(e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Advanced Options Toggle */}
                {masterConfig && (
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                    Advanced Options
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}

                {/* Advanced Options Panel */}
                {showAdvanced && masterConfig && (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-sm">Override Auto-Detection</CardTitle>
                      <CardDescription className="text-xs">
                        Manually select columns if the auto-detection was incorrect.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Master ID Column</label>
                          <select
                            className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={masterConfig.overrideIdColumn ?? masterConfig.idColumn?.index ?? ''}
                            onChange={(e) => setMasterConfig(prev => prev ? {
                              ...prev,
                              overrideIdColumn: e.target.value ? parseInt(e.target.value) : undefined
                            } : null)}
                          >
                            {masterConfig.headers?.map(h => (
                              <option key={h.index} value={h.index}>{h.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Output Column</label>
                          <select
                            className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={masterConfig.overrideResultColumn ?? masterConfig.resultColumn?.index ?? ''}
                            onChange={(e) => setMasterConfig(prev => prev ? {
                              ...prev,
                              overrideResultColumn: e.target.value ? parseInt(e.target.value) : undefined
                            } : null)}
                          >
                            {masterConfig.headers?.map(h => (
                              <option key={h.index} value={h.index}>{h.name}</option>
                            ))}
                            <option value={masterConfig.headers?.length || 0}>(New Column)</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Run Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    size="lg"
                    disabled={!isReady || isProcessing}
                    onClick={handleProcess}
                    className="min-w-40"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Run Matching
                      </>
                    )}
                  </Button>
                </div>

                {/* Ready status */}
                {!isReady && masterConfig && (
                  <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    {!masterConfig.idColumn && 'Master ID column not detected. '}
                    {targetConfigs.length === 0 && 'Select target files. '}
                    {targetConfigs.some(t => !t.idColumn) && 'Some targets missing ID column.'}
                  </div>
                )}
              </div>
            )}

            {/* Results Step */}
            {step === 'done' && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Matching Complete!</h1>
                    <p className="text-muted-foreground mt-2">Your master file has been updated.</p>
                  </div>
                </div>

                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="text-center">
                      <CardContent className="pt-6">
                        <p className="text-3xl font-bold">{stats.totalMasterRows}</p>
                        <p className="text-xs text-muted-foreground uppercase mt-1">Rows Scanned</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center bg-success/10 border-success/30">
                      <CardContent className="pt-6">
                        <p className="text-3xl font-bold text-success">{stats.matchedMasterRows}</p>
                        <p className="text-xs text-muted-foreground uppercase mt-1">Matches</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center bg-destructive/10 border-destructive/30">
                      <CardContent className="pt-6">
                        <p className="text-3xl font-bold text-destructive">{stats.unmatchedMasterRows}</p>
                        <p className="text-xs text-muted-foreground uppercase mt-1">Unmatched</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center bg-primary/10 border-primary/30">
                      <CardContent className="pt-6">
                        <p className="text-3xl font-bold text-primary">{stats.matchPercentage}%</p>
                        <p className="text-xs text-muted-foreground uppercase mt-1">Rate</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {perFileStats && perFileStats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Per-File Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {perFileStats.map((fileStat, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                              <span className="truncate font-medium">{fileStat.fileName}</span>
                              <span className="text-xs text-muted-foreground">
                                {fileStat.matched} / {fileStat.total} rows matched
                              </span>
                            </div>
                            <Badge variant={fileStat.percentage >= 80 ? 'success' : fileStat.percentage >= 50 ? 'warning' : 'destructive'}>
                              {fileStat.percentage}%
                            </Badge>
                          </div>
                          <Progress value={fileStat.percentage} className={cn(
                            fileStat.percentage >= 80 ? '[&>div]:bg-success' :
                              fileStat.percentage >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
                          )} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Unmatched Preview */}
                {unmatchedPath && stats && stats.unmatchedMasterRows > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          Unmatched Rows ({stats.unmatchedMasterRows})
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowUnmatchedPreview(!showUnmatchedPreview)}>
                            <Eye className="w-4 h-4 mr-1" />
                            {showUnmatchedPreview ? 'Hide' : 'Preview'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleOpenUnmatched}>
                            <Download className="w-4 h-4 mr-1" />
                            Open File
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleShowInFolder}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {showUnmatchedPreview && unmatchedPreview && (
                      <CardContent>
                        <div className="border rounded-lg overflow-hidden">
                          <div className="max-h-64 overflow-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-secondary sticky top-0">
                                <tr>
                                  {unmatchedPreview[0]?.map((header: any, idx: number) => (
                                    <th key={idx} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b">
                                      {String(header || `Col ${idx + 1}`)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {unmatchedPreview.slice(1).map((row, rIdx) => (
                                  <tr key={rIdx} className="border-b last:border-0 hover:bg-secondary/50">
                                    {row.map((cell: any, cIdx: number) => (
                                      <td key={cIdx} className="px-2 py-1.5 font-mono truncate max-w-32">
                                        {cell !== undefined && cell !== null ? String(cell) : ''}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {unmatchedPreview.length >= 50 && (
                            <div className="px-3 py-2 bg-secondary/50 text-xs text-muted-foreground text-center">
                              Showing first 50 rows. Open file for complete data.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}

                <div className="flex justify-center">
                  <Button size="lg" variant="outline" onClick={reset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Match
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

export default App;
