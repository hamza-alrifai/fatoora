/**
 * TypeScript type definitions for Electron IPC API
 * Replaces all 'any' types with proper interfaces
 */

export interface FileDialogOptions {
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
}

export interface FileDialogResult {
    canceled: boolean;
    filePaths: string[];
}

export interface SaveDialogResult {
    canceled: boolean;
    filePath?: string;
}

export interface ExcelPreviewResult {
    success: boolean;
    data?: any[][];
    rowCount?: number;
    headerRow?: number | null;
    footerStartRow?: number | null;
    suggestedColumn?: number;
    suggestedRowRange?: { start: number; end: number };
    error?: string;
}

export interface FileAnalysisResult {
    success: boolean;
    filePath?: string;
    fileName?: string;
    headers?: Array<{ name: string; index: number }>;
    suggestedIdColumn?: number;
    suggestedMatchLabel?: string;
    suggestedRowRange?: { start: number; end: number };
    error?: string;
}

export interface ProcessExcelOptions {
    masterPath: string;
    targetPaths: string[];
    masterColIndices: number[];
    masterResultColIndex: number;
    targetMatchColIndices: Record<string, number[]>;
    targetMatchStrings: Record<string, string>;
    matchSentence: string;
    noMatchSentence: string;
    outputPath: string;
    masterRowRange?: { start: number; end: number };
    targetRowRanges?: Record<string, { start: number; end: number }>;
}

export interface ProcessExcelResult {
    success: boolean;
    stats?: {
        totalMasterRows: number;
        matchedMasterRows: number;
        unmatchedMasterRows: number;
        matchPercentage: number;
    };
    perFileStats?: Array<{
        fileName: string;
        filePath: string;
        total: number;
        matched: number;
        percentage: number;
    }>;
    matchedRows?: Array<{
        sourceFile: string;
        data: any[];
        rowNumber: number;
    }>;
    unmatchedPath?: string;
    error?: string;
}

export interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    total20mm?: number;
    total10mm?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CustomersResult {
    success: boolean;
    customers?: Customer[];
    error?: string;
}

export interface SaveCustomerResult {
    success: boolean;
    id?: string;
    error?: string;
}

export interface Product {
    id: string;
    name: string;
    type: '10mm' | '20mm' | 'other';
    rate: number;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProductsResult {
    success: boolean;
    products?: Product[];
    error?: string;
}

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export interface Invoice {
    id: string;
    number: string;
    date: string;
    status: 'draft' | 'issued' | 'paid' | 'overdue';
    from: {
        name: string;
        address: string;
        email: string;
        phone: string;
    };
    to: {
        customerId?: string;
        name: string;
        address: string;
        email: string;
        phone: string;
    };
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
}

export interface InvoicesResult {
    success: boolean;
    invoices?: Invoice[];
    error?: string;
}

export interface SaveInvoiceResult {
    success: boolean;
    id?: string;
    number?: string;
    numberField?: number;
    error?: string;
}

export interface DeleteResult {
    success: boolean;
    error?: string;
}

export interface GenerateInvoiceResult {
    success: boolean;
    error?: string;
}

export interface BankingDetails {
    id: string;
    name: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    iban?: string;
    swiftCode?: string;
    isDefault: boolean;
}

export interface BankingDetailsResult {
    success: boolean;
    details?: BankingDetails | null;
    error?: string;
}

export interface BackupResult {
    success: boolean;
    error?: string;
}

export interface ElectronAPI {
    openFileDialog(options: FileDialogOptions): Promise<FileDialogResult>;
    openDirectoryDialog(): Promise<FileDialogResult>;
    saveFileDialog(defaultName: string): Promise<SaveDialogResult>;
    readExcelPreview(filePath: string): Promise<ExcelPreviewResult>;
    analyzeExcelFile(filePath: string): Promise<FileAnalysisResult>;
    processExcelFiles(options: ProcessExcelOptions): Promise<ProcessExcelResult>;
    openFile(filePath: string): Promise<void>;

    // Customer operations
    getCustomers(): Promise<CustomersResult>;
    saveCustomer(customer: Customer): Promise<SaveCustomerResult>;
    deleteCustomer(id: string): Promise<DeleteResult>;

    // Product operations
    getProducts(): Promise<ProductsResult>;
    saveProduct(product: Product): Promise<SaveCustomerResult>;
    deleteProduct(id: string): Promise<DeleteResult>;

    // Invoice operations
    getInvoices(): Promise<InvoicesResult>;
    saveInvoice(invoice: Invoice): Promise<SaveInvoiceResult>;
    deleteInvoice(id: string): Promise<DeleteResult>;
    generateSecureInvoice(invoice: Invoice, appUrl: string): Promise<GenerateInvoiceResult>;

    // Banking details
    getBankingDetails(): Promise<BankingDetailsResult>;
    saveBankingDetails(details: BankingDetails): Promise<SaveCustomerResult>;

    // Backup/Restore
    exportBackup(): Promise<BackupResult>;
    importBackup(): Promise<BackupResult>;
    clearAllData(): Promise<DeleteResult>;

    // Event listeners for background services
    on(channel: string, callback: (...args: any[]) => void): void;
    removeListener(channel: string, callback: (...args: any[]) => void): void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
