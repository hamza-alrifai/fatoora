import { BrowserWindow } from 'electron';
import { getDB } from '../db';
import { getTodayString, extractDateString, isInvoiceOverdue } from '../utils/invoice-utils';

let overdueCheckInterval: NodeJS.Timeout | null = null;

// Background service to automatically check and update overdue invoices
export async function checkAndUpdateOverdueInvoices(mainWindow: BrowserWindow | null) {
    try {
        const db = await getDB();
        const todayStr = getTodayString();
        let hasUpdates = false;

        db.data.invoices.forEach((inv: any) => {
            // Only check issued invoices with a due date
            if (inv.status === 'issued' && inv.dueDate) {
                const dueDateStr = extractDateString(String(inv.dueDate));

                if (isInvoiceOverdue(dueDateStr, todayStr)) {
                    console.log(`[Background Service] Marking invoice ${inv.number} as OVERDUE (Due: ${dueDateStr}, Today: ${todayStr})`);
                    inv.status = 'overdue';
                    inv.updatedAt = new Date().toISOString();
                    hasUpdates = true;
                }
            }
        });

        if (hasUpdates) {
            await db.write();
            console.log('[Background Service] Overdue invoices updated');

            // Notify renderer if window exists
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('invoices-updated');
            }
        }
    } catch (error) {
        console.error('[Background Service] Error checking overdue invoices:', error);
    }
}

// Start the background service
export function startOverdueCheckService(mainWindow: BrowserWindow | null) {
    // Run immediately on start
    checkAndUpdateOverdueInvoices(mainWindow);

    // Then run every hour (3600000 ms)
    overdueCheckInterval = setInterval(() => {
        checkAndUpdateOverdueInvoices(mainWindow);
    }, 3600000); // Check every hour

    console.log('[Background Service] Overdue invoice checker started (runs every hour)');
}

// Stop the background service
export function stopOverdueCheckService() {
    if (overdueCheckInterval) {
        clearInterval(overdueCheckInterval);
        overdueCheckInterval = null;
        console.log('[Background Service] Overdue invoice checker stopped');
    }
}
