import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import ScenariosTab from './ScenariosTab';
import PersonasTab from './PersonasTab';
import ConversationsTab from './ConversationsTab';

export default function AdminPanel({ store, onClose }) {
  const [tab, setTab] = useState('scenarios');

  if (!store.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Shield className="h-6 w-6 text-rose-600" />
            <h2 className="text-xl font-bold">Not authorized</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Admin access requires membership in the{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded">CGSC-Admins</code>{' '}
            Foundry group. If you should be an admin, ask the platform owner to
            add you.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-700 text-white rounded text-sm font-semibold hover:bg-emerald-800"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-slate-900 text-white shadow-md border-b-4 border-amber-500">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-amber-500" />
            <div>
              <h1 className="text-lg font-bold">Admin</h1>
              <p className="text-xs text-slate-400">
                Persisted to Foundry. Edits apply immediately.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1.5"
          >
            <X className="h-4 w-4" />
            Exit admin
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex border-b mb-4">
          {[
            { key: 'scenarios', label: 'Scenarios' },
            { key: 'personas', label: 'Personas' },
            { key: 'conversations', label: 'Conversations' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border shadow-sm">
          {tab === 'scenarios' && (
            <ScenariosTab
              scenarios={store.scenarios}
              agents={store.agents}
              onUpsert={store.upsertScenario}
              onDelete={store.deleteScenario}
            />
          )}
          {tab === 'personas' && (
            <PersonasTab
              agents={store.agents}
              scenarios={store.scenarios}
              onUpsert={store.upsertAgent}
              onDelete={store.deleteAgent}
              onToggle={store.togglePersonaActive}
            />
          )}
          {tab === 'conversations' && (
            <ConversationsTab
              listAll={store.adminListAllConversations}
              exportAll={store.adminExportConversations}
              deleteOne={store.adminDeleteConversation}
              scenarios={store.scenarios}
              agents={store.agents}
            />
          )}
        </div>
      </div>
    </div>
  );
}
