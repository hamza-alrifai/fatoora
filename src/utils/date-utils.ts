/**
 * Date utilities for invoice overdue detection
 * Uses string comparison to avoid timezone issues
 */

/**
 * Get today's date as YYYY-MM-DD string
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Extract date portion from an ISO string or date string
 * @param dateValue - Date string (ISO or YYYY-MM-DD)
 * @returns YYYY-MM-DD string
 */
export function extractDateString(dateValue: string): string {
    if (!dateValue) return '';
    return String(dateValue).split('T')[0];
}

/**
 * Check if a due date is overdue compared to today
 * Uses string comparison to avoid timezone issues
 * @param dueDate - The due date string
 * @param today - Optional today string for testing (defaults to actual today)
 * @returns True if overdue (today is strictly after due date)
 */
export function isOverdue(dueDate: string, today?: string): boolean {
    const todayStr = today ?? getTodayString();
    const dueDateStr = extractDateString(dueDate);

    if (!dueDateStr) return false;

    // String comparison works for YYYY-MM-DD format
    return todayStr > dueDateStr;
}

/**
 * Check if two dates are the same day
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns True if same day
 */
export function isSameDay(date1: string, date2: string): boolean {
    return extractDateString(date1) === extractDateString(date2);
}
