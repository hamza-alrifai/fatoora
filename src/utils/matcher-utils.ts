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
 * Determine product type from description
 */
export function detectProductType(description: string): '10mm' | '20mm' | 'other' {
    const lower = description.toLowerCase();
    if (lower.includes('20mm')) return '20mm';
    if (lower.includes('10mm')) return '10mm';
    return 'other';
}

/**
 * Get rate for a product type
 */
export function getRateForType(
    type: '10mm' | '20mm' | 'other',
    rate10: number,
    rate20: number
): number {
    if (type === '10mm') return rate10;
    if (type === '20mm') return rate20;
    return 0;
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
 * Aggregate quantities by description key
 */
export function aggregateQuantities(
    items: Array<{ description: string; quantity: number; rate: number }>
): Map<string, { quantity: number; rate: number }> {
    const grouped = new Map<string, { quantity: number; rate: number }>();

    items.forEach(item => {
        const key = `${item.description}|${item.rate}`;
        if (grouped.has(key)) {
            const existing = grouped.get(key)!;
            existing.quantity += item.quantity;
        } else {
            grouped.set(key, { quantity: item.quantity, rate: item.rate });
        }
    });

    return grouped;
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

export interface CustomerSummary {
    name: string;
    total20mm: number;
    total10mm: number;
    totalOther: number;
    totalQty: number;
    amount20mm: number;
    amount10mm: number;
    ticketCount: number;
    totalAmount: number;
    // New Fields
    trips10mm: number;
    trips20mm: number;
    percentage10mm: number;
    percentage20mm: number;
    excess10mm: number;
    invoiceNo: string;
}

/**
 * Generate Executive Summary by grouping data by a customer column
 */
export function generateExecutiveSummary(
    data: any[][],
    customerColIdx: number,
    quantityColIdx: number,
    descriptionColIdx: number,
    rate10: number,
    rate20: number
): CustomerSummary[] {
    // Skip header if it exists (usually the first row contains headers)
    const headers = data[0];
    const rows = data.slice(1);

    const summaryMap = new Map<string, CustomerSummary>();

    rows.forEach(row => {
        if (!isValidDataRow(row, headers)) return;

        // Skipped if empty or just "Unknown"
        const customerName = String(row[customerColIdx] || '').trim();
        if (!customerName || customerName.toLowerCase() === 'not matched') return;

        // Superior Header Detection:
        // Check if this row is actually a header row that was missed.
        // Signs of a header row:
        // 1. Quantity column contains "Qty", "Quantity", "Weight", "Net"
        // 2. Description column contains "Description", "Material", "Item"
        // 3. Customer column is exactly the header name (already checked below)

        const qtyVal = String(row[quantityColIdx] || '').toLowerCase();
        const descVal = String(row[descriptionColIdx] || '').toLowerCase();

        if (
            qtyVal === 'qty' || qtyVal === 'quantity' || qtyVal.includes('weight') ||
            qtyVal === 'net quantity' || qtyVal === 'net weight' ||
            descVal === 'description' || descVal === 'material' || descVal === 'item' ||
            descVal === 'material description'
        ) {
            return;
        }

        // Skip if this row looks like the known header (value matches the column header)
        if (headers && headers[customerColIdx] && String(headers[customerColIdx]).trim().toLowerCase() === customerName.toLowerCase()) {
            return;
        }

        if (!summaryMap.has(customerName)) {
            summaryMap.set(customerName, {
                name: customerName,
                total20mm: 0,
                total10mm: 0,
                totalOther: 0,
                totalQty: 0,
                amount20mm: 0,
                amount10mm: 0,
                ticketCount: 0,
                totalAmount: 0,
                trips10mm: 0,
                trips20mm: 0,
                percentage10mm: 0,
                percentage20mm: 0,
                excess10mm: 0,
                invoiceNo: ''
            });
        }

        const customerStats = summaryMap.get(customerName)!;

        // Parse Qty
        let qty = 0;
        const rawQty = row[quantityColIdx];
        if (typeof rawQty === 'number') qty = rawQty;
        else if (typeof rawQty === 'string') qty = parseFloat(rawQty.replace(/[^\d.-]/g, '')) || 0;

        // Determine Type
        const desc = String(row[descriptionColIdx] || '');
        const type = detectProductType(desc);

        customerStats.ticketCount++;
        customerStats.totalQty += qty;

        if (type === '20mm') {
            customerStats.total20mm += qty;
            customerStats.amount20mm += (qty * rate20);
            customerStats.trips20mm++;
        } else if (type === '10mm') {
            customerStats.total10mm += qty;
            customerStats.amount10mm += (qty * rate10);
            customerStats.trips10mm++;
        } else {
            customerStats.totalOther += qty;
        }
    });

    // Calculate totals, percentages and excess
    const results = Array.from(summaryMap.values()).map(s => {
        const total10and20 = s.total10mm + s.total20mm;

        let pct10 = 0;
        let pct20 = 0;
        let excess10 = 0;

        if (total10and20 > 0) {
            pct10 = (s.total10mm / total10and20) * 100;
            pct20 = (s.total20mm / total10and20) * 100;

            // Excess Logic: If 10mm > 40% of Total (10+20), then excess is calculated?
            // "excess of 10mm used in case more the 40% you know the 60/40 ratio"
            // So if 10mm % > 40%, then Excess = Actual 10mm - (Total * 0.40)
            const allowed10mm = total10and20 * 0.40;
            if (s.total10mm > allowed10mm) {
                excess10 = s.total10mm - allowed10mm;
            }
        }

        return {
            ...s,
            // Round to 2 decimals
            total20mm: Math.round(s.total20mm * 100) / 100,
            total10mm: Math.round(s.total10mm * 100) / 100,
            totalQty: Math.round(s.totalQty * 100) / 100,
            amount20mm: Math.round(s.amount20mm * 100) / 100,
            amount10mm: Math.round(s.amount10mm * 100) / 100,
            totalAmount: Math.round((s.amount20mm + s.amount10mm) * 100) / 100,
            percentage10mm: Math.round(pct10 * 10) / 10, // 1 decimal place
            percentage20mm: Math.round(pct20 * 10) / 10,
            excess10mm: Math.round(excess10 * 100) / 100
        };
    });

    // Sort by name
    return results.sort((a, b) => a.name.localeCompare(b.name));
}
