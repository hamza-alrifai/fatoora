import { ipcMain } from 'electron';
import crypto from 'crypto';
import { getDB } from '../db';

export function registerCustomerHandlers() {
    // Save Customer
    ipcMain.handle('customer:save', async (_, customer: any) => {
        try {
            const db = await getDB();
            if (!customer.id) {
                customer.id = crypto.randomUUID();
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

            // Check for linked invoices before deletion
            const linkedInvoices = db.data.invoices.filter((inv: any) => inv.to?.customerId === id);
            if (linkedInvoices.length > 0) {
                return {
                    success: false,
                    error: `Cannot delete: ${linkedInvoices.length} invoice(s) are linked to this customer. Clear them first or reassign.`
                };
            }

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
}
