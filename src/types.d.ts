// File analysis result from excel:analyze
export interface FileAnalysis {
    success: boolean;
    fileName?: string;
    filePath?: string;
    headers?: Array<{ index: number; name: string }>;
    rowCount?: number;
    dataRowCount?: number;
    headerRowIndex?: number;
    footerStartRow?: number;
    idColumn?: {
        index: number;
        name: string;
        confidence: 'high' | 'medium' | 'low';
    } | null;
    resultColumn?: {
        index: number;
        name: string;
        isNew: boolean;
    };
    suggestedRowRange?: { start: number; end: number };
    suggestedMatchLabel?: string;
    preview?: any[][];
    error?: string;
}

// Invoicing Types
export interface Customer {
    id: string;
    name: string;
    address: string;
    email?: string;
    phone?: string;
    // For 60/40 ratio calculation
    total20mm: number;
    total10mm: number;
    createdAt: string;
    updatedAt: string;
}

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    type?: '20mm' | '10mm' | 'other'; // Added for ratio calculation
}

export interface BusinessDetails {
    name: string;
    address: string;
    email: string;
    phone: string;
    logo?: string;
}

export interface ClientDetails {
    customerId?: string; // Link to verified customer
    name: string;
    address: string;
    email: string;
    phone?: string;
}

export interface Invoice {
    id: string;
    number: string;
    date: string;
    lpoNo?: string;
    lpoDate?: string;
    dueDate?: string;
    commercialOfferRef?: string;
    commercialOfferDate?: string;
    paymentTerms?: string;
    status: 'draft' | 'issued' | 'paid' | 'overdue';
    from: BusinessDetails;
    to: ClientDetails;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BankingDetails {
    beneficiaryName: string;
    beneficiaryBank: string;
    branch: string;
    ibanNo: string;
    swiftCode: string;
}

// Products
export interface Product {
    id: string;
    name: string;
    description?: string;
    rate: number;
    type: '10mm' | '20mm' | 'other';
    createdAt: string;
    updatedAt: string;
}

export interface ElectronAPI {
    // Legacy Excel & File System
    readExcelHeaders: (filePath: string) => Promise<{ success: boolean; headers?: string[]; error?: string }>;

    readExcelPreview: (filePath: string) => Promise<{
        success: boolean;
        data?: any[][];
        rowCount?: number;
        headerRow?: number;
        footerStartRow?: number;
        suggestedColumn?: number;
        suggestedRowRange?: { start: number; end: number };
        error?: string;
    }>;

    analyzeExcelFile: (filePath: string) => Promise<FileAnalysis>;

    processExcelFiles: (options: {
        masterPath: string;
        targetPaths: string[];
        masterColIndices: number[];
        masterResultColIndex: number;
        targetMatchColIndices: Record<string, number[]>;
        targetMatchStrings: Record<string, string>;
        matchSentence: string;
        noMatchSentence: string;
        outputPath?: string;
        masterRowRange?: { start: number; end: number };
        targetRowRanges?: Record<string, { start: number; end: number }>;
    }) => Promise<{
        success: boolean;
        results?: any[];
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
        unmatchedPath?: string;
        warnings?: Array<{
            type: string;
            file: string;
            row: number;
            message: string;
        }>;
        matchedRows?: Array<{
            sourceFile: string;
            data: any[];
            rowNumber: number;
        }>;
        error?: string;
    }>;

    openFile: (filePath: string) => Promise<void>;
    showInFolder: (filePath: string) => Promise<void>;
    saveFileDialog: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>;
    openFileDialog: (options: { multiple?: boolean; filters?: any[] }) => Promise<{ canceled: boolean; filePaths: string[] }>;

    // Invoicing
    saveInvoice: (invoice: Invoice) => Promise<{ success: boolean; id?: string; error?: string }>;
    getInvoices: () => Promise<{ success: boolean; invoices?: Invoice[]; error?: string }>;
    deleteInvoice: (id: string) => Promise<{ success: boolean; error?: string }>;
    generateInvoicePDF: (invoice: Invoice) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    generateSecureInvoice: (invoice: Invoice, appUrl?: string) => Promise<{ success: boolean; error?: string }>;
    onInvoiceData: (callback: (event: any, data: any) => void) => void;
    sendPrintReady: () => void;
    sendPrintWindowReady: () => void;

    // Customers
    saveCustomer: (customer: Customer) => Promise<{ success: boolean; id?: string; error?: string }>;
    getCustomers: () => Promise<{ success: boolean; customers?: Customer[]; error?: string }>;
    deleteCustomer: (id: string) => Promise<{ success: boolean; error?: string }>;
    clearData: () => Promise<{ success: boolean; error?: string }>;
    clearInvoices: () => Promise<{ success: boolean; error?: string }>;
    backupData: () => Promise<{ success: boolean; error?: string }>;
    restoreData: () => Promise<{ success: boolean; error?: string }>;

    // Products
    saveProduct: (product: Product) => Promise<{ success: boolean; id?: string; error?: string }>;
    getProducts: () => Promise<{ success: boolean; products?: Product[]; error?: string }>;
    deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;

    // Settings
    saveBankingDetails: (details: BankingDetails) => Promise<{ success: boolean; error?: string }>;
    getBankingDetails: () => Promise<{ success: boolean; data?: BankingDetails; error?: string }>;

    // Reports
    generateExecutiveSummary: (payload: { data: any[], filename?: string }) => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
