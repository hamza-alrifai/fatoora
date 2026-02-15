import type { Customer } from '../types.d';

// Helper: Levenshtein distance for fuzzy matching
export const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

// Helper: Guess customer from filename with fuzzy logic
export const guessCustomer = (fileName: string, customers: Customer[]): string | undefined => {
    if (!fileName || !customers.length) return undefined;

    // Normalize string: lowercase, replace separators with space, remove extra spaces
    const normalize = (str: string) => str.toLowerCase().replace(/[_\-.]/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedFile = normalize(fileName);

    // 1. Exact/Substring Match (High Confidence)
    // Sort customers by length desc to match longest first (e.g. "Al Kaabi" before "Al")
    const sorted = [...customers].sort((a, b) => b.name.length - a.name.length);

    for (const customer of sorted) {
        const normalizedCustomer = normalize(customer.name);
        if (normalizedFile.includes(normalizedCustomer)) {
            return customer.name;
        }
    }

    // 2. Fuzzy Token Match (Medium Confidence)
    // Split filename into tokens
    const fileTokens = normalizedFile.split(' ').filter(t => t.length > 3); // Ignore short words

    for (const customer of sorted) {
        const customerName = normalize(customer.name);
        // If customer name is short (<= 3 chars), skip fuzzy match to avoid false positives
        if (customerName.length <= 3) continue;

        for (const token of fileTokens) {
            // Check distance
            const distance = levenshtein(token, customerName);
            // Allow 1 edit for short words (4-5 chars), 2 edits for longer
            const threshold = customerName.length <= 5 ? 1 : 2;

            if (distance <= threshold) {
                return customer.name;
            }
        }
    }

    return undefined;
};
