import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import ModuleLayout from './components/ModuleLayout';
import FunctionsModule from './modules/FunctionsModule';
import IntegralsModule from './modules/IntegralsModule';
import MatricesModule from './modules/MatricesModule';
import VectorsModule from './modules/VectorsModule';
import LimitsModule from './modules/LimitsModule';
import TrigonometryModule from './modules/TrigonometryModule';
import ComplexModule from './modules/ComplexModule';
import ProbabilityModule from './modules/ProbabilityModule';
import type { ModuleId } from './types';

type AppState = 'landing' | 'app';
type ActivePage = ModuleId | 'dashboard';

function ModuleContent({ id }: { id: ModuleId }) {
  return (
    <ModuleLayout moduleId={id}>
      {id === 'functions' && <FunctionsModule />}
      {id === 'integrals' && <IntegralsModule />}
      {id === 'matrices' && <MatricesModule />}
      {id === 'vectors' && <VectorsModule />}
      {id === 'limits' && <LimitsModule />}
      {id === 'trigonometry' && <TrigonometryModule />}
      {id === 'complex' && <ComplexModule />}
      {id === 'probability' && <ProbabilityModule />}
    </ModuleLayout>
  );
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [active, setActive] = useState<ActivePage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (appState === 'landing') {
    return (
      <LandingPage
        onEnter={(moduleId) => {
          if (moduleId) setActive(moduleId);
          setAppState('app');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <Sidebar
          active={active}
          onSelect={setActive}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={active} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {active === 'dashboard' ? (
                <Dashboard onNavigate={(id) => setActive(id)} />
              ) : (
                <ModuleContent id={active as ModuleId} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        <header className="glass-bright border-b border-[var(--border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-lg font-bold">
            Math<span style={{ color: '#3B82F6' }}>Space</span>
          </span>
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
            {active === 'dashboard' ? 'Dashboard' : active}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={active} className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {active === 'dashboard' ? (
                <Dashboard onNavigate={(id) => setActive(id)} />
              ) : (
                <ModuleContent id={active as ModuleId} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomNav active={active} onSelect={setActive} />
      </div>
    </div>
  );
}
