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
});
