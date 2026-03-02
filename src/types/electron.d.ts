/**
 * TypeScript type definitions for Electron IPC API
 * Replaces all 'any' types with proper interfaces
 */

import type {
    Customer,
    Product,
    Invoice,
    InvoiceItem,
    BankingDetails
} from '../types';

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
    suggestedRowRange?: { start: number; end: number };
    error?: string;
}

export interface ProcessExcelOptions {
    masterPath: string;
    targetPaths: string[];
    masterColIndices: number[];
    masterResultColIndex: number;
    masterQuantityColIndex?: number;
    masterDescriptionColIndex?: number;
    targetMatchColIndices: Record<string, number[]>;
    targetMatchStrings: Record<string, string>;
    matchSentence: string;
    noMatchSentence: string;
    outputPath: string;
    masterRowRange?: { start: number; end: number };
    targetRowRanges?: Record<string, { start: number; end: number }>;
}

export interface BackendCustomerStat {
    total10mm: number;
    total20mm: number;
    trips10mm: number;
    trips20mm: number;
    totalQuantity: number;
    items: Array<{ description: string; quantity: number; type: '10mm' | '20mm' | 'other' }>;
}

export interface ProcessExcelResult {
    success: boolean;
    masterResultColIndex?: number;
    customerStats?: Record<string, BackendCustomerStat>;
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

export interface ProductsResult {
    success: boolean;
    products?: Product[];
    error?: string;
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

