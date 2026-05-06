import React, { useState } from 'react';
import { useStore } from './hooks/useStore';
import Dashboard from './components/Dashboard';
import ScenarioView from './components/ScenarioView';
import AdminPanel from './components/admin/AdminPanel';

/**
 * Pilot stripped-down build of the A731 simulator.
 *
 * No login, no users, no submissions, no grading. Open the app and you land on
 * the scenarios dashboard. Click a scenario to chat through the personas.
 * Click the "Admin" link in the header to edit scenarios and personas.
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

  if (view === 'admin') {
    return <AdminPanel store={store} onClose={goDashboard} />;
  }

  if (view === 'scenario' && activeScenarioKey) {
    return (
      <ScenarioView
        scenarioKey={activeScenarioKey}
        scenario={store.scenarios[activeScenarioKey]}
        scenarios={store.scenarios}
        agents={store.agents}
        store={store}
        onBackToDashboard={goDashboard}
        onAdminClick={() => setView('admin')}
      />
    );
  }

  return (
    <Dashboard
      scenarios={store.scenarios}
      agents={store.agents}
      transcripts={store.transcripts}
      onOpenScenario={openScenario}
      onAdminClick={() => setView('admin')}
    />
  );
}
