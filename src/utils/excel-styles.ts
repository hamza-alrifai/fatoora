import type ExcelJS from 'exceljs';

export const EXCEL_STYLES = {
    HEADER: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }, // Indigo-600
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
    } as Partial<ExcelJS.Style>,

    CELL: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
    } as Partial<ExcelJS.Style>,

    UNMATCHED_HEADER: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }, // Red
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
    } as Partial<ExcelJS.Style>,

    GRAND_TOTAL: {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }, // Emerald
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }
    } as Partial<ExcelJS.Style>,
};

export const EXECUTIVE_SUMMARY_COLUMNS = [
    { header: 'Serial', key: 'serial', width: 8 },
    { header: 'Customer', key: 'customer', width: 30 },
    { header: 'Total QTY (MT)', key: 'totalQty', width: 15 },
    { header: '10 mm Qty (MT)', key: 'qty10', width: 15 },
    { header: '20 mm Qty (MT)', key: 'qty20', width: 15 },
    { header: '10 mm %', key: 'pct10', width: 10 },
    { header: '20 mm %', key: 'pct20', width: 10 },
    { header: '10 mm Trips', key: 'trips10', width: 12 },
    { header: '20 mm Trips', key: 'trips20', width: 12 },
    { header: 'Total 10 & 20 Trips', key: 'totalTrips', width: 18 },
    { header: 'Invoice No', key: 'invoiceNo', width: 20 },
];
