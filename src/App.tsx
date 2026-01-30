import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { MatcherWorkspace } from '@/components/matcher/MatcherWorkspace';
import { InvoiceWorkspace } from '@/components/invoicing/InvoiceWorkspace';
import { CustomerWorkspace } from '@/components/customers/CustomerWorkspace';
import { ProductWorkspace } from '@/components/products/ProductWorkspace';
import { SettingsWorkspace } from '@/components/settings/SettingsWorkspace';
import { InvoicePrintView } from '@/components/invoicing/InvoicePrintView';
import { Dashboard } from '@/components/dashboard/Dashboard';

type Module = 'dashboard' | 'matcher' | 'invoicing' | 'customers' | 'products' | 'settings';
type MatcherStep = 'configure' | 'done';

function App() {
  // Check for print mode - HACK: simple routing
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'print') {
    return <InvoicePrintView />;
  }

  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [matcherStep, setMatcherStep] = useState<MatcherStep>('configure');

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
        {activeModule === 'products' && <ProductWorkspace />}
        {activeModule === 'settings' && <SettingsWorkspace />}
      </AppShell>
    </>
  );
}

export default App;
