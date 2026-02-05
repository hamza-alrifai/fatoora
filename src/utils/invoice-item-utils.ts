import type { Invoice } from '@/types';
import { calculateAmount, calculateSubtotal } from './calculations';

export function sanitizeAndConsolidateItems(invoice: Invoice): Invoice {
    // Check if invoice has split pricing or excess items - if so, preserve them
    const hasSplitPricing = invoice.items.some(i => i.id.includes('-split-') || i.description.includes('(Rate'));
    const hasExcess = invoice.items.some(i => i.id.includes('excess') || i.description.toLowerCase().includes('excess'));
    
    // If invoice has special pricing, don't consolidate - just recalculate totals
    if (hasSplitPricing || hasExcess) {
        return recalculateInvoiceTotals(invoice);
    }
    
    // Otherwise, consolidate as before
    const items20mm = invoice.items.filter(i => i.description.toLowerCase().includes('20mm'));
    const items10mm = invoice.items.filter(i => i.description.toLowerCase().includes('10mm'));

    const merged20mm = items20mm.reduce((acc, curr) => ({
        ...acc,
        quantity: acc.quantity + curr.quantity,
        amount: acc.amount + curr.amount
    }), { 
        id: 'fixed-20', 
        description: 'Gabbro 20mm', 
        quantity: 0, 
        unitPrice: items20mm[0]?.unitPrice || 0, 
        amount: 0, 
        type: '20mm' 
    });

    if (merged20mm.quantity > 0 && merged20mm.unitPrice > 0) {
        merged20mm.amount = calculateAmount(merged20mm.quantity, merged20mm.unitPrice);
    }

    const merged10mm = items10mm.reduce((acc, curr) => ({
        ...acc,
        quantity: acc.quantity + curr.quantity,
        amount: acc.amount + curr.amount
    }), { 
        id: 'fixed-10', 
        description: 'Gabbro 10mm', 
        quantity: 0, 
        unitPrice: items10mm[0]?.unitPrice || 0, 
        amount: 0, 
        type: '10mm' 
    });

    if (merged10mm.quantity > 0 && merged10mm.unitPrice > 0) {
        merged10mm.amount = calculateAmount(merged10mm.quantity, merged10mm.unitPrice);
    }

    const cleanList = [merged20mm, merged10mm];

    return recalculateInvoiceTotals({ ...invoice, items: cleanList });
}

export function recalculateInvoiceTotals(invoice: Invoice): Invoice {
    const subtotal = calculateSubtotal(invoice.items);
    return {
        ...invoice,
        subtotal,
        tax: 0,
        total: subtotal
    };
}
