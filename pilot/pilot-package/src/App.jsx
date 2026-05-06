import React, { useState } from 'react';
import { useStore } from './hooks/useStore';
import Dashboard from './components/Dashboard';
import ScenarioView from './components/ScenarioView';
import AdminPanel from './components/admin/AdminPanel';

/**
 * Foundry-backed build of the A731 simulator.
 *
 * No passcode gate; admin access is determined by group membership
 * (`CGSC-Admins`) via a probe call done once at mount in `useStore`.
 */
export default function App() {
  const store = useStore();
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'scenario' | 'admin'
  const [activeScenarioKey, setActiveScenarioKey] = useState(null);

  const openScenario = (key) => {
    setActiveScenarioKey(key);
    setView('scenario');
  };

  const goDashboard = () => {
    setView('dashboard');
    setActiveScenarioKey(null);
  };

  if (store.loadingCatalog || !store.identityChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm font-sans">
        Loading…
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <AdminPanel
        store={store}
        onClose={goDashboard}
      />
    );
  }

  if (view === 'scenario' && activeScenarioKey) {
    return (
      <ScenarioView
        scenarioKey={activeScenarioKey}
        scenario={store.scenarios[activeScenarioKey]}
        agents={store.agents}
        store={store}
        onBackToDashboard={goDashboard}
        onAdminClick={store.isAdmin ? () => setView('admin') : undefined}
      />
    );
  }

  return (
    <Dashboard
      scenarios={store.scenarios}
      agents={store.agents}
      transcripts={store.transcripts}
      onOpenScenario={openScenario}
      onAdminClick={store.isAdmin ? () => setView('admin') : undefined}
    />
  );
}
