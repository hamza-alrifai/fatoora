import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerAllHandlers } from './handlers';
import { startOverdueCheckService, stopOverdueCheckService } from './services/scheduler';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    // Set dock icon on macOS
    if (process.platform === 'darwin') {
        const iconPath = process.env.VITE_DEV_SERVER_URL
            ? path.join(__dirname, '../public/icon.png')
            : path.join(__dirname, '../dist/icon.png');

        if (fs.existsSync(iconPath) && app.dock) {
            const icon = nativeImage.createFromPath(iconPath);
            app.dock.setIcon(icon);
        }
    }

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: process.env.VITE_DEV_SERVER_URL
            ? path.join(__dirname, '../public/icon.png')
            : path.join(__dirname, '../dist/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false, // Wait for ready-to-show to avoid flicker
    });

    const isTestEnv = process.env.NODE_ENV === 'test';
    const shouldUseDevServer = !!process.env.VITE_DEV_SERVER_URL && !isTestEnv;

    if (shouldUseDevServer && process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else if (app.isPackaged || isTestEnv) {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        // In dev mode without explicit dev server, fall back to localhost retry
        const loadDevServer = async (retries = 0) => {
            try {
                await mainWindow?.loadURL('http://localhost:5173');
            } catch (e) {
                if (retries < 20) { // Try for 10 seconds (20 * 500ms)
                    setTimeout(() => loadDevServer(retries + 1), 500);
                } else {
                    mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
                }
            }
        };
        loadDevServer();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow?.maximize();
        mainWindow?.show();
    });
}

// IPC Handlers
registerAllHandlers(() => mainWindow);

app.whenReady().then(() => {
    createWindow();
    startOverdueCheckService(mainWindow);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopOverdueCheckService();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    stopOverdueCheckService();
});
