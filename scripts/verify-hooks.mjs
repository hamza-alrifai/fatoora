import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

console.log('--- Starting Smoke Test for Matcher Hooks ---');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function checkFile(pathRelative) {
    const fullPath = resolve(projectRoot, pathRelative);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ File exists: ${pathRelative}`);
        return true;
    } else {
        console.error(`❌ File MISSING: ${pathRelative}`);
        return false;
    }
}

const filesToCheck = [
    'src/components/matcher/useMatcherController.ts',
    'src/hooks/matcher/useCustomerManagement.ts',
    'src/hooks/matcher/useFileSelection.ts',
    'src/hooks/matcher/useProcessExecution.ts',
    'src/hooks/matcher/useInvoiceGeneration.ts',
    'src/hooks/matcher/useReconciliation.ts',
    'src/components/matcher/MatcherConfigureView.tsx',
    'src/components/matcher/FileConfigurationCard.tsx',
    'src/components/ui/custom-native-select.tsx',
    'src/utils/customer-matching.ts'
];

let allFilesExist = true;
filesToCheck.forEach(f => {
    if (!checkFile(f)) allFilesExist = false;
});

if (!allFilesExist) {
    console.error('Aborting: Critical files missing.');
    process.exit(1);
}

console.log('\n--- Hook structure verification passed ---');
process.exit(0);
