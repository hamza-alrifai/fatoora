
import os

target_file = 'src/components/matcher/MatcherWorkspace.tsx'

with open(target_file, 'r') as f:
    lines = f.readlines()

# Correct Indices (0-based)
# Line 344 (1-based) -> Index 343.
# Line 559 (1-based) -> Index 558.

start_idx = 343
end_idx = 558

# Verify we are cutting the right place
# print(f"Start: {lines[start_idx]}") # Should be "    const handleConfirmGeneration = async () => {\n"
# print(f"End: {lines[end_idx]}")     # Should be "    };\n"

new_content = r"""    const handleConfirmGeneration = async () => {
        // 1. Get configurations
        const outputConfig = fileGenConfigs['output'];
        if (!outputConfig) {
            toast.error("Output file configuration missing.");
            return;
        }

        // 2. Identify selected customers (Create a Map for quick lookup)
        const fileToCustomerMap: Record<string, string> = {};
        let hasSelections = false;

        Object.keys(fileGenConfigs).forEach(pathKey => {
            if (pathKey === 'output') return;

            const config = fileGenConfigs[pathKey];
            if (config && config.customerId) {
                const target = targetConfigs.find(t => t.filePath === pathKey);
                if (target) {
                    const fName = target.fileName || pathKey.split(/[\\/]/).pop() || '';
                    if (fName) {
                        fileToCustomerMap[fName.toLowerCase()] = config.customerId;
                        fileToCustomerMap[pathKey.toLowerCase()] = config.customerId;
                        hasSelections = true;
                    }
                }
            }
        });

        if (!hasSelections && !outputConfig.customerId) {
            toast.error("Please select a customer for at least one target file to map from.");
            return;
        }

        setIsCustomerDialogOpen(false);
        setIsGeneratingInvoices(true);

        try {
            // 3. Prepare Data Structures
            const invoiceItemsByCustomer: Record<string, any[]> = {};
            const customerTotals: Record<string, { t10: number, t20: number }> = {};
            
            // Get Column Indices
            const descIdx = outputConfig.descriptionColIdx ?? 0;
            const qtyIdx = outputConfig.quantityColIdx ?? -1;
            // Default Result Column to the last column if not specified
            const resultIdx = outputConfig.resultColIdx ?? (outputFileHeaders.length > 0 ? outputFileHeaders[outputFileHeaders.length - 1].index : -1);

            if (qtyIdx === -1) {
                toast.warning("Quantity column not selected. Invoice quantities might be 0.");
            }

            // 4. Iterate Output File Rows
            const dataRows = outputFileData.slice(1); // Skip header

            dataRows.forEach((row, idx) => {
                if (!row || row.length === 0) return;

                // A. Determine Customer for this row
                let customerId: string | null = null;
                
                // Read the value in the Result Column
                const matchValue = String(row[resultIdx] || '').trim().toLowerCase();

                if (matchValue && matchValue !== 'not matched') {
                    const knownFiles = Object.keys(fileToCustomerMap);
                    
                    // Priority: Exact match -> Contains
                    let foundFile = knownFiles.find(f => matchValue === f);
                    if (!foundFile) {
                        foundFile = knownFiles.find(f => matchValue.includes(f));
                    }

                    if (foundFile) {
                        customerId = fileToCustomerMap[foundFile];
                    }
                }

                if (!customerId) return;

                // B. Extract Item Data
                const description = String(row[descIdx] || `Item ${idx + 1}`);
                const fullRowText = row.map((cell: any) => String(cell || '').trim()).join(' ').toLowerCase();

                // Rate / Type Logic
                let rate = 0;
                let type: '10mm' | '20mm' | 'other' = 'other';
                const descLower = description.toLowerCase();

                // Find the config for the matched file (to get specific rates)
                let specificConfig = null;
                const targetMatch = targetConfigs.find(t => {
                   const fName = (t.fileName || t.filePath?.split(/[\\/]/).pop() || '').toLowerCase();
                   return fName === matchValue || matchValue.includes(fName!);
                });

                if (targetMatch && targetMatch.filePath && fileGenConfigs[targetMatch.filePath]) {
                    specificConfig = fileGenConfigs[targetMatch.filePath];
                }

                const effectiveRate10 = specificConfig?.rate10 ?? 0;
                const effectiveRate20 = specificConfig?.rate20 ?? 0;

                if (descLower.includes('20mm') || fullRowText.includes('20mm')) {
                    rate = effectiveRate20;
                    type = '20mm';
                } else if (descLower.includes('10mm') || fullRowText.includes('10mm')) {
                    rate = effectiveRate10;
                    type = '10mm';
                }

                // Quantity
                let quantity = 0;
                if (qtyIdx !== -1 && qtyIdx < row.length) {
                    const rawVal = row[qtyIdx];
                    let parsed = 0;
                    if (typeof rawVal === 'number') parsed = rawVal;
                    else if (typeof rawVal === 'string') parsed = parseFloat(rawVal.replace(/[^0-9.]/g, ''));

                    if (!isNaN(parsed) && parsed > 0) quantity = parsed;
                }
                if (quantity > 100000) quantity = 0;

                // C. Add to List
                if (!invoiceItemsByCustomer[customerId]) {
                    invoiceItemsByCustomer[customerId] = [];
                    customerTotals[customerId] = { t10: 0, t20: 0 };
                }

                invoiceItemsByCustomer[customerId].push({
                    id: crypto.randomUUID(),
                    description: description,
                    quantity: quantity,
                    unitPrice: rate,
                    amount: quantity * rate,
                    type: type
                });

                if (type === '10mm') customerTotals[customerId].t10 += quantity;
                if (type === '20mm') customerTotals[customerId].t20 += quantity;
            });

            // 5. Generate Invoices
            let successCount = 0;
            let failCount = 0;

            for (const [custId, items] of Object.entries(invoiceItemsByCustomer)) {
                if (items.length === 0) continue;

                const customer = customers.find(c => c.id === custId);
                if (!customer) continue;

                // Update Customer Totals
                const totals = customerTotals[custId];
                if (totals.t10 > 0 || totals.t20 > 0) {
                     const updatedCustomer = {
                        ...customer,
                        total10mm: (customer.total10mm || 0) + totals.t10,
                        total20mm: (customer.total20mm || 0) + totals.t20,
                    };
                    await window.electron.saveCustomer(updatedCustomer);
                }

                // Create Invoice
                const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
                const tax = subtotal * 0.05;

                const newInvoice = {
                    id: crypto.randomUUID(),
                    number: `INV-${Date.now().toString().slice(-6)}`,
                    date: new Date().toISOString(),
                    status: 'draft',
                    from: {
                        name: 'My Business',
                        address: '123 Business Rd',
                        email: 'billing@example.com',
                        phone: '+1234567890'
                    },
                    to: {
                        customerId: customer.id,
                        name: customer.name,
                        address: customer.address,
                        email: customer.email || ''
                    },
                    items: items,
                    subtotal: subtotal,
                    tax: tax,
                    total: subtotal + tax,
                    currency: 'QAR',
                    notes: `Generated from Matching`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                const result = await window.electron.saveInvoice(newInvoice);
                if (result.success) successCount++;
                else failCount++;
            }

            if (successCount > 0) {
                toast.success(`${successCount} invoice(s) generated successfully!`);
                if (loadCustomers) loadCustomers();
            } else if (failCount > 0) {
                toast.error("Failed to generate invoices.");
            } else {
                toast.info("No matching rows found for the selected customers.");
            }

        } catch (error) {
            console.error(error);
            toast.error("An error occurred during generation.");
        } finally {
            setIsGeneratingInvoices(false);
        }
    };
"""

# Reassemble
combined = lines[:start_idx] + [new_content + "\n"] + lines[end_idx+1:]
# Note: end_idx is inclusive in my logic "StartLine..EndLine", so we skip it.
# lines[end_idx+1] is the line AFTER the closing brace (Line 560).

with open(target_file, 'w') as f:
    f.writelines(combined)
