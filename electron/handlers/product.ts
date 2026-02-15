import { ipcMain } from 'electron';
import crypto from 'crypto';
import { getDB } from '../db';

export function registerProductHandlers() {
    // Save Product
    ipcMain.handle('product:save', async (_, product: any) => {
        try {
            const db = await getDB();
            if (!product.id) {
                product.id = crypto.randomUUID();
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
}
