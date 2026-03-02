import ExcelJS from 'exceljs';
import type { ReconciliationResult } from './reconciliation-engine';
import type { Customer } from '@/types';
import { EXCEL_STYLES, EXECUTIVE_SUMMARY_COLUMNS } from './excel-styles';
import { guessCustomer } from './customer-matching';

export async function generateExecutiveSummaryExcel(
    data: ReconciliationResult,
    outputFileName: string = 'Executive Summary.xlsx',
    customers: Customer[] = []
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

    // 1. Get all groups from groupStats
    const groupNames = Object.keys(data.groupStats);

    // Sort groups alphabetically
    groupNames.sort((a, b) => a.localeCompare(b));

    let serial = 1;
    for (const group of groupNames) {
        const groupStat = data.groupStats[group];

        // Resolve display name: prefer assigned customer, then fuzzy guess, then raw group name
        let displayName: string;
        if (groupStat.assignedCustomer?.name) {
            displayName = groupStat.assignedCustomer.name;
        } else if (customers.length > 0) {
            displayName = guessCustomer(groupStat.groupName, customers) || groupStat.groupName;
        } else {
            displayName = groupStat.groupName;
        }

        const totalQty = groupStat.total10mm + groupStat.total20mm;
        // Read pre-calculated trips from the backend stats
        const trips10 = groupStat.trips10mm || 0;
        const trips20 = groupStat.trips20mm || 0;
        const totalTrips = trips10 + trips20;

        const pct10 = totalQty > 0 ? groupStat.total10mm / totalQty : 0;
        const pct20 = totalQty > 0 ? groupStat.total20mm / totalQty : 0;

        const row = sheet.addRow({
            serial: serial++,
            customer: displayName,
            totalQty: totalQty,
            qty10: groupStat.total10mm,
            qty20: groupStat.total20mm,
            pct10: pct10,
            pct20: pct20,
            trips10: trips10,
            trips20: trips20,
            totalTrips: totalTrips,
            invoiceNo: 'Draft'
        });

        row.eachCell((cell, colNumber) => {
            // Must copy the style object, otherwise we mutate the exported EXCEL_STYLES.CELL globally!
            cell.style = { ...EXCEL_STYLES.CELL };
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
    const grandTot10Trips = groupNames.reduce((acc, g) => acc + (data.groupStats[g].trips10mm || 0), 0);
    const grandTot20Trips = groupNames.reduce((acc, g) => acc + (data.groupStats[g].trips20mm || 0), 0);

    const grandTotalRow = sheet.addRow([
        'GRAND TOTAL',
        '',
        data.totalQuantity,
        data.total10mm,
        data.total20mm,
        '',
        '',
        grandTot10Trips,
        grandTot20Trips,
        grandTot10Trips + grandTot20Trips,
        ''
    ]);

    grandTotalRow.eachCell((cell, colNumber) => {
        // Must copy style object
        cell.style = { ...EXCEL_STYLES.GRAND_TOTAL };

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
