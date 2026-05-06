import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Award,
  ShieldAlert,
  ShieldX,
  Shield,
  ShieldCheck,
  X,
  RotateCw,
  MessageSquare,
  Download,
} from 'lucide-react';
import { generateAnalysis } from '../../utils/gemini';
import { exportAnalysisDocx } from '../../utils/exportAnalysis';

const PATH_TONE = {
  optimal: {
    label: 'Optimal',
    icon: Award,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accent: 'text-emerald-700',
  },
  acceptable: {
    label: 'Acceptable',
    icon: ShieldCheck,
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    accent: 'text-sky-700',
  },
  suboptimal: {
    label: 'Suboptimal',
    icon: Shield,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    accent: 'text-amber-700',
  },
  catastrophic: {
    label: 'Catastrophic',
    icon: ShieldX,
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    accent: 'text-rose-700',
  },
};

const PERFORMANCE_TONE = {
  Strong: 'bg-emerald-100 text-emerald-800',
  Adequate: 'bg-sky-100 text-sky-800',
  Weak: 'bg-amber-100 text-amber-800',
  Skipped: 'bg-slate-200 text-slate-600',
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
 * Modal that renders the scenario analysis. If `existing` is present, shows it
 * directly; otherwise generates one. Persists the result via `onSave`.
 *
 * Props:
 *   lesson           the lesson object (must include outcomeRubric)
 *   transcripts      this student's transcripts for the lesson
 *   profile          { rank, lastName, uid }
 *   existing         existing analysis record from Firestore (or null)
 *   onSave(payload)  persist the result; returns the saved record
 *   onClose
 */
export default function ScenarioAnalysis({
  lesson,
  transcripts,
  profile,
  existing,
  onSave,
  onClose,
}) {
  const [analysis, setAnalysis] = useState(existing?.result || null);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setRunning(true);
    setError('');
    try {
      const result = await generateAnalysis({
        transcripts,
        lesson,
        studentMeta: {
          rank: profile?.rank,
          lastName: profile?.lastName,
        },
      });
      setAnalysis(result);
      if (onSave) {
        await onSave({
          id: existing?.id,
          userId: profile?.uid || profile?.id,
          studentRank: profile?.rank || '',
          studentName: profile?.lastName || '',
          studentEmail: profile?.email || '',
          lessonId: lesson.id,
          result,
        });
      }
    } catch (err) {
      setError(err?.message || 'Could not generate analysis.');
    } finally {
      setRunning(false);
    }
  };

  // Auto-run on open if no existing analysis is present.
  React.useEffect(() => {
    if (!existing && !analysis && !running) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    if (!analysis) return;
    setExporting(true);
    setError('');
    try {
      await exportAnalysisDocx({
        analysis,
        lesson,
        profile,
        generatedAt: existing?.updatedAt || existing?.createdAt,
      });
    } catch (err) {
      setError(`Export failed: ${err?.message || 'unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const path = analysis ? PATH_TONE[pathKey(analysis.pathLabel)] : null;
  const PathIcon = path?.icon || Sparkles;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Scenario Analysis
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {lesson.title || lesson.id}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-grow overflow-y-auto px-6 py-5 space-y-5">
          {running && !analysis && (
            <div className="flex items-center justify-center gap-3 text-sm text-slate-500 py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              Reviewing your conversations and projecting the outcome…
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2 text-sm text-rose-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Analysis failed</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {analysis && (
            <>
              {/* Path verdict */}
              {path && (
                <div className={`border rounded-lg p-4 ${path.color}`}>
                  <div className="flex items-start gap-3">
                    <PathIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                        Outcome
                      </div>
                      <div className="text-base font-bold">
                        {analysis.pathLabel || path.label} Path
                        {typeof analysis.pathConfidence === 'number' && (
                          <span className="ml-2 text-xs opacity-70 font-semibold">
                            (confidence{' '}
                            {(analysis.pathConfidence * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analysis.summary && (
                <Section title="Summary">
                  <p className="text-sm leading-relaxed text-slate-700">
                    {analysis.summary}
                  </p>
                </Section>
              )}

              {analysis.outcomeNarrative && (
                <Section title="Real-world outcome">
                  <p className="text-sm leading-relaxed text-slate-700">
                    {analysis.outcomeNarrative}
                  </p>
                </Section>
              )}

              {Array.isArray(analysis.personaInteractions) &&
                analysis.personaInteractions.length > 0 && (
                  <Section title="Per-persona feedback">
                    <ul className="space-y-3">
                      {analysis.personaInteractions.map((p, i) => (
                        <li
                          key={`${p.agentName || i}-${i}`}
                          className="bg-slate-50 border rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="font-semibold text-slate-900 text-sm">
                              {p.agentName}
                            </span>
                            {p.role && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                {p.role}
                              </span>
                            )}
                            {p.archetype && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                {p.archetype}
                              </span>
                            )}
                            {p.performance && (
                              <span
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ml-auto ${
                                  PERFORMANCE_TONE[p.performance] ||
                                  'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {p.performance}
                              </span>
                            )}
                          </div>
                          {p.observations && (
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {p.observations}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

              {Array.isArray(analysis.recommendations) &&
                analysis.recommendations.length > 0 && (
                  <Section title="Recommendations">
                    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </Section>
                )}
            </>
          )}
        </div>

        <footer className="px-6 py-3 border-t bg-slate-50 flex justify-between items-center gap-3 flex-wrap">
          <p className="text-[11px] text-slate-500">
            {existing?.createdAt && !running ? (
              <>
                Analyzed{' '}
                {new Date(
                  existing.updatedAt || existing.createdAt,
                ).toLocaleString()}
              </>
            ) : (
              'AI analysis based on your conversations.'
            )}
          </p>
          <div className="flex items-center gap-2">
            {analysis && !running && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                title="Download this analysis as a Word document"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {exporting ? 'Exporting…' : 'Export to Word'}
              </button>
            )}
            {analysis && !running && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Re-run the analysis? This replaces the current result.',
                    )
                  ) {
                    run();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-semibold text-slate-700 hover:bg-white"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Re-run
              </button>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 text-white rounded-md text-sm font-semibold hover:bg-emerald-800"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}
