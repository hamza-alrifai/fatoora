import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let dbInstance: any = null;

export async function getDB() {
    // Dynamic import for ESM-only package
    // @ts-ignore
    const { JSONFilePreset } = (await import('lowdb/node')) as any;
    const dbPath = path.join(app.getPath('userData'), 'db.json');

    // Always re-initialize to ensure fresh read from disk, or call read()
    // Using JSONFilePreset will read from disk.
    // Electron main process is single threaded, so memory should be consistent.

    if (!dbInstance) {
        dbInstance = await JSONFilePreset(dbPath, {
            customers: [],
            invoices: [],
            products: [],
            bankingDetails: null,
            lastInvoiceNumber: 613 // Start from 613 so next is 614
        });

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

    // Ensure baseline products exist (UI removed, but domain types rely on these)
    if (!Array.isArray(dbInstance.data.products) || dbInstance.data.products.length === 0) {
        dbInstance.data.products = [
            {
                id: crypto.randomUUID(),
                name: '20mm Gabbro',
                description: 'Gabbro aggregate 20mm',
                rate: 0,
                type: '20mm',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: crypto.randomUUID(),
                name: '10mm Gabbro',
                description: 'Gabbro aggregate 10mm',
                rate: 0,
                type: '10mm',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
        ];
        await dbInstance.write();
    }

    return dbInstance;
}
