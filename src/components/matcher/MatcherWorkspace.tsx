import { Suspense, lazy } from 'react';
import { Loader2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TopBar } from '@/components/layout/TopBar';
import { useMatcherController } from './useMatcherController';

// Lazy load sub-components
const MatcherUploadView = lazy(() => import('./MatcherUploadView'));
const MatcherConfigureView = lazy(() => import('./MatcherConfigureView'));
const MatcherResultsView = lazy(() => import('./MatcherResultsView'));
const InvoiceGenerationDialog = lazy(() => import('./InvoiceGenerationDialog'));
const CustomerCreationDialog = lazy(() => import('@/components/customers/CustomerCreationDialog'));

interface MatcherWorkspaceProps {
    currentStep: 'upload' | 'configure' | 'done';
    onStepChange: (step: 'upload' | 'configure' | 'done') => void;
}

export function MatcherWorkspace({ currentStep, onStepChange }: MatcherWorkspaceProps) {
    // Initialize Controller - The single source of truth for all matcher logic
    const controller = useMatcherController({ onStepChange });

    const {
        state,
        ui,
        actions,
        customers,
        isReady,
        reconciliationResult
    } = controller;

    // Destructure state for easier access in render
    const {
        masterConfig,
        targetConfigs,
        noMatchLabel,
        stats,
        perFileStats,
        fileGenConfigs,
        outputFileHeaders,
        isHydrated,
    } = state;

    // Don't render until state is hydrated from localStorage
    if (!isHydrated) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden">
                <TopBar
                    title={currentStep === 'done' ? 'Reconciliation Complete' : 'Reconciliation'}
                    subtitle={
                        currentStep === 'upload' ? 'Upload your Excel files to get started' :
                            currentStep === 'configure' ? 'Configure column mappings' :
                                'Review results and generate invoices'
                    }
                    icon={FileSpreadsheet}
                    iconColor="from-indigo-500 to-indigo-600"
                    actions={
                        currentStep !== 'upload' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={actions.handleReset}
                                className="gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Start Over
                            </Button>
                        )
                    }
                />

                {/* Invoice Generation Configuration Wizard */}
                {ui.isCustomerDialogOpen && !ui.isCreatingCustomer && (
                    <Suspense fallback={null}>
                        <InvoiceGenerationDialog
                            isOpen={true}
                            onClose={() => ui.setIsCustomerDialogOpen(false)}
                            fileGenConfigs={fileGenConfigs}
                            onUpdateConfig={actions.updateFileConfig}
                            reconciliationResult={reconciliationResult}
                            customers={customers}
                            outputFileHeaders={outputFileHeaders}
                            customerProjections={ui.customerProjections}
                            onCreateCustomer={() => ui.setIsCreatingCustomer(true)}
                            onGenerate={actions.handleConfirmGeneration}
                            isGenerating={ui.isGeneratingInvoices}
                        />
                    </Suspense>
                )}

                {/* Create Customer Dialog */}
                {ui.isCreatingCustomer && (
                    <Suspense fallback={null}>
                        <CustomerCreationDialog
                            isOpen={true}
                            onClose={() => ui.setIsCreatingCustomer(false)}
                            onSave={actions.handleCreateCustomer}
                        />
                    </Suspense>
                )}

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {currentStep === 'upload' && (
                            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                                <MatcherUploadView
                                    masterConfig={masterConfig}
                                    targetConfigs={targetConfigs}
                                    isAnalyzing={ui.isAnalyzing}
                                    handleSelectMaster={actions.handleSelectMaster}
                                    handleSelectTargets={actions.handleSelectTargets}
                                    removeTarget={actions.removeTarget}
                                    onContinue={() => onStepChange('configure')}
                                />
                            </Suspense>
                        )}

                        {currentStep === 'configure' && (
                            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                                <MatcherConfigureView
                                    masterConfig={masterConfig}
                                    targetConfigs={targetConfigs}
                                    noMatchLabel={noMatchLabel}
                                    isProcessing={ui.isProcessing}
                                    isReady={isReady}
                                    customers={customers}
                                    setNoMatchLabel={state.setNoMatchLabel}
                                    setMasterConfig={state.setMasterConfig}
                                    setTargetConfigs={state.setTargetConfigs}
                                    removeTarget={actions.removeTarget}
                                    handleProcess={actions.handleProcess}
                                    onBack={() => onStepChange('upload')}
                                />
                            </Suspense>
                        )}

                        {currentStep === 'done' && (
                            <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                                <MatcherResultsView
                                    stats={stats}
                                    perFileStats={perFileStats}
                                    targetConfigs={targetConfigs}
                                    isGeneratingInvoices={ui.isGeneratingInvoices}
                                    handlePrepareGeneration={actions.handlePrepareGeneration}
                                    handleOpenUnmatched={actions.handleOpenUnmatched}
                                    reconciliationResult={reconciliationResult}
                                />
                            </Suspense>
                        )}
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
