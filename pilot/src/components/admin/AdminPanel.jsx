import React, { useState } from 'react';
import { Shield, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { ADMIN_PASSCODE } from '../../config/constants';
import ScenariosTab from './ScenariosTab';
import PersonasTab from './PersonasTab';

export default function AdminPanel({ store, onClose }) {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('scenarios');
  const [confirmReset, setConfirmReset] = useState(false);

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 space-y-5">
          <div className="flex items-center gap-2 text-slate-900">
            <Shield className="h-6 w-6 text-emerald-600" />
            <h2 className="text-xl font-bold">Admin access</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Enter the admin passcode to edit scenarios and personas. The default
            is <code className="bg-slate-100 px-1.5 py-0.5 rounded">pilot</code>.
            Override with <code className="bg-slate-100 px-1.5 py-0.5 rounded">VITE_ADMIN_PASSCODE</code> in
            {' '}<code>.env.local</code>.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code === ADMIN_PASSCODE) {
                setAuthed(true);
                setError('');
              } else {
                setError('Incorrect passcode.');
              }
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              placeholder="Passcode"
              className="w-full border p-3 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {error && <p className="text-xs text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 text-white rounded text-sm font-semibold hover:bg-emerald-800"
              >
                Enter
              </button>
            </div>
          </form>
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
                Scenarios and personas live in localStorage. Edits persist across reloads.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmReset(true)}
              className="text-xs text-slate-300 hover:text-white inline-flex items-center gap-1.5"
              title="Wipe localStorage and reload defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to seed data
            </button>
            <button
              onClick={onClose}
              className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1.5 ml-3"
            >
              <X className="h-4 w-4" />
              Exit admin
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex border-b mb-4">
          {[
            { key: 'scenarios', label: 'Scenarios' },
            { key: 'personas', label: 'Personas' },
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
              onToggle={store.toggleAgent}
            />
          )}
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 rounded-full">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Reset everything?</h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  This wipes all locally-saved scenarios, personas, and chat
                  transcripts and reloads the defaults. Cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  store.resetAll();
                  setConfirmReset(false);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-semibold hover:bg-rose-700"
              >
                Reset everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
