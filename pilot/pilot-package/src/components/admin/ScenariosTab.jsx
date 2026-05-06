import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, BookOpen } from 'lucide-react';

function sortedKeys(scenarios) {
  return Object.values(scenarios || {})
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map((s) => s.scenarioId);
}

const EMPTY = {
  scenarioId: '',
  title: '',
  order: 99,
  description: '',
  objectives: '',
  studentInstructions: '',
  aiContext: '',
};

export default function ScenariosTab({ scenarios, agents, onUpsert, onDelete }) {
  const [editing, setEditing] = useState(null); // scenarioId or 'new'
  const [draft, setDraft] = useState(EMPTY);
  const keys = sortedKeys(scenarios);

  const startNew = () => {
    setDraft({ ...EMPTY, scenarioId: `lesson-${Date.now()}`, order: keys.length });
    setEditing('new');
  };

  const startEdit = (id) => {
    setDraft({ ...EMPTY, ...scenarios[id] });
    setEditing(id);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(EMPTY);
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.scenarioId.trim()) return;
    try {
      await onUpsert(draft);
      cancel();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`Save failed: ${err?.message || 'unknown'}`);
    }
  };

  return (
    <div>
      <div className="p-5 bg-slate-50 border-b flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Scenarios</h3>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-1.5 bg-emerald-700 text-white text-sm px-3 py-2 rounded-md font-semibold hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          Add scenario
        </button>
      </div>

      {editing && (
        <ScenarioEditor
          draft={draft}
          setDraft={setDraft}
          onCancel={cancel}
          onSave={save}
        />
      )}

      <ul className="divide-y">
        {keys.map((key) => {
          const scenario = scenarios[key];
          const personasCount = agents.filter(
            (a) => a.scenarioId === key,
          ).length;
          return (
            <li key={key} className="p-5 group hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-grow">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-bold text-slate-900">
                      {scenario.title}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      {key}
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">
                      {personasCount} personas
                    </span>
                  </div>
                  {scenario.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {scenario.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => startEdit(key)}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Delete "${scenario.title}"? Note: in v0.0.3 there is no backend deleteScenario; this will fail. Use Foundry's ontology UI to delete a scenario.`,
                        )
                      ) {
                        try {
                          await onDelete(key);
                        } catch (err) {
                          // eslint-disable-next-line no-alert
                          alert(err?.message || 'Delete failed');
                        }
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete (not supported in v0.0.3)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ScenarioEditor({ draft, setDraft, onCancel, onSave }) {
  return (
    <div className="p-5 bg-emerald-50 border-b space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Title
          </label>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Order (sort)
          </label>
          <input
            type="number"
            value={draft.order}
            onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) || 0 })}
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">
          Scenario ID (linked to from personas — change with care)
        </label>
        <input
          value={draft.scenarioId}
          onChange={(e) => setDraft({ ...draft, scenarioId: e.target.value })}
          className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
        />
      </div>
      <Field
        label="Description"
        value={draft.description}
        onChange={(v) => setDraft({ ...draft, description: v })}
        rows={3}
      />
      <Field
        label="Objectives"
        value={draft.objectives}
        onChange={(v) => setDraft({ ...draft, objectives: v })}
        rows={4}
      />
      <Field
        label="Student instructions"
        value={draft.studentInstructions}
        onChange={(v) => setDraft({ ...draft, studentInstructions: v })}
        rows={3}
      />
      <Field
        label="AI context (injected into persona prompts)"
        value={draft.aiContext}
        onChange={(v) => setDraft({ ...draft, aiContext: v })}
        rows={4}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 px-4 py-2 border rounded text-sm hover:bg-white"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-700 text-white rounded text-sm font-bold hover:bg-emerald-800"
        >
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, rows = 2 }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400 leading-relaxed"
      />
    </div>
  );
}
