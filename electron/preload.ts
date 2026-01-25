import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    openFileDialog: (options: { multiple?: boolean, filters?: any[] }) =>
        ipcRenderer.invoke('dialog:openFile', options),

    readExcelHeaders: (filePath: string) =>
        ipcRenderer.invoke('excel:readHeaders', filePath),

    readExcelPreview: (filePath: string) =>
        ipcRenderer.invoke('excel:readPreview', filePath),

    analyzeExcelFile: (filePath: string) =>
        ipcRenderer.invoke('excel:analyze', filePath),

    processExcelFiles: (options: any) =>
        ipcRenderer.invoke('excel:process', options),

    openFile: (filePath: string) => ipcRenderer.invoke('app:openFile', filePath),
    showInFolder: (filePath: string) => ipcRenderer.invoke('app:showInFolder', filePath),
    saveFileDialog: (defaultPath: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),

    // Invoicing
    saveInvoice: (invoice: any) => ipcRenderer.invoke('invoice:save', invoice),
    getInvoices: () => ipcRenderer.invoke('invoice:list'),
    deleteInvoice: (id: string) => ipcRenderer.invoke('invoice:delete', id),
    generateInvoicePDF: (invoice: any) => ipcRenderer.invoke('invoice:pdf', invoice),
    clearData: () => ipcRenderer.invoke('app:clearData'),
    clearInvoices: () => ipcRenderer.invoke('app:clearInvoices'),
    backupData: () => ipcRenderer.invoke('app:backup'),
    restoreData: () => ipcRenderer.invoke('app:restore'),

    // Customers
    saveCustomer: (customer: any) => ipcRenderer.invoke('customer:save', customer),
    getCustomers: () => ipcRenderer.invoke('customer:list'),
    deleteCustomer: (id: string) => ipcRenderer.invoke('customer:delete', id),

    // Products
    saveProduct: (product: any) => ipcRenderer.invoke('product:save', product),
    getProducts: () => ipcRenderer.invoke('product:list'),
    deleteProduct: (id: string) => ipcRenderer.invoke('product:delete', id),

    // Settings
    saveBankingDetails: (details: any) => ipcRenderer.invoke('settings:saveBanking', details),
    getBankingDetails: () => ipcRenderer.invoke('settings:getBanking'),

    // Reports
    generateExecutiveSummary: (payload: any) => ipcRenderer.invoke('reports:executive-summary', payload),

    // Invoicing Utilities
    getNextInvoiceNumber: () => ipcRenderer.invoke('invoice:nextNumber'),

    // Secure Printing
    generateSecureInvoice: (invoice: any, appUrl?: string) => ipcRenderer.invoke('invoice:generate-secure', invoice, appUrl),
    onInvoiceData: (callback: (event: any, data: any) => void) => ipcRenderer.on('print-data', callback),
    sendPrintReady: () => ipcRenderer.send('print-ready'),
    sendPrintWindowReady: () => ipcRenderer.send('print-window-ready'),
});
