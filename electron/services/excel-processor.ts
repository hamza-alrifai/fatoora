import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import {
    getSheet,
    findHeaderRow,
    findFooterStartRow,
    detectFileIssues,
    findColumnFuzzy,
    ID_COLUMN_PATTERNS,
    RESULT_COLUMN_PATTERNS,
    findFirstEmptyColumn,
    analyzeColumnQuality,
    generateMatchLabel,
    normalizeValue
} from '../utils/excel-utils';

export interface ProcessOptions {
    masterPath: string;
    targetPaths: string[];
    masterColIndices: number[];
    masterResultColIndex: number;
    targetMatchColIndices: Record<string, number[]>;
    targetMatchStrings: Record<string, string>;
    matchSentence: string;
    noMatchSentence: string;
    outputPath?: string;
    masterRowRange?: { start: number; end: number };
    targetRowRanges?: Record<string, { start: number; end: number }>;
    masterSheetName?: string;
    targetSheetNames?: Record<string, string>;
}

export async function analyzeExcelFile(filePath: string, sheetName?: string) {
    try {
        const workbook = XLSX.readFile(filePath);
        const allSheets = workbook.SheetNames;
        const { sheet, name: selectedSheet } = getSheet(workbook, sheetName);

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (data.length === 0) {
            return {
                success: false,
                error: 'Sheet is empty',
                sheets: allSheets,
                selectedSheet
            };
        }

        // Find header row
        const headerRowIndex = findHeaderRow(data);
        const headers = data[headerRowIndex] || [];

        // Find footer row
        const footerStartRow = findFooterStartRow(data);
        const dataRowCount = Math.max(0, footerStartRow - headerRowIndex - 1);
        const startRow = headerRowIndex + 1; // 0-indexed start of data
        const endRow = footerStartRow; // 0-indexed end of data (exclusive)

        // Detect global file issues
        const fileIssues = detectFileIssues(data, headerRowIndex, footerStartRow);

        // Fuzzy match ID column
        const idColumn = findColumnFuzzy(headers, ID_COLUMN_PATTERNS);

        // Fuzzy match existing result column (or suggest new)
        const existingResultColumn = findColumnFuzzy(headers, RESULT_COLUMN_PATTERNS);
        const suggestedResultColumn = existingResultColumn
            ? existingResultColumn.index
            : findFirstEmptyColumn(data);

        // Analyze column quality for important columns
        let idColumnAnalysis = null;
        if (idColumn) {
            idColumnAnalysis = analyzeColumnQuality(data, idColumn.index, startRow, endRow);
            // Enhance reasoning with data quality stats
            idColumn.reasoning += ` (${idColumnAnalysis.uniqueCount} unique values, ${Math.round(idColumnAnalysis.score)}% quality)`;
        }

        // Suggest row range
        const suggestedRowRange = {
            start: headerRowIndex + 2, // 1-indexed, skip header
            end: footerStartRow // 1-indexed (based on length)
        };

        // Generate match label from filename
        const suggestedMatchLabel = generateMatchLabel(filePath);

        // Calculate overall data quality score
        const overallScore = idColumnAnalysis ? idColumnAnalysis.score : (fileIssues.length > 0 ? 50 : 100);

        return {
            success: true,
            fileName: path.basename(filePath),
            filePath,
            sheets: allSheets,
            selectedSheet,
            headers: headers.map((h, i) => ({ index: i, name: String(h || `Column ${i + 1}`) })),
            rowCount: data.length,
            dataRowCount,
            headerRowIndex: headerRowIndex + 1, // 1-indexed
            footerStartRow: footerStartRow + 1, // 1-indexed
            idColumn: idColumn ? {
                index: idColumn.index,
                name: idColumn.columnName,
                confidence: idColumn.confidence >= 80 ? 'high' : idColumn.confidence >= 60 ? 'medium' : 'low',
                reasoning: idColumn.reasoning,
                sampleValues: idColumnAnalysis?.sampleValues,
                qualityScore: idColumnAnalysis?.score,
                issues: idColumnAnalysis?.issues
            } : null,
            resultColumn: {
                index: suggestedResultColumn,
                name: existingResultColumn?.columnName || '(New Column)',
                isNew: !existingResultColumn
            },
            suggestedRowRange,
            suggestedMatchLabel,
            analysisReport: {
                qualityScore: overallScore,
                issues: fileIssues
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function processExcelJob(options: ProcessOptions) {
    try {
        const { masterPath, targetPaths, masterColIndices, masterResultColIndex, targetMatchColIndices, targetMatchStrings, noMatchSentence, outputPath, masterRowRange, targetRowRanges, masterSheetName, targetSheetNames } = options;

        // Validation tracking
        const validationWarnings: Array<{ type: string; file: string; row: number; message: string }> = [];
        const masterDuplicates = new Map<string, number[]>(); // key -> row numbers

        // Process Files
        interface MatchedRow {
            sourceFile: string;
            data: any[];
            rowNumber: number;
        }

        const matchedRows: MatchedRow[] = [];

        // STEP 1: Build Master Lookup (what exists in master file)
        // Read with cellNF:true and cellStyles:true to preserve formats (dates, colors)
        const masterWb = XLSX.readFile(masterPath, { cellDates: false, cellNF: true, cellStyles: true });
        const { sheet: masterSheet } = getSheet(masterWb, masterSheetName);

        const masterData = XLSX.utils.sheet_to_json(masterSheet, { header: 1, raw: true, defval: '' }) as any[][];

        const masterLookup = new Set<string>();

        // Determine row range for master file
        const masterStart = masterRowRange ? masterRowRange.start - 1 : 1; // Convert to 0-indexed, default skip header
        const masterEnd = masterRowRange ? masterRowRange.end : masterData.length;

        // Build lookup from master file (only from selected row range)
        for (let i = masterStart; i < masterEnd && i < masterData.length; i++) {
            const row = masterData[i];
            if (Array.isArray(row)) {
                const masterValues = masterColIndices
                    .map(colIdx => normalizeValue(row[colIdx]))
                    .filter(val => val !== '');

                if (masterValues.length > 0) {
                    const key = masterValues.join('|'); // Use pipe separator

                    // Check for empty QPMC ticket
                    const rawTicket = row[masterColIndices[0]];
                    if (!rawTicket || String(rawTicket).trim() === '') {
                        validationWarnings.push({
                            type: 'empty_ticket',
                            file: 'Master',
                            row: i + 1,
                            message: `Row ${i + 1}: Empty QPMC ticket`
                        });
                    }

                    // Check for format (should be 10 digits)
                    const ticketStr = String(rawTicket).trim();
                    if (ticketStr && !/^\d{10}$/.test(ticketStr)) {
                        validationWarnings.push({
                            type: 'invalid_format',
                            file: 'Master',
                            row: i + 1,
                            message: `Row ${i + 1}: QPMC ticket "${ticketStr}" is not 10 digits`
                        });
                    }

                    // Track duplicates
                    if (masterLookup.has(key)) {
                        if (!masterDuplicates.has(key)) {
                            masterDuplicates.set(key, []);
                        }
                        masterDuplicates.get(key)!.push(i + 1);
                    }

                    masterLookup.add(key);
                }
            }
        }

        // Report duplicates
        masterDuplicates.forEach((rows, key) => {
            validationWarnings.push({
                type: 'duplicate',
                file: 'Master',
                row: rows[0],
                message: `Duplicate QPMC ticket "${key}" found in rows: ${rows.join(', ')}`
            });
        });

        // STEP 2: Process Target Files
        const targetLookup = new Map<string, Set<string>>();
        const unmatchedRows: any[][] = [];
        let unmatchedHeader: any[] = [];

        const fileStats = new Map<string, { total: number; matched: number }>();

        for (const targetPath of targetPaths) {
            try {
                const targetMatchColIndices_forFile = targetMatchColIndices[targetPath];
                const matchString = targetMatchStrings[targetPath] || 'Matched';
                const targetSheetName = targetSheetNames ? targetSheetNames[targetPath] : undefined;

                if (!targetMatchColIndices_forFile || targetMatchColIndices_forFile.length === 0) {
                    console.warn(`No columns selected for target file: ${targetPath}`);
                    continue;
                }

                const targetWb = XLSX.readFile(targetPath, { cellDates: false, raw: true });
                const { sheet: targetSheet } = getSheet(targetWb, targetSheetName);
                const targetData = XLSX.utils.sheet_to_json(targetSheet, { header: 1, raw: true, defval: '' }) as any[][];

                fileStats.set(targetPath, { total: 0, matched: 0 });

                if (unmatchedRows.length === 0 && targetData.length > 0) {
                    unmatchedHeader = [...targetData[0], 'Source File'];
                    unmatchedRows.push(unmatchedHeader);
                }

                const targetRange = targetRowRanges?.[targetPath];
                const targetStart = targetRange ? targetRange.start - 1 : 1;
                const targetEnd = targetRange ? targetRange.end : targetData.length;

                for (let rowIndex = targetStart; rowIndex < targetEnd && rowIndex < targetData.length; rowIndex++) {
                    const row = targetData[rowIndex];
                    if (!Array.isArray(row)) continue;

                    const values = targetMatchColIndices_forFile
                        .map(colIdx => normalizeValue(row[colIdx]))
                        .filter(val => val !== '');

                    if (values.length > 0) {
                        const key = values.join('|');

                        const lowerKey = key.toLowerCase();
                        const looksLikeTicket = /^\d{10}$/.test(key.trim());

                        const footerKeywords = [
                            'total', 'sum', 'size', 'qty', 'quantity', 'percentage',
                            'no of trip', 'trip', 'count', 'grand total',
                            '10 mm', '20 mm', '10mm', '20mm', '30 mm', '40 mm',
                            'aggregate', 'average', 'avg', 'subtotal', 'sub-total',
                            'qpmc ticket', 'ticket no', 'serial no', 'readymix',
                            'report', 'supply', 'material', 'vehicle type'
                        ];

                        const isFooterRow = footerKeywords.some(kw => lowerKey.includes(kw));

                        const isInvalidRow =
                            key.length === 0 ||
                            isFooterRow ||
                            (lowerKey.includes('date') && lowerKey.length < 15) ||
                            (!looksLikeTicket && key.length < 8);

                        if (isInvalidRow) {
                            continue;
                        }

                        const stats = fileStats.get(targetPath)!;
                        stats.total++;

                        if (masterLookup.has(key)) {
                            if (!targetLookup.has(key)) {
                                targetLookup.set(key, new Set());
                            }
                            targetLookup.get(key)!.add(matchString);
                            stats.matched++;

                            matchedRows.push({
                                sourceFile: targetPath,
                                data: row,
                                rowNumber: rowIndex + 1
                            });

                        } else {
                            unmatchedRows.push([...row, path.basename(targetPath)]);
                        }
                    }
                }
            } catch (err: any) {
                console.error(`Error reading target ${targetPath}:`, err);
            }
        }

        // STEP 3: Update Master File
        let matchCount = 0;
        const updateStart = masterRowRange ? masterRowRange.start - 1 : 1;
        const updateEnd = masterRowRange ? masterRowRange.end : masterData.length;

        if (masterSheet['!ref']) {
            const range = XLSX.utils.decode_range(masterSheet['!ref']);
            if (masterResultColIndex > range.e.c) {
                range.e.c = masterResultColIndex;
                masterSheet['!ref'] = XLSX.utils.encode_range(range);
            }
        }

        for (let i = updateStart; i < updateEnd && i < masterData.length; i++) {
            const row = masterData[i];
            if (!Array.isArray(row)) continue;

            const values = masterColIndices
                .map(colIdx => normalizeValue(row[colIdx]))
                .filter(val => val !== '');

            let resultValue = '';

            if (values.length > 0) {
                const key = values.join('|');

                if (targetLookup.has(key)) {
                    const matchStrings = Array.from(targetLookup.get(key)!);
                    resultValue = matchStrings.join(', ');
                    matchCount++;
                } else {
                    if (noMatchSentence) {
                        resultValue = noMatchSentence;
                    }
                }
            }

            if (resultValue) {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: masterResultColIndex });
                masterSheet[cellRef] = { t: 's', v: resultValue };
            }
        }

        // STEP 4: Save Updated Master File
        let newPath: string;
        if (outputPath) {
            newPath = outputPath;
            fs.mkdirSync(path.dirname(newPath), { recursive: true });
        } else {
            const dir = path.dirname(masterPath);
            const ext = path.extname(masterPath);
            const name = path.basename(masterPath, ext);
            newPath = path.join(dir, `${name}_updated${ext}`);
        }

        XLSX.writeFile(masterWb, newPath);

        // STEP 5: Save Unmatched File
        let unmatchedPath: string | undefined;
        const unmatchedCount = unmatchedRows.length - 1;

        if (unmatchedCount > 0) {
            const dir = path.dirname(masterPath);
            const ext = path.extname(masterPath);
            const name = path.basename(masterPath, ext);
            unmatchedPath = path.join(dir, `${name}_unmatched${ext}`);

            const unmatchedSheet = XLSX.utils.aoa_to_sheet(unmatchedRows);
            const unmatchedWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(unmatchedWb, unmatchedSheet, "Unmatched");
            XLSX.writeFile(unmatchedWb, unmatchedPath);
        }

        // Calculate Stats
        const totalMasterRows = masterData.length - 1;
        const matchedMasterRows = matchCount;
        const unmatchedMasterRows = unmatchedCount;
        const matchPercentage = totalMasterRows > 0 ? (matchedMasterRows / totalMasterRows) * 100 : 0;

        const perFileStats = Array.from(fileStats.entries()).map(([filePath, stats]) => ({
            fileName: path.basename(filePath),
            filePath,
            total: stats.total,
            matched: stats.matched,
            percentage: stats.total > 0 ? parseFloat(((stats.matched / stats.total) * 100).toFixed(2)) : 0
        }));

        return {
            success: true,
            results: [{
                path: masterPath,
                status: 'success',
                newPath,
                matchCount
            }],
            stats: {
                totalMasterRows,
                matchedMasterRows,
                unmatchedMasterRows,
                matchPercentage: parseFloat(matchPercentage.toFixed(2))
            },
            perFileStats,
            unmatchedPath,
            warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
            matchedRows
        };

    } catch (error: any) {
        console.error(error);
        return { success: false, error: error.message };
    }
}
