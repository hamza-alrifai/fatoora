/**
 * Excel parsing utilities
 * Extracted from main.ts for testability
 */

/**
 * Common header patterns for column detection
 */
export const COLUMN_PATTERNS = {
    id: ['ticket', 'ticket #', 'ticket#', 'id', 'no', 'number', 'ref', 'reference', 'serial', 'sl', 'sl.', 's.no', 'code'],
    description: ['description', 'desc', 'item', 'material', 'product', 'name', 'details', 'particulars', 'narration'],
    quantity: ['qty', 'quantity', 'qnty', 'ton', 'tons', 'weight', 'units', 'pcs', 'amount', 'net', 'gross'],
    date: ['date', 'dated', 'dt', 'delivery date', 'trip date', 'invoice date'],
} as const;

/**
 * Normalize a cell value for comparison
 * @param value - Raw cell value
 * @returns Normalized lowercase trimmed string
 */
export function normalizeValue(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).toLowerCase().trim();
}

/**
 * Check if a value looks like a valid ID (ticket number, reference, etc.)
 * @param value - Raw cell value
 * @returns True if it looks like an ID
 */
export function isValidId(value: any): boolean {
    const str = String(value ?? '').trim();

    // Empty or very short strings aren't valid IDs
    if (str.length < 1) return false;

    // Skip if it looks like a header keyword
    const lower = str.toLowerCase();
    const headerKeywords = ['ticket', 'id', 'number', 'ref', 'date', 'description', 'qty', 'total'];
    if (headerKeywords.some(kw => lower === kw)) return false;

    // Accept alphanumeric values that aren't just headers
    return /^[a-zA-Z0-9][a-zA-Z0-9-_./\\s]*$/.test(str);
}

/**
 * Score a header name against known patterns
 * @param headerName - The header name to score
 * @param patternType - The type of column to match
 * @returns Score (higher = better match)
 */
export function scoreHeader(headerName: string, patternType: keyof typeof COLUMN_PATTERNS): number {
    const normalized = normalizeValue(headerName);
    const patterns = COLUMN_PATTERNS[patternType];

    // Exact match = highest score
    if ((patterns as readonly string[]).includes(normalized)) {
        return 100;
    }

    // Partial match
    for (const pattern of patterns) {
        if (normalized.includes(pattern)) {
            return 50;
        }
        if (pattern.includes(normalized) && normalized.length > 2) {
            return 30;
        }
    }

    return 0;
}

/**
 * Find the best column index for a given pattern type
 * @param headers - Array of header names
 * @param patternType - The type of column to find
 * @returns Best matching column index or -1 if not found
 */
export function findBestColumn(headers: string[], patternType: keyof typeof COLUMN_PATTERNS): number {
    let bestIndex = -1;
    let bestScore = 0;

    headers.forEach((header, index) => {
        const score = scoreHeader(header, patternType);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return bestIndex;
}

/**
 * Parse a quantity value from various formats
 * @param value - Raw quantity value
 * @returns Parsed number or 0
 */
export function parseQuantity(value: any): number {
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }

    if (typeof value === 'string') {
        // Remove common formatting characters
        const cleaned = value.replace(/[,\s]/g, '').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
}

/**
 * Check if a row looks like a footer/total row
 * @param row - Array of cell values
 * @returns True if row appears to be a total/footer
 */
export function isFooterRow(row: any[]): boolean {
    const footerKeywords = ['total', 'grand total', 'sub total', 'subtotal', 'sum', 'net total'];

    return row.some(cell => {
        const normalized = normalizeValue(cell);
        return footerKeywords.some(kw => normalized.includes(kw));
    });
}
