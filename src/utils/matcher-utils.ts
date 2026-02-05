/**
 * Matcher algorithm utilities
 * Extracted from MatcherWorkspace.tsx for testability
 */

/**
 * Guess column indices from header names for common patterns
 */
export function guessColumns(headers: string[]): { descriptionColIdx: number; quantityColIdx: number } {
    const lower = headers.map(h => h.toLowerCase());

    // Find description column
    let d = lower.findIndex(h => h.includes('material') && h.includes('description'));
    if (d === -1) d = lower.findIndex(h => h.includes('description'));
    if (d === -1) d = lower.findIndex(h => h.includes('material'));
    if (d === -1) d = 0;

    // Find quantity column
    let q = lower.findIndex(h => h.includes('net') && h.includes('weight'));
    if (q === -1) q = lower.findIndex(h => h.includes('weight'));
    if (q === -1) q = lower.findIndex(h => h.includes('qty'));
    if (q === -1) q = lower.findIndex(h => h.includes('quantity'));

    return { descriptionColIdx: d, quantityColIdx: q };
}

/**
 * Extract unique values from a column in data rows
 */
export function extractUniqueValues(
    data: any[][],
    colIdx: number,
    options?: { skipHeader?: boolean; excludeValues?: string[] }
): string[] {
    const { skipHeader = true, excludeValues = [] } = options || {};

    const rows = skipHeader ? data.slice(1) : data;
    const unique = new Set<string>();
    const excludeLower = excludeValues.map(v => v.toLowerCase());

    rows.forEach(row => {
        const val = String(row[colIdx] ?? '').trim();
        if (val && !excludeLower.includes(val.toLowerCase())) {
            unique.add(val);
        }
    });

    return Array.from(unique).sort();
}

/**
 * Calculate match statistics
 */
export function calculateMatchStats(
    totalRows: number,
    matchedRows: number
): { matched: number; unmatched: number; percentage: number } {
    const unmatched = totalRows - matchedRows;
    const percentage = totalRows > 0 ? Math.round((matchedRows / totalRows) * 100) : 0;

    return { matched: matchedRows, unmatched, percentage };
}

/**
 * Check if a row is a valid data row (not header, not empty, not total)
 */
export function isValidDataRow(row: any[], headerRow: any[]): boolean {
    if (!row || row.length === 0) return false;

    // Check if it's the header row repeated
    const isHeader = row.every((cell, idx) => String(cell).toLowerCase() === String(headerRow[idx]).toLowerCase());
    if (isHeader) return false;

    // Check if it's a total row
    const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
    if (rowText.includes('total') || rowText.includes('subtotal') || rowText.includes('grand')) {
        return false;
    }

    // Check if completely empty
    const hasContent = row.some(c => c !== null && c !== undefined && String(c).trim() !== '');
    return hasContent;
}
