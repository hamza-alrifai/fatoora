import { ipcMain, dialog, shell } from 'electron';
import fs from 'fs';
import { getDB } from '../db';

export function registerSettingsHandlers() {
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

            // Parse JSON with explicit error handling
            let data;
            try {
                data = JSON.parse(fileContent);
            } catch (parseError) {
                return { success: false, error: 'Invalid JSON in backup file. The file may be corrupted.' };
            }

            // Basic validation
            if (!Array.isArray(data.customers) || !Array.isArray(data.invoices)) {
                return { success: false, error: 'Invalid backup file format: missing customers or invoices array' };
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
}
