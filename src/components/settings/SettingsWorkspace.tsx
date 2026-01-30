import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Loader2, Building2, Database, Download, Upload, AlertTriangle } from 'lucide-react';
import type { BankingDetails } from '@/types';

export function SettingsWorkspace() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [bankingDetails, setBankingDetails] = useState<BankingDetails>({
        beneficiaryName: '',
        beneficiaryBank: '',
        branch: '',
        ibanNo: '',
        swiftCode: ''
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const result = await window.electron.getBankingDetails();
            if (result.success && result.data) {
                setBankingDetails(result.data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await window.electron.saveBankingDetails(bankingDetails);
            if (result.success) {
                toast.success('Settings saved successfully');
            } else {
                toast.error(result.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Unexpected error saving settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof BankingDetails, value: string) => {
        setBankingDetails(prev => ({ ...prev, [field]: value }));
    };

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'clear' | 'reset' | null>(null);
    const [confirmText, setConfirmText] = useState('');

    const handleBackup = async () => {
        const result = await window.electron.backupData();
        if (result.success) {
            toast.success('Backup created successfully');
        } else if (result.error !== 'Cancelled') {
            toast.error(result.error || 'Backup failed');
        }
    };

    const handleRestore = async () => {
        const result = await window.electron.restoreData();
        if (result.success) {
            toast.success('Data restored successfully. Please restart the app.');
            // Optionally force reload
            window.location.reload();
        } else if (result.error !== 'Cancelled') {
            toast.error(result.error || 'Restore failed');
        }
    };

    const openConfirmDialog = (action: 'clear' | 'reset') => {
        setConfirmAction(action);
        setConfirmText('');
        setConfirmDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (confirmText.toUpperCase() !== 'CONFIRM') return;

        setConfirmDialogOpen(false);
        let result;

        if (confirmAction === 'clear') {
            // Clear invoices only? Or everything? 
            // "Clear All Data" usually implies customers + invoices + products
            // But main.ts logic for 'app:clearData' clears customers and invoices.
            result = await window.electron.clearData();
        } else if (confirmAction === 'reset') {
            // Factory Reset could mean clearing settings too.
            // For now mapping to clearData. We can add more specific logic if needed.
            result = await window.electron.clearData();
        }

        if (result?.success) {
            toast.success('Action completed successfully');
            loadSettings(); // Reload
        } else {
            toast.error(result?.error || 'Action failed');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-background p-8 overflow-auto">
            <div className="mx-auto w-full max-w-2xl space-y-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your application settings and preferences.
                    </p>
                </div>

                <div className="grid gap-6">
                    {/* Banking Details */}
                    <Card className="p-6 bg-card/40 backdrop-blur-md border-white/5 shadow-sm hover:shadow-md transition-all">
                        <div className="mb-6 flex items-center gap-2 border-b pb-4">
                            <Building2 className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Banking Details</h3>
                        </div>

                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Beneficiary Name</label>
                                <Input
                                    value={bankingDetails.beneficiaryName}
                                    onChange={(e) => handleChange('beneficiaryName', e.target.value)}
                                    placeholder="Company Name LLC"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Beneficiary Bank</label>
                                <Input
                                    value={bankingDetails.beneficiaryBank}
                                    onChange={(e) => handleChange('beneficiaryBank', e.target.value)}
                                    placeholder="Bank Name"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Branch</label>
                                <Input
                                    value={bankingDetails.branch}
                                    onChange={(e) => handleChange('branch', e.target.value)}
                                    placeholder="Branch Name"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">IBAN No</label>
                                <Input
                                    value={bankingDetails.ibanNo}
                                    onChange={(e) => handleChange('ibanNo', e.target.value)}
                                    placeholder="QA00 0000 0000 0000 0000 0000 000"
                                />
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Swift Code</label>
                                <Input
                                    value={bankingDetails.swiftCode}
                                    onChange={(e) => handleChange('swiftCode', e.target.value)}
                                    placeholder="BANKQAXX"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>

                    {/* Data Management */}
                    <Card className="p-6 bg-card/40 backdrop-blur-md border-white/5 shadow-sm hover:shadow-md transition-all">
                        <div className="mb-6 flex items-center gap-2 border-b pb-4">
                            <Database className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Data Management</h3>
                        </div>
                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground">
                                Create backups of your entire database or restore from a previous backup file.
                            </p>
                            <div className="flex gap-4">
                                <Button variant="outline" onClick={handleBackup}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Backup
                                </Button>
                                <Button variant="outline" onClick={handleRestore}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import Backup
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="p-6 border-destructive/30 bg-destructive/5 backdrop-blur-md">
                        <div className="mb-6 flex items-center gap-2 border-b border-destructive/20 pb-4">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <h3 className="font-semibold text-destructive">Danger Zone</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="font-medium">Clear All Data</h4>
                                    <p className="text-sm text-muted-foreground">Permanently remove all customers, invoices, and settings.</p>
                                </div>
                                <Button variant="destructive" onClick={() => openConfirmDialog('clear')}>
                                    Clear Data
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Confirmation Dialog */}
                {confirmDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95">
                            <h3 className="text-lg font-semibold text-destructive mb-2">Are you absolutely sure?</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                This action cannot be undone. This will permanently delete your data.
                            </p>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium uppercase text-muted-foreground">
                                        Type <span className="font-bold text-foreground">CONFIRM</span> to proceed
                                    </label>
                                    <Input
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="Type CONFIRM"
                                        className="font-mono"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                                    <Button
                                        variant="destructive"
                                        disabled={confirmText.toUpperCase() !== 'CONFIRM'}
                                        onClick={handleConfirmAction}
                                    >
                                        I understand the consequences
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
