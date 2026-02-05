import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { FileAnalysis, Customer } from '../../types.d';
import type { CustomerData } from '@/components/customers/CustomerCreationDialog';
import { useMatcherState, type FileGenConfig } from '@/hooks/useMatcherState';
import { parseQuantitySafe } from '@/utils/quantity-parser';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

export function useMatcherController(params: {
    onStepChange: (step: 'configure' | 'done') => void;
}) {
    const { onStepChange } = params;

    const matcherState = useMatcherState(onStepChange);
    const {
        masterConfig,
        setMasterConfig,
        targetConfigs,
        setTargetConfigs,
        setOutputFilePath,
        noMatchLabel,
        setStats,
        setPerFileStats,
        fileGenConfigs,
        setFileGenConfigs,
        outputFileHeaders,
        setOutputFileHeaders,
        outputFileData,
        setOutputFileData,
        executiveSummary,
        setExecutiveSummary,
        groupTotals,
        setGroupTotals,
        uniqueMatchValues,
        setUniqueMatchValues,
        reset,
    } = matcherState;

    const [mapperOpen, setMapperOpen] = useState(false);
    const [mappingTarget, setMappingTarget] = useState<{ type: 'master' | 'target'; index: number } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);
    const [_matchedRows, setMatchedRows] = useState<Array<{ sourceFile: string; data: any[]; rowNumber: number }>>([]);
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [creatingCustomerForTargetIndex, setCreatingCustomerForTargetIndex] = useState<number | null>(null);

    const [customerProjections, setCustomerProjections] = useState<Record<string, { t10: number; t20: number }>>({});

    const summaryConfig = useMemo(
        () =>
            fileGenConfigs['output'] || {
                customerId: null,
                descriptionColIdx: -1,
                quantityColIdx: -1,
                resultColIdx: -1,
            },
        [fileGenConfigs]
    );

    const loadCustomers = useCallback(async () => {
        const res = await window.electron.getCustomers();
        if (res.success && res.customers) {
            setCustomers(res.customers);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    useEffect(() => {
        const proj: Record<string, { t10: number; t20: number }> = {};

        customers.forEach(c => {
            proj[c.id] = { t10: c.total10mm || 0, t20: c.total20mm || 0 };
        });

        Object.entries(fileGenConfigs).forEach(([groupName, config]) => {
            if (config.customerId && groupTotals[groupName]) {
                const cid = config.customerId;
                if (!proj[cid]) proj[cid] = { t10: 0, t20: 0 };

                proj[cid].t10 += groupTotals[groupName].t10;
                proj[cid].t20 += groupTotals[groupName].t20;
            }
        });

        setCustomerProjections(proj);
    }, [fileGenConfigs, groupTotals, customers]);

    useEffect(() => {
        const resultColIdx = fileGenConfigs['output']?.resultColIdx;

        if (resultColIdx !== undefined && resultColIdx !== -1 && outputFileData.length > 0) {
            const outputHeadersLower = outputFileHeaders.map(h => h.name.toLowerCase());
            let qIdx = fileGenConfigs['output']?.quantityColIdx ?? -1;

            if (qIdx === -1) {
                qIdx = outputHeadersLower.findIndex(h => h.includes('net') && h.includes('weight'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('weight'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('qty'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('quantity'));
            }

            const totals: Record<string, { total: number; t10: number; t20: number }> = {};
            const unique = new Set<string>();
            const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';

            const dataRows = outputFileData.slice(1);

            dataRows.forEach(row => {
                const val = row[resultColIdx] !== undefined && row[resultColIdx] !== null ? String(row[resultColIdx]).trim() : '';

                if (
                    val &&
                    val.toLowerCase() !== 'not matched' &&
                    val !== noMatchLabel &&
                    val !== headerName
                ) {
                    unique.add(val);

                    let quantity = 0;
                    if (qIdx !== -1 && qIdx < row.length) {
                        quantity = parseQuantitySafe(row[qIdx]);
                    }

                    const fullRow = row.join(' ').toLowerCase();
                    const is20 = fullRow.includes('20mm');
                    const is10 = fullRow.includes('10mm');

                    if (!totals[val]) totals[val] = { total: 0, t10: 0, t20: 0 };
                    totals[val].total += quantity;
                    if (is10) totals[val].t10 += quantity;
                    if (is20) totals[val].t20 += quantity;
                }
            });

            setGroupTotals(totals);
            const sorted = Array.from(unique).sort();
            setUniqueMatchValues(sorted);
        }
    }, [fileGenConfigs, outputFileData, outputFileHeaders, noMatchLabel, setGroupTotals, setUniqueMatchValues]);

    const handleGenerateSummary = useCallback(async () => {
        if (!summaryConfig.resultColIdx || summaryConfig.resultColIdx === -1) {
            toast.error('Please select a customer column');
            return;
        }

        try {
            const { generateExecutiveSummary } = await import('@/utils/executive-summary-utils');
            const summaryRows = generateExecutiveSummary({
                outputFileHeaders,
                outputFileData,
                summaryConfig,
                fileGenConfigs,
                noMatchLabel,
                customers,
            });

            setExecutiveSummary(summaryRows);
            toast.success('Executive Summary Generated');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate summary');
        }
    }, [customers, fileGenConfigs, noMatchLabel, outputFileData, outputFileHeaders, setExecutiveSummary, summaryConfig]);

    const handleExportSummary = useCallback(async () => {
        if (!executiveSummary) return;

        try {
            const { exportExecutiveSummaryToExcel } = await import('@/utils/executive-summary-export');
            await exportExecutiveSummaryToExcel(executiveSummary);
            toast.success('Executive Summary downloaded successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export summary');
        }
    }, [executiveSummary]);

    const analyzeFile = useCallback(async (filePath: string): Promise<FileConfig | null> => {
        const result = await window.electron.analyzeExcelFile(filePath);
        if (!result.success) {
            toast.error(`Failed to analyze: ${result.error}`);
            return null;
        }

        const previewRes = await window.electron.readExcelPreview(filePath);

        return {
            ...result,
            ...result,
            matchLabel: undefined,
            preview: previewRes.success ? previewRes.data : undefined,
        } as FileConfig;
    }, []);

    const handleSelectMaster = useCallback(async () => {
        const res = await window.electron.openFileDialog({
            multiple: false,
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        });
        if (!res.canceled && res.filePaths.length > 0) {
            setIsAnalyzing(true);
            const config = await analyzeFile(res.filePaths[0]);
            setMasterConfig(config);
            setIsAnalyzing(false);

            if (config) {
                setMappingTarget({ type: 'master', index: 0 });
                setMapperOpen(true);
            }
        }
    }, [analyzeFile, setMasterConfig]);

    const handleSelectTargets = useCallback(async () => {
        const res = await window.electron.openFileDialog({
            multiple: true,
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        });
        if (!res.canceled && res.filePaths.length > 0) {
            setIsAnalyzing(true);
            const configs: FileConfig[] = [];
            for (const filePath of res.filePaths) {
                const config = await analyzeFile(filePath);
                if (config) configs.push(config);
            }

            const startIndex = targetConfigs.length;
            setTargetConfigs(prev => [...prev, ...configs]);
            setIsAnalyzing(false);

            if (configs.length > 0) {
                setMappingTarget({ type: 'target', index: startIndex });
                setMapperOpen(true);
            }
        }
    }, [analyzeFile, setTargetConfigs, targetConfigs.length]);

    const removeTarget = useCallback(
        (index: number) => {
            setTargetConfigs(prev => prev.filter((_, i) => i !== index));
        },
        [setTargetConfigs]
    );

    const updateTargetLabel = useCallback(
        (index: number, label: string) => {
            setTargetConfigs(prev => prev.map((c, i) => (i === index ? { ...c, matchLabel: label } : c)));
        },
        [setTargetConfigs]
    );

    const handleConfirmMapping = useCallback(
        (idCol: number, resultCol?: number, matchLabel?: string) => {
            if (!mappingTarget) return;

            if (mappingTarget.type === 'master') {
                setMasterConfig(prev =>
                    prev
                        ? {
                              ...prev,
                              overrideIdColumn: idCol,
                              overrideResultColumn: resultCol,
                          }
                        : null
                );
            } else {
                if (matchLabel === '___NEW___') {
                    setCreatingCustomerForTargetIndex(mappingTarget.index);
                    setIsCreatingCustomer(true);
                    setIsCustomerDialogOpen(true);
                    setMapperOpen(false);
                    setMappingTarget(null);
                    return;
                }

                setTargetConfigs(prev =>
                    prev.map((c, i) =>
                        i === mappingTarget.index
                            ? {
                                  ...c,
                                  overrideIdColumn: idCol,
                                  matchLabel: matchLabel !== undefined ? matchLabel : c.matchLabel,
                              }
                            : c
                    )
                );

                const nextIndex = mappingTarget.index + 1;
                if (nextIndex < targetConfigs.length) {
                    setMappingTarget({ type: 'target', index: nextIndex });
                    return;
                }
            }

            setMapperOpen(false);
            setMappingTarget(null);
        },
        [mappingTarget, setMasterConfig, setTargetConfigs, targetConfigs.length]
    );

    const isReady =
        masterConfig?.overrideIdColumn !== undefined &&
        masterConfig?.overrideIdColumn !== -1 &&
        masterConfig?.overrideResultColumn !== undefined &&
        masterConfig?.overrideResultColumn !== -1 &&
        targetConfigs.length > 0 &&
        targetConfigs.every(t => t.overrideIdColumn !== undefined && t.overrideIdColumn !== -1 && !!t.matchLabel);

    const handleProcess = useCallback(async () => {
        if (!masterConfig?.filePath || !isReady) return;

        const defaultName = masterConfig.fileName?.replace('.xlsx', '_updated.xlsx') || 'updated.xlsx';
        const saveResult = await window.electron.saveFileDialog(defaultName);
        if (saveResult.canceled || !saveResult.filePath) return;

        setIsProcessing(true);

        const res = await window.electron.processExcelFiles({
            masterPath: masterConfig.filePath,
            targetPaths: targetConfigs.map(t => t.filePath!),
            masterColIndices: [masterConfig.overrideIdColumn!],
            masterResultColIndex: masterConfig.overrideResultColumn!,
            targetMatchColIndices: Object.fromEntries(targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn!]])),
            targetMatchStrings: Object.fromEntries(targetConfigs.map(t => [t.filePath!, t.matchLabel || 'Matched'])),
            matchSentence: '',
            noMatchSentence: noMatchLabel,
            outputPath: saveResult.filePath,
            masterRowRange: masterConfig.suggestedRowRange,
            targetRowRanges: Object.fromEntries(targetConfigs.filter(t => t.suggestedRowRange).map(t => [t.filePath!, t.suggestedRowRange!])),
        });

        setIsProcessing(false);

        if (res.success) {
            if (res.stats) setStats(res.stats);
            if (res.perFileStats) setPerFileStats(res.perFileStats);
            if (res.matchedRows) setMatchedRows(res.matchedRows);
            if (res.unmatchedPath) {
                setUnmatchedPath(res.unmatchedPath);
            }

            setOutputFilePath(saveResult.filePath);
            const outputAnalysis = await window.electron.analyzeExcelFile(saveResult.filePath);
            if (outputAnalysis.success && outputAnalysis.headers) {
                setOutputFileHeaders(outputAnalysis.headers);
            }
            const outputPreview = await window.electron.readExcelPreview(saveResult.filePath);
            if (outputPreview.success && outputPreview.data) {
                setOutputFileData(outputPreview.data);
            }

            onStepChange('done');
            toast.success('Matching completed!');
        } else {
            toast.error(res.error || 'Processing failed');
        }
    }, [isReady, masterConfig, noMatchLabel, onStepChange, setOutputFileData, setOutputFileHeaders, setOutputFilePath, setPerFileStats, setStats, targetConfigs]);

    const handleCreateCustomer = useCallback(
        async (data: CustomerData) => {
            if (!data.name.trim()) {
                toast.error('Customer name is required');
                return;
            }

            const newCustomer: Customer = {
                id: '',
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                total20mm: 0,
                total10mm: 0,
                createdAt: '',
                updatedAt: '',
            };

            const result = await window.electron.saveCustomer(newCustomer);
            if (result.success && result.id) {
                toast.success('Customer created!');
                await loadCustomers();

                if (creatingCustomerForTargetIndex !== null) {
                    updateTargetLabel(creatingCustomerForTargetIndex, newCustomer.name);
                    setCreatingCustomerForTargetIndex(null);
                }

                setIsCustomerDialogOpen(false);
                setIsCreatingCustomer(false);
            } else {
                toast.error(result.error || 'Failed to create customer');
            }
        },
        [creatingCustomerForTargetIndex, loadCustomers, updateTargetLabel]
    );

    const handlePrepareGeneration = useCallback(async () => {
        if (outputFileData.length === 0) {
            toast.error('No output file data available. Please run matching first.');
            return;
        }

        const outputHeaders = outputFileHeaders.map(h => h.name);
        const lastColIdx = outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1;
        const resultColIdx = fileGenConfigs['output']?.resultColIdx ?? lastColIdx;

        const newConfigs: Record<string, FileGenConfig> = {
            output:
                fileGenConfigs['output'] ||
                ({
                    customerId: null,
                    descriptionColIdx: -1,
                    quantityColIdx: -1,
                    resultColIdx: -1,
                } satisfies FileGenConfig),
        };

        targetConfigs.forEach(tConfig => {
            const filePath = tConfig.filePath!;
            newConfigs[filePath] =
                fileGenConfigs[filePath] ||
                ({
                    customerId: null,
                    descriptionColIdx: -1,
                    quantityColIdx: -1,
                } satisfies FileGenConfig);
        });

        const totals: Record<string, { total: number; t10: number; t20: number }> = {};

        const outputHeadersLower = outputHeaders.map(h => h.toLowerCase());
        let qIdx = outputHeadersLower.findIndex(h => h.includes('net') && h.includes('weight'));
        if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('weight'));
        if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('qty'));

        if (resultColIdx !== -1 && outputFileData.length > 0) {
            const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';
            const unique = new Set<string>();
            const dataRows = outputFileData.slice(1);

            dataRows.forEach(row => {
                const val = String(row[resultColIdx] || '').trim();
                if (val && val.toLowerCase() !== 'not matched' && val !== noMatchLabel && val !== headerName) {
                    unique.add(val);

                    let quantity = 0;
                    if (qIdx !== -1 && qIdx < row.length) {
                        quantity = parseQuantitySafe(row[qIdx]);
                    }

                    const fullRow = row.join(' ').toLowerCase();
                    const is20 = fullRow.includes('20mm');
                    const is10 = fullRow.includes('10mm');

                    if (!totals[val]) totals[val] = { total: 0, t10: 0, t20: 0 };
                    totals[val].total += quantity;
                    if (is10) totals[val].t10 += quantity;
                    if (is20) totals[val].t20 += quantity;
                }
            });

            setGroupTotals(totals);

            const sorted = Array.from(unique).sort();
            setUniqueMatchValues(sorted);

            const findBestMatchConfig = (groupName: string) => {
                const groupLower = groupName.toLowerCase();
                const target = targetConfigs.find(t => {
                    const fName = (t.fileName || '').toLowerCase();
                    const fPath = (t.filePath || '').toLowerCase();
                    return fName === groupLower || fName.includes(groupLower) || groupLower.includes(fName) || fPath.includes(groupLower);
                });

                if (target && target.filePath && newConfigs[target.filePath]) return newConfigs[target.filePath];
                return null;
            };

            sorted.forEach(val => {
                if (!fileGenConfigs[val]) {
                    const existing = findBestMatchConfig(val);
                    newConfigs[val] = {
                        customerId: existing?.customerId || null,
                        descriptionColIdx: -1,
                        quantityColIdx: -1,
                    };
                } else {
                    newConfigs[val] = fileGenConfigs[val];
                }
            });
        }

        setFileGenConfigs(newConfigs);

        loadCustomers();
        setIsCustomerDialogOpen(true);
    }, [fileGenConfigs, loadCustomers, noMatchLabel, outputFileData, outputFileHeaders, setFileGenConfigs, setGroupTotals, setUniqueMatchValues, targetConfigs]);

    const updateFileConfig = useCallback(
        (filePath: string, updates: Partial<FileGenConfig>) => {
            setFileGenConfigs(prev => ({
                ...prev,
                [filePath]: { ...prev[filePath], ...updates },
            }));
        },
        [setFileGenConfigs]
    );

    const handleConfirmGeneration = useCallback(async () => {
        const outputConfig = fileGenConfigs['output'];
        if (!outputConfig) {
            toast.error('Output file configuration missing.');
            return;
        }

        const participatingGroups = uniqueMatchValues.filter(val => fileGenConfigs[val]?.customerId);
        if (participatingGroups.length === 0 && !outputConfig.customerId) {
            toast.error('Please assign a customer to at least one matched group.');
            return;
        }

        if (outputConfig.quantityColIdx === -1) {
            toast.warning('Quantity column not selected. Invoice quantities might be 0.');
        }

        setIsCustomerDialogOpen(false);
        setIsGeneratingInvoices(true);

        try {
            const { generateInvoicesFromReconciliation } = await import('@/utils/invoice-generation-utils');
            const result = await generateInvoicesFromReconciliation(
                {
                    outputFileHeaders,
                    outputFileData,
                    fileGenConfigs,
                    uniqueMatchValues,
                    noMatchLabel,
                    customers,
                },
                window.electron.saveInvoice,
                window.electron.saveCustomer
            );

            const { successCount, failCount } = result;

            if (successCount > 0) {
                toast.success(`${successCount} invoice(s) generated successfully!`);
                loadCustomers();

                if (executiveSummary && executiveSummary.length > 0) {
                    try {
                        await handleExportSummary();
                    } catch (error) {
                        console.error('Failed to auto-download Executive Summary:', error);
                        toast.warning('Invoices generated, but Executive Summary download failed.');
                    }
                }
            } else if (failCount > 0) {
                toast.error('Failed to generate invoices.');
            } else {
                toast.info('No matching rows found for the selected customers.');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred during generation.');
        } finally {
            setIsGeneratingInvoices(false);
        }
    }, [customers, executiveSummary, fileGenConfigs, handleExportSummary, loadCustomers, noMatchLabel, outputFileData, outputFileHeaders, uniqueMatchValues]);

    const handleOpenUnmatched = useCallback(() => {
        if (unmatchedPath) {
            window.electron.openFile(unmatchedPath);
        }
    }, [unmatchedPath]);

    const handleReset = useCallback(() => {
        reset();
        setUnmatchedPath(null);
        setMatchedRows([]);
        onStepChange('configure');
    }, [onStepChange, reset]);

    return {
        state: matcherState,
        ui: {
            mapperOpen,
            setMapperOpen,
            mappingTarget,
            setMappingTarget,
            isProcessing,
            isAnalyzing,
            unmatchedPath,
            isGeneratingInvoices,
            isCustomerDialogOpen,
            setIsCustomerDialogOpen,
            isCreatingCustomer,
            setIsCreatingCustomer,
            customerProjections,
        },
        customers,
        summaryConfig,
        isReady,
        actions: {
            handleGenerateSummary,
            handleExportSummary,
            handleSelectMaster,
            handleSelectTargets,
            removeTarget,
            updateTargetLabel,
            handleProcess,
            handleCreateCustomer,
            handlePrepareGeneration,
            updateFileConfig,
            handleConfirmGeneration,
            handleOpenUnmatched,
            handleReset,
            handleConfirmMapping,
        },
    };
}
