/**
 * Pricing calculation utilities
 * Consolidates split pricing and excess charge logic
 */

import type { ProductType } from './product-type-utils';

export interface SplitPricingConfig {
    enabled: boolean;
    threshold: number;
    rate1: number;
    rate2: number;
}

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    type: ProductType;
}

/**
 * Apply split pricing to items based on configuration
 * Splits items at a threshold into two tiers with different rates
 * 
 * @param items - Array of invoice items to process
 * @param splitConfig - Split pricing configuration
 * @param targetType - Product type to apply split to
 * @returns New array with split items
 */
export function applySplitPricing(
    items: InvoiceItem[],
    splitConfig: SplitPricingConfig | undefined,
    targetType: ProductType
): InvoiceItem[] {
    if (!splitConfig || !splitConfig.enabled) {
        return items;
    }

    const { threshold, rate1, rate2 } = splitConfig;
    const resultItems: InvoiceItem[] = [];

    items.forEach(item => {
        if (item.type !== targetType) {
            resultItems.push(item);
            return;
        }

        if (item.quantity <= threshold) {
            resultItems.push({
                ...item,
                unitPrice: rate1,
                amount: Math.round(item.quantity * rate1 * 100) / 100,
            });
        } else {
            const tier1Qty = threshold;
            const tier2Qty = item.quantity - threshold;

            resultItems.push({
                ...item,
                id: crypto.randomUUID(),
                quantity: tier1Qty,
                unitPrice: rate1,
                amount: Math.round(tier1Qty * rate1 * 100) / 100,
            });

            resultItems.push({
                ...item,
                id: crypto.randomUUID(),
                quantity: tier2Qty,
                unitPrice: rate2,
                amount: Math.round(tier2Qty * rate2 * 100) / 100,
                description: `${item.description} (> ${threshold})`,
            });
        }
    });

    return resultItems;
}

/**
 * Apply cumulative split pricing (for invoice generation)
 * Processes items sequentially, tracking remaining tier 1 capacity
 */
export function applyCumulativeSplitPricing(
    items: InvoiceItem[],
    splitConfig: SplitPricingConfig | undefined,
    targetType: ProductType
): InvoiceItem[] {
    if (!splitConfig || !splitConfig.enabled) {
        return items;
    }

    const { threshold, rate1, rate2 } = splitConfig;
    let remainingTier1 = threshold;
    const resultItems: InvoiceItem[] = [];

    items.forEach(item => {
        if (item.type !== targetType) {
            resultItems.push(item);
            return;
        }

        if (remainingTier1 > 0) {
            const tier1Alloc = Math.min(item.quantity, remainingTier1);

            resultItems.push({
                ...item,
                id: crypto.randomUUID(),
                unitPrice: rate1,
                amount: Math.round(tier1Alloc * rate1 * 100) / 100,
                quantity: tier1Alloc,
                description: item.description + ' (Tier 1)',
            });

            remainingTier1 -= tier1Alloc;

            if (item.quantity > tier1Alloc) {
                const tier2Qty = Math.round((item.quantity - tier1Alloc) * 100) / 100;
                resultItems.push({
                    ...item,
                    id: crypto.randomUUID(),
                    unitPrice: rate2,
                    amount: Math.round(tier2Qty * rate2 * 100) / 100,
                    quantity: tier2Qty,
                    description: item.description + ' (Tier 2)',
                });
            }
        } else {
            resultItems.push({
                ...item,
                unitPrice: rate2,
                amount: Math.round(item.quantity * rate2 * 100) / 100,
                description: item.description + ' (Tier 2)',
            });
        }
    });

    return resultItems;
}

/**
 * Calculate excess 10mm charge based on 60/40 ratio rule
 * If cumulative 10mm exceeds 40% of total (10mm + 20mm), excess is charged at special rate
 * 
 * @returns Object with excess quantity and items with excess applied
 */
export function calculateExcess10mm(
    items: InvoiceItem[],
    excessRate: number,
    historicalTotal10mm: number,
    historicalTotal20mm: number
): { excessQuantity: number; items: InvoiceItem[] } {
    if (excessRate <= 0) {
        return { excessQuantity: 0, items };
    }

    const current10 = items.filter(i => i.type === '10mm').reduce((sum, i) => sum + i.quantity, 0);
    const current20 = items.filter(i => i.type === '20mm').reduce((sum, i) => sum + i.quantity, 0);

    const cumulative10 = historicalTotal10mm + current10;
    const cumulative20 = historicalTotal20mm + current20;
    const cumulativeTotal = cumulative10 + cumulative20;

    const allowedCumulative10 = cumulativeTotal * 0.40;
    const cumulativeExcess = Math.max(0, cumulative10 - allowedCumulative10);

    const historicalExcess = Math.max(0, historicalTotal10mm - (historicalTotal10mm + historicalTotal20mm) * 0.40);
    const newExcessQty = Math.max(0, cumulativeExcess - historicalExcess);

    if (newExcessQty <= 0) {
        return { excessQuantity: 0, items };
    }

    const updatedItems = [...items];
    let remainingDeduction = newExcessQty;
    let actuallyDeducted = 0;

    updatedItems
        .filter(i => i.type === '10mm')
        .forEach(item => {
            if (remainingDeduction <= 0) return;

            const deduction = Math.min(item.quantity, remainingDeduction);
            item.quantity = Math.round((item.quantity - deduction) * 100) / 100;
            item.amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
            remainingDeduction = Math.round((remainingDeduction - deduction) * 100) / 100;
            actuallyDeducted = Math.round((actuallyDeducted + deduction) * 100) / 100;
        });

    if (actuallyDeducted > 0.001) {
        updatedItems.push({
            id: crypto.randomUUID(),
            description: 'Excess 10mm Charge (>40%)',
            quantity: Math.round(actuallyDeducted * 100) / 100,
            unitPrice: excessRate,
            amount: Math.round(actuallyDeducted * excessRate * 100) / 100,
            type: '10mm',
        });
    }

    return {
        excessQuantity: actuallyDeducted,
        items: updatedItems.filter(i => i.quantity > 0.001),
    };
}
