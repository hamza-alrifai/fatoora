import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileAnalysis, Customer } from '../../types.d';
import { GlassDialog } from '@/components/ui/glass-dialog';
import { ArrowRight, Check, FileSpreadsheet, Files, Loader2, RefreshCw, Sparkles, Trash2, AlertCircle, ExternalLink } from 'lucide-react';

import * as ExcelJS from 'exceljs';
import { type CustomerSummary } from '@/utils/matcher-utils';
import { ColumnMapper } from './ColumnMapper';
import { InvoiceGenerationDialog } from './InvoiceGenerationDialog';
import { Badge } from '@/components/ui/badge';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

interface MatcherWorkspaceProps {
    currentStep: 'configure' | 'done';
    onStepChange: (step: 'configure' | 'done') => void;
}

const STORAGE_KEY = 'fatoora_matcher_state';

export function MatcherWorkspace({ currentStep, onStepChange }: MatcherWorkspaceProps) {
    // Local state for DATA, but step is now controlled
    const [masterConfig, setMasterConfig] = useState<FileConfig | null>(null);
    const [targetConfigs, setTargetConfigs] = useState<FileConfig[]>([]);

    // UX State
    const [mapperOpen, setMapperOpen] = useState(false);
    const [mappingTarget, setMappingTarget] = useState<{ type: 'master' | 'target', index: number } | null>(null);

    const [outputFilePath, setOutputFilePath] = useState<string | null>(null);
    const [noMatchLabel, setNoMatchLabel] = useState('Not Matched');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [unmatchedPath, setUnmatchedPath] = useState<string | null>(null);
    const [_matchedRows, setMatchedRows] = useState<Array<{ sourceFile: string; data: any[]; rowNumber: number; }>>([]); // eslint-disable-line @typescript-eslint/no-unused-vars;
    const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Customer Selection State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

    // Per-File Generation Configuration
    type FileGenConfig = {
        customerId: string | null;
        rate10: number;
        rate20: number;
        rateExcess10: number;
        splitRates10?: {
            enabled: boolean;
            threshold: number;
            rate1: number;
            rate2: number;
        };
        splitRates20?: {
            enabled: boolean;
            threshold: number;
            rate1: number;
            rate2: number;
        };
        descriptionColIdx: number;
        quantityColIdx: number;
        resultColIdx?: number;
    };
    const [fileGenConfigs, setFileGenConfigs] = useState<Record<string, FileGenConfig>>({});


    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    // Track which file we are creation a customer FOR (index in targetConfigs)
    const [creatingCustomerForTargetIndex, setCreatingCustomerForTargetIndex] = useState<number | null>(null);

    const [newCustomerData, setNewCustomerData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const [stats, setStats] = useState<{
        totalMasterRows: number;
        matchedMasterRows: number;
        unmatchedMasterRows: number;
        matchPercentage: number;
    } | null>(null);

    // Calculated Totals for Groups
    const [groupTotals, setGroupTotals] = useState<Record<string, { total: number, t10: number, t20: number }>>({});
    // Projections for UI (Customer based)
    const [customerProjections, setCustomerProjections] = useState<Record<string, { t10: number, t20: number }>>({});

    const [perFileStats, setPerFileStats] = useState<Array<{
        fileName: string;
        filePath: string;
        total: number;
        matched: number;
        percentage: number;
    }> | null>(null);

    // Output file state (for invoice generation)
    const [outputFileData, setOutputFileData] = useState<any[][]>([]);
    const [outputFileHeaders, setOutputFileHeaders] = useState<{ name: string; index: number }[]>([]);

    // Executive Summary State
    // Executive Summary State


    // Derived config for summary (shared with Invoice Generation Global Settings)
    const summaryConfig = fileGenConfigs['output'] || {
        customerId: null,
        rate10: 25,
        rate20: 30,
        rateExcess10: 0,
        descriptionColIdx: -1,
        quantityColIdx: -1,
        resultColIdx: -1
    };



    const [executiveSummary, setExecutiveSummary] = useState<CustomerSummary[] | null>(null);

    const handleGenerateSummary = () => {
        if (!summaryConfig.resultColIdx || summaryConfig.resultColIdx === -1) {
            toast.error("Please select a customer column");
            return;
        }

        const guessed = guessColumns(outputFileHeaders.map(h => h.name));
        const descCol = summaryConfig.descriptionColIdx !== -1 ? summaryConfig.descriptionColIdx : guessed.descriptionColIdx;
        const qtyCol = summaryConfig.quantityColIdx !== -1 ? summaryConfig.quantityColIdx : guessed.quantityColIdx;

        try {
            // Aggregate Data by Customer Group
            const groups: Record<string, { items: any[], trips10: number, trips20: number }> = {};
            const dataRows = outputFileData.slice(1);

            // Inline helper for split (copied to ensure consistency)
            const processSplit = (currentItems: any[], splitConfig: any, itemType: string) => {
                if (!splitConfig || !splitConfig.enabled) return currentItems;
                const threshold = splitConfig.threshold || 0;
                const r1 = splitConfig.rate1 || 0;
                const r2 = splitConfig.rate2 || 0;
                let newItems: any[] = [];
                currentItems.forEach(item => {
                    if (item.type !== itemType) {
                        newItems.push(item);
                        return;
                    }
                    if (item.quantity <= threshold) {
                        item.unitPrice = r1;
                        item.amount = Math.round(item.quantity * r1 * 100) / 100;
                        newItems.push(item);
                    } else {
                        // Split
                        const q1 = threshold;
                        const q2 = item.quantity - threshold;
                        const i1 = { ...item, quantity: q1, unitPrice: r1, amount: Math.round(q1 * r1 * 100) / 100, id: crypto.randomUUID() };
                        const i2 = {
                            ...item,
                            quantity: q2,
                            unitPrice: r2,
                            amount: Math.round(q2 * r2 * 100) / 100,
                            id: crypto.randomUUID(),
                            description: `${item.description} (> ${threshold})`
                        };
                        newItems.push(i1);
                        newItems.push(i2);
                    }
                });
                return newItems;
            };

            dataRows.forEach((row) => {
                const groupName = String(row[summaryConfig.resultColIdx!] || '').trim();

                if (!groupName || groupName.toLowerCase() === 'not matched' || groupName === noMatchLabel) return;

                // Get Config
                const groupConfig = fileGenConfigs[groupName];
                if (!groups[groupName]) groups[groupName] = { items: [], trips10: 0, trips20: 0 };

                // Parse Qty
                let qty = 0;
                if (qtyCol !== -1 && qtyCol < row.length) {
                    const raw = row[qtyCol];
                    if (typeof raw === 'number') qty = raw;
                    else if (typeof raw === 'string') qty = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
                }

                // Determine Type
                const desc = String(row[descCol] || '').toLowerCase();
                const fullRow = row.join(' ').toLowerCase();
                let type: '10mm' | '20mm' = '10mm';
                if (desc.includes('20mm') || fullRow.includes('20mm')) type = '20mm';
                else if (desc.includes('10mm') || fullRow.includes('10mm')) type = '10mm';
                else {
                    if (desc.includes('10mm')) type = '10mm';
                    else if (desc.includes('20mm')) type = '20mm';
                    else type = '10mm'; // Fallback
                }

                // Count Trips (Rows)
                if (type === '10mm') groups[groupName].trips10++;
                else groups[groupName].trips20++;

                // Rate
                let rate = 0;
                if (groupConfig) {
                    rate = type === '10mm' ? groupConfig.rate10 : groupConfig.rate20;
                } else {
                    rate = type === '10mm' ? (summaryConfig.rate10 || 25) : (summaryConfig.rate20 || 30);
                }

                groups[groupName].items.push({
                    type,
                    quantity: qty,
                    unitPrice: rate,
                    amount: Math.round(qty * rate * 100) / 100,
                    description: row[descCol]
                });
            });

            // Calculate Totals per Group
            const summaryRows: CustomerSummary[] = Object.entries(groups).map(([name, data]) => {
                let items = data.items;
                const config = fileGenConfigs[name];

                // Apply Splits
                if (config) {
                    items = processSplit(items, config.splitRates10, '10mm');
                    items = processSplit(items, config.splitRates20, '20mm');
                }

                // Apply Excess
                let excessAmount = 0;
                const t10Qty = items.filter(i => i.type === '10mm').reduce((s, i) => s + i.quantity, 0);
                const t20Qty = items.filter(i => i.type === '20mm').reduce((s, i) => s + i.quantity, 0);
                const totalQ = t10Qty + t20Qty;

                let hist10 = 0;
                let hist20 = 0;
                if (config?.customerId) {
                    const c = customers.find(cust => cust.id === config.customerId);
                    if (c) {
                        hist10 = c.total10mm || 0;
                        hist20 = c.total20mm || 0;
                    }
                }

                const excessRate = config ? config.rateExcess10 : 0;
                if (excessRate > 0) {
                    const cum10 = hist10 + t10Qty;
                    const cum20 = hist20 + t20Qty;
                    const cumGrand = cum10 + cum20;
                    const cumAllowed10 = cumGrand * 0.40;
                    const cumExcess = Math.max(0, cum10 - cumAllowed10);
                    const histExcess = Math.max(0, hist10 - (hist10 + hist20) * 0.40);
                    const excessQty = Math.max(0, cumExcess - histExcess);

                    if (excessQty > 0) {
                        excessAmount = excessQty * excessRate;
                        let remaining = excessQty;
                        items.filter(i => i.type === '10mm').forEach(item => {
                            if (remaining <= 0) return;
                            const deduct = Math.min(item.quantity, remaining);
                            item.quantity -= deduct;
                            item.amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
                            remaining -= deduct;
                        });
                        items.push({
                            type: '10mm',
                            quantity: excessQty,
                            unitPrice: excessRate,
                            amount: Math.round(excessQty * excessRate * 100) / 100,
                            description: 'Excess'
                        });
                    }
                }

                const amount10 = items.filter(i => i.type === '10mm').reduce((s, i) => s + i.amount, 0);
                const amount20 = items.filter(i => i.type === '20mm').reduce((s, i) => s + i.amount, 0);
                const totalVal = amount10 + amount20;

                return {
                    name,
                    total20mm: Math.round(t20Qty * 100) / 100,
                    total10mm: Math.round(t10Qty * 100) / 100,
                    totalOther: 0,
                    totalQty: Math.round(totalQ * 100) / 100,
                    amount20mm: Math.round(amount20 * 100) / 100,
                    amount10mm: Math.round(amount10 * 100) / 100,
                    ticketCount: data.trips10 + data.trips20,
                    totalAmount: Math.round(totalVal * 100) / 100,
                    trips10mm: data.trips10,
                    trips20mm: data.trips20,
                    percentage10mm: totalQ > 0 ? Math.round((t10Qty / totalQ) * 1000) / 10 : 0,
                    percentage20mm: totalQ > 0 ? Math.round((t20Qty / totalQ) * 1000) / 10 : 0,
                    excess10mm: Math.round(excessAmount * 100) / 100,
                    invoiceNo: 'DRAFT'
                };
            });

            setExecutiveSummary(summaryRows);
            toast.success("Executive Summary Generated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate summary");
        }
    };

    const handleExportSummary = async () => {
        if (!executiveSummary) return;

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Executive Summary');

        // Define columns
        worksheet.columns = [
            { header: 'Serial', key: 'serial', width: 8 },
            { header: 'Customer', key: 'customer', width: 30 },
            { header: 'Total Qty (MT)', key: 'totalQty', width: 15, style: { numFmt: '#,##0.00' } },
            { header: '10mm Qty (MT)', key: 'total10mm', width: 15, style: { numFmt: '#,##0.00' } },
            { header: '20mm Qty (MT)', key: 'total20mm', width: 15, style: { numFmt: '#,##0.00' } },
            { header: '10mm %', key: 'pct10mm', width: 10 },
            { header: '20mm %', key: 'pct20mm', width: 10 },
            { header: '10mm Trips', key: 'trips10mm', width: 12 },
            { header: '20mm Trips', key: 'trips20mm', width: 12 },
            { header: 'Total Trips', key: 'totalTrips', width: 12 },
            { header: 'Invoice No', key: 'invNo', width: 15 },
            { header: 'Excess 10mm', key: 'excess10mm', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Total Value', key: 'totalValue', width: 18, style: { numFmt: '"QAR" #,##0.00' } }
        ];

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' } // Indigo-600
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;

        // Add Data Rows
        executiveSummary.forEach((s, idx) => {
            worksheet.addRow({
                serial: idx + 1,
                customer: s.name,
                totalQty: s.totalQty,
                total10mm: s.total10mm,
                total20mm: s.total20mm,
                pct10mm: s.percentage10mm + '%',
                pct20mm: s.percentage20mm + '%',
                trips10mm: s.trips10mm,
                trips20mm: s.trips20mm,
                totalTrips: s.trips10mm + s.trips20mm,
                invNo: s.invoiceNo || '-',
                excess10mm: s.excess10mm,
                totalValue: s.totalAmount
            });
        });

        // Add Grand Total Row
        const totals = executiveSummary.reduce((acc, s) => ({
            totalQty: acc.totalQty + s.totalQty,
            total10mm: acc.total10mm + s.total10mm,
            total20mm: acc.total20mm + s.total20mm,
            trips10mm: acc.trips10mm + s.trips10mm,
            trips20mm: acc.trips20mm + s.trips20mm,
            totalAmount: acc.totalAmount + s.totalAmount,
            excess10mm: acc.excess10mm + s.excess10mm
        }), { totalQty: 0, total10mm: 0, total20mm: 0, trips10mm: 0, trips20mm: 0, totalAmount: 0, excess10mm: 0 });

        const totalRow = worksheet.addRow({
            serial: '',
            customer: 'GRAND TOTAL',
            totalQty: totals.totalQty,
            total10mm: totals.total10mm,
            total20mm: totals.total20mm,
            pct10mm: '',
            pct20mm: '',
            trips10mm: totals.trips10mm,
            trips20mm: totals.trips20mm,
            totalTrips: totals.trips10mm + totals.trips20mm,
            invNo: '',
            excess10mm: totals.excess10mm,
            totalValue: totals.totalAmount
        });

        // Style Total Row
        totalRow.font = { bold: true };
        totalRow.getCell('customer').alignment = { horizontal: 'right' };
        totalRow.eachCell((cell, colNumber) => {
            if (colNumber > 2) { // Skip Serial and Name
                cell.border = {
                    top: { style: 'double' }
                };
            }
        });

        // Generate and Save
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = new Date().toISOString().split('T')[0];

        // Use Electron IPC to save file
        // We need to send the buffer to the main process or use a blob download since we are in renderer?
        // Actually, in web environment (like this renderer often mimics), Blob works.
        // But for Electron full experience, let's use the save dialog if available or just Blob download as before.
        // The previous code used XLSX.writeFile which in browser triggers download. 
        // Let's use standard Blob download for simplicity and compatibility.

        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fatoora_Executive_Summary_${dateStr}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success("Executive Summary downloaded successfully!");
    };
    const [uniqueMatchValues, setUniqueMatchValues] = useState<string[]>([]);

    // Sync local step with prop if needed, or just use prop. We use prop `currentStep`.

    // Persistence: Load State on Mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);

                if (data.masterConfig) setMasterConfig(data.masterConfig);
                if (data.targetConfigs) setTargetConfigs(data.targetConfigs);
                if (data.outputFilePath) setOutputFilePath(data.outputFilePath);
                if (data.noMatchLabel) setNoMatchLabel(data.noMatchLabel);
                if (data.stats) setStats(data.stats);
                if (data.perFileStats) setPerFileStats(data.perFileStats);
                if (data.fileGenConfigs) setFileGenConfigs(data.fileGenConfigs);
                if (data.outputFileHeaders) setOutputFileHeaders(data.outputFileHeaders);
                if (data.outputFileData) setOutputFileData(data.outputFileData);
                if (data.executiveSummary) setExecutiveSummary(data.executiveSummary);
                if (data.groupTotals) setGroupTotals(data.groupTotals);

                if (data.uniqueMatchValues) setUniqueMatchValues(data.uniqueMatchValues);

                // If analysis was complete, restore 'done' step
                if (data.stats && data.stats.totalMasterRows > 0) {
                    onStepChange('done');
                }

                // Only show toast if we actually restored meaningful data
                if (data.masterConfig || data.targetConfigs.length > 0) {
                    toast.info("Resumed previous session");
                }
            }
        } catch (e) {
            console.error("Failed to load matcher state", e);
        } finally {
            setIsHydrated(true);
        }
    }, []);

    // Persistence: Save State on Change
    useEffect(() => {
        if (!isHydrated) return;

        try {
            // Only save if we have some data to save, to avoid overwriting with empty on initial mount if effects run weirdly
            // But we want to save empty if user clears it? 
            // The reset function clears storage explicitly.
            // Here we just save whatever is in state.
            // Sanitize: If outputFileData is huge, don't save it to prevent crashing
            // 5000 is a safe limit for localStorage (~5MB usually).
            const safeOutputData = (outputFileData && outputFileData.length > 5000) ? [] : outputFileData;

            const stateToSave = {
                masterConfig,
                targetConfigs,
                outputFilePath,
                noMatchLabel,
                stats,
                perFileStats,
                fileGenConfigs,
                outputFileHeaders,
                outputFileData: safeOutputData,
                executiveSummary,
                groupTotals,

                uniqueMatchValues
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save matcher state", e);
        }
    }, [
        isHydrated,
        masterConfig,
        targetConfigs,
        outputFilePath,
        noMatchLabel,
        stats,
        perFileStats,
        fileGenConfigs,
        outputFileHeaders,
        outputFileData,
        executiveSummary,
        groupTotals,

        uniqueMatchValues
    ]);

    // Load customers on mount
    useEffect(() => {
        loadCustomers();
    }, []);

    // Calculate customer projections whenever configs or group totals change
    useEffect(() => {
        const proj: Record<string, { t10: number, t20: number }> = {};

        // Initialize for all customers
        customers.forEach(c => {
            proj[c.id] = { t10: c.total10mm || 0, t20: c.total20mm || 0 };
        });

        // Add current group totals based on assignments
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

    // Live Recalculation of Groups/Totals when Target Column changes
    useEffect(() => {
        const resultColIdx = fileGenConfigs['output']?.resultColIdx;

        if (resultColIdx !== undefined && resultColIdx !== -1 && outputFileData.length > 0) {
            // Find Qty Column index
            const outputHeadersLower = outputFileHeaders.map(h => h.name.toLowerCase());
            let qIdx = fileGenConfigs['output']?.quantityColIdx ?? -1;

            // Auto-guess if not set
            if (qIdx === -1) {
                qIdx = outputHeadersLower.findIndex(h => h.includes('net') && h.includes('weight'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('weight'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('qty'));
                if (qIdx === -1) qIdx = outputHeadersLower.findIndex(h => h.includes('quantity'));
            }

            const totals: Record<string, { total: number, t10: number, t20: number }> = {};
            const unique = new Set<string>();
            const headerName = outputFileHeaders.find(h => h.index === resultColIdx)?.name || '';

            const dataRows = outputFileData.slice(1);

            dataRows.forEach(row => {
                const val = (row[resultColIdx] !== undefined && row[resultColIdx] !== null) ? String(row[resultColIdx]).trim() : '';
                // Filter out empty, "not matched", and THE HEADER ITSELF
                if (val &&
                    val.toLowerCase() !== 'not matched' &&
                    val !== noMatchLabel &&
                    val !== headerName) {
                    unique.add(val);

                    // Totals Calculation
                    let quantity = 0;
                    if (qIdx !== -1 && qIdx < row.length) {
                        const rawVal = row[qIdx];
                        let parsed = 0;
                        if (typeof rawVal === 'number') parsed = rawVal;
                        else if (typeof rawVal === 'string') parsed = parseFloat(rawVal.replace(/[^0-9.]/g, ''));
                        if (!isNaN(parsed)) quantity = parsed;
                    }

                    const fullRow = row.join(' ').toLowerCase();
                    let is20 = fullRow.includes('20mm');
                    let is10 = fullRow.includes('10mm');

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
    }, [fileGenConfigs['output']?.resultColIdx, outputFileData, outputFileHeaders]);

    // ... (analyzeFile, handleSelectMaster, etc. - keep as is)

    // Run matching
    const analyzeFile = async (filePath: string): Promise<FileConfig | null> => {
        const result = await window.electron.analyzeExcelFile(filePath);
        if (!result.success) {
            toast.error(`Failed to analyze: ${result.error}`);
            return null;
        }

        // Fetch Preview for Mapping
        const previewRes = await window.electron.readExcelPreview(filePath);

        return {
            ...result,
            ...result,
            // matchLabel: result.suggestedMatchLabel, // DISABLE GUESSING
            matchLabel: undefined,
            preview: previewRes.success ? previewRes.data : undefined
        } as FileConfig;
    };


    const handleConfirmMapping = (idCol: number, resultCol?: number, matchLabel?: string) => {
        if (!mappingTarget) return;

        if (mappingTarget.type === 'master') {
            setMasterConfig(prev => prev ? ({
                ...prev,
                overrideIdColumn: idCol,
                overrideResultColumn: resultCol
            }) : null);
        } else {
            // Handle new customer creation from dialog if needed
            if (matchLabel === '___NEW___') {
                setCreatingCustomerForTargetIndex(mappingTarget.index);
                setIsCreatingCustomer(true);
                setIsCustomerDialogOpen(true);
                setMapperOpen(false);
                setMappingTarget(null);
                return;
            }

            setTargetConfigs(prev => prev.map((c, i) =>
                i === mappingTarget.index ? ({
                    ...c,
                    overrideIdColumn: idCol,
                    matchLabel: matchLabel !== undefined ? matchLabel : c.matchLabel
                }) : c
            ));

            // Chain to next file if available
            const nextIndex = mappingTarget.index + 1;
            if (nextIndex < targetConfigs.length) {
                // Determine if we should pause slightly or just switch
                // React state batching handles the switch cleanly
                setMappingTarget({ type: 'target', index: nextIndex });
                // Dialog remains open
                return;
            }
        }

        setMapperOpen(false);
        setMappingTarget(null);
    };

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

            // Trigger Mapper
            if (config) {
                setMappingTarget({ type: 'master', index: 0 });
                setMapperOpen(true);
            }
        }
    };

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

            const startIndex = targetConfigs.length;
            setTargetConfigs(prev => [...prev, ...configs]);
            setIsAnalyzing(false);

            // Trigger Mapper for the FIRST new file
            if (configs.length > 0) {
                setMappingTarget({ type: 'target', index: startIndex });
                setMapperOpen(true);
            }
        }
    };

    const removeTarget = (index: number) => {
        setTargetConfigs(prev => prev.filter((_, i) => i !== index));
    };

    const updateTargetLabel = (index: number, label: string) => {
        setTargetConfigs(prev => prev.map((c, i) =>
            i === index ? { ...c, matchLabel: label } : c
        ));
    };

    const isReady =
        (masterConfig?.overrideIdColumn !== undefined && masterConfig?.overrideIdColumn !== -1) && // Must be explicitly set and valid
        (masterConfig?.overrideResultColumn !== undefined && masterConfig?.overrideResultColumn !== -1) && // Must be explicitly set and valid
        targetConfigs.length > 0 &&
        targetConfigs.every(t => t.overrideIdColumn !== undefined && t.overrideIdColumn !== -1 && !!t.matchLabel); // Must have valid ID col AND match label

    const handleProcess = async () => {
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
            targetMatchColIndices: Object.fromEntries(
                targetConfigs.map(t => [t.filePath!, [t.overrideIdColumn!]])
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
            if (res.matchedRows) setMatchedRows(res.matchedRows);
            if (res.unmatchedPath) {
                setUnmatchedPath(res.unmatchedPath);
            }

            // Store output file info for invoice generation
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
    };

    const loadCustomers = async () => {

        const res = await window.electron.getCustomers();
        if (res.success && res.customers) {
            setCustomers(res.customers);
        }

    };

    const handleCreateCustomer = async () => {
        if (!newCustomerData.name.trim()) {
            toast.error("Customer name is required");
            return;
        }

        const newCustomer: Customer = {
            id: '', // Backend assigns
            name: newCustomerData.name,
            email: newCustomerData.email,
            phone: newCustomerData.phone,
            address: newCustomerData.address,
            total20mm: 0,
            total10mm: 0,
            createdAt: '',
            updatedAt: ''
        };

        const result = await window.electron.saveCustomer(newCustomer);
        if (result.success && result.id) {
            toast.success("Customer created!");
            await loadCustomers();

            // If we were creating this for a specific target file (label assignment), auto-select it
            if (creatingCustomerForTargetIndex !== null) {
                updateTargetLabel(creatingCustomerForTargetIndex, newCustomer.name);
                setCreatingCustomerForTargetIndex(null);
            }

            setIsCustomerDialogOpen(false); // Close the entire dialog
            setIsCreatingCustomer(false);
            setNewCustomerData({ name: '', email: '', phone: '', address: '' });
        } else {
            toast.error(result.error || "Failed to create customer");
        }
    };

    // Helper: Guess columns for default
    const guessColumns = (headers: string[]) => {
        const lower = headers.map(h => h.toLowerCase());

        let d = lower.findIndex(h => h.includes('material') && h.includes('description'));
        if (d === -1) d = lower.findIndex(h => h.includes('description'));
        if (d === -1) d = lower.findIndex(h => h.includes('material'));
        if (d === -1) d = 0;

        let q = lower.findIndex(h => h.includes('net') && h.includes('weight'));
        if (q === -1) q = lower.findIndex(h => h.includes('weight'));
        if (q === -1) q = lower.findIndex(h => h.includes('qty'));
        if (q === -1) q = lower.findIndex(h => h.includes('quantity'));

        return { descriptionColIdx: d, quantityColIdx: q };
    };


    const handlePrepareGeneration = async () => {
        if (outputFileData.length === 0) {
            toast.error("No output file data available. Please run matching first.");
            return;
        }

        // Load products to get default rates
        let defaultRate10 = 0;
        let defaultRate20 = 0;
        const productRes = await window.electron.getProducts();
        if (productRes.success && productRes.products) {
            const p10 = productRes.products.find((p: any) => p.type === '10mm');
            const p20 = productRes.products.find((p: any) => p.type === '20mm');
            if (p10) defaultRate10 = p10.rate;
            if (p20) defaultRate20 = p20.rate;
        } else {
            toast.warning("Could not load product rates. Please set rates manually.");
        }

        // Create config for OUTPUT file
        const outputHeaders = outputFileHeaders.map(h => h.name);
        // const outputGuessed = guessColumns(outputHeaders); 
        const lastColIdx = outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1;

        // Existing or default result column
        const resultColIdx = fileGenConfigs['output']?.resultColIdx ?? lastColIdx; // Use existing if set, else guess last

        const newConfigs: Record<string, FileGenConfig> = {
            // Output file config (for master file invoicing)
            'output': fileGenConfigs['output'] || {
                customerId: null,
                rate10: defaultRate10,
                rate20: defaultRate20,
                rateExcess10: 0,
                descriptionColIdx: -1, // Force manual selection
                quantityColIdx: -1,    // Force manual selection
                resultColIdx: -1       // Force manual selection
            }
        };

        // Also create configs for each TARGET file (original behavior)
        targetConfigs.forEach(tConfig => {
            const filePath = tConfig.filePath!;
            // const headers = tConfig.headers?.map(h => h.name) || [];
            // const guessed = guessColumns(headers); // Disabled guessing

            newConfigs[filePath] = fileGenConfigs[filePath] || {
                customerId: null,
                rate10: defaultRate10,
                rate20: defaultRate20,
                rateExcess10: 0,
                descriptionColIdx: -1, // Force manual selection
                quantityColIdx: -1     // Force manual selection
            };
        });

        // Calculate Group Totals
        const totals: Record<string, { total: number, t10: number, t20: number }> = {};

        // Find Qty Column index
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
                // Filter out empty, "not matched", and THE HEADER ITSELF
                if (val &&
                    val.toLowerCase() !== 'not matched' &&
                    val !== noMatchLabel &&
                    val !== headerName) {
                    unique.add(val);

                    // Totals Calculation
                    let quantity = 0;
                    if (qIdx !== -1 && qIdx < row.length) {
                        const rawVal = row[qIdx];
                        let parsed = 0;
                        if (typeof rawVal === 'number') parsed = rawVal;
                        else if (typeof rawVal === 'string') parsed = parseFloat(rawVal.replace(/[^0-9.]/g, '')); // Basic parsing
                        if (!isNaN(parsed)) quantity = parsed;
                    }

                    const fullRow = row.join(' ').toLowerCase();
                    let is20 = fullRow.includes('20mm');
                    let is10 = fullRow.includes('10mm');

                    if (!totals[val]) totals[val] = { total: 0, t10: 0, t20: 0 };
                    totals[val].total += quantity;
                    if (is10) totals[val].t10 += quantity;
                    if (is20) totals[val].t20 += quantity;
                }
            });

            setGroupTotals(totals);

            const sorted = Array.from(unique).sort();
            setUniqueMatchValues(sorted);

            // Generate configs for these found groups
            const findBestMatchConfig = (groupName: string) => {
                const groupLower = groupName.toLowerCase();
                const target = targetConfigs.find(t => {
                    const fName = (t.fileName || '').toLowerCase();
                    const fPath = (t.filePath || '').toLowerCase();
                    return fName === groupLower ||
                        fName.includes(groupLower) ||
                        groupLower.includes(fName) ||
                        fPath.includes(groupLower);
                });
                if (target && target.filePath && fileGenConfigs[target.filePath]) { // Check against PREV state is tricky, use newConfigs if we just added it?
                    // Actually we want to check if we have any existing preferences. 
                    // Ideally we check newConfigs[target.filePath] which effectively copies old config if it existed.
                    if (target.filePath && newConfigs[target.filePath]) return newConfigs[target.filePath];
                }
                return null;
            };

            sorted.forEach(val => {
                // If we don't already have a config for this group...
                if (!fileGenConfigs[val]) { // checking prev state
                    const existing = findBestMatchConfig(val);
                    newConfigs[val] = {
                        customerId: existing?.customerId || null,
                        rate10: existing?.rate10 || defaultRate10,
                        rate20: existing?.rate20 || defaultRate20,
                        rateExcess10: 0,
                        descriptionColIdx: -1, // Force manual
                        quantityColIdx: -1     // Force manual
                    };
                } else {
                    // Start with existing
                    newConfigs[val] = fileGenConfigs[val];
                }
            });

            if (sorted.length > 0) {
                // optional toast, maybe too noisy on open
                // toast.info(`Found ${sorted.length} unique groups.`);
            }
        }

        setFileGenConfigs(newConfigs);

        loadCustomers();
        setIsCustomerDialogOpen(true);
    };

    const updateFileConfig = (filePath: string, updates: Partial<FileGenConfig>) => {
        setFileGenConfigs(prev => ({
            ...prev,
            [filePath]: { ...prev[filePath], ...updates }
        }));
    };
    const handleConfirmGeneration = async () => {
        // 1. Get configurations
        const outputConfig = fileGenConfigs['output'];
        if (!outputConfig) {
            toast.error("Output file configuration missing.");
            return;
        }

        // 2. Initial Checks
        const participatingGroups = uniqueMatchValues.filter(val => fileGenConfigs[val]?.customerId);
        if (participatingGroups.length === 0 && !outputConfig.customerId) {
            toast.error("Please assign a customer to at least one matched group.");
            return;
        }

        setIsCustomerDialogOpen(false);
        setIsGeneratingInvoices(true);

        try {
            // 3. Prepare Data Structures
            // Use Map for aggregation to consolidate items
            const invoiceItemsByCustomer: Record<string, Map<string, any>> = {};
            const customerTotals: Record<string, { t10: number, t20: number }> = {};

            // Get Column Indices
            const descIdx = outputConfig.descriptionColIdx ?? 0;
            const qtyIdx = outputConfig.quantityColIdx ?? -1;
            const resultIdx = outputConfig.resultColIdx ?? (outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1);

            if (qtyIdx === -1) {
                toast.warning("Quantity column not selected. Invoice quantities might be 0.");
            }

            // 4. Iterate Output File Rows
            const dataRows = outputFileData.slice(1); // Skip header

            dataRows.forEach((row, idx) => {
                if (!row || row.length === 0) return;

                // A. Determine Match Value (Group)
                const matchValue = String(row[resultIdx] || '').trim();
                // We use the exact string match as captured in uniqueMatchValues
                if (!matchValue || matchValue.toLowerCase() === 'not matched' || matchValue === noMatchLabel) return;

                // B. Find Config for this value
                const groupConfig = fileGenConfigs[matchValue];

                if (!groupConfig || !groupConfig.customerId) return;

                const customerId = groupConfig.customerId;

                // C. Extract Item Data
                const description = String(row[descIdx] || `Item ${idx + 1}`);
                const fullRowText = row.map((cell: any) => String(cell || '').trim()).join(' ').toLowerCase();

                // Rate / Type Logic
                let rate = 0;
                let type: '10mm' | '20mm' | 'other' = 'other';
                const descLower = description.toLowerCase();

                const effectiveRate10 = groupConfig.rate10 ?? 0;
                const effectiveRate20 = groupConfig.rate20 ?? 0;

                if (descLower.includes('20mm') || fullRowText.includes('20mm')) {
                    rate = effectiveRate20;
                    type = '20mm';
                } else if (descLower.includes('10mm') || fullRowText.includes('10mm')) {
                    rate = effectiveRate10;
                    type = '10mm';
                }

                // Quantity
                let quantity = 0;
                if (qtyIdx !== -1 && qtyIdx < row.length) {
                    const rawVal = row[qtyIdx];
                    let parsed = 0;
                    if (typeof rawVal === 'number') parsed = rawVal;
                    else if (typeof rawVal === 'string') parsed = parseFloat(rawVal.replace(/[^0-9.]/g, ''));

                    if (!isNaN(parsed) && parsed > 0) {
                        quantity = Math.round(parsed * 100) / 100;
                    }
                }
                if (quantity > 1000000) {
                    console.warn(`Row ${idx + 2}: Unusually high quantity ${quantity}, please verify`);
                    quantity = 0; // Skip likely invalid row
                }

                // D. Add to List with Aggregation
                if (!invoiceItemsByCustomer[customerId]) {
                    invoiceItemsByCustomer[customerId] = new Map();
                    customerTotals[customerId] = { t10: 0, t20: 0 };
                }

                const key = `${description}|${rate}`;
                const customerMap = invoiceItemsByCustomer[customerId];

                if (customerMap.has(key)) {
                    const existing = customerMap.get(key);
                    existing.quantity = Math.round((existing.quantity + quantity) * 100) / 100;
                    existing.amount = Math.round(existing.quantity * existing.unitPrice * 100) / 100;
                } else {
                    customerMap.set(key, {
                        id: crypto.randomUUID(),
                        description: description,
                        quantity: quantity,
                        unitPrice: rate,
                        amount: Math.round(quantity * rate * 100) / 100,
                        type: type
                    });
                }

                if (type === '10mm') customerTotals[customerId].t10 += quantity;
                if (type === '20mm') customerTotals[customerId].t20 += quantity;
            });

            // 5. Generate Invoices
            let successCount = 0;
            let failCount = 0;

            for (const [custId, itemMap] of Object.entries(invoiceItemsByCustomer)) {
                const items = Array.from(itemMap.values());
                if (items.length === 0) continue;

                const customer = customers.find(c => c.id === custId);
                if (!customer) continue;

                // Update Customer Totals
                const totals = customerTotals[custId];
                if (totals.t10 > 0 || totals.t20 > 0) {
                    const updatedCustomer = {
                        ...customer,
                        total10mm: (customer.total10mm || 0) + totals.t10,
                        total20mm: (customer.total20mm || 0) + totals.t20,
                    };
                    await window.electron.saveCustomer(updatedCustomer);
                }

                // Create Invoice
                // Find config for this customer
                const customerConfigEntry = Object.entries(fileGenConfigs).find(([_, cfg]) => cfg.customerId === custId);
                const customerConfig = customerConfigEntry ? customerConfigEntry[1] : null;

                // SPLIT PRICING LOGIC (10mm & 20mm)
                let workingItems = [...items];

                const processSplit = (currentItems: any[], splitConfig: FileGenConfig['splitRates10'], itemType: string) => {
                    if (!splitConfig || !splitConfig.enabled) return currentItems;

                    const threshold = splitConfig.threshold || 0;
                    const rate1 = splitConfig.rate1 || 0;
                    const rate2 = splitConfig.rate2 || 0;

                    let remainingTier1 = threshold;
                    const resultItems: any[] = [];

                    currentItems.forEach(item => {
                        if (item.type !== itemType) {
                            resultItems.push(item);
                            return;
                        }

                        if (remainingTier1 > 0) {
                            const alloc = Math.min(item.quantity, remainingTier1);

                            // Tier 1 Portion
                            resultItems.push({
                                ...item,
                                id: crypto.randomUUID(),
                                unitPrice: rate1,
                                amount: Math.round(alloc * rate1 * 100) / 100,
                                quantity: alloc,
                                description: item.description + ` (Tier 1)`
                            });

                            remainingTier1 -= alloc;

                            // Tier 2 Remainder
                            if (item.quantity > alloc) {
                                const rem = Math.round((item.quantity - alloc) * 100) / 100;
                                resultItems.push({
                                    ...item,
                                    id: crypto.randomUUID(),
                                    unitPrice: rate2,
                                    amount: Math.round(rem * rate2 * 100) / 100,
                                    quantity: rem,
                                    description: item.description + ` (Tier 2)`
                                });
                            }
                        } else {
                            // All Tier 2
                            resultItems.push({
                                ...item,
                                unitPrice: rate2,
                                amount: Math.round(item.quantity * rate2 * 100) / 100,
                                description: item.description + ` (Tier 2)`
                            });
                        }
                    });
                    return resultItems;
                };

                // Apply splits
                if (customerConfig) {
                    workingItems = processSplit(workingItems, customerConfig.splitRates10, '10mm');
                    workingItems = processSplit(workingItems, customerConfig.splitRates20, '20mm');
                }

                // Excess 10mm Logic
                const excessRate = customerConfig ? customerConfig.rateExcess10 : 0;

                const hist10 = customer.total10mm || 0;
                const hist20 = customer.total20mm || 0;
                const current10 = totals.t10;
                const current20 = totals.t20;

                const cum10 = hist10 + current10;
                const cum20 = hist20 + current20;
                const cumGrand = cum10 + cum20;

                const cumAllowed10 = cumGrand * 0.40;
                const cumExcess = Math.max(0, cum10 - cumAllowed10);

                // We only want to bill for the NEW excess generated by this batch
                const histExcess = Math.max(0, hist10 - (hist10 + hist20) * 0.40);

                const excessQty = Math.max(0, cumExcess - histExcess);

                if (excessQty > 0 && excessRate > 0) {
                    let remainingdeduction = excessQty;
                    const items10 = workingItems.filter(i => i.type === '10mm');
                    let actuallyDeducted = 0;

                    items10.forEach(item => {
                        if (remainingdeduction <= 0) return;

                        const deduct = Math.min(item.quantity, remainingdeduction);
                        item.quantity = Math.round((item.quantity - deduct) * 100) / 100;
                        item.amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
                        remainingdeduction = Math.round((remainingdeduction - deduct) * 100) / 100;
                        actuallyDeducted = Math.round((actuallyDeducted + deduct) * 100) / 100;
                    });

                    // Create Excess Item if we actually converted anything
                    if (actuallyDeducted > 0.001) {
                        const excessItem = {
                            id: crypto.randomUUID(),
                            description: `Excess 10mm Charge (>40%)`,
                            quantity: Math.round(actuallyDeducted * 100) / 100,
                            unitPrice: excessRate,
                            amount: Math.round(actuallyDeducted * excessRate * 100) / 100,
                            type: '10mm' as const
                        };
                        workingItems.push(excessItem);
                    }
                }

                // Filter out 0 quantity items
                const finalItems = workingItems.filter(i => i.quantity > 0.001);

                const subtotal = finalItems.reduce((sum: number, item: any) => sum + item.amount, 0);
                const tax = subtotal * 0.05;

                const newInvoice: any = {
                    id: crypto.randomUUID(),
                    number: 'DRAFT', // Backend will assign next sequence number
                    date: new Date().toISOString(),
                    status: 'draft', // Type assertion via :any handled
                    from: {
                        name: 'My Business',
                        address: '123 Business Rd',
                        email: 'billing@example.com',
                        phone: '+1234567890'
                    },
                    to: {
                        customerId: customer.id,
                        name: customer.name,
                        address: customer.address || '',
                        email: customer.email || '',
                        phone: customer.phone || ''
                    },
                    items: finalItems,
                    subtotal: subtotal,
                    tax: tax,
                    total: subtotal + tax,
                    currency: 'QAR',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const result = await window.electron.saveInvoice(newInvoice);
                if (result.success) successCount++;
                else failCount++;
            }

            if (successCount > 0) {
                toast.success(`${successCount} invoice(s) generated successfully!`);
                if (loadCustomers) loadCustomers();

                // Auto-download Executive Summary if available
                if (executiveSummary && executiveSummary.length > 0) {
                    try {
                        await handleExportSummary();
                    } catch (error) {
                        console.error('Failed to auto-download Executive Summary:', error);
                        toast.warning('Invoices generated, but Executive Summary download failed.');
                    }
                }
            } else if (failCount > 0) {
                toast.error("Failed to generate invoices.");
            } else {
                toast.info("No matching rows found for the selected customers.");
            }

        } catch (error) {
            console.error(error);
            toast.error("An error occurred during generation.");
        } finally {
            setIsGeneratingInvoices(false);
        }
    };




    const handleOpenUnmatched = () => {
        if (unmatchedPath) {
            window.electron.openFile(unmatchedPath);
        }
    };

    const handleShowInFolder = () => {
        if (unmatchedPath) {
            window.electron.showInFolder(unmatchedPath);
        }
    };

    const reset = () => {
        localStorage.removeItem(STORAGE_KEY);
        setMasterConfig(null);
        setTargetConfigs([]);
        setNoMatchLabel('Not Matched');
        setStats(null);
        setPerFileStats(null);
        setMatchedRows([]); // Clear matched rows
        setUnmatchedPath(null);
        // Clear output file state
        setOutputFilePath(null);
        setOutputFileHeaders([]);
        setOutputFileData([]);
        setFileGenConfigs({});
        onStepChange('configure'); // Use Prop
    };





    return (
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            {/* Main Content only - Sidebar removed */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/30">
                    <h2 className="font-semibold text-foreground">
                        {currentStep === 'configure' ? 'Configure & Run' : 'Results'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Generate Invoice Button in Results Step */}
                        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    </div>
                </header>

                {/* Invoice Generation Configuration Wizard */}
                <InvoiceGenerationDialog
                    isOpen={isCustomerDialogOpen && !isCreatingCustomer}
                    onClose={() => setIsCustomerDialogOpen(false)}
                    fileGenConfigs={fileGenConfigs}
                    onUpdateConfig={updateFileConfig}
                    uniqueMatchValues={uniqueMatchValues}
                    customers={customers}
                    outputFileHeaders={outputFileHeaders}
                    outputFilePath={outputFilePath}
                    groupTotals={groupTotals}
                    customerProjections={customerProjections}
                    onCreateCustomer={() => setIsCreatingCustomer(true)}
                    onGenerate={handleConfirmGeneration}
                    onGenerateSummary={handleGenerateSummary}
                    isGenerating={isGeneratingInvoices}
                />

                {/* Create Customer Dialog (Overlay) */}
                <GlassDialog
                    isOpen={isCreatingCustomer}
                    onClose={() => setIsCreatingCustomer(false)}
                    title="Create New Customer"
                    description="Enter customer details below."
                    className="max-w-xl"
                >
                    <div className="space-y-4">
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Name *</label>
                                <Input
                                    value={newCustomerData.name}
                                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                    placeholder="Business Name"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Email</label>
                                <Input
                                    value={newCustomerData.email}
                                    onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Phone</label>
                                <Input
                                    value={newCustomerData.phone}
                                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                    placeholder="+974 ..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium">Address</label>
                                <Input
                                    value={newCustomerData.address}
                                    onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                    placeholder="Building, Street, Zone"
                                />
                            </div>
                            <div className="flex justify-end pt-2 gap-2">
                                <Button variant="ghost" onClick={() => setIsCreatingCustomer(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateCustomer}>
                                    Save Customer
                                </Button>
                            </div>
                        </div>
                    </div>
                </GlassDialog>

                {/* Column Mapper */}
                {mappingTarget && (
                    <ColumnMapper
                        open={mapperOpen}
                        onOpenChange={setMapperOpen}
                        fileType={mappingTarget.type}
                        fileName={mappingTarget.type === 'master' ? masterConfig?.fileName || '' : targetConfigs[mappingTarget.index]?.fileName || ''}
                        headers={mappingTarget.type === 'master' ? masterConfig?.headers || [] : targetConfigs[mappingTarget.index]?.headers || []}
                        previewData={mappingTarget.type === 'master' ? masterConfig?.preview || [] : targetConfigs[mappingTarget.index]?.preview || []}
                        customers={customers}
                        initialIdCol={mappingTarget.type === 'master' ? (masterConfig?.overrideIdColumn ?? -1) : (targetConfigs[mappingTarget.index]?.overrideIdColumn ?? -1)}
                        initialResultCol={mappingTarget.type === 'master' ? (masterConfig?.overrideResultColumn ?? -1) : -1}
                        initialMatchLabel={mappingTarget.type === 'target' ? targetConfigs[mappingTarget.index]?.matchLabel : undefined}
                        onConfirm={handleConfirmMapping}
                    />
                )}

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {currentStep === 'configure' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                {/* File Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Master File */}
                                    <Card
                                        className={cn(
                                            "cursor-pointer group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500/30",
                                            masterConfig ? "border-emerald-500/50 bg-emerald-50/10" : "border-dashed border-4 hover:bg-secondary/30",
                                            "h-64 flex flex-col justify-center items-center"
                                        )}
                                        onClick={handleSelectMaster}
                                    >
                                        <CardContent className="p-0 w-full">
                                            <div className="flex flex-col items-center text-center space-y-6">
                                                <div className={cn(
                                                    "w-24 h-24 rounded-3xl flex items-center justify-center transition-colors shadow-sm",
                                                    masterConfig ? "bg-emerald-100 text-emerald-600 ring-4 ring-emerald-500/20" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                )}>
                                                    {masterConfig ? <Check className="w-12 h-12" /> : <FileSpreadsheet className="w-12 h-12" />}
                                                </div>
                                                {masterConfig ? (
                                                    <div className="font-bold text-xl text-emerald-700 bg-emerald-50 px-6 py-2 rounded-full border-2 border-emerald-100">{masterConfig.fileName}</div>
                                                ) : (
                                                    <div className="text-3xl font-bold text-foreground">Master File</div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Target Files */}
                                    <Card
                                        className={cn(
                                            "cursor-pointer group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/30",
                                            targetConfigs.length > 0 ? "border-blue-500/50 bg-blue-50/10" : "border-dashed border-4 hover:bg-secondary/30",
                                            "h-64 flex flex-col justify-center items-center"
                                        )}
                                        onClick={handleSelectTargets}
                                    >
                                        <CardContent className="p-0 w-full">
                                            <div className="flex flex-col items-center text-center space-y-6">
                                                <div className={cn(
                                                    "w-24 h-24 rounded-3xl flex items-center justify-center transition-colors shadow-sm",
                                                    targetConfigs.length > 0 ? "bg-blue-100 text-blue-600 ring-4 ring-blue-500/20" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                )}>
                                                    {targetConfigs.length > 0 ? <Files className="w-12 h-12" /> : <Files className="w-12 h-12 opacity-50" />}
                                                </div>
                                                {targetConfigs.length > 0 ? (
                                                    <div className="font-bold text-xl text-blue-700 bg-blue-50 px-6 py-2 rounded-full border-2 border-blue-100">{targetConfigs.length} Files Loaded</div>
                                                ) : (
                                                    <div className="text-3xl font-bold text-foreground">Customer Files</div>
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
                                    <Card className="border-2 shadow-sm">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-xl flex items-center gap-3">
                                                    <Sparkles className="w-6 h-6 text-primary" />
                                                    Matching Configuration
                                                </CardTitle>
                                                <Badge variant="secondary" className="text-sm px-3 py-1">
                                                    {masterConfig?.dataRowCount} rows
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Master Config */}
                                            <div className="p-5 rounded-xl bg-secondary/30 border border-border/50 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg font-bold flex-1">Master: {masterConfig.fileName}</span>
                                                    <div className="bg-success/20 p-1 rounded-full">
                                                        <Check className="w-5 h-5 text-success" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-sm font-medium text-muted-foreground">ID Column</span>
                                                        <select
                                                            className="w-full h-12 rounded-lg border border-input bg-background px-3 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            value={masterConfig.overrideIdColumn ?? -1}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                setMasterConfig(prev => prev ? {
                                                                    ...prev,
                                                                    overrideIdColumn: val === -1 ? undefined : val
                                                                } : null);
                                                            }}
                                                        >
                                                            <option value={-1}>
                                                                Select Column...
                                                            </option>
                                                            {masterConfig?.headers?.map(h => (
                                                                <option key={h.index} value={h.index}>{h.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-sm font-medium text-muted-foreground">Output Column</span>
                                                        <select
                                                            className="w-full h-12 rounded-lg border border-input bg-background px-3 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            value={masterConfig.overrideResultColumn ?? -1}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                setMasterConfig(prev => prev ? {
                                                                    ...prev,
                                                                    overrideResultColumn: val === -1 ? undefined : val
                                                                } : null);
                                                            }}
                                                        >
                                                            <option value={-1}>
                                                                Auto ({masterConfig.resultColumn?.isNew ? 'New Column' : masterConfig.resultColumn?.name})
                                                            </option>
                                                            {masterConfig.headers?.map(h => (
                                                                <option key={h.index} value={h.index}>{h.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>


                                            {/* Target Configs */}
                                            {targetConfigs.map((target, idx) => (
                                                <div key={idx} className="p-5 rounded-xl bg-secondary/30 border border-border/50 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-lg font-bold flex-1">{target.fileName}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                            onClick={(e) => { e.stopPropagation(); removeTarget(idx); }}
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm font-medium text-muted-foreground">Mapping Configuration</span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 gap-2 text-primary border-primary/20 hover:bg-primary/5"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setMappingTarget({ type: 'target', index: idx });
                                                                        setMapperOpen(true);
                                                                    }}
                                                                >
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                    Map Columns / Preview
                                                                </Button>
                                                            </div>
                                                            <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/50 text-sm">
                                                                <div className="flex-1 truncate">
                                                                    <span className="text-muted-foreground mr-2">ID Column:</span>
                                                                    <span className="font-medium">
                                                                        {target.overrideIdColumn !== undefined
                                                                            ? (target.headers?.find(h => h.index === target.overrideIdColumn)?.name || `Col ${target.overrideIdColumn + 1}`)
                                                                            : <span className="text-muted-foreground italic">Auto</span>
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1 truncate border-l pl-2 border-border/50">
                                                                    <span className="text-muted-foreground mr-2">Label:</span>
                                                                    {target.matchLabel ? (
                                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                            {target.matchLabel}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-destructive font-bold text-xs">Missing</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* No-match label */}
                                            <div className="flex items-center gap-4 pt-2">
                                                <span className="text-base font-medium text-muted-foreground">Label for unmatched items:</span>
                                                <Input
                                                    className="h-12 w-64 text-base"
                                                    value={noMatchLabel}
                                                    onChange={(e) => setNoMatchLabel(e.target.value)}
                                                    placeholder="Type label..."
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}



                                {/* Run Button */}
                                <div className="flex justify-center pt-12 pb-8">
                                    <Button
                                        size="lg"
                                        disabled={!isReady || isProcessing}
                                        onClick={handleProcess}
                                        className={cn(
                                            "min-w-96 transition-all font-bold text-3xl h-24 shadow-xl rounded-2xl",
                                            isReady ? "bg-primary hover:bg-primary/90 animate-pulse-slow" : ""
                                        )}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-10 h-10 mr-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            "Reconcile"
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
                        {currentStep === 'done' && (
                            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                {/* 1. Hero Success Card */}
                                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xl">
                                    <div className="absolute top-0 right-0 p-12 opacity-10">
                                        <Check className="w-64 h-64" />
                                    </div>
                                    <div className="relative z-10 p-8 md:p-10">
                                        <div className="flex flex-col md:flex-row justify-between gap-8 items-start md:items-center">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                                        <Check className="w-6 h-6 text-white" />
                                                    </div>
                                                    <h1 className="text-3xl font-bold text-white">
                                                        Reconciliation Complete
                                                    </h1>
                                                </div>
                                            </div>

                                            {/* Key Metrics */}
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

                                {/* 2. Action Deck (What Now?) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Primary Action: Invoicing */}
                                    {/* Consolidated Action: Generate Documents */}
                                    <Card className="col-span-1 md:col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
                                        <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        <CardContent className="p-8 relative z-10 flex flex-col items-center text-center h-full">
                                            <div className="p-4 bg-primary/10 text-primary rounded-2xl mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                                <Files className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-3xl font-bold mb-3">Generate Documents</h3>
                                            <p className="text-muted-foreground mb-8 max-w-lg text-lg">
                                                Create official <strong>Invoices</strong> and the <strong>Executive Summary</strong> based on these reconciled figures.
                                            </p>
                                            <Button
                                                size="lg"
                                                className="w-full max-w-sm text-lg font-bold shadow-lg shadow-primary/20 h-12"
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
                                                        Start Generation <ArrowRight className="ml-2 w-5 h-5" />
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* 3. Data Review & Downloads */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Per-File Performance */}
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
                                                                {/* Mini Progress Bar */}
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

                                    {/* Unmatched Review */}
                                    <Card className="md:col-span-2 border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                                <AlertCircle className="w-5 h-5" />
                                                Review Needed
                                                <Badge variant="outline" className="ml-auto border-orange-300 text-orange-700 bg-orange-100 dark:bg-orange-950 dark:text-orange-300">
                                                    {stats?.unmatchedMasterRows || 0} Items
                                                </Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Some rows in the master file couldn't be automatically matched.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-orange-200 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-800 dark:hover:bg-orange-900"
                                                onClick={handleOpenUnmatched}
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                Download Unmatched Results
                                            </Button>
                                        </CardContent>
                                    </Card>


                                    {/* Executive Summary removed - auto-download instead */}
                                </div>


                            </div>
                        )}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}

