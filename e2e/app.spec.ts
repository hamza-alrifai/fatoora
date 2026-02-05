import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

const APP_ROOT = path.join(__dirname, '..');

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
    // Build step runs before Playwright via npm script
    app = await electron.launch({
        args: ['.'],
        cwd: APP_ROOT,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '0',
            NODE_ENV: 'test',
        },
    });

    // Wait for the main window
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
    await app?.close();
});

test.describe('Fatoora App', () => {
    test('should launch with dashboard visible', async () => {
        // Check the app title or main content
        const title = await page.title();
        expect(title).toBeTruthy();

        // Dashboard should be the default view
        const overview = page.locator('text=Overview').first();
        await expect(overview).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Invoicing tab', async () => {
        // Click on Invoicing in the sidebar
        const invoicingTab = page.locator('text=Invoices').first();
        await invoicingTab.click();

        // Should show invoice list or empty state
        await page.waitForTimeout(500);
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).toContain('invoice');
    });

    test('should navigate to Customers tab', async () => {
        const customersTab = page.locator('text=Customers').first();
        await customersTab.click();

        await page.waitForTimeout(500);
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).toContain('customer');
    });

    test('should navigate to Settings tab', async () => {
        const settingsTab = page.locator('text=Settings').first();
        await settingsTab.click();

        await page.waitForTimeout(500);
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).toContain('settings');
    });
});
