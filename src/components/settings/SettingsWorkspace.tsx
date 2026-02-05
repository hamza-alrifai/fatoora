import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingState';
import { toast } from 'sonner';
import { Save, Loader2, Building2, Database, Download, Upload, AlertTriangle, Settings } from 'lucide-react';
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
            <div className="h-full flex items-center justify-center">
                <LoadingState label="Loading settings…" />
            </div>
        );
    }

    return (
        <div className="h-full bg-background overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-500/20">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                        <p className="text-sm text-muted-foreground">Manage your application preferences</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Banking Details */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Banking Details</CardTitle>
                                    <p className="text-sm text-muted-foreground">Invoice payment information</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-semibold">Beneficiary Name</label>
                                <Input
                                    value={bankingDetails.beneficiaryName}
                                    onChange={(e) => handleChange('beneficiaryName', e.target.value)}
                                    placeholder="Company Name LLC"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-semibold">Beneficiary Bank</label>
                                    <Input
                                        value={bankingDetails.beneficiaryBank}
                                        onChange={(e) => handleChange('beneficiaryBank', e.target.value)}
                                        placeholder="Bank Name"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-semibold">Branch</label>
                                    <Input
                                        value={bankingDetails.branch}
                                        onChange={(e) => handleChange('branch', e.target.value)}
                                        placeholder="Branch Name"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-semibold">IBAN Number</label>
                                <Input
                                    value={bankingDetails.ibanNo}
                                    onChange={(e) => handleChange('ibanNo', e.target.value)}
                                    placeholder="QA00 0000 0000 0000 0000 0000 000"
                                    className="font-mono"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-semibold">Swift Code</label>
                                <Input
                                    value={bankingDetails.swiftCode}
                                    onChange={(e) => handleChange('swiftCode', e.target.value)}
                                    placeholder="BANKQAXX"
                                    className="font-mono"
                                />
                            </div>
                            <div className="pt-4 flex justify-end">
                                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Management */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <Database className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Data Management</CardTitle>
                                    <p className="text-sm text-muted-foreground">Backup and restore your data</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Create backups of your entire database or restore from a previous backup file.
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handleBackup} className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Export Backup
                                </Button>
                                <Button variant="outline" onClick={handleRestore} className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    Import Backup
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-red-200 bg-red-50/50">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-red-700">Danger Zone</CardTitle>
                                    <p className="text-sm text-red-600/70">Irreversible actions</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/80 border border-red-200">
                                <div>
                                    <h4 className="font-semibold text-red-700">Clear All Data</h4>
                                    <p className="text-sm text-red-600/70">Permanently remove all customers, invoices, and settings</p>
                                </div>
                                <Button variant="destructive" onClick={() => openConfirmDialog('clear')}>
                                    Clear Data
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {confirmDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/40 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold text-destructive mb-2">Are you absolutely sure?</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            This action cannot be undone. This will permanently delete your data.
                        </p>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">
                                    Type <span className="font-bold text-foreground">CONFIRM</span> to proceed
                                </label>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Type CONFIRM"
                                    className="font-mono"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                                <Button
                                    variant="destructive"
                                    disabled={confirmText.toUpperCase() !== 'CONFIRM'}
                                    onClick={handleConfirmAction}
                                >
                                    I understand
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
