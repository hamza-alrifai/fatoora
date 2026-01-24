// ... (previous imports)
import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
import path from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// ... (existing helper functions and handlers)

// --- INVOICING MODULE ---

const INVOICING_MODULE_STARTED = true;

// --- INVOICING MODULE (LowDB) ---

interface DBData {
    customers: any[];
    invoices: any[];
    products: any[];
}

let dbInstance: any = null;

async function getDB() {
    // Dynamic import for ESM-only package
    // @ts-ignore
    const { JSONFilePreset } = (await import('lowdb/node')) as any;
    const dbPath = path.join(app.getPath('userData'), 'db.json');

    // Always re-initialize to ensure fresh read from disk, or call read()
    // Using JSONFilePreset will read from disk.
    // If we cache dbInstance, we must call dbInstance.read() to get updates from other processes?
    // Electron main process is single threaded, so memory should be consistent.
    // However, let's be safe.

    if (!dbInstance) {
        dbInstance = await JSONFilePreset(dbPath, { customers: [], invoices: [], products: [], bankingDetails: null });

        // ONE-TIME CLEANUP (Deleting old JSON files and folders)
        try {
            const oldCustomersDir = path.join(app.getPath('userData'), 'customers');
            const oldInvoicesDir = path.join(app.getPath('userData'), 'invoices');

            if (fs.existsSync(oldCustomersDir)) {
                fs.rmSync(oldCustomersDir, { recursive: true, force: true });
            }
            if (fs.existsSync(oldInvoicesDir)) {
                fs.rmSync(oldInvoicesDir, { recursive: true, force: true });
            }
        } catch (e) {
            console.error("Cleanup error:", e);
        }
    } else {
        await dbInstance.read();
    }

    return dbInstance;
}

// Handlers

// Save Customer
ipcMain.handle('customer:save', async (_, customer: any) => {
    try {
        const db = await getDB();
        if (!customer.id) {
            customer.id = uuidv4();
            customer.createdAt = new Date().toISOString();
        }
        customer.updatedAt = new Date().toISOString();
        // Ensure ratio fields exist
        customer.total20mm = customer.total20mm || 0;
        customer.total10mm = customer.total10mm || 0;

        const idx = db.data.customers.findIndex((c: any) => c.id === customer.id);
        if (idx >= 0) {
            db.data.customers[idx] = customer;
        } else {
            db.data.customers.push(customer);
        }
        await db.write(); // Persist
        return { success: true, id: customer.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Get All Customers
ipcMain.handle('customer:list', async () => {
    try {
        const db = await getDB();
        return { success: true, customers: db.data.customers };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Delete Customer
ipcMain.handle('customer:delete', async (_, id: string) => {
    try {
        const db = await getDB();
        const initialLen = db.data.customers.length;
        db.data.customers = db.data.customers.filter((c: any) => c.id !== id);
        if (db.data.customers.length !== initialLen) {
            await db.write();
            return { success: true };
        }
        return { success: false, error: 'Customer not found' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Save Invoice
ipcMain.handle('invoice:save', async (_, invoice: any) => {
    try {
        const db = await getDB();
        if (!invoice.id) {
            invoice.id = uuidv4();
            invoice.createdAt = new Date().toISOString();
        }
        invoice.updatedAt = new Date().toISOString();

        const idx = db.data.invoices.findIndex((inv: any) => inv.id === invoice.id);
        if (idx >= 0) {
            db.data.invoices[idx] = invoice;
        } else {
            db.data.invoices.push(invoice);
        }
        await db.write();
        return { success: true, id: invoice.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Get All Invoices
ipcMain.handle('invoice:list', async () => {
    try {
        const db = await getDB();

        // Auto-Check Overdue Status
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Midnight today
        let hasUpdates = false;

        db.data.invoices.forEach((inv: any) => {
            if (inv.status === 'issued' && inv.dueDate) {
                const dueDate = new Date(inv.dueDate);
                // Ensure we compare apples to apples (dates at midnight)
                dueDate.setHours(0, 0, 0, 0);

                // Debug Log
                console.log(`[Check Overdue] Inv: ${inv.number}, Status: ${inv.status}, Due: ${inv.dueDate} (Parsed: ${dueDate.toISOString()}), Now: ${now.toISOString()}`);

                // Overdue if today is strictly after the due date
                if (now.getTime() > dueDate.getTime()) {
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

// Save Product
ipcMain.handle('product:save', async (_, product: any) => {
    try {
        const db = await getDB();
        if (!product.id) {
            product.id = uuidv4();
            product.createdAt = new Date().toISOString();
        }
        product.updatedAt = new Date().toISOString();

        const idx = db.data.products.findIndex((p: any) => p.id === product.id);
        if (idx >= 0) {
            db.data.products[idx] = product;
        } else {
            db.data.products.push(product);
        }
        await db.write();
        return { success: true, id: product.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Get All Products
ipcMain.handle('product:list', async () => {
    try {
        const db = await getDB();
        return { success: true, products: db.data.products || [] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Delete Product
ipcMain.handle('product:delete', async (_, id: string) => {
    try {
        const db = await getDB();
        const initialLen = db.data.products.length;
        db.data.products = db.data.products.filter((p: any) => p.id !== id);
        if (db.data.products.length !== initialLen) {
            await db.write();
            return { success: true };
        }
        return { success: false, error: 'Product not found' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Save Banking Details
ipcMain.handle('settings:saveBanking', async (_, details: any) => {
    try {
        const db = await getDB();
        db.data.bankingDetails = details;
        await db.write();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Get Banking Details
ipcMain.handle('settings:getBanking', async () => {
    try {
        const db = await getDB();
        return { success: true, data: db.data.bankingDetails || null };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Backup Data (Export)
ipcMain.handle('app:backup', async () => {
    try {
        const db = await getDB();
        const data = JSON.stringify(db.data, null, 2);

        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Backup',
            defaultPath: `fatoora-backup-${new Date().toISOString().split('T')[0]}.json`,
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (filePath) {
            fs.writeFileSync(filePath, data);
            return { success: true };
        }
        return { success: false, error: 'Cancelled' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Restore Data (Import)
ipcMain.handle('app:restore', async () => {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'Cancelled' };
        }

        const filePath = result.filePaths[0];
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Basic validation
        if (!Array.isArray(data.customers) || !Array.isArray(data.invoices)) {
            return { success: false, error: 'Invalid backup file format' };
        }

        const db = await getDB();
        db.data = data;
        await db.write();

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Clear Data (Updated to include products if needed, but keeping safe for now)
ipcMain.handle('app:clearData', async () => {
    try {
        const db = await getDB();
        db.data.customers = [];
        db.data.invoices = [];
        // Optional: clear products too? User said "Clear All Data". 
        // Usually product catalog is persistent configuration. Let's keep products for now unless requested.
        await db.write();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Clear Invoices Only (keeps customers, resets their totals)
ipcMain.handle('app:clearInvoices', async () => {
    try {
        const db = await getDB();
        // Clear all invoices
        db.data.invoices = [];
        // Reset customer totals
        db.data.customers = db.data.customers.map((c: any) => ({
            ...c,
            total10mm: 0,
            total20mm: 0
        }));
        await db.write();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

// Generate PDF
ipcMain.handle('invoice:pdf', async (_, invoice: any) => {
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
                normal: path.join(__dirname, '../node_modules/pdfmake/fonts/Roboto-Regular.ttf'),
                bold: path.join(__dirname, '../node_modules/pdfmake/fonts/Roboto-Medium.ttf'),
                italics: path.join(__dirname, '../node_modules/pdfmake/fonts/Roboto-Italic.ttf'),
                bolditalics: path.join(__dirname, '../node_modules/pdfmake/fonts/Roboto-MediumItalic.ttf')
            }
        };

        const printer = new PdfPrinter(fonts);

        // Fetch banking details from DB
        const db = await getDB();
        const banking = db.data.bankingDetails;

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
                            ...(() => {
                                const totalQty = invoice.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
                                const consolidated: Record<string, any> = {};
                                invoice.items.forEach((item: any) => {
                                    const key = `${item.description}|${item.unitPrice}`;
                                    if (consolidated[key]) {
                                        consolidated[key].quantity += item.quantity;
                                    } else {
                                        consolidated[key] = { ...item };
                                    }
                                });

                                return Object.values(consolidated).map((item: any) => [
                                    { text: item.description, style: 'tableCell' },
                                    { text: item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 }), style: 'tableCell', alignment: 'right' },
                                    { text: totalQty > 0 ? ((item.quantity / totalQty) * 100).toFixed(1) + '%' : '-', style: 'tableCell', alignment: 'right' },
                                    { text: item.unitPrice.toFixed(2), style: 'tableCell', alignment: 'right' },
                                    { text: (item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), style: 'tableCell', alignment: 'right' }
                                ]);
                            })()
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
});



// Secure PDF Generation (HTML-to-PDF + Encryption)
ipcMain.handle('invoice:generate-secure', async (_, invoice: any, appUrl?: string) => {
    let printWindow: BrowserWindow | null = null;
    try {
        console.log('Starting secure PDF generation...');
        // 1. Create a hidden window
        printWindow = new BrowserWindow({
            show: false,
            width: 794, // A4 width at 96dpi
            height: 1123,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
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
            // If appUrl contains query params, append &mode=print, else ?mode=print
            // appUrl is usually "http://localhost:5173/" or "file:///.../index.html"
            const urlObj = new URL(appUrl);
            urlObj.searchParams.set('mode', 'print');
            loadUrl = urlObj.toString();
        } else {
            // Fallback
            loadUrl = process.env.VITE_DEV_SERVER_URL
                ? `${process.env.VITE_DEV_SERVER_URL}?mode=print`
                : `file://${path.join(__dirname, '../dist/index.html')}?mode=print`;
        }

        // 3. Handshake: Register LISTENER before loading URL to avoid race condition
        console.log('Waiting for print-window-ready handshake...');

        const handshakePromise = new Promise<void>((resolve, reject) => {
            const handshakeTimeout = setTimeout(() => {
                reject(new Error('Handshake timed out - Renderer did not report ready.'));
            }, 10000);

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

        // Save the PDF directly (pdf-lib encryption API not available)
        const pdfBytes = pdfBuffer;

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
});

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    // Set dock icon on macOS

    if (process.platform === 'darwin') {
        const iconPath = process.env.VITE_DEV_SERVER_URL
            ? path.join(__dirname, '../public/icon.png')
            : path.join(__dirname, '../dist/icon.png');

        if (fs.existsSync(iconPath) && app.dock) {
            const icon = nativeImage.createFromPath(iconPath);
            app.dock.setIcon(icon);
        }
    }

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: process.env.VITE_DEV_SERVER_URL
            ? path.join(__dirname, '../public/icon.png')
            : path.join(__dirname, '../dist/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false, // Wait for ready-to-show to avoid flicker
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        // In dev mode, if env var is missing, try localhost with retry
        if (!app.isPackaged) {
            const loadDevServer = async (retries = 0) => {
                try {
                    await mainWindow?.loadURL('http://localhost:5173');
                } catch (e) {
                    if (retries < 20) { // Try for 10 seconds (20 * 500ms)
                        setTimeout(() => loadDevServer(retries + 1), 500);
                    } else {
                        mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
                    }
                }
            };
            loadDevServer();
        } else {
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.maximize();
        mainWindow?.show();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers

// Open Path
ipcMain.handle('app:openFile', async (_, filePath) => {
    await shell.openPath(filePath);
});

// Show in Folder
ipcMain.handle('app:showInFolder', async (_, filePath) => {
    shell.showItemInFolder(filePath);
});

// Open File Dialog
ipcMain.handle('dialog:openFile', async (_, { multiple = false, filters = [] }) => {
    const result = await dialog.showOpenDialog({
        properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
        filters: filters,
    });
    return result;
});

// Save File Dialog
ipcMain.handle('dialog:saveFile', async (_, defaultPath) => {
    const result = await dialog.showSaveDialog({
        defaultPath,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });
    return result;
});

// Read Headers from Excel
ipcMain.handle('excel:readHeaders', async (_, filePath) => {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Read first row specifically
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
        return { success: true, headers };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Fuzzy column matching patterns (priority-based)
const ID_COLUMN_PATTERNS = [
    { pattern: /qpmc.*ticket/i, priority: 100 },
    { pattern: /ticket.*no/i, priority: 90 },
    { pattern: /ticket.*#/i, priority: 90 },
    { pattern: /ticket\s*number/i, priority: 85 },
    { pattern: /serial.*no/i, priority: 80 },
    { pattern: /reference.*no/i, priority: 75 },
    { pattern: /\bid\b/i, priority: 70 },
    { pattern: /reference/i, priority: 60 },
    { pattern: /invoice.*no/i, priority: 55 },
];

const RESULT_COLUMN_PATTERNS = [
    { pattern: /status/i, priority: 80 },
    { pattern: /result/i, priority: 80 },
    { pattern: /match/i, priority: 70 },
    { pattern: /payment.*status/i, priority: 90 },
];

// Helper: Find column using fuzzy matching with priorities
function findColumnFuzzy(headers: any[], patterns: typeof ID_COLUMN_PATTERNS): { index: number; columnName: string; confidence: number } | null {
    let bestMatch: { index: number; columnName: string; confidence: number } | null = null;

    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (!header) continue;
        const headerStr = String(header).trim();

        for (const { pattern, priority } of patterns) {
            if (pattern.test(headerStr)) {
                if (!bestMatch || priority > bestMatch.confidence) {
                    bestMatch = { index: i, columnName: headerStr, confidence: priority };
                }
                break; // Found a match for this header, move to next
            }
        }
    }

    return bestMatch;
}

// Helper: Find first empty column for result output
function findFirstEmptyColumn(data: any[][]): number {
    if (data.length === 0) return 0;
    const maxCols = Math.max(...data.map(row => row?.length || 0));
    return maxCols; // Return index after last column (new column)
}

// Helper: Generate smart match label from filename
function generateMatchLabel(filePath: string): string {
    const filename = path.basename(filePath, path.extname(filePath));
    // Convert snake_case and kebab-case to spaces
    let label = filename.replace(/[_-]/g, ' ');
    // Remove common prefixes/suffixes
    label = label.replace(/\b(data|file|export|report|sheet)\b/gi, '').trim();
    // Title case
    label = label.replace(/\b\w/g, c => c.toUpperCase());
    // Truncate if too long
    if (label.length > 25) {
        label = label.substring(0, 22) + '...';
    }
    return label || 'Matched';
}

// Helper: Find column index by exact name (case-insensitive) - kept for backward compat
function findColumnByName(sheet: XLSX.WorkSheet, columnName: string): number | null {
    try {
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (data.length === 0) return null;

        const headers = data[0];
        if (!Array.isArray(headers)) return null;

        const normalizedName = columnName.toLowerCase().trim();
        const index = headers.findIndex(header =>
            header && String(header).toLowerCase().trim() === normalizedName
        );

        return index >= 0 ? index : null;
    } catch {
        return null;
    }
}

// NEW: Comprehensive file analysis with smart defaults
ipcMain.handle('excel:analyze', async (_, filePath: string) => {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (data.length === 0) {
            return { success: false, error: 'File is empty' };
        }

        // Find header row
        const headerRowIndex = findHeaderRow(data);
        const headers = data[headerRowIndex] || [];

        // Find footer row
        const footerStartRow = findFooterStartRow(data);

        // Fuzzy match ID column
        const idColumn = findColumnFuzzy(headers, ID_COLUMN_PATTERNS);

        // Fuzzy match existing result column (or suggest new)
        const existingResultColumn = findColumnFuzzy(headers, RESULT_COLUMN_PATTERNS);
        const suggestedResultColumn = existingResultColumn
            ? existingResultColumn.index
            : findFirstEmptyColumn(data);

        // Calculate suggested row range
        const suggestedRowRange = {
            start: headerRowIndex + 2, // 1-indexed, skip header
            end: footerStartRow
        };

        // Generate match label from filename
        const suggestedMatchLabel = generateMatchLabel(filePath);

        // Count actual data rows
        const dataRowCount = Math.max(0, footerStartRow - headerRowIndex - 1);

        return {
            success: true,
            fileName: path.basename(filePath),
            filePath,
            headers: headers.map((h, i) => ({ index: i, name: String(h || `Column ${i + 1}`) })),
            rowCount: data.length,
            dataRowCount,
            headerRowIndex: headerRowIndex + 1, // 1-indexed
            footerStartRow: footerStartRow + 1, // 1-indexed
            idColumn: idColumn ? {
                index: idColumn.index,
                name: idColumn.columnName,
                confidence: idColumn.confidence >= 80 ? 'high' : idColumn.confidence >= 60 ? 'medium' : 'low'
            } : null,
            resultColumn: {
                index: suggestedResultColumn,
                name: existingResultColumn?.columnName || '(New Column)',
                isNew: !existingResultColumn
            },
            suggestedRowRange,
            suggestedMatchLabel,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Read Preview (All rows)
ipcMain.handle('excel:readPreview', async (_, filePath) => {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Read as array of arrays - ALL ROWS
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Auto-detect header row
        const headerRow = findHeaderRow(data);

        // Auto-detect footer start row
        const footerStartRow = findFooterStartRow(data);

        // Auto-detect "QPMC Ticket" column (search in header row)
        const suggestedColumn = findColumnByName(sheet, 'QPMC Ticket');

        // Suggest row range: from header+1 to footer-1 (1-indexed)
        const suggestedRowRange = {
            start: headerRow + 2, // +1 for 1-indexing, +1 to skip header
            end: footerStartRow // Already 1-indexed (length-based)
        };

        return {
            success: true,
            data,
            rowCount: data.length,
            headerRow: headerRow + 1, // Convert to 1-indexed
            footerStartRow: footerStartRow + 1, // Convert to 1-indexed
            suggestedColumn: suggestedColumn !== null ? suggestedColumn : undefined,
            suggestedRowRange
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

interface ProcessOptions {
    masterPath: string;
    targetPaths: string[];
    masterColIndices: number[]; // Changed from single number to array for range support
    masterResultColIndex: number;
    targetMatchColIndices: Record<string, number[]>; // Changed from number to number[] for range support
    targetMatchStrings: Record<string, string>;
    matchSentence: string;
    noMatchSentence: string;
    outputPath?: string;
    masterRowRange?: { start: number; end: number };
    targetRowRanges?: Record<string, { start: number; end: number }>;
}

// Helper: Normalize value for matching (handles numbers, strings, whitespace)
function normalizeValue(val: any): string {
    if (val === undefined || val === null || val === '') return '';
    // Convert to string and trim
    let str = String(val).trim();
    // Remove extra whitespace
    str = str.replace(/\s+/g, ' ');
    // Convert to lowercase for case-insensitive matching
    return str.toLowerCase();
}

// Helper: Find header row (not always row 1!)
function findHeaderRow(data: any[][]): number {
    // Look for row with most non-empty string values and common header keywords
    const keywords = ['qpmc', 'ticket', 'serial', 'date', 'vehicle', 'weight', 'material', 'truck', 'customer'];

    let bestRow = 0;
    let bestScore = 0;

    // Only check first 10 rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (!row) continue;

        let score = 0;
        let nonEmptyCount = 0;

        row.forEach(cell => {
            if (cell && typeof cell === 'string') {
                nonEmptyCount++;
                const cellLower = cell.toLowerCase().trim();
                // Boost score if cell contains header keywords
                if (keywords.some(kw => cellLower.includes(kw))) {
                    score += 10;
                }
            }
        });

        // Add base score for non-empty string cells
        score += nonEmptyCount;

        if (score > bestScore) {
            bestScore = score;
            bestRow = i;
        }
    }

    return bestRow;
}

// Helper: Find footer start row (totals, empty rows at end)
function findFooterStartRow(data: any[][]): number {
    // Look backwards from end for rows with "total", "sum", or mostly empty
    for (let i = data.length - 1; i >= Math.max(0, data.length - 10); i--) {
        const row = data[i];
        if (!row) continue;

        // Check for total/sum keywords
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('total') || rowStr.includes('sum') ||
            rowStr.includes('grand total') || rowStr.includes('subtotal')) {
            return i;
        }

        // Check if row is mostly empty (>80% empty cells)
        const emptyCount = row.filter(c => !c || c === '').length;
        if (row.length > 0 && emptyCount / row.length > 0.8) {
            // This is an empty row, keep looking
            continue;
        }
    }

    return data.length; // No footer found, use end of data
}

// Process Files
ipcMain.handle('excel:process', async (_, options: ProcessOptions) => {
    try {
        const { masterPath, targetPaths, masterColIndices, masterResultColIndex, targetMatchColIndices, targetMatchStrings, noMatchSentence, outputPath, masterRowRange, targetRowRanges } = options;

        // Validation tracking
        const validationWarnings: Array<{ type: string; file: string; row: number; message: string }> = [];
        const masterDuplicates = new Map<string, number[]>(); // key -> row numbers

        // Process Files
        interface MatchedRow {
            sourceFile: string;
            data: any[];
            rowNumber: number;
        }

        const matchedRows: MatchedRow[] = [];

        // ... (existing helper functions if any, but this is inside the handler)

        // STEP 1: Build Master Lookup (what exists in master file)
        // Read with cellNF:true and cellStyles:true to preserve formats (dates, colors)
        const masterWb = XLSX.readFile(masterPath, { cellDates: false, cellNF: true, cellStyles: true });
        const masterSheet = masterWb.Sheets[masterWb.SheetNames[0]];
        const masterData = XLSX.utils.sheet_to_json(masterSheet, { header: 1, raw: true, defval: '' }) as any[][];

        const masterLookup = new Set<string>();

        // Determine row range for master file
        const masterStart = masterRowRange ? masterRowRange.start - 1 : 1; // Convert to 0-indexed, default skip header
        const masterEnd = masterRowRange ? masterRowRange.end : masterData.length;

        // Build lookup from master file (only from selected row range)
        for (let i = masterStart; i < masterEnd && i < masterData.length; i++) {
            const row = masterData[i];
            if (Array.isArray(row)) {
                const masterValues = masterColIndices
                    .map(colIdx => normalizeValue(row[colIdx]))
                    .filter(val => val !== '');

                if (masterValues.length > 0) {
                    const key = masterValues.join('|'); // Use pipe separator

                    // Check for empty QPMC ticket
                    const rawTicket = row[masterColIndices[0]];
                    if (!rawTicket || String(rawTicket).trim() === '') {
                        validationWarnings.push({
                            type: 'empty_ticket',
                            file: 'Master',
                            row: i + 1,
                            message: `Row ${i + 1}: Empty QPMC ticket`
                        });
                    }

                    // Check for format (should be 10 digits)
                    const ticketStr = String(rawTicket).trim();
                    if (ticketStr && !/^\d{10}$/.test(ticketStr)) {
                        validationWarnings.push({
                            type: 'invalid_format',
                            file: 'Master',
                            row: i + 1,
                            message: `Row ${i + 1}: QPMC ticket "${ticketStr}" is not 10 digits`
                        });
                    }

                    // Track duplicates
                    if (masterLookup.has(key)) {
                        if (!masterDuplicates.has(key)) {
                            masterDuplicates.set(key, []);
                        }
                        masterDuplicates.get(key)!.push(i + 1);
                    }

                    masterLookup.add(key);
                }
            }
        }

        // Report duplicates
        masterDuplicates.forEach((rows, key) => {
            validationWarnings.push({
                type: 'duplicate',
                file: 'Master',
                row: rows[0],
                message: `Duplicate QPMC ticket "${key}" found in rows: ${rows.join(', ')}`
            });
        });

        // STEP 2: Process Target Files
        // - Build targetLookup for matched items (to mark in master file)
        // - Collect unmatched rows (target rows NOT in master)
        // - Track per-file statistics
        const targetLookup = new Map<string, Set<string>>();
        const unmatchedRows: any[][] = [];
        let unmatchedHeader: any[] = [];

        // Per-file statistics
        const fileStats = new Map<string, { total: number; matched: number }>();

        for (const targetPath of targetPaths) {
            try {
                const targetMatchColIndices_forFile = targetMatchColIndices[targetPath];
                const matchString = targetMatchStrings[targetPath] || 'Matched';

                if (!targetMatchColIndices_forFile || targetMatchColIndices_forFile.length === 0) {
                    console.warn(`No columns selected for target file: ${targetPath}`);
                    continue;
                }

                const targetWb = XLSX.readFile(targetPath, { cellDates: false, raw: true });
                const targetSheet = targetWb.Sheets[targetWb.SheetNames[0]];
                const targetData = XLSX.utils.sheet_to_json(targetSheet, { header: 1, raw: true, defval: '' }) as any[][];

                // Initialize stats for this file
                fileStats.set(targetPath, { total: 0, matched: 0 });

                // Set up header for unmatched file (only once, from first target file)
                if (unmatchedRows.length === 0 && targetData.length > 0) {
                    unmatchedHeader = [...targetData[0], 'Source File'];
                    unmatchedRows.push(unmatchedHeader);
                }

                // Determine row range for this target file
                const targetRange = targetRowRanges?.[targetPath];
                const targetStart = targetRange ? targetRange.start - 1 : 1; // Convert to 0-indexed, default skip header
                const targetEnd = targetRange ? targetRange.end : targetData.length;

                // Process each row in target file (only within selected range)
                for (let rowIndex = targetStart; rowIndex < targetEnd && rowIndex < targetData.length; rowIndex++) {
                    const row = targetData[rowIndex];
                    if (!Array.isArray(row)) continue;

                    const values = targetMatchColIndices_forFile
                        .map(colIdx => normalizeValue(row[colIdx]))
                        .filter(val => val !== '');

                    if (values.length > 0) {
                        const key = values.join('|'); // Use pipe separator

                        // Validate that this looks like a real data row, not a header/footer/metadata
                        // Skip rows where the QPMC ticket value is:
                        // - Empty or just whitespace
                        // - Common header text (case-insensitive)
                        // - Common footer/summary text
                        const lowerKey = key.toLowerCase();

                        // Check if it looks like a QPMC ticket (10 digits)
                        const looksLikeTicket = /^\d{10}$/.test(key.trim());

                        // Common keywords in footer/summary rows
                        const footerKeywords = [
                            'total', 'sum', 'size', 'qty', 'quantity', 'percentage',
                            'no of trip', 'trip', 'count', 'grand total',
                            '10 mm', '20 mm', '10mm', '20mm', '30 mm', '40 mm',
                            'aggregate', 'average', 'avg', 'subtotal', 'sub-total',
                            'qpmc ticket', 'ticket no', 'serial no', 'readymix',
                            'report', 'supply', 'material', 'vehicle type'
                        ];

                        const isFooterRow = footerKeywords.some(kw => lowerKey.includes(kw));

                        // Skip if: empty, looks like footer, OR doesn't look like a ticket number
                        const isInvalidRow =
                            key.length === 0 ||
                            isFooterRow ||
                            (lowerKey.includes('date') && lowerKey.length < 15) || // Likely a header
                            (!looksLikeTicket && key.length < 8); // Too short to be a real ticket

                        if (isInvalidRow) {
                            // Skip this row - it's likely a header, footer, or metadata
                            continue;
                        }

                        // Count this as a valid data row
                        const stats = fileStats.get(targetPath)!;
                        stats.total++;

                        // Check if this row exists in master
                        if (masterLookup.has(key)) {
                            // Track this match in targetLookup with its matchString
                            if (!targetLookup.has(key)) {
                                targetLookup.set(key, new Set());
                            }
                            targetLookup.get(key)!.add(matchString);
                            stats.matched++;

                            // RECORD MATCHED ROW FOR INVOICING
                            matchedRows.push({
                                sourceFile: targetPath,
                                data: row,
                                rowNumber: rowIndex + 1
                            });

                        } else {
                            // This row is NOT in master, add to unmatched
                            unmatchedRows.push([...row, path.basename(targetPath)]);
                        }
                    }
                }
            } catch (err: any) {
                console.error(`Error reading target ${targetPath}:`, err);
            }
        }

        // STEP 3: Update Master File (IN-PLACE modification to preserve formats)
        let matchCount = 0;

        // Determine range to update
        const updateStart = masterRowRange ? masterRowRange.start - 1 : 1; // 0-indexed
        const updateEnd = masterRowRange ? masterRowRange.end : masterData.length;

        // Update range of the sheet if necessary (if adding a new column)
        if (masterSheet['!ref']) {
            const range = XLSX.utils.decode_range(masterSheet['!ref']);
            if (masterResultColIndex > range.e.c) {
                range.e.c = masterResultColIndex;
                masterSheet['!ref'] = XLSX.utils.encode_range(range);
            }
        }

        // Iterate through rows and update specific cells directly
        for (let i = updateStart; i < updateEnd && i < masterData.length; i++) {
            const row = masterData[i];
            // Skip invalid rows
            if (!Array.isArray(row)) continue;

            const values = masterColIndices
                .map(colIdx => normalizeValue(row[colIdx]))
                .filter(val => val !== '');

            let resultValue = '';

            if (values.length > 0) {
                const key = values.join('|');

                if (targetLookup.has(key)) {
                    const matchStrings = Array.from(targetLookup.get(key)!);
                    resultValue = matchStrings.join(', ');
                    matchCount++;
                } else {
                    if (noMatchSentence) {
                        resultValue = noMatchSentence;
                    }
                }
            }

            // Write to cell if we have a result
            if (resultValue) {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: masterResultColIndex });
                masterSheet[cellRef] = { t: 's', v: resultValue };
            }
        }

        // STEP 4: Save Updated Master File
        let newPath: string;
        if (outputPath) {
            newPath = outputPath;
        } else {
            const dir = path.dirname(masterPath);
            const ext = path.extname(masterPath);
            const name = path.basename(masterPath, ext);
            newPath = path.join(dir, `${name}_updated${ext}`);
        }

        // Write the original workbook (with our surgical edits) back to file
        XLSX.writeFile(masterWb, newPath);

        // STEP 5: Save Unmatched File (TARGET rows NOT in MASTER)
        let unmatchedPath: string | undefined;
        const unmatchedCount = unmatchedRows.length - 1; // Exclude header

        if (unmatchedCount > 0) {
            const dir = path.dirname(masterPath);
            const ext = path.extname(masterPath);
            const name = path.basename(masterPath, ext);
            unmatchedPath = path.join(dir, `${name}_unmatched${ext}`);

            const unmatchedSheet = XLSX.utils.aoa_to_sheet(unmatchedRows);
            const unmatchedWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(unmatchedWb, unmatchedSheet, "Unmatched");
            XLSX.writeFile(unmatchedWb, unmatchedPath);
        }

        // Calculate Stats
        const totalMasterRows = masterData.length - 1; // Exclude header
        const matchedMasterRows = matchCount;
        const unmatchedMasterRows = unmatchedCount; // This is now TARGET rows not in MASTER
        const matchPercentage = totalMasterRows > 0 ? (matchedMasterRows / totalMasterRows) * 100 : 0;


        // Prepare per-file statistics for response
        const perFileStats = Array.from(fileStats.entries()).map(([filePath, stats]) => ({
            fileName: path.basename(filePath),
            filePath,
            total: stats.total,
            matched: stats.matched,
            percentage: stats.total > 0 ? parseFloat(((stats.matched / stats.total) * 100).toFixed(2)) : 0
        }));

        return {
            success: true,
            results: [{
                path: masterPath,
                status: 'success',
                newPath,
                matchCount
            }],
            stats: {
                totalMasterRows,
                matchedMasterRows,
                unmatchedMasterRows,
                matchPercentage: parseFloat(matchPercentage.toFixed(2))
            },
            perFileStats,
            unmatchedPath,
            warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
            matchedRows // Return the matched data
        };

    } catch (error: any) {
        console.error(error);
        return { success: false, error: error.message };
    }
});
