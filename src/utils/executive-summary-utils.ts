import type { Customer } from '@/types';
import type { FileGenConfig } from '@/hooks/useMatcherState';
import { detectProductType } from './product-type-utils';
import { parseQuantitySafe } from './quantity-parser';

export interface CustomerSummary {
    name: string;
    total20mm: number;
    total10mm: number;
    totalOther: number;
    totalQty: number;
    ticketCount: number;
    trips10mm: number;
    trips20mm: number;
    percentage10mm: number;
    percentage20mm: number;
    excess10mm: number;
    invoiceNo: string;
}

interface SummaryGenerationParams {
    outputFileHeaders: Array<{ name: string; index: number }>;
    outputFileData: any[][];
    summaryConfig: FileGenConfig;
    fileGenConfigs: Record<string, FileGenConfig>;
    noMatchLabel: string;
    customers: Customer[];
}

export function generateExecutiveSummary(params: SummaryGenerationParams): CustomerSummary[] {
    const { 
        outputFileHeaders, 
        outputFileData, 
        summaryConfig, 
        fileGenConfigs, 
        noMatchLabel, 
        customers 
    } = params;

    const guessColumns = (headers: string[]) => {
        const headersLower = headers.map(h => h.toLowerCase());
        
        const descriptionColIdx = headersLower.findIndex(h => 
            h.includes('description') || h.includes('desc') || h.includes('item')
        );
        
        const quantityColIdx = headersLower.findIndex(h => 
            (h.includes('net') && h.includes('weight')) || 
            h.includes('weight') || 
            h.includes('qty') || 
            h.includes('quantity')
        );
        
        return { descriptionColIdx, quantityColIdx };
    };

    const guessed = guessColumns(outputFileHeaders.map(h => h.name));
    const descCol = summaryConfig.descriptionColIdx !== -1 ? summaryConfig.descriptionColIdx : guessed.descriptionColIdx;
    const qtyCol = summaryConfig.quantityColIdx !== -1 ? summaryConfig.quantityColIdx : guessed.quantityColIdx;

    const groups: Record<string, { items: any[], trips10: number, trips20: number }> = {};
    const dataRows = outputFileData.slice(1);

    dataRows.forEach((row) => {
        const groupName = String(row[summaryConfig.resultColIdx!] || '').trim();

        if (!groupName || groupName.toLowerCase() === 'not matched' || groupName === noMatchLabel) return;

        if (!groups[groupName]) groups[groupName] = { items: [], trips10: 0, trips20: 0 };

        let qty = 0;
        if (qtyCol !== -1 && qtyCol < row.length) {
            qty = parseQuantitySafe(row[qtyCol]);
        }

        const desc = String(row[descCol] || '');
        const fullRow = row.join(' ');
        const type = detectProductType(desc, fullRow) === 'other' ? '10mm' : detectProductType(desc, fullRow);

        if (type === '10mm') groups[groupName].trips10++;
        else groups[groupName].trips20++;

        groups[groupName].items.push({
            type,
            quantity: qty,
            unitPrice: 0,
            amount: 0,
            description: row[descCol]
        });
    });

    const summaryRows: CustomerSummary[] = Object.entries(groups).map(([name, data]) => {
        const items = data.items;
        const config = fileGenConfigs[name];

        const t10Qty = items.filter(i => i.type === '10mm').reduce((s, i) => s + i.quantity, 0);
        const t20Qty = items.filter(i => i.type === '20mm').reduce((s, i) => s + i.quantity, 0);
        const totalQ = t10Qty + t20Qty;

        let hist10 = 0;
        let hist20 = 0;
        if (config?.customerId) {
            const c = customers.find(cust => cust.id === config.customerId);
            if (c) {
                hist10 = c.total10mm || 0;
                hist20 = c.total20mm || 0;
            }
        }

        const cum10 = hist10 + t10Qty;
        const cum20 = hist20 + t20Qty;
        const cumGrand = cum10 + cum20;
        const cumAllowed10 = cumGrand * 0.40;
        const cumExcess = Math.max(0, cum10 - cumAllowed10);
        const histExcess = Math.max(0, hist10 - (hist10 + hist20) * 0.40);
        const excessQty = Math.max(0, cumExcess - histExcess);

        return {
            name,
            total20mm: Math.round(t20Qty * 100) / 100,
            total10mm: Math.round(t10Qty * 100) / 100,
            totalOther: 0,
            totalQty: Math.round(totalQ * 100) / 100,
            ticketCount: data.trips10 + data.trips20,
            trips10mm: data.trips10,
            trips20mm: data.trips20,
            percentage10mm: totalQ > 0 ? Math.round((t10Qty / totalQ) * 1000) / 10 : 0,
            percentage20mm: totalQ > 0 ? Math.round((t20Qty / totalQ) * 1000) / 10 : 0,
            excess10mm: Math.round(excessQty * 100) / 100,
            invoiceNo: 'DRAFT'
        };
    });

    return summaryRows;
}
