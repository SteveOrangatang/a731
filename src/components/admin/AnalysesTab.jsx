import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Trash2,
  Eye,
  RefreshCcw,
  Filter,
  Award,
  Shield,
  ShieldCheck,
  ShieldX,
  Download,
  Loader2,
} from 'lucide-react';
import { exportAnalysisDocx } from '../../utils/exportAnalysis';

const PATH_TONE = {
  optimal: { label: 'Optimal', icon: Award, color: 'bg-emerald-100 text-emerald-800' },
  acceptable: { label: 'Acceptable', icon: ShieldCheck, color: 'bg-sky-100 text-sky-800' },
  suboptimal: { label: 'Suboptimal', icon: Shield, color: 'bg-amber-100 text-amber-800' },
  catastrophic: { label: 'Catastrophic', icon: ShieldX, color: 'bg-rose-100 text-rose-800' },
};

function pathKey(label) {
  if (!label) return 'suboptimal';
  const lower = label.toLowerCase();
  if (lower.startsWith('optimal')) return 'optimal';
  if (lower.startsWith('acceptable')) return 'acceptable';
  if (lower.startsWith('catastrophic')) return 'catastrophic';
  return 'suboptimal';
}

/**
 * Admin view of student-run scenario analyses. Filter by lesson; click a row
 * to see the full analysis output. Delete to allow the student to re-run.
 */
export default function AnalysesTab({ analyses, lessons, onDelete }) {
  const [filterLesson, setFilterLesson] = useState('');
  const [viewing, setViewing] = useState(null);

  const lessonLookup = Object.fromEntries(
    Object.values(lessons || {}).map((l) => [l.id, l.title || l.id]),
  );

  const filtered = useMemo(() => {
    const rows = (analyses || []).filter((a) =>
      filterLesson ? a.lessonId === filterLesson : true,
    );
    return [...rows].sort(
      (a, b) =>
        (b.updatedAt || b.createdAt || 0) -
        (a.updatedAt || a.createdAt || 0),
    );
  }, [analyses, filterLesson]);

  const handleDelete = async (a) => {
    if (
      !window.confirm(
        `Delete this analysis for ${a.studentRank || ''} ${a.studentName || a.userId}? They will be able to re-run it next time.`,
      )
    )
      return;
    try {
      await onDelete(a.id);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="p-5 bg-slate-50 border-b flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-bold text-slate-800 inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Scenario analyses
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
            {filtered.length}
          </span>
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={filterLesson}
            onChange={(e) => setFilterLesson(e.target.value)}
            className="border bg-white rounded-md px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All lessons</option>
            {Object.values(lessons || {})
              .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title || l.id}
                </option>
              ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">
          No analyses to show. Students generate these by clicking "Run scenario
          analysis" on their dashboard.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b">
            <tr>
              <th className="text-left p-3">Student</th>
              <th className="text-left p-3">Lesson</th>
              <th className="text-left p-3">Path</th>
              <th className="text-left p-3">Generated</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((a) => {
              const tone = PATH_TONE[pathKey(a.result?.pathLabel)];
              const PathIcon = tone?.icon || Sparkles;
              return (
                <tr key={a.id} className="hover:bg-slate-50 group">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">
                      {a.studentRank} {a.studentName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {a.studentEmail}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    {lessonLookup[a.lessonId] || a.lessonId}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        tone?.color || 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <PathIcon className="h-3 w-3" />
                      {a.result?.pathLabel || tone?.label || '—'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    {a.createdAt
                      ? new Date(a.updatedAt || a.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewing(a)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <ExportButton
                        row={a}
                        lessonTitle={lessonLookup[a.lessonId] || a.lessonId}
                        lesson={(lessons || {})[a.lessonId]}
                      />
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 text-slate-300 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title="Delete (lets the student re-run)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {viewing && (
        <AnalysisViewerModal
          row={viewing}
          lessonTitle={lessonLookup[viewing.lessonId] || viewing.lessonId}
          lesson={(lessons || {})[viewing.lessonId]}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function ExportButton({ row, lessonTitle, lesson }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      await exportAnalysisDocx({
        analysis: row.result || {},
        lesson: lesson || { id: row.lessonId, title: lessonTitle },
        profile: {
          rank: row.studentRank,
          lastName: row.studentName,
          email: row.studentEmail,
        },
        generatedAt: row.updatedAt || row.createdAt,
      });
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`Export failed: ${err?.message || 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={handle}
      disabled={busy}
      className="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded disabled:opacity-50"
      title="Export this analysis as a Word document"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}

function AnalysisViewerModal({ row, lessonTitle, lesson, onClose }) {
  const r = row.result || {};
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b flex items-start justify-between gap-3 sticky top-0 bg-white">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {row.studentRank} {row.studentName} · {lessonTitle}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Path: {r.pathLabel || '—'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton row={row} lessonTitle={lessonTitle} lesson={lesson} />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-lg px-2"
            >
              ×
            </button>
          </div>
        </header>
        <div className="px-6 py-5 space-y-4">
          {r.summary && (
            <Block title="Summary">
              <p className="text-sm leading-relaxed text-slate-700">
                {r.summary}
              </p>
            </Block>
          )}
          {r.outcomeNarrative && (
            <Block title="Real-world outcome">
              <p className="text-sm leading-relaxed text-slate-700">
                {r.outcomeNarrative}
              </p>
            </Block>
          )}
          {Array.isArray(r.personaInteractions) && r.personaInteractions.length > 0 && (
            <Block title="Per-persona feedback">
              <ul className="space-y-2">
                {r.personaInteractions.map((p, i) => (
                  <li
                    key={`${p.agentName || i}-${i}`}
                    className="bg-slate-50 border rounded p-2"
                  >
                    <div className="text-xs font-bold text-slate-900">
                      {p.agentName}
                      {p.performance && (
                        <span className="ml-2 text-[10px] uppercase font-bold px-1 py-0.5 rounded bg-slate-200 text-slate-700">
                          {p.performance}
                        </span>
                      )}
                    </div>
                    {p.observations && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {p.observations}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {Array.isArray(r.recommendations) && r.recommendations.length > 0 && (
            <Block title="Recommendations">
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
                {r.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {title}
      </h4>
      {children}
    </div>
  );
}
