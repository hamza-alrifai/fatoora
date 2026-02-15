/**
 * Application Constants
 * Single Source of Truth for values used across the application.
 */

export const PRODUCT_TYPES = {
    TYPE_10MM: '10mm',
    TYPE_20MM: '20mm',
    OTHER: 'other',
} as const;

export const SHEET_NAMES = {
    CUSTOMERS: 'Customers',
    INVOICES: 'Invoices',
    PRODUCTS: 'Products',
} as const;

/**
 * Keywords used for column detection and header matching.
 * Merged superset from previous excel-utils and column-detection lists.
 */
export const COLUMN_KEYWORDS = {
    ID: [
        'ticket', 'ticket #', 'ticket#', 'id', 'no', 'number', 'ref', 'reference', 'serial',
        'sl', 'sl.', 's.no', 'code', 'slip', 'doc', 'delivery note', 'dn', 'd/n'
    ],
    DESCRIPTION: [
        'description', 'desc', 'item', 'material', 'product', 'name', 'details',
        'particulars', 'narration', 'type', 'grade', 'commodity', 'size', 'gabbro',
        'spec', 'specification'
    ],
    QUANTITY: [
        'qty', 'quantity', 'qnty', 'ton', 'tons', 'weight', 'units', 'pcs', 'amount',
        'net', 'gross', 'limit', 'loaded', 'measure', 'mt', 'mass', 'load'
    ],
    DATE: [
        'date', 'dated', 'dt', 'delivery date', 'trip date', 'invoice date'
    ],
    CUSTOMER: [
        'customer', 'client', 'party', 'received', 'account', 'name', 'buyer'
    ],
    RESULT: [
        'matched', 'status', 'result', 'finding', 'match', 'customer', 'client', 'party'
    ],
} as const;

export const FOOTER_KEYWORDS = [
    'total', 'grand total', 'sub total', 'subtotal', 'sum', 'net total'
];

export const IGNORED_SHEETS = ['template', 'guide', 'instructions', 'readme'];
