import React, { useMemo, useState } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  BookOpen,
  Star,
} from 'lucide-react';

const ARCHETYPES = ['', 'loyalist', 'operator', 'stickler', 'partner'];
const ROLES = ['leader', 'subordinate'];

function scenarioOptions(scenarios) {
  return Object.values(scenarios || {})
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map((s) => ({ id: s.id, label: s.title || s.id }));
}

const EMPTY = {
  id: '',
  rank: '',
  name: '',
  type: '',
  active: true,
  initiates: false,
  role: 'subordinate',
  archetype: '',
  lessonId: 'lesson1',
  displayOrder: 1,
  minTurns: 6,
  openingMessage: '',
  briefbackOpening: '',
  directive: '',
  briefbackDirective: '',
  backstory: '',
  winCondition: '',
};

export default function PersonasTab({
  agents,
  scenarios,
  onUpsert,
  onDelete,
  onToggle,
}) {
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(EMPTY);

  const lessonOpts = scenarioOptions(scenarios);

  const filtered = useMemo(() => {
    const f =
      filter === 'all'
        ? agents
        : agents.filter((a) => (a.lessonId || 'lesson1') === filter);
    return [...f].sort((a, b) => {
      if ((a.lessonId || '') !== (b.lessonId || ''))
        return (a.lessonId || '').localeCompare(b.lessonId || '');
      return (a.displayOrder ?? 99) - (b.displayOrder ?? 99);
    });
  }, [agents, filter]);

  const startNew = () => {
    setDraft({
      ...EMPTY,
      id: `persona-${Date.now()}`,
      lessonId: lessonOpts[0]?.id || 'lesson1',
    });
    setEditing('new');
  };

  const startEdit = (agent) => {
    setDraft({ ...EMPTY, ...agent });
    setEditing(agent.id);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(EMPTY);
  };

  const save = () => {
    if (!draft.name.trim() || !draft.id.trim()) return;
    onUpsert(draft);
    cancel();
  };

  return (
    <div>
      <div className="p-5 bg-slate-50 border-b flex justify-between items-center gap-3 flex-wrap">
        <h3 className="font-bold text-slate-800">Personas</h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border bg-white rounded-md px-3 py-2 text-sm outline-none"
          >
            <option value="all">All scenarios</option>
            {lessonOpts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 bg-emerald-700 text-white text-sm px-3 py-2 rounded-md font-semibold hover:bg-emerald-800"
          >
            <UserPlus className="h-4 w-4" />
            Add persona
          </button>
        </div>
      </div>

      {editing && (
        <PersonaEditor
          draft={draft}
          setDraft={setDraft}
          onCancel={cancel}
          onSave={save}
          lessonOpts={lessonOpts}
        />
      )}

      <ul className="divide-y">
        {filtered.map((agent) => {
          const lessonLabel =
            scenarios?.[agent.lessonId || 'lesson1']?.title ||
            agent.lessonId ||
            'lesson1';
          return (
            <li
              key={agent.id}
              className={`p-5 group transition-colors ${
                agent.active === false
                  ? 'bg-slate-50 opacity-60'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-grow">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {agent.role === 'leader' && (
                      <Star className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                    )}
                    <span className="font-bold text-slate-900">
                      {agent.rank} {agent.name}
                    </span>
                    {agent.type && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                        {agent.type}
                      </span>
                    )}
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                      <BookOpen className="h-2.5 w-2.5" />
                      {lessonLabel}
                    </span>
                    {agent.archetype && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">
                        {agent.archetype}
                      </span>
                    )}
                    {agent.initiates && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">
                        Initiates
                      </span>
                    )}
                    {agent.active === false && (
                      <span className="text-[10px] bg-slate-300 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                        Inactive
                      </span>
                    )}
                  </div>
                  {agent.directive && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {agent.directive}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => onToggle(agent.id)}
                    className={`p-2 rounded transition-all ${
                      agent.active === false
                        ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        : 'text-emerald-500 hover:text-slate-500 hover:bg-slate-100'
                    }`}
                    title={agent.active === false ? 'Enable' : 'Disable'}
                  >
                    {agent.active === false ? (
                      <ToggleLeft className="h-5 w-5" />
                    ) : (
                      <ToggleRight className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(agent)}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this persona?'))
                        onDelete(agent.id);
                    }}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
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

function PersonaEditor({ draft, setDraft, onCancel, onSave, lessonOpts }) {
  return (
    <div className="p-5 bg-emerald-50 border-b space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Rank"
          value={draft.rank}
          onChange={(v) => setDraft({ ...draft, rank: v })}
        />
        <Input
          label="Name"
          value={draft.name}
          onChange={(v) => setDraft({ ...draft, name: v })}
        />
        <Input
          label="Type / role label"
          value={draft.type}
          onChange={(v) => setDraft({ ...draft, type: v })}
        />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Scenario
          </label>
          <select
            value={draft.lessonId}
            onChange={(e) => setDraft({ ...draft, lessonId: e.target.value })}
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {lessonOpts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Role
          </label>
          <select
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Archetype
          </label>
          <select
            value={draft.archetype || ''}
            onChange={(e) => setDraft({ ...draft, archetype: e.target.value })}
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {ARCHETYPES.map((a) => (
              <option key={a} value={a}>
                {a || '— none —'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Display order
          </label>
          <input
            type="number"
            value={draft.displayOrder ?? 1}
            onChange={(e) =>
              setDraft({ ...draft, displayOrder: Number(e.target.value) || 0 })
            }
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="ID (do not change unless you know why)"
          value={draft.id}
          onChange={(v) => setDraft({ ...draft, id: v })}
          mono
        />
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Min turns
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={draft.minTurns ?? 6}
            onChange={(e) =>
              setDraft({ ...draft, minTurns: Number(e.target.value) || 6 })
            }
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 py-1">
        <button
          type="button"
          onClick={() => setDraft({ ...draft, initiates: !draft.initiates })}
          className="flex-shrink-0"
        >
          {draft.initiates ? (
            <ToggleRight className="h-6 w-6 text-emerald-600" />
          ) : (
            <ToggleLeft className="h-6 w-6 text-slate-400" />
          )}
        </button>
        <span className="text-sm font-semibold text-slate-700">
          Persona initiates the conversation
        </span>
        <span className="text-[10px] text-slate-500 italic">
          (typically on for leaders, off for subordinates)
        </span>
      </div>

      {draft.initiates && (
        <Field
          label="Opening message (intake)"
          value={draft.openingMessage}
          onChange={(v) => setDraft({ ...draft, openingMessage: v })}
          rows={3}
        />
      )}

      <Field
        label="Directive (system prompt — persona behavior)"
        value={draft.directive}
        onChange={(v) => setDraft({ ...draft, directive: v })}
        rows={6}
      />
      <Field
        label="Backstory (color / humor)"
        value={draft.backstory}
        onChange={(v) => setDraft({ ...draft, backstory: v })}
        rows={3}
      />
      <Field
        label="Win condition (instructor reference)"
        value={draft.winCondition}
        onChange={(v) => setDraft({ ...draft, winCondition: v })}
        rows={3}
      />

      {draft.role === 'leader' && (
        <>
          <Field
            label="Brief-back opening line (used in stage 3)"
            value={draft.briefbackOpening}
            onChange={(v) => setDraft({ ...draft, briefbackOpening: v })}
            rows={2}
          />
          <Field
            label="Brief-back directive (system prompt override in stage 3)"
            value={draft.briefbackDirective}
            onChange={(v) => setDraft({ ...draft, briefbackDirective: v })}
            rows={4}
          />
        </>
      )}

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

function Input({ label, value, onChange, mono }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {label}
      </label>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400 ${
          mono ? 'font-mono' : ''
        }`}
      />
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
