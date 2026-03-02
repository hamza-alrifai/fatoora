import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { getSheet } from './electron/utils/excel-utils';

const MASTER_FILE_PATH = "/Users/hamza/Downloads/Blkhadem Master Sheet 15-21 Feb 2026.xlsx";
const TARGET_TICKET = "9002106182";

async function checkOffsetMisalignment() {
    console.log(`\n🔍 DEBUGGING MATRIX MISALIGNMENT`);
    console.log(`==================================\n`);

    if (!fs.existsSync(MASTER_FILE_PATH)) {
        console.error("❌ Error: Master file does not exist.");
        return;
    }

    const masterWb = XLSX.readFile(MASTER_FILE_PATH, { cellDates: false, cellNF: true, cellStyles: true });
    const { sheet: masterSheet } = getSheet(masterWb);

    // This is exactly how the backend creates its matrix:
    const masterData = XLSX.utils.sheet_to_json(masterSheet, { header: 1, raw: true, defval: '' }) as any[][];

    // Find our ticket in the matrix
    let matrixRowIndex = -1;
    for (let i = 0; i < masterData.length; i++) {
        const row = masterData[i];
        if (Array.isArray(row) && String(row[2]).trim() === TARGET_TICKET) {
            matrixRowIndex = i;
            break;
        }
    }

    if (matrixRowIndex === -1) {
        console.log(`❌ Could not find ticket ${TARGET_TICKET} in masterData matrix.`);
        return;
    }

    console.log(`✅ FOUND ticket ${TARGET_TICKET} at JS Array Index: ${matrixRowIndex}`);
    console.log(`   (When i=${matrixRowIndex} in the loop, this is where it matched)`);

    // The backend uses this exact formula to compute the physical cell to overwrite:
    // const cellRef = XLSX.utils.encode_cell({ r: i, c: masterResultColIndex });
    // Assuming Result column is H (idx 7) or whatever it uses
    const resultCol = 8; // I.e. Col I, matching your console log

    const calculatedRef = XLSX.utils.encode_cell({ r: matrixRowIndex, c: resultCol });
    const originalTicketRef = XLSX.utils.encode_cell({ r: matrixRowIndex, c: 2 }); // Col C

    console.log(`\nBackend Translation to physical XLSX:`);
    console.log(`   encode_cell({r: ${matrixRowIndex}, c: 2}) = ${originalTicketRef}`);
    console.log(`   encode_cell({r: ${matrixRowIndex}, c: ${resultCol}}) = ${calculatedRef}`);

    console.log(`\nLet's check the RAW physical XLSX file BEFORE backend logic runs:`);
    console.log(`   What does XLSX say is physically in cell ${originalTicketRef}?  >>${masterSheet[originalTicketRef]?.v}<<`);

    // Check one row UP
    const upRef = XLSX.utils.encode_cell({ r: matrixRowIndex - 1, c: 2 });
    console.log(`   What does XLSX say is physically in cell ${upRef}?  >>${masterSheet[upRef]?.v}<<`);

    // Check one row DOWN
    const downRef = XLSX.utils.encode_cell({ r: matrixRowIndex + 1, c: 2 });
    console.log(`   What does XLSX say is physically in cell ${downRef}?  >>${masterSheet[downRef]?.v}<<`);

    console.log(`\nCONCLUSION:`);
    if (String(masterSheet[originalTicketRef]?.v).trim() !== TARGET_TICKET) {
        console.log(`🚨 HUGE BUG DETECTED: 🚨`);
        console.log(`The JS Array Index ${matrixRowIndex} DOES NOT ALIGN with the physical XLSX encode_cell row {r: ${matrixRowIndex}}!`);
        console.log(`This means the backend is matching the right data, but writing the answer 'spartan' to the wrong physical row in the final file!`);
    } else {
        console.log(`✅ Matrices align perfectly. Encode logic is sound.`);
    }

}

checkOffsetMisalignment();
