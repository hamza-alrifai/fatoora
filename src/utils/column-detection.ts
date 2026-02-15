import { COLUMN_KEYWORDS } from '@/constants';

export interface ColumnDetectionResult {
    idColumn?: number;
    descriptionColumn?: number;
    quantityColumn?: number;
    resultColumn?: number;
    customerColumn?: number;
    confidence: {
        id: number;
        description: number;
        quantity: number;
        result: number;
        customer: number;
    };
}

export interface Header {
    name: string;
    index: number;
}

/**
 * Heuristics for column detection
 */
const KEYWORDS = {
    ID: [...COLUMN_KEYWORDS.ID],
    WEIGHT: [...COLUMN_KEYWORDS.QUANTITY],
    CUSTOMER: [...COLUMN_KEYWORDS.CUSTOMER],
    MATERIAL: [...COLUMN_KEYWORDS.DESCRIPTION],
    RESULT: [...COLUMN_KEYWORDS.RESULT]
};

/**
 * Scores a header name against a list of keywords.
 * Returns a score between 0 and 1.
 */
function scoreHeader(headerName: string, keywords: string[]): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normHeader = normalize(headerName);

    // Exact match (highest score)
    if (keywords.some(k => normalize(k) === normHeader)) return 1.0;

    // Contains match
    if (keywords.some(k => normHeader.includes(normalize(k)))) return 0.8;

    // Partial fuzzy match (rudimentary)
    return 0;
}

export function detectColumns(headers: Header[]): ColumnDetectionResult {
    const result: ColumnDetectionResult = {
        confidence: { id: 0, description: 0, quantity: 0, result: 0, customer: 0 }
    };

    // Helper to find best match for a category
    const findBestMatch = (keywords: string[]): { index: number, score: number } => {
        let bestIdx = -1;
        let bestScore = 0;

        headers.forEach(h => {
            const score = scoreHeader(h.name, keywords);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = h.index;
            }
        });

        return { index: bestIdx, score: bestScore };
    };

    // 1. Detect ID Column
    const idMatch = findBestMatch(KEYWORDS.ID);
    if (idMatch.score > 0.4) {
        result.idColumn = idMatch.index;
        result.confidence.id = idMatch.score;
    }

    // 2. Detect Weight/Qty Column
    const qtyMatch = findBestMatch(KEYWORDS.WEIGHT);
    if (qtyMatch.score > 0.4) {
        result.quantityColumn = qtyMatch.index;
        result.confidence.quantity = qtyMatch.score;
    }

    // 3. Detect Material/Description Column
    const descMatch = findBestMatch(KEYWORDS.MATERIAL);
    if (descMatch.score > 0.4) {
        result.descriptionColumn = descMatch.index;
        result.confidence.description = descMatch.score;
    }

    // 4. Detect Customer Column (often the same as Result for Output files)
    const custMatch = findBestMatch(KEYWORDS.CUSTOMER);
    if (custMatch.score > 0.4) {
        result.customerColumn = custMatch.index;
        result.confidence.customer = custMatch.score;
    }

    // 5. Detect Result Column (For Master/Output files)
    // Often similar to Customer, but we prioritize "Status" or "Matched" if present for internal logic
    // But for the config view, we usually interpret "Result" as "The column to write the match to" 
    // or "The column that contains the match"
    const resMatch = findBestMatch(KEYWORDS.RESULT);
    if (resMatch.score > 0.4) {
        result.resultColumn = resMatch.index;
        result.confidence.result = resMatch.score;
    }


    return result;
}
