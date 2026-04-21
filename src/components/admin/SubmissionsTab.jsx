import React, { useMemo, useState } from 'react';
import {
  FileText,
  MessageSquare,
  Sparkles,
  Download,
  ChevronDown,
  Trash2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { generateGrade } from '../../utils/gemini';
import { downloadGradeReport } from '../../utils/gradeReport';

export default function SubmissionsTab({
  submissions,
  transcripts,
  lessons,
  rubrics,
  onUpsertSubmission,
  onDeleteSubmission,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [gradingId, setGradingId] = useState(null);
  const [error, setError] = useState('');

  // Also synthesize "virtual" submission rows for students who have transcripts
  // but no submitted paper yet, so the instructor can still see their chats.
  const syntheticRows = useMemo(() => {
    const byKey = new Set(submissions.map((s) => `${s.userId}::${s.lessonId}`));
    const map = new Map();
    transcripts.forEach((t) => {
      if (!t.userId || !t.lessonId) return;
      const k = `${t.userId}::${t.lessonId}`;
      if (byKey.has(k)) return;
      if (!map.has(k)) {
        map.set(k, {
          id: `virtual::${k}`,
          virtual: true,
          userId: t.userId,
          lessonId: t.lessonId,
          studentRank: t.studentRank,
          studentName: t.studentName,
          studentEmail: t.studentEmail,
          submittedAt: t.timestamp,
        });
      }
    });
    return Array.from(map.values());
  }, [submissions, transcripts]);

  const rows = [...submissions, ...syntheticRows].sort(
    (a, b) => (b.submittedAt || 0) - (a.submittedAt || 0),
  );

  const handleGrade = async (row) => {
    setError('');
    setGradingId(row.id);

    const rubric = rubrics?.[row.lessonId];
    if (!rubric?.text) {
      setError(
        `No rubric uploaded for "${lessons?.[row.lessonId]?.title || row.lessonId}". Upload one on the Lessons tab first.`,
      );
      setGradingId(null);
      return;
    }

    const studentChats = transcripts.filter(
      (t) => t.userId === row.userId && t.lessonId === row.lessonId,
    );
    const allMessages = studentChats.flatMap((t, i) => [
      {
        role: 'agent',
        text: `\n--- Conversation ${i + 1}: ${t.agentName} ---`,
        id: `divider-${i}`,
      },
      ...(t.messages || []).filter((m) => m.id !== 'opening' || m.text),
    ]);

    const studentMeta = {
      rank: row.studentRank,
      lastName: row.studentName,
      email: row.studentEmail,
      lessonTitle: lessons?.[row.lessonId]?.title || row.lessonId,
    };

    try {
      const grade = await generateGrade({
        messages: allMessages,
        paperText: row.paperText || '',
        rubricText: rubric.text,
        studentMeta,
        lesson: lessons?.[row.lessonId],
      });

      // Persist the grade on the submission (create one if virtual)
      const updated = {
        id: row.virtual ? undefined : row.id,
        userId: row.userId,
        studentRank: row.studentRank,
        studentName: row.studentName,
        studentEmail: row.studentEmail,
        lessonId: row.lessonId,
        paperText: row.paperText || '',
        paperFileName: row.paperFileName || null,
        transcriptIds: studentChats.map((t) => t.id),
        grade,
        gradedAt: Date.now(),
      };
      await onUpsertSubmission(updated);

      // Trigger Word download
      await downloadGradeReport({
        grade,
        studentMeta,
        messages: allMessages,
        paperText: row.paperText || '',
      });
    } catch (err) {
      console.error(err);
      setError('Grading failed: ' + (err.message || 'unknown error'));
    } finally {
      setGradingId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        No student activity yet. Once students start conversations or submit papers, they'll appear here.
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}
      <div className="divide-y">
        {rows.map((row) => {
          const studentChats = transcripts.filter(
            (t) => t.userId === row.userId && t.lessonId === row.lessonId,
          );
          const expanded = expandedId === row.id;
          const lessonTitle = lessons?.[row.lessonId]?.title || row.lessonId;

          return (
            <div key={row.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">
                      {row.studentRank} {row.studentName}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {row.studentEmail}
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">
                      {lessonTitle}
                    </span>
                    {row.virtual && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                        No Paper Yet
                      </span>
                    )}
                    {row.grade && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">
                        Graded · {row.grade.totalScore}/{row.grade.maxTotal}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {studentChats.length} conversation{studentChats.length === 1 ? '' : 's'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {row.paperText
                        ? `${row.paperText.length.toLocaleString()} chars`
                        : 'No paper'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      setExpandedId(expanded ? null : row.id)
                    }
                    className="text-xs flex items-center text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 mr-1 transition-transform ${
                        expanded ? 'rotate-180' : ''
                      }`}
                    />
                    View
                  </button>
                  <button
                    onClick={() => handleGrade(row)}
                    disabled={gradingId === row.id || studentChats.length === 0}
                    className="text-xs flex items-center text-white bg-indigo-600 px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {gradingId === row.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    {gradingId === row.id ? 'Grading…' : row.grade ? 'Regrade' : 'Grade & Export'}
                  </button>
                  {!row.virtual && (
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this submission?'))
                          onDeleteSubmission(row.id);
                      }}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="mt-4 ml-4 space-y-4">
                  {/* Paper */}
                  <section className="border rounded-lg bg-white">
                    <header className="bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        Student Paper
                      </span>
                      {row.paperFileName && (
                        <span className="text-slate-400 normal-case font-medium">
                          from {row.paperFileName}
                        </span>
                      )}
                    </header>
                    <div className="p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto text-slate-800">
                      {row.paperText || (
                        <span className="italic text-slate-400">
                          No paper submitted yet.
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Chats */}
                  {studentChats.map((t) => (
                    <section key={t.id} className="border rounded-lg bg-white">
                      <header className="bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        {t.agentName}
                        {t.isMoralCourageChallenge && (
                          <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full normal-case">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            MC
                          </span>
                        )}
                      </header>
                      <div className="p-4 max-h-80 overflow-y-auto bg-slate-50 text-sm">
                        {(t.messages || []).map((m, i) => (
                          <div key={i} className="mb-2">
                            <span
                              className={`font-bold mr-2 uppercase text-[10px] tracking-wider ${
                                m.role === 'user'
                                  ? 'text-emerald-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {m.role === 'user' ? 'Student' : 'Agent'}:
                            </span>
                            <span className="text-slate-800">{m.text}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                  {/* Previous grade */}
                  {row.grade && (
                    <section className="border rounded-lg bg-amber-50 border-amber-200">
                      <header className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-800 border-b border-amber-200 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          Saved Grade · {row.grade.totalScore} / {row.grade.maxTotal}
                        </span>
                        <button
                          onClick={async () => {
                            const studentMeta = {
                              rank: row.studentRank,
                              lastName: row.studentName,
                              email: row.studentEmail,
                              lessonTitle,
                            };
                            const msgs = studentChats.flatMap((t, i) => [
                              { role: 'agent', text: `\n--- Conversation ${i + 1}: ${t.agentName} ---`, id: `d-${i}` },
                              ...(t.messages || []).filter((m) => m.id !== 'opening' || m.text),
                            ]);
                            await downloadGradeReport({
                              grade: row.grade,
                              studentMeta,
                              messages: msgs,
                              paperText: row.paperText || '',
                            });
                          }}
                          className="text-xs flex items-center text-amber-800 hover:text-amber-900 font-bold"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download .docx
                        </button>
                      </header>
                      <div className="p-4 text-sm space-y-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-amber-900">Summary</div>
                          <p className="text-slate-800">{row.grade.summary}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-amber-900">Paper vs. Conversation</div>
                          <p className="text-slate-800">{row.grade.comparison}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-amber-900 mb-1">Rubric</div>
                          <table className="w-full text-xs border bg-white">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-left p-2 border-b">Criterion</th>
                                <th className="text-left p-2 border-b">Score</th>
                                <th className="text-left p-2 border-b">Rationale</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(row.grade.criteria || []).map((c, i) => (
                                <tr key={i} className="border-b">
                                  <td className="p-2 font-semibold">{c.name}</td>
                                  <td className="p-2 whitespace-nowrap">{c.score} / {c.maxScore}</td>
                                  <td className="p-2 text-slate-600">{c.rationale}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase text-amber-900">Overall</div>
                          <p className="text-slate-800">{row.grade.overallComments}</p>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
