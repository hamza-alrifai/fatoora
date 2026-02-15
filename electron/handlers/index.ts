import { BrowserWindow } from 'electron';
import { registerCustomerHandlers } from './customer';
import { registerInvoiceHandlers } from './invoice';
import { registerProductHandlers } from './product';
import { registerSettingsHandlers } from './settings';
import { registerExcelHandlers } from './excel';

export function registerAllHandlers(mainWindowGetter: () => BrowserWindow | null) {
    registerCustomerHandlers();
    registerInvoiceHandlers(mainWindowGetter);
    registerProductHandlers();
    registerSettingsHandlers();
    registerExcelHandlers();
}
