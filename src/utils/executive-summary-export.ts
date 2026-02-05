import * as ExcelJS from 'exceljs';
import type { CustomerSummary } from './executive-summary-utils';

export async function exportExecutiveSummaryToExcel(summary: CustomerSummary[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Executive Summary');

    worksheet.columns = [
        { header: 'Serial', key: 'serial', width: 8 },
        { header: 'Customer', key: 'customer', width: 30 },
        { header: 'Total Qty (tons)', key: 'totalQty', width: 15, style: { numFmt: '#,##0.00' } },
        { header: '10mm Qty (tons)', key: 'total10mm', width: 15, style: { numFmt: '#,##0.00' } },
        { header: '20mm Qty (tons)', key: 'total20mm', width: 15, style: { numFmt: '#,##0.00' } },
        { header: '10mm %', key: 'pct10mm', width: 10 },
        { header: '20mm %', key: 'pct20mm', width: 10 },
        { header: '10mm Trips', key: 'trips10mm', width: 12 },
        { header: '20mm Trips', key: 'trips20mm', width: 12 },
        { header: 'Total Trips', key: 'totalTrips', width: 12 },
        { header: 'Invoice No', key: 'invNo', width: 15 },
        { header: 'Excess 10mm (tons)', key: 'excess10mm', width: 18, style: { numFmt: '#,##0.00' } }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    summary.forEach((s, idx) => {
        worksheet.addRow({
            serial: idx + 1,
            customer: s.name,
            totalQty: s.totalQty,
            total10mm: s.total10mm,
            total20mm: s.total20mm,
            pct10mm: s.percentage10mm + '%',
            pct20mm: s.percentage20mm + '%',
            trips10mm: s.trips10mm,
            trips20mm: s.trips20mm,
            totalTrips: s.trips10mm + s.trips20mm,
            invNo: s.invoiceNo || '-',
            excess10mm: s.excess10mm
        });
    });

    const totals = summary.reduce((acc, s) => ({
        totalQty: acc.totalQty + s.totalQty,
        total10mm: acc.total10mm + s.total10mm,
        total20mm: acc.total20mm + s.total20mm,
        trips10mm: acc.trips10mm + s.trips10mm,
        trips20mm: acc.trips20mm + s.trips20mm,
        excess10mm: acc.excess10mm + s.excess10mm
    }), { totalQty: 0, total10mm: 0, total20mm: 0, trips10mm: 0, trips20mm: 0, excess10mm: 0 });

    const totalRow = worksheet.addRow({
        serial: '',
        customer: 'GRAND TOTAL',
        totalQty: totals.totalQty,
        total10mm: totals.total10mm,
        total20mm: totals.total20mm,
        pct10mm: '',
        pct20mm: '',
        trips10mm: totals.trips10mm,
        trips20mm: totals.trips20mm,
        totalTrips: totals.trips10mm + totals.trips20mm,
        invNo: '',
        excess10mm: totals.excess10mm
    });

    totalRow.font = { bold: true };
    totalRow.getCell('customer').alignment = { horizontal: 'right' };
    totalRow.eachCell((cell, colNumber) => {
        if (colNumber > 2) {
            cell.border = {
                top: { style: 'double' }
            };
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];

    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fatoora_Executive_Summary_${dateStr}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
}
