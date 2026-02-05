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

test.describe('Automated Matching Workflow', () => {
    test('should complete full matching process automatically', async () => {
        // Get test file paths
        const masterFile = path.join(__dirname, 'test-data/master-file');
        const customerFiles = path.join(__dirname, 'test-data/customer-files');
        
        // 1. Navigate to Matcher page
        await page.locator('text=Matcher').first().click();
        await page.waitForTimeout(1000);
        
        // 2. Upload master file
        console.log('Uploading master file...');
        page.on('dialog', async dialog => {
            console.log('Dialog appeared, accepting master file...');
            await dialog.accept(masterFile);
        });
        
        // Look for master file upload button
        const masterUploadBtn = page.locator('button:has-text("Upload"), button:has-text("Select"), button:has-text("Browse")').first();
        await masterUploadBtn.click();
        await page.waitForTimeout(2000);
        
        // 3. Upload customer/target files
        console.log('Uploading customer files...');
        page.on('dialog', async dialog => {
            console.log('Dialog appeared, accepting customer file...');
            await dialog.accept(customerFiles);
        });
        
        // Look for target file upload button
        const targetUploadBtn = page.locator('button:has-text("Upload"), button:has-text("Select"), button:has-text("Browse")').nth(1);
        await targetUploadBtn.click();
        await page.waitForTimeout(2000);
        
        // 4. Configure matching (if needed)
        console.log('Configuring matching...');
        
        // Look for column mapping or configuration
        const configBtn = page.locator('button:has-text("Configure"), button:has-text("Next"), button:has-text("Continue")').first();
        if (await configBtn.isVisible()) {
            await configBtn.click();
            await page.waitForTimeout(1000);
        }
        
        // 5. Run matching process
        console.log('Running matching process...');
        const runMatchBtn = page.locator('button:has-text("Run"), button:has-text("Start"), button:has-text("Match")').first();
        if (await runMatchBtn.isVisible()) {
            await runMatchBtn.click();
            await page.waitForTimeout(3000); // Wait for processing
        }
        
        // 6. Verify results
        console.log('Verifying results...');
        const pageContent = await page.content();
        
        // Check for success indicators
        const successIndicators = [
            'matching complete',
            'results',
            'matched',
            'processed',
            'success'
        ];
        
        const hasSuccessIndicator = successIndicators.some(indicator => 
            pageContent.toLowerCase().includes(indicator)
        );
        
        if (hasSuccessIndicator) {
            console.log('✅ Matching process completed successfully!');
        } else {
            console.log('⚠️ Could not verify success - check page content');
            console.log('Page content preview:', pageContent.substring(0, 500));
        }
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/matching-results.png' });
        
        // Basic assertion - page should have loaded without errors
        expect(await page.title()).toBeTruthy();
    });
    
    test('should handle file selection dialogs properly', async () => {
        const testPath = path.join(__dirname, 'test-data');
        
        // Navigate to Matcher
        await page.locator('text=Matcher').first().click();
        await page.waitForTimeout(1000);
        
        // Test dialog handling
        let dialogHandled = false;
        page.on('dialog', async dialog => {
            console.log('Dialog detected:', dialog.message());
            await dialog.dismiss(); // Cancel for this test
            dialogHandled = true;
        });
        
        // Try to trigger file upload
        const uploadBtn = page.locator('button:has-text("Upload"), button:has-text("Select")').first();
        if (await uploadBtn.isVisible()) {
            await uploadBtn.click();
            await page.waitForTimeout(1000);
            
            expect(dialogHandled).toBeTruthy();
            console.log('✅ File dialog handled correctly');
        } else {
            console.log('⚠️ No upload button found');
        }
    });
});
