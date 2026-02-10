import { useState, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Code splitting: lazy load workspace components
const MatcherWorkspace = lazy(() => import('@/components/matcher/MatcherWorkspace').then(m => ({ default: m.MatcherWorkspace })));
const InvoiceWorkspace = lazy(() => import('@/components/invoicing/InvoiceWorkspace').then(m => ({ default: m.InvoiceWorkspace })));
const CustomerWorkspace = lazy(() => import('@/components/customers/CustomerWorkspace').then(m => ({ default: m.CustomerWorkspace })));
const SettingsWorkspace = lazy(() => import('@/components/settings/SettingsWorkspace').then(m => ({ default: m.SettingsWorkspace })));
const InvoicePrintView = lazy(() => import('@/components/invoicing/InvoicePrintView').then(m => ({ default: m.InvoicePrintView })));
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));

type Module = 'dashboard' | 'matcher' | 'invoicing' | 'customers' | 'settings';
type MatcherStep = 'upload' | 'configure' | 'done';

function App() {
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [matcherStep, setMatcherStep] = useState<MatcherStep>('upload');

  // Check for print mode - HACK: simple routing
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'print') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <InvoicePrintView />
      </Suspense>
    );
  }

  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <Toaster
        theme="light"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "bg-background/80 backdrop-blur-md border-border/50 shadow-xl",
            description: "text-muted-foreground",
            actionButton: "bg-primary text-primary-foreground",
            cancelButton: "bg-muted text-muted-foreground",
          },
        }}
      />

      <AppShell
        activeTab={activeModule}
        onTabChange={(tabId: string) => setActiveModule(tabId as Module)}
      >
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {activeModule === 'dashboard' && <Dashboard />}
            {activeModule === 'matcher' && (
              <MatcherWorkspace
                currentStep={matcherStep}
                onStepChange={setMatcherStep}
              />
            )}
            {activeModule === 'invoicing' && (
              <InvoiceWorkspace
                onNavigate={(mod) => setActiveModule(mod as Module)}
              />
            )}
            {activeModule === 'customers' && <CustomerWorkspace />}
            {activeModule === 'settings' && <SettingsWorkspace />}
          </Suspense>
        </ErrorBoundary>
      </AppShell>
    </>
  );
}

export default App;
