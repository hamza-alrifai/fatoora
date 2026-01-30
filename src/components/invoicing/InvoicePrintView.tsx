import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import headerImg from '@/assets/images/invoice-header.png';
import footerImg from '@/assets/images/invoice-footer.png';

interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

interface InvoiceData {
    number: string;
    invoiceNumber?: string;
    date: string;
    dueDate?: string;
    lpoDate?: string;
    lpoNo?: string;
    commercialOfferRef?: string;
    commercialOfferDate?: string;
    to: {
        name: string;
        phone?: string;
        address?: string;
        email?: string;
    };
    from?: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
    };
    items: InvoiceItem[];
    total: number;
    currency: string;
    notes?: string;
    paymentTerms?: string;
}

import type { BankingDetails } from '@/types';

// ... (interfaces remain same)

export function InvoicePrintView() {
    const [data, setData] = useState<InvoiceData | null>(null);
    const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);

    useEffect(() => {
        // Fetch Banking Details
        if (window.electron && window.electron.getBankingDetails) {
            window.electron.getBankingDetails().then(result => {
                if (result.success && result.data) {
                    setBankingDetails(result.data);
                }
            });
        }

        if (window.electron && (window.electron as any).sendPrintWindowReady) {
            console.log('[PrintView] Sending print-window-ready signal...');
            (window.electron as any).sendPrintWindowReady();
        }

        const handleData = (_: any, invoice: InvoiceData) => {
            console.log('[PrintView] Received invoice data');
            setData(invoice);
            setTimeout(() => {
                console.log('[PrintView] Sending print-ready signal...');
                window.electron.sendPrintReady();
            }, 400);
        };

        if (window.electron && (window.electron as any).onInvoiceData) {
            (window.electron as any).onInvoiceData(handleData);
        }
    }, []);

    // Consolidate items by description + rate
    const consolidatedItems = useMemo(() => {
        if (!data?.items) return [];
        const grouped: Record<string, InvoiceItem> = {};
        data.items.forEach(item => {
            const key = `${item.description}|${item.unitPrice}`;
            if (grouped[key]) {
                grouped[key].quantity += item.quantity;
            } else {
                grouped[key] = { ...item };
            }
        });
        return Object.values(grouped);
    }, [data?.items]);

    if (!data) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                color: '#86868b',
                fontSize: '15px'
            }}>
                Preparing Invoice...
            </div>
        );
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            return format(new Date(dateStr), 'dd/MM/yyyy');
        } catch {
            return dateStr;
        }
    };

    return (
        <div style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
            color: '#1d1d1f',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
        }}>

            {/* Header Image */}
            <div style={{ width: '100%', flexShrink: 0 }}>
                <img src={headerImg} alt="Header" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '24px 40px', display: 'flex', flexDirection: 'column' }}>

                {/* Invoice Details Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px 24px',
                    marginBottom: '24px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e5e5e5'
                }}>
                    {/* Invoice No - Required */}
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                            Invoice No.
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f' }}>
                            {data.number || data.invoiceNumber}
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                            Date
                        </div>
                        <div style={{ fontSize: '13px', color: '#1d1d1f' }}>
                            {formatDate(data.date) || '-'}
                        </div>
                    </div>

                    {/* Due Date */}
                    {data.dueDate && (
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Due Date
                            </div>
                            <div style={{ fontSize: '13px', color: '#1d1d1f' }}>
                                {formatDate(data.dueDate)}
                            </div>
                        </div>
                    )}

                    {/* LPO No */}
                    {data.lpoNo && (
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                LPO No.
                            </div>
                            <div style={{ fontSize: '13px', color: '#1d1d1f' }}>
                                {data.lpoNo}
                            </div>
                        </div>
                    )}

                    {/* LPO Date */}
                    {data.lpoDate && (
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                LPO Date
                            </div>
                            <div style={{ fontSize: '13px', color: '#1d1d1f' }}>
                                {formatDate(data.lpoDate)}
                            </div>
                        </div>
                    )}

                    {/* Commercial Offer Ref */}
                    {data.commercialOfferRef && (
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Commercial Offer Ref
                            </div>
                            <div style={{ fontSize: '13px', color: '#1d1d1f' }}>
                                {data.commercialOfferRef}
                            </div>
                        </div>
                    )}

                    {/* Commercial Offer Date */}
                    {data.commercialOfferDate && (
                        <div>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#86868b', marginBottom: '3px' }}>
                                Commercial Offer Date
                            </div>
                            <div style={{ fontSize: '13px', color: '#1d1d1f' }}>
                                {formatDate(data.commercialOfferDate)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Grid: Banking/Terms (Left) + Customer Details (Right) */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px', marginBottom: '32px' }}>

                    {/* Left: Banking & Terms */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        {/* Payment Terms */}
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '4px' }}>
                                Payment Terms
                            </div>
                            <div style={{ fontSize: '14px', color: '#6e6e73', lineHeight: 1.4 }}>
                                {data.paymentTerms || 'Payment due within 30 days.'}
                            </div>
                        </div>

                        {/* Banking Details - Compact */}
                        {bankingDetails && (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '8px' }}>
                                    Beneficiary Details
                                </div>
                                <div style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
                                    <span style={{ fontWeight: 500, color: '#333' }}>Beneficiary:</span> <span>{bankingDetails.beneficiaryName}</span>
                                    <span style={{ fontWeight: 500, color: '#333' }}>Bank:</span> <span>{bankingDetails.beneficiaryBank}</span>
                                    <span style={{ fontWeight: 500, color: '#333' }}>Branch:</span> <span>{bankingDetails.branch}</span>
                                    <span style={{ fontWeight: 500, color: '#333' }}>IBAN:</span> <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{bankingDetails.ibanNo}</span>
                                    <span style={{ fontWeight: 500, color: '#333' }}>SWIFT:</span> <span style={{ fontFamily: 'monospace', fontSize: '15px' }}>{bankingDetails.swiftCode}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Customer Details */}
                    <div style={{ paddingLeft: '20px', borderLeft: '1px solid #eee' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', marginBottom: '8px' }}>
                            Billed To
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f', marginBottom: '4px' }}>
                            {data.to.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6e6e73', lineHeight: 1.5 }}>
                            {data.to.address && <div>{data.to.address}</div>}
                            {data.to.phone && <div>Tel: {data.to.phone}</div>}
                            {data.to.email && <div>Email: {data.to.email}</div>}
                        </div>
                    </div>
                </div>

                {/* Items Table - No Flex Grow so Total follows immediately */}
                <div style={{ marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f5f5f7' }}>
                                <th style={{
                                    textAlign: 'left',
                                    padding: '10px 8px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: '#86868b',
                                    width: '120px',
                                    borderBottom: '1px solid #d2d2d7'
                                }}>
                                    Description
                                </th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 8px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: '#86868b',
                                    width: '100px',
                                    borderBottom: '1px solid #d2d2d7'
                                }}>
                                    Qty (Tons)
                                </th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 8px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: '#86868b',
                                    width: '60px',
                                    borderBottom: '1px solid #d2d2d7'
                                }}>
                                    Mix %
                                </th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 8px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: '#86868b',
                                    width: '90px',
                                    borderBottom: '1px solid #d2d2d7'
                                }}>
                                    Rate
                                </th>
                                <th style={{
                                    textAlign: 'right',
                                    padding: '10px 8px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    color: '#86868b',
                                    width: '100px',
                                    borderBottom: '1px solid #d2d2d7'
                                }}>
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const totalQty = consolidatedItems.reduce((acc, item) => acc + item.quantity, 0);
                                return consolidatedItems.map((item, i) => (
                                    <tr key={i}>
                                        <td style={{
                                            padding: '10px 8px',
                                            color: '#1d1d1f',
                                            borderBottom: '1px solid #e8e8ed'
                                        }}>
                                            {item.description}
                                        </td>
                                        <td style={{
                                            padding: '10px 8px',
                                            textAlign: 'right',
                                            color: '#6e6e73',
                                            fontVariantNumeric: 'tabular-nums',
                                            borderBottom: '1px solid #e8e8ed'
                                        }}>
                                            {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{
                                            padding: '10px 8px',
                                            textAlign: 'right',
                                            color: '#6e6e73',
                                            fontVariantNumeric: 'tabular-nums',
                                            borderBottom: '1px solid #e8e8ed'
                                        }}>
                                            {totalQty > 0 ? ((item.quantity / totalQty) * 100).toFixed(1) + '%' : '-'}
                                        </td>
                                        <td style={{
                                            padding: '10px 8px',
                                            textAlign: 'right',
                                            color: '#6e6e73',
                                            fontVariantNumeric: 'tabular-nums',
                                            borderBottom: '1px solid #e8e8ed'
                                        }}>
                                            {item.unitPrice.toFixed(2)}
                                        </td>
                                        <td style={{
                                            padding: '10px 8px',
                                            textAlign: 'right',
                                            color: '#1d1d1f',
                                            fontWeight: 500,
                                            fontVariantNumeric: 'tabular-nums',
                                            borderBottom: '1px solid #e8e8ed'
                                        }}>
                                            {(item.quantity * item.unitPrice).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Total Section */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        minWidth: '250px',
                        paddingTop: '12px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline', // Align text baselines
                            gap: '32px' // Add space between label and amount
                        }}>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#86868b'
                            }}>
                                Total Due
                            </span>
                            <span style={{
                                fontSize: '20px',
                                fontWeight: 600,
                                color: '#1d1d1f',
                                letterSpacing: '-0.02em',
                                fontVariantNumeric: 'tabular-nums'
                            }}>
                                <span style={{ fontSize: '12px', color: '#86868b', marginRight: '4px' }}>
                                    {data.currency}
                                </span>
                                {data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>


            </div>

            {/* Footer Image */}
            <div style={{ width: '100%', flexShrink: 0, marginTop: 'auto' }}>
                <img src={footerImg} alt="Footer" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
        </div>
    );
}
