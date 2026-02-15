import ExcelJS from 'exceljs';
import type { ReconciliationResult } from './reconciliation-engine';
import { EXCEL_STYLES, EXECUTIVE_SUMMARY_COLUMNS } from './excel-styles';

export async function generateExecutiveSummaryExcel(
    data: ReconciliationResult,
    outputFileName: string = 'Executive_Summary.xlsx'
): Promise<void> {
    console.log('--- Generating Executive Summary ---');
    console.log('Received Data:', data);
    console.log('Customer Stats keys:', Object.keys(data.customerStats));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fatoora App';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Executive Summary');

    // --- Columns Setup ---
    sheet.columns = EXECUTIVE_SUMMARY_COLUMNS;

    // Apply Header Styles
    sheet.getRow(1).eachCell((cell) => {
        cell.style = EXCEL_STYLES.HEADER;
    });

    // --- Data Population ---

    // We want to group by Customer, then by Project
    // 1. Get all customers from customerStats
    const customerIds = Object.keys(data.customerStats);

    // Sort customers by name
    customerIds.sort((a, b) => {
        const nameA = data.customerStats[a].customer.name.toLowerCase();
        const nameB = data.customerStats[b].customer.name.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    let serial = 1;
    for (const custId of customerIds) {
        const custStat = data.customerStats[custId];
        const customerName = custStat.customer.name;

        const totalQty = custStat.total10mm + custStat.total20mm;
        const totalTrips = custStat.trips10mm + custStat.trips20mm;

        const pct10 = totalQty > 0 ? custStat.total10mm / totalQty : 0;
        const pct20 = totalQty > 0 ? custStat.total20mm / totalQty : 0;

        const row = sheet.addRow({
            serial: serial++,
            customer: customerName,
            totalQty: totalQty,
            qty10: custStat.total10mm,
            qty20: custStat.total20mm,
            pct10: pct10,
            pct20: pct20,
            trips10: custStat.trips10mm,
            trips20: custStat.trips20mm,
            totalTrips: totalTrips,
            invoiceNo: 'Draft' // Placeholder or implement logic to fetch actual invoice number if available
        });

        row.eachCell((cell, colNumber) => {
            cell.style = EXCEL_STYLES.CELL;
            if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
                cell.numFmt = '#,##0.00';
            }
            if (colNumber === 6 || colNumber === 7) {
                cell.numFmt = '0.00%';
            }
        });
    }

    // --- Add Unmatched Section ---
    if (data.unmatchedStats.count > 0) {
        sheet.addRow([]); // Spacer
        const unmatchedHeader = sheet.addRow(['Unmatched Items', '', '', '', '', '']);
        unmatchedHeader.eachCell(cell => {
            cell.style = EXCEL_STYLES.UNMATCHED_HEADER;
        });
        sheet.mergeCells(`A${unmatchedHeader.number}:F${unmatchedHeader.number}`);

        sheet.addRow(['Total Unmatched Rows', data.unmatchedStats.count]);
    }

    // --- Global Totals ---
    sheet.addRow([]);
    const grandTotalRow = sheet.addRow([
        'GRAND TOTAL',
        '',
        data.totalQuantity,
        data.total10mm,
        data.total20mm,
        '',
        '',
        Object.values(data.customerStats).reduce((a, b) => a + b.trips10mm, 0),
        Object.values(data.customerStats).reduce((a, b) => a + b.trips20mm, 0),
        Object.values(data.customerStats).reduce((a, b) => a + b.trips10mm + b.trips20mm, 0),
        ''
    ]);

    grandTotalRow.eachCell((cell, colNumber) => {
        cell.style = EXCEL_STYLES.GRAND_TOTAL;

        if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
            cell.numFmt = '#,##0.00';
        }
    });
    sheet.mergeCells(`A${grandTotalRow.number}:B${grandTotalRow.number}`);


    // --- Save File ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName;
    a.click();
    window.URL.revokeObjectURL(url);
}
