import path from 'path';
import * as XLSX from 'xlsx';

// Fuzzy column matching patterns (priority-based)
export const ID_COLUMN_PATTERNS = [
    { pattern: /^ticket\s*no\.?$/i, priority: 100 },
    { pattern: /^qpmc\s*ticket.*$/i, priority: 99 },
    { pattern: /^ticket\s*#$/i, priority: 99 },
    { pattern: /qpmc.*ticket/i, priority: 95 },
    { pattern: /ticket.*no/i, priority: 90 },
    { pattern: /ticket\s*number/i, priority: 85 },
    { pattern: /serial.*no/i, priority: 80 },
    { pattern: /reference.*no/i, priority: 75 },
    { pattern: /^id$/i, priority: 70 },
    { pattern: /reference/i, priority: 60 },
    { pattern: /invoice.*no/i, priority: 55 },
];

export const RESULT_COLUMN_PATTERNS = [
    { pattern: /status/i, priority: 80 },
    { pattern: /result/i, priority: 80 },
    { pattern: /match/i, priority: 70 },
    { pattern: /payment.*status/i, priority: 90 },
];

// Helper: Get sheet by name or default to first
export function getSheet(workbook: XLSX.WorkBook, sheetName?: string): { sheet: XLSX.WorkSheet, name: string } {
    const name = sheetName && workbook.SheetNames.includes(sheetName)
        ? sheetName
        : workbook.SheetNames[0];
    return { sheet: workbook.Sheets[name], name };
}

// Helper: Find column using fuzzy matching with priorities
export function findColumnFuzzy(headers: any[], patterns: any): { index: number; columnName: string; confidence: number; reasoning: string } | null {
    let bestMatch: { index: number; columnName: string; confidence: number; reasoning: string } | null = null;

    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (!header) continue;
        const headerStr = String(header).trim();

        for (const { pattern, priority } of patterns) {
            if (pattern.test(headerStr)) {
                if (!bestMatch || priority > bestMatch.confidence) {
                    bestMatch = {
                        index: i,
                        columnName: headerStr,
                        confidence: priority,
                        reasoning: `High confidence match for pattern "${pattern.source}"`
                    };
                }
                break; // Found a match for this header, move to next
            }
        }
    }

    return bestMatch;
}

// Helper: Find first empty column for result output
export function findFirstEmptyColumn(data: any[][]): number {
    if (data.length === 0) return 0;
    const maxCols = Math.max(...data.map(row => row?.length || 0));
    return maxCols; // Return index after last column (new column)
}

// Helper: Generate smart match label from filename
export function generateMatchLabel(filePath: string): string {
    const filename = path.basename(filePath, path.extname(filePath));
    // Convert snake_case and kebab-case to spaces
    let label = filename.replace(/[_-]/g, ' ');
    // Remove common prefixes/suffixes
    label = label.replace(/\b(data|file|export|report|sheet)\b/gi, '').trim();
    // Title case
    label = label.replace(/\b\w/g, c => c.toUpperCase());
    // Truncate if too long
    if (label.length > 25) {
        label = label.substring(0, 22) + '...';
    }
    return label || 'Matched';
}

// Helper: Normalize value for matching (handles numbers, strings, whitespace)
export function normalizeValue(val: any): string {
    if (val === undefined || val === null || val === '') return '';
    // Convert to string and trim
    let str = String(val).trim();
    // Remove extra whitespace
    str = str.replace(/\s+/g, ' ');
    // Convert to lowercase for case-insensitive matching
    return str.toLowerCase();
}

/**
 * AI-Level Analysis Helpers
 */

export interface ColumnQuality {
    score: number; // 0-100
    emptyCount: number;
    uniqueCount: number;
    sampleValues: any[];
    type: 'string' | 'number' | 'date' | 'mixed';
    issues: string[];
}

export function analyzeColumnQuality(
    data: any[][],
    colIndex: number,
    startRow: number,
    endRow: number
): ColumnQuality {
    let emptyCount = 0;
    const values = new Set<string>();
    const samples: any[] = [];
    let numberCount = 0;
    let dateCount = 0;
    let stringCount = 0;
    const totalRows = Math.max(0, endRow - startRow);

    for (let i = startRow; i < endRow; i++) {
        const row = data[i];
        const val = row ? row[colIndex] : undefined;

        if (val === undefined || val === null || val === '') {
            emptyCount++;
        } else {
            const strVal = String(val).trim();
            values.add(strVal);

            // Collect first 3 non-empty samples
            if (samples.length < 3) samples.push(val);

            // Type detection
            if (!isNaN(Number(val))) numberCount++;
            else if (!isNaN(Date.parse(val)) && strVal.length > 5) dateCount++; // Crude date check
            else stringCount++;
        }
    }

    // Determine dominant type
    let type: ColumnQuality['type'] = 'mixed';
    if (numberCount > (totalRows - emptyCount) * 0.9) type = 'number';
    else if (dateCount > (totalRows - emptyCount) * 0.9) type = 'date';
    else if (stringCount > (totalRows - emptyCount) * 0.9) type = 'string';

    const issues: string[] = [];
    if (emptyCount > totalRows * 0.5) issues.push(`High empty rate (${Math.round(emptyCount / totalRows * 100)}%)`);
    if (values.size < totalRows * 0.05 && totalRows > 20) issues.push('Low variance (potential duplicate or category)');

    return {
        score: Math.max(0, 100 - (emptyCount / totalRows * 50)),
        emptyCount,
        uniqueCount: values.size,
        sampleValues: samples,
        type,
        issues
    };
}

export function detectFileIssues(data: any[][], headerRow: number, footerRow: number): { type: 'warning' | 'error', message: string }[] {
    const issues: { type: 'warning' | 'error', message: string }[] = [];
    const totalRows = footerRow - headerRow - 1;

    if (totalRows <= 0) {
        issues.push({ type: 'error', message: 'File appears to be empty or has no data rows.' });
        return issues;
    }

    if (totalRows < 5) {
        issues.push({ type: 'warning', message: 'Very few data rows detected. Check if header detection is correct.' });
    }

    // Check for empty rows in the middle of data
    let consecutiveEmpty = 0;
    for (let i = headerRow + 1; i < footerRow; i++) {
        const row = data[i];
        const isEmpty = !row || row.filter((c: any) => c !== undefined && c !== '').length === 0;
        if (isEmpty) consecutiveEmpty++;
        else consecutiveEmpty = 0;

        if (consecutiveEmpty > 5) {
            issues.push({ type: 'warning', message: 'Found large block of empty rows. Data might be fragmented.' });
            break;
        }
    }

    return issues;
}

// Helper: Find header row (not always row 1!)
export function findHeaderRow(data: any[][]): number {
    // Look for row with most non-empty string values and common header keywords
    const keywords = ['qpmc', 'ticket', 'serial', 'date', 'vehicle', 'weight', 'material', 'truck', 'customer'];

    let bestRow = 0;
    let bestScore = 0;

    // Only check first 10 rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (!row) continue;

        let score = 0;
        let nonEmptyCount = 0;

        row.forEach(cell => {
            if (cell && typeof cell === 'string') {
                nonEmptyCount++;
                const cellLower = cell.toLowerCase().trim();
                // Boost score if cell contains header keywords
                if (keywords.some(kw => cellLower.includes(kw))) {
                    score += 10;
                }
            }
        });

        // Add base score for non-empty string cells
        score += nonEmptyCount;

        if (score > bestScore) {
            bestScore = score;
            bestRow = i;
        }
    }

    return bestRow;
}

// Helper: Find footer start row (totals, empty rows at end)
export function findFooterStartRow(data: any[][]): number {
    // Look backwards from end for rows with "total", "sum", or mostly empty
    for (let i = data.length - 1; i >= Math.max(0, data.length - 10); i--) {
        const row = data[i];
        if (!row) continue;

        // Check for total/sum keywords
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('total') || rowStr.includes('sum') ||
            rowStr.includes('grand total') || rowStr.includes('subtotal')) {
            return i;
        }

        // Check if row is mostly empty (>80% empty cells)
        const emptyCount = row.filter(c => !c || c === '').length;
        if (row.length > 0 && emptyCount / row.length > 0.8) {
            // This is an empty row, keep looking
            continue;
        }
    }

    return data.length; // No footer found, use end of data
}
