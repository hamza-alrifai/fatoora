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
    error?: string;
}

export interface ElectronAPI {
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
        error?: string;
    }>;

    openFile: (filePath: string) => Promise<void>;
    showInFolder: (filePath: string) => Promise<void>;
    saveFileDialog: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>;
    openFileDialog: (options: { multiple?: boolean; filters?: any[] }) => Promise<{ canceled: boolean; filePaths: string[] }>;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
