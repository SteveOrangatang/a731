import React, { useState } from 'react';
import {
  UserPlus,
  X,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Trash2,
  BookOpen,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import ResetConfirmDialog from './ResetConfirmDialog';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Ordered list of lesson ids (keyed map → sorted by lesson.order). */
function lessonKeys(lessons) {
  return Object.values(lessons || {})
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((l) => l.id);
}

function lessonLabel(key, lessons) {
  return lessons?.[key]?.title || key;
}

/** Resolve the default lessonId for a new persona — first lesson by order. */
function defaultLessonId(lessons) {
  return lessonKeys(lessons)[0] || 'lesson1';
}

// ─── New Agent Form ──────────────────────────────────────────────────────────
function NewAgentForm({ onSave, onCancel, lessons }) {
  const keys = lessonKeys(lessons);
  const [data, setData] = useState({
    rank: '',
    name: '',
    type: '',
    directive: '',
    backstory: '',
    winCondition: '',
    initiates: false,
    openingMessage: '',
    lessonId: defaultLessonId(lessons),
    minTurns: 10,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.name) return;
    onSave(data);
    onCancel();
  };

  return (
    <div className="p-6 bg-emerald-50 border-b">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="grid grid-cols-3 gap-3">
          <input required placeholder="Rank" value={data.rank}
            onChange={(e) => setData({ ...data, rank: e.target.value })}
            className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          <input required placeholder="Full Name" value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          <input placeholder="Type (instructor reference)" value={data.type}
            onChange={(e) => setData({ ...data, type: e.target.value })}
            className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Lesson</label>
            <select value={data.lessonId}
              onChange={(e) => setData({ ...data, lessonId: e.target.value })}
              className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400">
              {keys.map((k) => (
                <option key={k} value={k}>{lessonLabel(k, lessons)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Minimum turns before resolving
            </label>
            <input type="number" min="1" max="50" value={data.minTurns}
              onChange={(e) => setData({ ...data, minTurns: Number(e.target.value) || 10 })}
              className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>

        <textarea required placeholder="AI Directive (behavior & tone)" value={data.directive}
          onChange={(e) => setData({ ...data, directive: e.target.value })}
          className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
        <textarea placeholder="Backstory & trivia" value={data.backstory}
          onChange={(e) => setData({ ...data, backstory: e.target.value })}
          className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />
        <textarea placeholder="Win condition" value={data.winCondition}
          onChange={(e) => setData({ ...data, winCondition: e.target.value })}
          className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />

        <div className="border-t pt-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" onClick={() => setData({ ...data, initiates: !data.initiates })} className="flex-shrink-0">
              {data.initiates
                ? <ToggleRight className="h-6 w-6 text-emerald-600" />
                : <ToggleLeft className="h-6 w-6 text-slate-400" />}
            </button>
            <span className="text-sm font-semibold text-slate-700">Agent initiates the conversation</span>
            <span className="text-[10px] text-slate-500 italic">
              (recommended OFF for subordinates so the student must engage them)
            </span>
          </label>
          {data.initiates && (
            <textarea required placeholder="Opening message — what the agent says first..."
              value={data.openingMessage}
              onChange={(e) => setData({ ...data, openingMessage: e.target.value })}
              className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
          )}
        </div>

        <button type="submit" className="bg-emerald-700 text-white px-6 py-2 rounded font-bold hover:bg-emerald-800 transition-colors">
          Save Persona
        </button>
      </form>
    </div>
  );
}

// ─── Agent Edit Row ──────────────────────────────────────────────────────────
function AgentEditRow({ agent, onSave, onCancel, lessons }) {
  const keys = lessonKeys(lessons);
  const [ed, setEd] = useState({
    minTurns: 10,
    lessonId: defaultLessonId(lessons),
    ...agent,
  });

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex gap-2">
        <input value={ed.rank} onChange={(e) => setEd({ ...ed, rank: e.target.value })}
          className="w-20 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        <input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })}
          className="flex-grow border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        <input value={ed.type || ''} onChange={(e) => setEd({ ...ed, type: e.target.value })}
          placeholder="Type label"
          className="w-40 border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Assigned Lesson</label>
          <select value={ed.lessonId || defaultLessonId(lessons)}
            onChange={(e) => setEd({ ...ed, lessonId: e.target.value })}
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400">
            {keys.map((k) => (
              <option key={k} value={k}>{lessonLabel(k, lessons)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Min. turns</label>
          <input type="number" min="1" max="50" value={ed.minTurns || 10}
            onChange={(e) => setEd({ ...ed, minTurns: Number(e.target.value) || 10 })}
            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
      </div>

      <textarea value={ed.directive} onChange={(e) => setEd({ ...ed, directive: e.target.value })}
        className="w-full border p-2 rounded text-sm h-28 outline-none focus:ring-2 focus:ring-emerald-400" />
      <textarea value={ed.backstory || ''} onChange={(e) => setEd({ ...ed, backstory: e.target.value })}
        placeholder="Backstory"
        className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />
      <textarea value={ed.winCondition} onChange={(e) => setEd({ ...ed, winCondition: e.target.value })}
        placeholder="Win condition"
        className="w-full border p-2 rounded text-sm h-16 outline-none focus:ring-2 focus:ring-emerald-400" />

      <div className="border-t pt-3 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <button type="button" onClick={() => setEd({ ...ed, initiates: !ed.initiates })} className="flex-shrink-0">
            {ed.initiates
              ? <ToggleRight className="h-6 w-6 text-emerald-600" />
              : <ToggleLeft className="h-6 w-6 text-slate-400" />}
          </button>
          <span className="text-sm font-semibold text-slate-700">Agent initiates the conversation</span>
          <span className="text-[10px] text-slate-500 italic">
            (off for subordinates; on for leaders delivering the order)
          </span>
        </label>
        {ed.initiates && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Opening message</label>
            <textarea value={ed.openingMessage || ''} onChange={(e) => setEd({ ...ed, openingMessage: e.target.value })}
              className="w-full border p-2 rounded text-sm h-24 outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-1.5 border rounded text-sm hover:bg-slate-50">Cancel</button>
        <button onClick={() => { onSave(ed); onCancel(); }}
          className="px-4 py-1.5 bg-emerald-700 text-white rounded text-sm font-bold hover:bg-emerald-800">
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─── Main PersonasTab ────────────────────────────────────────────────────────
export default function PersonasTab({
  agents,
  lessons,
  onToggle,
  onDelete,
  onCreate,
  onUpdate,
  onResetToSeed,
}) {
  const [isAdding, setIsAdding]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter]       = useState('all');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState('');

  const keys = lessonKeys(lessons);
  const fallbackLessonId = defaultLessonId(lessons);

  const filtered =
    filter === 'all'
      ? agents
      : agents.filter((a) => (a.lessonId || fallbackLessonId) === filter);

  return (
    <div className="divide-y">
      <div className="p-6 bg-slate-50 border-b flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-slate-800">Managed AI Personas</h3>
          {resetStatus && (
            <span className="text-[11px] text-emerald-700 font-semibold">
              {resetStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onResetToSeed && (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 bg-white border text-slate-700 px-3 py-2 rounded-md text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              title="Wipe persona docs not in the seed and overwrite the rest from initialAgents.js"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {resetting ? 'Resetting…' : 'Reset to seed'}
            </button>
          )}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border bg-white rounded-md px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Lessons</option>
            {keys.map((k) => (
              <option key={k} value={k}>{lessonLabel(k, lessons)}</option>
            ))}
          </select>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              isAdding
                ? 'bg-slate-200 text-slate-700'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
          >
            {isAdding ? <X className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            {isAdding ? 'Cancel' : 'Create New Persona'}
          </button>
        </div>
      </div>

      {isAdding && (
        <NewAgentForm
          onSave={onCreate}
          onCancel={() => setIsAdding(false)}
          lessons={lessons}
        />
      )}

      {filtered.map((agent) => (
        <div
          key={agent.id}
          className={`p-6 group transition-colors ${
            agent.active === false ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'
          }`}
        >
          {editingId === agent.id ? (
            <AgentEditRow
              agent={agent}
              onSave={onUpdate}
              onCancel={() => setEditingId(null)}
              lessons={lessons}
            />
          ) : (
            <div className="flex justify-between items-start">
              <div className="flex-grow pr-10">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    {lessonLabel(agent.lessonId || 'lesson1', lessons)}
                  </span>
                  {agent.initiates && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase">
                      Initiates
                    </span>
                  )}
                  {agent.active === false && (
                    <span className="text-[10px] bg-slate-300 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      Inactive
                    </span>
                  )}
                </div>
                {agent.initiates && agent.openingMessage && (
                  <p className="text-xs text-slate-500 italic mb-1 line-clamp-2">
                    Opens with: &ldquo;{agent.openingMessage}&rdquo;
                  </p>
                )}
                {!agent.initiates && (
                  <p className="text-xs text-slate-400 mb-1">
                    Waits for student to initiate
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onToggle(agent)}
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
                  onClick={() => setEditingId(agent.id)}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this persona permanently?'))
                      onDelete(agent.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {confirmReset && (
        <ResetConfirmDialog
          title="Reset personas to seed?"
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            setResetting(true);
            setResetStatus('');
            try {
              const result = await onResetToSeed();
              setResetStatus(
                `Reset complete: ${result.deleted} removed, ${result.seeded} seeded.`,
              );
              setConfirmReset(false);
              setTimeout(() => setResetStatus(''), 6000);
            } catch (err) {
              setResetStatus(
                `Reset failed: ${err?.message || 'unknown error'}`,
              );
            } finally {
              setResetting(false);
            }
          }}
          working={resetting}
          confirmLabel="Reset personas"
          ack="I understand this will delete custom personas and overwrite all persona records."
          body={
            <>
              <p className="text-sm text-slate-700 leading-relaxed">
                This action will <strong>permanently delete</strong> every persona
                whose ID is not in the canonical seed (`initialAgents.js`) and{' '}
                <strong>overwrite</strong> the 29 seed personas with the values from
                the current build.
              </p>
              <ul className="list-disc pl-5 text-xs text-rose-800 space-y-1 leading-relaxed">
                <li>Custom personas created through the admin UI will be removed.</li>
                <li>Edits made to seed personas (directives, opening messages, etc.) will be overwritten.</li>
                <li>Conversation transcripts attached to deleted personas remain in Firestore but lose their link to a live persona.</li>
              </ul>
              <p className="text-xs text-slate-500 leading-relaxed">
                Use this only to clean up duplicates or fix personas with missing
                <code className="bg-slate-100 px-1 rounded mx-1">lessonId</code>
                fields. Cannot be undone.
              </p>
            </>
          }
        />
      )}
    </div>
  );
}
