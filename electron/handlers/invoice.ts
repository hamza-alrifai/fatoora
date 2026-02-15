import { ipcMain, BrowserWindow } from 'electron';
import crypto from 'crypto';
import { getDB } from '../db';
import { getTodayString, extractDateString, isInvoiceOverdue } from '../utils/invoice-utils';
import { generateInvoicePDF, generateSecureInvoicePDF } from '../services/pdf-service';
import path from 'path';

export function registerInvoiceHandlers(mainWindowGetter: () => BrowserWindow | null) {
    // Save Invoice
    ipcMain.handle('invoice:save', async (_, invoice: any) => {
        try {
            const db = await getDB();

            // Ensure lastInvoiceNumber exists (migration-like safety)
            if (typeof db.data.lastInvoiceNumber !== 'number') {
                db.data.lastInvoiceNumber = 613;
            }

            const isNew = !invoice.id;
            if (isNew) {
                invoice.id = crypto.randomUUID();
                invoice.createdAt = new Date().toISOString();
            }
            invoice.updatedAt = new Date().toISOString();

            // 1. Check if we need to assign a number
            const currentNum = String(invoice.number || '');
            const needsNumber = isNew || currentNum === 'DRAFT' || currentNum.startsWith('INV-');

            if (needsNumber) {
                db.data.lastInvoiceNumber += 1;
                const nextNum = db.data.lastInvoiceNumber;
                invoice.number = String(nextNum);
                invoice.invoiceNumber = String(nextNum); // Legacy support if needed
            }

            const idx = db.data.invoices.findIndex((inv: any) => inv.id === invoice.id);
            if (idx >= 0) {
                db.data.invoices[idx] = invoice;
            } else {
                db.data.invoices.push(invoice);
            }
            await db.write();
            return { success: true, id: invoice.id, number: invoice.number };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });

    // Get All Invoices
    ipcMain.handle('invoice:list', async () => {
        try {
            const db = await getDB();

            // Auto-Check Overdue Status using date strings to avoid timezone issues
            const todayStr = getTodayString();
            let hasUpdates = false;

            db.data.invoices.forEach((inv: any) => {
                if (inv.status === 'issued' && inv.dueDate) {
                    // Extract date portion only (handles both ISO strings and YYYY-MM-DD)
                    const dueDateStr = extractDateString(String(inv.dueDate));

                    // Overdue if today is strictly after the due date (string comparison works for YYYY-MM-DD format)
                    if (isInvoiceOverdue(dueDateStr, todayStr)) {
                        console.log(`[Auto-Overdue] !!! Marking invoice ${inv.number} as OVERDUE !!!`);
                        inv.status = 'overdue';
                        inv.updatedAt = new Date().toISOString();
                        hasUpdates = true;
                    }
                }
            });

            if (hasUpdates) {
                await db.write();
            }

            // Sort DESC
            const sorted = [...db.data.invoices].sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            return { success: true, invoices: sorted };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });

    // Delete Invoice
    ipcMain.handle('invoice:delete', async (_, id: string) => {
        try {
            const db = await getDB();
            const initialLen = db.data.invoices.length;
            db.data.invoices = db.data.invoices.filter((inv: any) => inv.id !== id);
            if (db.data.invoices.length !== initialLen) {
                await db.write();
                return { success: true };
            }
            return { success: false, error: 'Invoice not found' };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });

    // Get Next Invoice Number (Predicted)
    ipcMain.handle('invoice:nextNumber', async () => {
        try {
            const db = await getDB();
            const last = typeof db.data.lastInvoiceNumber === 'number' ? db.data.lastInvoiceNumber : 613;
            return { success: true, nextNumber: last + 1 };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });

    // Generate PDF
    ipcMain.handle('invoice:pdf', async (_, invoice: any) => {
        return await generateInvoicePDF(invoice);
    });

    // Secure PDF Generation (HTML-to-PDF + Encryption)
    ipcMain.handle('invoice:generate-secure', async (_, invoice: any, appUrl?: string) => {
        return await generateSecureInvoicePDF(invoice, appUrl, __dirname);
    });
}
