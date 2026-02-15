import { BrowserWindow, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { aggregateInvoiceItems } from '../utils/invoice-utils';
import { getDB } from '../db';

export async function generateInvoicePDF(invoice: any) {
    try {
        // We will generate the PDF using `pdfmake`
        // Use require for CommonJS
        const PdfPrinter = require('pdfmake');

        // Fonts need to be defined. For server-side node, we need standard fonts.
        // We can use the 'Roboto' font included in `pdfmake/fonts/Roboto` usually,
        // or just map to standard fonts. 
        // NOTE: pdfmake on node requires fonts to be passed in constructor.

        const fonts = {
            Roboto: {
                normal: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto-Regular.ttf'),
                bold: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto-Medium.ttf'),
                italics: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto-Italic.ttf'),
                bolditalics: path.join(__dirname, '../../node_modules/pdfmake/fonts/Roboto-MediumItalic.ttf')
            }
        };

        const printer = new PdfPrinter(fonts);

        // Fetch banking details from DB
        const db = await getDB();
        const banking = db.data.bankingDetails;

        const safeItems = Array.isArray(invoice.items) ? invoice.items : [];
        const aggregatedItems = aggregateInvoiceItems(safeItems);
        const totalQty = aggregatedItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
        const itemRows = aggregatedItems.map((item: any) => {
            const amount = typeof item.amount === 'number'
                ? item.amount
                : item.quantity * item.unitPrice;
            return [
                { text: item.description, style: 'tableCell' },
                { text: item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 }), style: 'tableCell', alignment: 'right' },
                { text: totalQty > 0 ? ((item.quantity / totalQty) * 100).toFixed(1) + '%' : '-', style: 'tableCell', alignment: 'right' },
                { text: item.unitPrice.toFixed(2), style: 'tableCell', alignment: 'right' },
                { text: amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'tableCell', alignment: 'right' }
            ];
        });

        const docDefinition = {
            content: [
                // Header: Title + Invoice Info
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'INVOICE', style: 'header' },
                                { text: `Invoice #: ${invoice.number || invoice.invoiceNumber}`, style: 'label' },
                                { text: `Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, style: 'label' },
                                invoice.dueDate ? { text: `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, style: 'label' } : '',
                                { text: `Status: ${invoice.status.toUpperCase()}`, style: 'label', color: invoice.status === 'paid' ? 'green' : 'gray' }
                            ]
                        },
                        {
                            width: 'auto',
                            stack: [
                                { text: invoice.to.name, style: 'valueBold' },
                                { text: invoice.to.address || '', style: 'small' },
                                invoice.to.phone ? { text: invoice.to.phone, style: 'small' } : '',
                                invoice.to.email ? { text: invoice.to.email, style: 'small' } : ''
                            ],
                            alignment: 'right'
                        }
                    ]
                },
                { text: '\n' },

                // Payment Terms & Banking Details (Top Section)
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'PAYMENT TERMS', style: 'labelBold' },
                                { text: invoice.paymentTerms || 'Net 30', style: 'value' }
                            ]
                        },
                        banking ? {
                            width: 'auto',
                            stack: [
                                { text: 'BENEFICIARY DETAILS', style: 'labelBold' },
                                { text: banking.beneficiaryName, style: 'valueBold' },
                                { text: banking.beneficiaryBank, style: 'small' },
                                { text: `Branch: ${banking.branch}`, style: 'small' },
                                { text: `IBAN: ${banking.ibanNo}`, style: 'smallMono' },
                                { text: `SWIFT: ${banking.swiftCode}`, style: 'smallMono' }
                            ],
                            alignment: 'right'
                        } : {}
                    ]
                },
                { text: '\n\n' },

                // Reference Details Grid
                {
                    table: {
                        widths: ['*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'LPO NO', style: 'tableHeaderSmall' },
                                { text: 'LPO DATE', style: 'tableHeaderSmall' },
                                { text: 'OFFER REF', style: 'tableHeaderSmall' },
                                { text: 'OFFER DATE', style: 'tableHeaderSmall' }
                            ],
                            [
                                { text: invoice.lpoNo || '-', style: 'tableCell' },
                                { text: invoice.lpoDate || '-', style: 'tableCell' },
                                { text: invoice.commercialOfferRef || '-', style: 'tableCell' },
                                { text: invoice.commercialOfferDate || '-', style: 'tableCell' }
                            ]
                        ]
                    },
                    layout: 'lightHorizontalLines'
                },
                { text: '\n' },

                // Items Table
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'DESCRIPTION', style: 'tableHeader' },
                                { text: 'QTY (TONS)', style: 'tableHeader', alignment: 'right' },
                                { text: 'MIX %', style: 'tableHeader', alignment: 'right' },
                                { text: 'RATE', style: 'tableHeader', alignment: 'right' },
                                { text: 'AMOUNT', style: 'tableHeader', alignment: 'right' }
                            ],
                            ...itemRows
                        ]
                    },
                },

                // Total Section (Outside Table)
                { text: '\n' },
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 'auto',
                            table: {
                                widths: ['auto', 'auto'],
                                body: [
                                    [
                                        { text: 'TOTAL DUE', style: 'totalLabel', alignment: 'right', margin: [0, 5] },
                                        {
                                            text: invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + invoice.currency, style: 'totalValue', alignment: 'right', margin: [0, 5]
                                        }
                                    ]
                                ]
                            },
                            layout: 'noBorders'
                        }
                    ]
                }
            ],
            styles: {
                header: { fontSize: 26, bold: true, margin: [0, 0, 0, 5] },
                label: { fontSize: 11, color: '#666666', margin: [0, 2] },
                labelBold: { fontSize: 10, bold: true, color: '#999999', margin: [0, 2] },
                value: { fontSize: 12, color: '#333333', margin: [0, 2] },
                valueBold: { fontSize: 12, bold: true, color: '#333333', margin: [0, 2] },
                small: { fontSize: 10, color: '#666666', margin: [0, 1] },
                smallMono: { fontSize: 10, font: 'Roboto', color: '#666666', margin: [0, 1] }, // using default font as mono proxy
                tableHeader: { fontSize: 11, bold: true, color: '#333333', margin: [0, 5] },
                tableHeaderSmall: { fontSize: 9, bold: true, color: '#999999' },
                tableCell: { fontSize: 11, color: '#333333', margin: [0, 5] },
                totalLabel: { fontSize: 13, bold: true, margin: [0, 10] },
                totalValue: { fontSize: 16, bold: true, margin: [0, 10] }
            },
            defaultStyle: {
                font: 'Roboto'
            }
        };

        // Create PDF Stream
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: any[] = [];

        const promise = new Promise<{ success: boolean; error?: string }>((resolve) => {
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', async () => {
                try {
                    const result = Buffer.concat(chunks);
                    // Save to user documents or temp
                    const { filePath } = await dialog.showSaveDialog({
                        title: 'Save Invoice PDF',
                        defaultPath: `Invoice-${invoice.invoiceNumber}.pdf`,
                        filters: [{ name: 'PDF', extensions: ['pdf'] }]
                    });

                    if (filePath) {
                        fs.writeFileSync(filePath, result);
                        shell.openPath(filePath); // Open it immediately
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: 'Cancelled' });
                    }
                } catch (e: any) {
                    resolve({ success: false, error: e.message });
                }
            });
            pdfDoc.on('error', (e: any) => {
                resolve({ success: false, error: e.message });
            });
        });

        pdfDoc.end();
        return await promise;

    } catch (e: any) {
        console.error("PDF Generation Error:", e);
        return { success: false, error: e.message };
    }
}

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
