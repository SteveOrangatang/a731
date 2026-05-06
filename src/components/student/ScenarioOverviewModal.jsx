import React, { useState } from 'react';
import {
  X,
  Download,
  Loader2,
  BookOpen,
  Target,
  User,
  AlertTriangle,
} from 'lucide-react';
import { exportLessonOverviewDocx } from '../../utils/exportLessonOverview';

/**
 * Modal showing a scenario's overview: context, objectives, and the student's
 * role. Includes a "Download as Word" button that generates a .docx with the
 * same content using the docx package.
 */
export default function ScenarioOverviewModal({ lesson, profile, onClose }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  if (!lesson) return null;

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await exportLessonOverviewDocx({ lesson, profile });
    } catch (err) {
      setError(`Export failed: ${err?.message || 'unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
              Scenario overview
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
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2 text-sm text-rose-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {lesson.studentInstructions && (
            <Section
              icon={User}
              tone="bg-emerald-50 border-emerald-200"
              accentClass="text-emerald-800"
              title="Your role"
            >
              <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {lesson.studentInstructions}
              </p>
            </Section>
          )}

          {lesson.description && (
            <Section
              icon={BookOpen}
              tone="bg-slate-50 border-slate-200"
              accentClass="text-slate-700"
              title="Scenario context"
            >
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {lesson.description}
              </p>
            </Section>
          )}

          {lesson.objectives && (
            <Section
              icon={Target}
              tone="bg-indigo-50 border-indigo-200"
              accentClass="text-indigo-800"
              title="Learning objectives"
            >
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {lesson.objectives}
              </p>
            </Section>
          )}

          {!lesson.studentInstructions &&
            !lesson.description &&
            !lesson.objectives && (
              <p className="text-sm text-slate-500 text-center py-6">
                No overview content has been written for this scenario yet.
                Ask your instructor to populate it through the admin panel.
              </p>
            )}
        </div>

        <footer className="px-6 py-3 border-t bg-slate-50 flex justify-between items-center gap-3 flex-wrap">
          <p className="text-[11px] text-slate-500">
            Read it here, or download as a Word document for printing or notes.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
              title="Download this overview as a Word document"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exporting ? 'Exporting…' : 'Download as Word'}
            </button>
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

function Section({ icon: Icon, tone, accentClass, title, children }) {
  return (
    <section className={`border rounded-lg p-4 ${tone}`}>
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${accentClass}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </section>
  );
}
