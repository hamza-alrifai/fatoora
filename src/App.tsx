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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Default to device setting
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <>
      <Toaster theme={isDarkMode ? "dark" : "light"} position="top-right" />

      <AppShell
        activeTab={activeModule}
        onTabChange={(tabId: string) => setActiveModule(tabId as Module)}
        isDarkMode={isDarkMode}
        onThemeToggle={handleToggleTheme}
      >
        {activeModule === 'dashboard' && <Dashboard />}
        {activeModule === 'matcher' && (
          <MatcherWorkspace
            currentStep={matcherStep}
            onStepChange={setMatcherStep}
          />
        )}
        {activeModule === 'invoicing' && <InvoiceWorkspace />}
        {activeModule === 'customers' && <CustomerWorkspace />}
        {activeModule === 'products' && <ProductWorkspace />}
        {activeModule === 'settings' && <SettingsWorkspace />}
      </AppShell>
    </>
  );
}

export default App;
