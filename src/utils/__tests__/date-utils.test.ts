import { describe, it, expect } from 'vitest';
import { extractDateString, isOverdue, isSameDay } from '../date-utils';

describe('extractDateString', () => {
    it('extracts date from ISO string', () => {
        expect(extractDateString('2026-01-25T10:30:00.000Z')).toBe('2026-01-25');
    });

    it('handles YYYY-MM-DD format', () => {
        expect(extractDateString('2026-01-25')).toBe('2026-01-25');
    });

    it('returns empty string for empty input', () => {
        expect(extractDateString('')).toBe('');
    });

    it('handles undefined-like values', () => {
        expect(extractDateString(undefined as any)).toBe('');
    });
});

describe('isOverdue', () => {
    it('returns true when today is after due date', () => {
        expect(isOverdue('2026-01-24', '2026-01-25')).toBe(true);
    });

    it('returns false when today equals due date', () => {
        expect(isOverdue('2026-01-25', '2026-01-25')).toBe(false);
    });

    it('returns false when today is before due date', () => {
        expect(isOverdue('2026-02-01', '2026-01-25')).toBe(false);
    });

    it('handles ISO date strings', () => {
        expect(isOverdue('2026-01-24T00:00:00.000Z', '2026-01-25')).toBe(true);
    });

    it('returns false for empty due date', () => {
        expect(isOverdue('', '2026-01-25')).toBe(false);
    });

    it('handles year boundary correctly', () => {
        expect(isOverdue('2025-12-31', '2026-01-01')).toBe(true);
    });
});

describe('isSameDay', () => {
    it('returns true for same dates', () => {
        expect(isSameDay('2026-01-25', '2026-01-25')).toBe(true);
    });

    it('returns true for same day in different formats', () => {
        expect(isSameDay('2026-01-25T10:00:00Z', '2026-01-25')).toBe(true);
    });

    it('returns false for different dates', () => {
        expect(isSameDay('2026-01-25', '2026-01-26')).toBe(false);
    });
});
