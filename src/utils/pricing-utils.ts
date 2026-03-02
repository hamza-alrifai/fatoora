/**
 * Pricing calculation utilities (Non-Destructive Line Item Modifier Architecture)
 * Applies financial rules (split pricing, 40% excess) by calculating adjustments
 * to be appended to an invoice, preserving the raw physical item quantities.
 */

import type { Customer, InvoiceItem } from '../types';

/** Default threshold for excess 10mm penalty (40%) */
const DEFAULT_EXCESS_THRESHOLD = 0.40;

/**
 * Calculates financial modifiers based on defined pricing rules without mutating the base items.
 * Modifiers are returned as standalone InvoiceItems that can be appended to the invoice.
 *
 * @param items - The RAW physical base items matched from Excel
 * @param customer - The customer object containing pricing config and historical volume
 * @returns Array of newly generated surcharge/modifier InvoiceItems
 */
export function calculatePricingModifiers(
    items: InvoiceItem[],
    customer: Customer,
    manualSplits?: Record<string, { splitQty: number; splitRate: number; baseRate: number }>,
    disableExcess?: boolean,
    excessPenaltyRate?: number
): InvoiceItem[] {
    const modifiers: InvoiceItem[] = [];

    // 1. Process Manual Split Pricing Overrides
    if (manualSplits) {
        const splitMods = calculateManualSplitPricingModifiers(items, manualSplits);
        modifiers.push(...splitMods);
    }

    // 2. Process Excess Penalty (automatic for all customers, opt-out per invoice)
    if (!disableExcess) {
        const penaltyRate = excessPenaltyRate ?? customer.excessPricing?.penaltyRate ?? 0;
        const excessMod = calculateExcessPricingModifier(
            items,
            { enabled: true, ratioThreshold: DEFAULT_EXCESS_THRESHOLD, penaltyRate },
            customer.total10mm,
            customer.total20mm
        );
        if (excessMod) modifiers.push(excessMod);
    }

    return modifiers;
}

/**
 * Calculates a split pricing surcharge dynamically per item based on user manual UI inputs.
 * It strictly applies the rate difference mathematically to the specified split quantity,
 * generating discrete Surcharge line items mapped to the original item ID.
 */
function calculateManualSplitPricingModifiers(
    items: InvoiceItem[],
    manualSplits: Record<string, { splitQty: number; splitRate: number; baseRate: number }>
): InvoiceItem[] {
    const modifiers: InvoiceItem[] = [];

    // Safety check - we only generate modifiers for items that exist in our base pass
    items.forEach(item => {
        const manualSplit = manualSplits[item.id!];
        if (manualSplit && manualSplit.splitQty >= 0) {

            // Limit split quantity to the strict maximum physical base quantity
            const safeSplitQty = Math.min(item.quantity, manualSplit.splitQty);
            const amount = Math.round(safeSplitQty * manualSplit.splitRate * 100) / 100;

            modifiers.push({
                id: `${item.id}-split-surcharge`,
                description: `↳ Split`,
                quantity: Math.round(safeSplitQty * 100) / 100,
                unitPrice: manualSplit.splitRate,
                amount: amount,
                type: 'other'
            });
        }
    });

    return modifiers;
}

/**
 * Calculates an excess material penalty if the cumulative ratio (e.g. 10mm)
 * exceeds the allowed ratio limit (e.g. 40% of Total (10mm + 20mm)).
 */
function calculateExcessPricingModifier(
    items: InvoiceItem[],
    config: { enabled: boolean; ratioThreshold: number; penaltyRate: number },
    historicalTotal10mm: number,
    historicalTotal20mm: number
): InvoiceItem | null {
    // 1. Sum up current physical volumes
    const current10 = items.filter(i => i.type === '10mm').reduce((sum, i) => sum + i.quantity, 0);
    const current20 = items.filter(i => i.type === '20mm').reduce((sum, i) => sum + i.quantity, 0);

    // 2. Calculate Cumulative Totals
    const cumulative10 = historicalTotal10mm + current10;
    const cumulative20 = historicalTotal20mm + current20;
    const cumulativeTotal = cumulative10 + cumulative20;

    if (cumulativeTotal === 0) return null;

    // 3. Determine the allowed threshold for 10mm
    const allowedCumulative10 = cumulativeTotal * config.ratioThreshold;
    const cumulativeExcess = Math.max(0, cumulative10 - allowedCumulative10);

    // 4. Calculate what was already penalized historically so we don't double charge
    const historicalTotal = historicalTotal10mm + historicalTotal20mm;
    const allowedHistorical10 = historicalTotal * config.ratioThreshold;
    const historicalExcess = Math.max(0, historicalTotal10mm - allowedHistorical10);

    // 5. The new excess that occurred precisely in this invoice period
    const newExcessQty = Math.max(0, cumulativeExcess - historicalExcess);

    if (newExcessQty <= 0.001) {
        return null;
    }

    const actuallyAllocatedExcess = Math.min(newExcessQty, current10); // Cannot charge more excess than what was physically shipped today

    if (actuallyAllocatedExcess <= 0.001) return null;

    return {
        id: 'excess-10mm-surcharge',
        description: `Excess 10mm Ratio Surcharge (> ${(config.ratioThreshold * 100).toFixed(0)}%)`,
        quantity: Math.round(actuallyAllocatedExcess * 100) / 100,
        unitPrice: config.penaltyRate,
        amount: Math.round(actuallyAllocatedExcess * config.penaltyRate * 100) / 100,
        type: 'other' // Modifiers are 'other', not '10mm', so they don't break subsequent ratio math
    };
}
