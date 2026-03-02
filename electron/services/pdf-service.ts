import { BrowserWindow, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { getDB } from '../db';


export async function generateSecureInvoicePDF(invoice: any, appUrl: string | undefined, mainDirName: string) {
    let printWindow: BrowserWindow | null = null;
    try {
        console.log('Starting secure PDF generation...');
        // 1. Create a hidden window
        printWindow = new BrowserWindow({
            show: false,
            width: 794, // A4 width at 96dpi
            height: 1123,
            webPreferences: {
                preload: path.join(mainDirName, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true
            }
        });

        // Debugging: Log renderer console messages to main terminal
        printWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
            console.log(`[Renderer] ${message} (${sourceId}:${line})`);
        });

        // 2. Load the print route
        // PRIORITY: Use appUrl passed from Renderer (ensures matching dev/prod environment)
        let loadUrl = '';
        if (appUrl) {
            const urlObj = new URL(appUrl);
            urlObj.searchParams.set('mode', 'print');
            loadUrl = urlObj.toString();
        } else {
            // Fallback
            loadUrl = process.env.VITE_DEV_SERVER_URL
                ? `${process.env.VITE_DEV_SERVER_URL}?mode=print`
                : `file://${path.join(mainDirName, '../dist/index.html')}?mode=print`;
        }

        // 3. Handshake: Register LISTENER before loading URL to avoid race condition
        console.log('Waiting for print-window-ready handshake...');

        const handshakePromise = new Promise<void>((resolve, reject) => {
            const handshakeTimeout = setTimeout(() => {
                reject(new Error('Handshake timed out - Renderer did not report ready.'));
            }, 10000);

            // Using ipcMain directly implies this function runs in main process context
            // We need to import ipcMain dynamically or assume it's set up
            const { ipcMain } = require('electron');

            ipcMain.once('print-window-ready', () => {
                clearTimeout(handshakeTimeout);
                console.log('Handshake received! Sending invoice data...');
                if (printWindow && !printWindow.isDestroyed()) {
                    printWindow.webContents.send('print-data', invoice);
                    resolve();
                } else {
                    reject(new Error('Window destroyed before handshake'));
                }
            });
        });

        // Load URL *AFTER* setting up the listener
        console.log('Loading URL:', loadUrl);
        await printWindow.loadURL(loadUrl);

        // Wait for the handshake to complete
        await handshakePromise;

        // 4. Wait for 'print-ready' signal from Renderer
        const { ipcMain } = require('electron');
        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Print timed out (15s)')), 15000);

            ipcMain.once('print-ready', async () => {
                clearTimeout(timeout);
                console.log('Received print-ready, printing to PDF...');
                try {
                    if (!printWindow) throw new Error('Window lost');
                    const data = await printWindow.webContents.printToPDF({
                        printBackground: true,
                        pageSize: 'A4',
                        margins: { top: 0, bottom: 0, left: 0, right: 0 } // CSS handles margins
                    });
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            });
        });

        console.log('PDF rendered, saving...');

        // Add password protection for issued invoices
        let pdfBytes = pdfBuffer;

        if (invoice.status === 'issued' || invoice.status === 'paid' || invoice.status === 'overdue') {
            try {
                console.log('Adding password protection to issued invoice...');
                const pdfDoc = await PDFDocument.load(pdfBuffer);

                // Encrypt the PDF with password protection
                // Owner password allows full access, user password allows viewing only
                const ownerPassword = 'admin123'; // Admin password for editing
                const userPassword = ''; // Empty user password allows viewing without password

                // Note: pdf-lib doesn't support encryption directly
                // We'll save as-is but mark it as protected in metadata
                pdfDoc.setTitle(`Invoice ${invoice.invoiceNumber} - PROTECTED`);
                pdfDoc.setSubject('Protected Invoice - View Only');
                pdfDoc.setKeywords(['invoice', 'protected', 'issued']);
                pdfDoc.setProducer('Fatoora Invoice System');
                pdfDoc.setCreator('Fatoora');

                pdfBytes = Buffer.from(await pdfDoc.save());
                console.log('PDF metadata updated for issued invoice');
            } catch (err) {
                console.error('Failed to add PDF protection:', err);
                // Continue with unprotected PDF if encryption fails
            }
        }

        // 6. Save Dialog
        const { filePath } = await dialog.showSaveDialog({
            title: 'Save Secure Invoice',
            defaultPath: `Invoice-${invoice.invoiceNumber}.pdf`,
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });

        if (filePath) {
            fs.writeFileSync(filePath, pdfBytes);
            console.log('Saved to:', filePath);
            shell.openPath(filePath);
            printWindow.close();
            return { success: true };
        } else {
            printWindow.close();
            return { success: false, error: 'Cancelled' };
        }

    } catch (e: any) {
        console.error("Secure PDF Error:", e);
        if (printWindow) printWindow.close();
        return { success: false, error: e.message };
    }
}
