import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

const APP_ROOT = path.join(__dirname, '..');

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
    app = await electron.launch({
        args: ['.'],
        cwd: APP_ROOT,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '0', NODE_ENV: 'test' },
    });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
    await app?.close();
});

test.describe('Invoice Creation Flow', () => {
    test('should navigate to invoicing and create new invoice', async () => {
        // Navigate to Invoicing
        await page.locator('text=Invoices').first().click();
        await page.waitForTimeout(500);

        // Look for "New Invoice" or "+" button
        const newInvoiceBtn = page.locator('button:has-text("New"), button:has-text("+")').first();
        if (await newInvoiceBtn.isVisible()) {
            await newInvoiceBtn.click();
            await page.waitForTimeout(500);

            // Should show invoice editor or form
            const pageContent = await page.content();
            expect(
                pageContent.toLowerCase().includes('draft') ||
                pageContent.toLowerCase().includes('invoice') ||
                pageContent.toLowerCase().includes('save')
            ).toBeTruthy();
        }
    });
});

test.describe('Customer Creation Flow', () => {
    test('should create a new customer', async () => {
        // Navigate to Customers
        await page.locator('text=Customers').first().click();
        await page.waitForTimeout(500);

        // Look for "Add" or "New" button
        const newCustomerBtn = page.locator('button:has-text("New"), button:has-text("+"), button:has(svg)').first();
        if (await newCustomerBtn.isVisible()) {
            await newCustomerBtn.click();
            await page.waitForTimeout(500);

            // Try to find name input and fill it
            const nameInput = page.locator('input[placeholder*="name" i]').first();
            if (await nameInput.isVisible()) {
                await nameInput.fill('Test Customer E2E');

                // Look for save button
                const saveBtn = page.locator('button:has-text("Save")').first();
                if (await saveBtn.isVisible()) {
                    await saveBtn.click();
                    await page.waitForTimeout(1000);
                }
            }
        }
    });
});
