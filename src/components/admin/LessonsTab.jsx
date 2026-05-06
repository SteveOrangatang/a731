import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  FileText,
  Upload,
  Check,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  Save,
  X,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { extractTextFromFile } from '../../utils/fileParsers';
import ResetConfirmDialog from './ResetConfirmDialog';

const EMPTY_RUBRIC_PATH = { summary: '', outcome: '' };
const EMPTY_RUBRIC = {
  optimal: { ...EMPTY_RUBRIC_PATH },
  acceptable: { ...EMPTY_RUBRIC_PATH },
  suboptimal: { ...EMPTY_RUBRIC_PATH },
  catastrophic: { ...EMPTY_RUBRIC_PATH },
};

const EMPTY_DRAFT = {
  title: '',
  description: '',
  objectives: '',
  studentInstructions: '',
  aiContext: '',
  outcomeRubric: EMPTY_RUBRIC,
};

export default function LessonsTab({
  lessons,
  rubrics,
  agents,
  onUpsertLesson,
  onDeleteLesson,
  onReassignAgents,
  onSaveRubric,
  onResetToSeed,
}) {
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [topError, setTopError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState('');

  // Sorted list (stable) for display
  const sorted = useMemo(
    () =>
      Object.values(lessons).sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      ),
    [lessons],
  );

  const moveLesson = async (lesson, dir) => {
    const idx = sorted.findIndex((l) => l.id === lesson.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    // Swap their order values
    await onUpsertLesson({ ...lesson, order: other.order });
    await onUpsertLesson({ ...other, order: lesson.order });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-indigo-500" />
            Lessons
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl">
            Each lesson groups a set of personas and has its own rubric.
            Students see the title, description, and instructions on their
            dashboard. The description, objectives, and AI context are
            automatically injected into persona prompts and into the grader so
            scenarios and grading stay aligned with the lesson.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onResetToSeed && (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={resetting}
              className="inline-flex items-center gap-2 bg-white border text-slate-700 px-3 py-2 rounded-md text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              title="Overwrite all lessons with the seed values from the current build"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {resetting ? 'Resetting…' : 'Reset to seed'}
            </button>
          )}
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Lesson
          </button>
        </div>
      </div>

      {resetStatus && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 flex items-center gap-2">
          <Check className="h-3.5 w-3.5" />
          {resetStatus}
        </div>
      )}

      {topError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{topError}</span>
        </div>
      )}

      {creating && (
        <LessonEditor
          draft={{ ...EMPTY_DRAFT }}
          title="Create Lesson"
          onCancel={() => setCreating(false)}
          onSave={async (draft) => {
            const maxOrder = sorted.length
              ? Math.max(...sorted.map((l) => l.order || 0))
              : -1;
            await onUpsertLesson({ ...draft, order: maxOrder + 1 });
            setCreating(false);
          }}
        />
      )}

      <div className="space-y-4">
        {sorted.map((lesson, idx) => {
          const expanded = expandedId === lesson.id;
          const lessonAgents = agents.filter(
            (a) => (a.lessonId || 'lesson1') === lesson.id,
          );
          return (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={idx}
              lastIndex={sorted.length - 1}
              lessonAgents={lessonAgents}
              rubric={rubrics[lesson.id]}
              expanded={expanded}
              onToggle={() =>
                setExpandedId(expanded ? null : lesson.id)
              }
              onSave={async (draft) => {
                await onUpsertLesson({ ...lesson, ...draft });
                setExpandedId(null);
              }}
              onDeleteRequest={() => {
                setTopError('');
                setPendingDelete(lesson);
              }}
              onMoveUp={() => moveLesson(lesson, -1)}
              onMoveDown={() => moveLesson(lesson, 1)}
              onSaveRubric={onSaveRubric}
            />
          );
        })}
        {sorted.length === 0 && !creating && (
          <div className="border border-dashed rounded-lg p-10 text-center text-slate-400 text-sm">
            No lessons yet. Click "New Lesson" to create the first one.
          </div>
        )}
      </div>

      {confirmReset && (
        <ResetConfirmDialog
          title="Reset lessons to seed?"
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            setResetting(true);
            setResetStatus('');
            try {
              const count = await onResetToSeed();
              setResetStatus(
                `Reset complete: ${count} lessons rewritten from seed.`,
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
          confirmLabel="Reset lessons"
          ack="I understand this will overwrite every lesson with the seed values from the current build."
          body={
            <>
              <p className="text-sm text-slate-700 leading-relaxed">
                This action will <strong>overwrite every lesson record</strong>{' '}
                with the canonical seed values from the current build (titles,
                descriptions, objectives, student instructions, AI context,
                and outcome rubrics).
              </p>
              <ul className="list-disc pl-5 text-xs text-rose-800 space-y-1 leading-relaxed">
                <li>Any text edits you made through the admin UI will be replaced.</li>
                <li>Custom lessons created via "New Lesson" will be removed if their IDs aren't in the seed.</li>
                <li>Personas and transcripts are not touched.</li>
              </ul>
              <p className="text-xs text-slate-500 leading-relaxed">
                Use this only when a lesson's text has drifted from the source
                (e.g. missing "Your role" content). Cannot be undone.
              </p>
            </>
          }
        />
      )}

      {pendingDelete && (
        <DeleteLessonModal
          lesson={pendingDelete}
          agentsInLesson={agents.filter(
            (a) =>
              (a.lessonId || 'lesson1') === pendingDelete.id,
          )}
          otherLessons={sorted.filter((l) => l.id !== pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async (reassignTo) => {
            try {
              if (reassignTo) {
                await onReassignAgents(pendingDelete.id, reassignTo);
              }
              await onDeleteLesson(pendingDelete.id);
              setPendingDelete(null);
            } catch (err) {
              setTopError(err.message || 'Delete failed.');
              setPendingDelete(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Lesson card (read + rubric) ──────────────────────────────────────────

function LessonCard({
  lesson,
  index,
  lastIndex,
  lessonAgents,
  rubric,
  expanded,
  onToggle,
  onSave,
  onDeleteRequest,
  onMoveUp,
  onMoveDown,
  onSaveRubric,
}) {
  const [uploading, setUploading] = useState(false);
  const [rubricStatus, setRubricStatus] = useState('');

  const handleRubricUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setRubricStatus('');
    try {
      const text = await extractTextFromFile(file);
      if (!text || !text.trim()) {
        throw new Error('No text could be extracted from this file.');
      }
      await onSaveRubric(lesson.id, {
        fileName: file.name,
        text,
        uploadedAt: Date.now(),
      });
      setRubricStatus('Rubric saved.');
      setTimeout(() => setRubricStatus(''), 2500);
    } catch (err) {
      console.error(err);
      setRubricStatus('Upload failed: ' + (err.message || 'unknown error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="text-slate-400 hover:text-indigo-700 disabled:opacity-20 leading-none"
              title="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === lastIndex}
              className="text-slate-400 hover:text-indigo-700 disabled:opacity-20 leading-none mt-0.5"
              title="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">
                {lesson.id}
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">
                {lessonAgents.length} persona
                {lessonAgents.length === 1 ? '' : 's'}
              </span>
              {rubric?.fileName && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5" />
                  Rubric loaded
                </span>
              )}
            </div>
            <h4 className="font-bold text-slate-900 text-base leading-tight mt-1 truncate">
              {lesson.title || lesson.id}
            </h4>
            {lesson.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                {lesson.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggle}
            className="text-xs flex items-center text-slate-600 bg-white border px-3 py-1.5 rounded hover:bg-slate-50"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 mr-1 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
            {expanded ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={onDeleteRequest}
            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete lesson"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-b">
          <LessonEditor
            draft={{
              title: lesson.title || '',
              description: lesson.description || '',
              objectives: lesson.objectives || '',
              studentInstructions: lesson.studentInstructions || '',
              aiContext: lesson.aiContext || '',
              outcomeRubric: lesson.outcomeRubric || EMPTY_RUBRIC,
            }}
            inline
            onCancel={onToggle}
            onSave={onSave}
          />
        </div>
      )}

      <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Grading Rubric
          </div>
          {rubric?.fileName ? (
            <div className="mt-1 text-sm text-slate-700 truncate">
              {rubric.fileName}
              <span className="text-slate-400 ml-2 text-[11px]">
                {rubric.text
                  ? `${rubric.text.length.toLocaleString()} chars`
                  : 'no text'}
              </span>
            </div>
          ) : (
            <div className="mt-1 text-xs italic text-slate-400">
              No rubric uploaded.
            </div>
          )}
          {rubricStatus && (
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              {rubricStatus}
            </p>
          )}
        </div>
        <label className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-md text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors flex-shrink-0">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading
            ? 'Uploading…'
            : rubric?.fileName
            ? 'Replace Rubric'
            : 'Upload Rubric'}
          <input
            type="file"
            accept=".docx,.pdf,.txt,.md"
            onChange={handleRubricUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}

// ─── Lesson editor (shared by create + edit) ──────────────────────────────

function LessonEditor({ draft: initial, onSave, onCancel, title, inline }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError('Title is required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        title: draft.title.trim(),
        description: draft.description.trim(),
        objectives: draft.objectives.trim(),
        studentInstructions: draft.studentInstructions.trim(),
        aiContext: draft.aiContext.trim(),
        outcomeRubric: draft.outcomeRubric || EMPTY_RUBRIC,
      });
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        inline
          ? 'space-y-3'
          : 'bg-white border rounded-lg shadow-sm p-4 space-y-3'
      }
    >
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Field label="Title" required>
        <input
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Lesson 1 — Leading Up"
          className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />
      </Field>

      <Field
        label="Short Description"
        hint="1–2 sentences shown on the student dashboard card."
      >
        <textarea
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What this lesson is about at a glance."
          rows={2}
          className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        />
      </Field>

      <Field
        label="Learning Objectives"
        hint="One per line. Shown to students and fed to the AI."
      >
        <textarea
          value={draft.objectives}
          onChange={(e) => set('objectives', e.target.value)}
          placeholder={
            '• Identify morally courageous decisions\n• Frame disagreement up the chain of command'
          }
          rows={4}
          className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-y font-mono"
        />
      </Field>

      <Field
        label="Student Instructions"
        hint="Guidance the student sees when they enter the lesson."
      >
        <textarea
          value={draft.studentInstructions}
          onChange={(e) => set('studentInstructions', e.target.value)}
          placeholder="What you want the student to try, constraints, how long to spend, etc."
          rows={3}
          className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        />
      </Field>

      <Field
        label="AI Context"
        hint="Prepended to every persona and grading prompt in this lesson. Use it to frame the scenario, set the doctrinal frame, or clarify the learning focus."
      >
        <textarea
          value={draft.aiContext}
          onChange={(e) => set('aiContext', e.target.value)}
          placeholder="e.g. 'Focus the conversation on moral courage in the face of a questionable order from a superior. Push the student to articulate principle before tactics.'"
          rows={5}
          className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        />
      </Field>

      <RubricEditor
        rubric={draft.outcomeRubric || EMPTY_RUBRIC}
        onChange={(next) => set('outcomeRubric', next)}
      />

      {error && (
        <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? 'Saving…' : 'Save Lesson'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 border rounded text-xs text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function RubricEditor({ rubric, onChange }) {
  const [open, setOpen] = useState(false);
  const paths = [
    {
      key: 'optimal',
      label: 'Optimal',
      tone: 'bg-emerald-50 border-emerald-200',
    },
    {
      key: 'acceptable',
      label: 'Acceptable',
      tone: 'bg-sky-50 border-sky-200',
    },
    {
      key: 'suboptimal',
      label: 'Suboptimal',
      tone: 'bg-amber-50 border-amber-200',
    },
    {
      key: 'catastrophic',
      label: 'Catastrophic',
      tone: 'bg-rose-50 border-rose-200',
    },
  ];

  const updatePath = (key, field, value) => {
    onChange({
      ...rubric,
      [key]: { ...(rubric[key] || {}), [field]: value },
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Outcome Rubric
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Four decision-tree paths and their projected real-world outcomes.
            Used by the student-facing scenario analysis to project
            consequences. Click to {open ? 'collapse' : 'expand'}.
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {paths.map(({ key, label, tone }) => {
            const p = rubric[key] || {};
            return (
              <div
                key={key}
                className={`border rounded-lg p-3 space-y-2 ${tone}`}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {label} path
                </div>
                <textarea
                  value={p.summary || ''}
                  onChange={(e) => updatePath(key, 'summary', e.target.value)}
                  placeholder={`What the student does on the ${label.toLowerCase()} path. 1–2 sentences.`}
                  rows={2}
                  className="w-full border p-2 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-400 resize-y bg-white"
                />
                <textarea
                  value={p.outcome || ''}
                  onChange={(e) => updatePath(key, 'outcome', e.target.value)}
                  placeholder={`The downstream real-world consequence. 2–4 sentences.`}
                  rows={3}
                  className="w-full border p-2 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-400 resize-y bg-white"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Delete confirmation (with reassign) ──────────────────────────────────

function DeleteLessonModal({
  lesson,
  agentsInLesson,
  otherLessons,
  onCancel,
  onConfirm,
}) {
  const [reassignTo, setReassignTo] = useState(
    otherLessons[0]?.id || '',
  );
  const [working, setWorking] = useState(false);

  const hasOrphans = agentsInLesson.length > 0;
  const canConfirm = !hasOrphans || (reassignTo && otherLessons.length > 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-50 rounded-full">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              Delete "{lesson.title || lesson.id}"?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              This also removes the lesson's rubric. Student transcripts and
              submissions from this lesson will stay in the database but will
              no longer map to any lesson.
            </p>
          </div>
        </div>

        {hasOrphans && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800">
              {agentsInLesson.length} persona
              {agentsInLesson.length === 1 ? '' : 's'} currently assigned:
            </p>
            <ul className="text-xs text-amber-900 list-disc pl-5">
              {agentsInLesson.slice(0, 6).map((a) => (
                <li key={a.id}>
                  {a.rank} {a.name}
                </li>
              ))}
              {agentsInLesson.length > 6 && (
                <li>+ {agentsInLesson.length - 6} more…</li>
              )}
            </ul>
            {otherLessons.length === 0 ? (
              <p className="text-xs text-red-700 font-semibold">
                Cannot delete — this is your only lesson. Create another
                lesson first so personas have somewhere to go.
              </p>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1">
                  Reassign personas to
                </label>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                >
                  {otherLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title || l.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={working}
            className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={!canConfirm || working}
            onClick={async () => {
              setWorking(true);
              await onConfirm(hasOrphans ? reassignTo : null);
              setWorking(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {working ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {hasOrphans ? 'Reassign & Delete' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
