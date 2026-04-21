import React, { useState } from 'react';
import {
  BookOpen,
  MessageSquare,
  FileText,
  ArrowRight,
  Check,
  LogOut,
  User,
  ChevronRight,
  Shield,
} from 'lucide-react';
import Header from '../Header';
import PaperSubmission from './PaperSubmission';
import TranscriptViewer from './TranscriptViewer';

/** Sorted lesson ids (by lesson.order). */
function lessonKeys(lessons) {
  return Object.values(lessons || {})
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((l) => l.id);
}

/**
 * Student landing page after login. Shows 3 lessons with status:
 *   - personas available
 *   - how many conversations started
 *   - paper submission status
 *   - graded?
 */
export default function StudentDashboard({
  profile,
  agents,
  lessons,
  transcripts,
  submissions,
  onOpenLesson,
  onSignOut,
  onSubmitPaper,
  onDeleteTranscript,
  onEnterAdmin,
}) {
  const [paperLesson, setPaperLesson] = useState(null);
  const [viewingTranscript, setViewingTranscript] = useState(null);

  const keys = lessonKeys(lessons);
  const fallbackLessonId = keys[0] || 'lesson1';

  // Lookup: transcripts belonging to current student
  const myTranscripts = transcripts.filter(
    (t) => t.userId === profile.uid || t.userId === profile.id,
  );
  const mySubmissions = submissions.filter(
    (s) => s.userId === profile.uid || s.userId === profile.id,
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header view="student" onExit={onSignOut} />

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <User className="h-6 w-6 text-emerald-600" />
              Welcome, {profile.rank} {profile.lastName}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{profile.email}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {profile.role === 'admin' && onEnterAdmin && (
              <button
                onClick={onEnterAdmin}
                className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                title="Open the instructor dashboard"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin Portal
              </button>
            )}
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {keys.map((key) => {
            const lesson = lessons[key] || { title: key };
            const lessonAgents = agents.filter(
              (a) => (a.lessonId || fallbackLessonId) === key && a.active !== false,
            );
            const lessonTranscripts = myTranscripts.filter(
              (t) => t.lessonId === key,
            );
            const submission = mySubmissions.find((s) => s.lessonId === key);
            const chatsWithContent = lessonTranscripts.filter(
              (t) => (t.messages || []).some((m) => m.role === 'user'),
            );

            return (
              <div
                key={key}
                className="bg-white rounded-xl border shadow-sm overflow-hidden"
              >
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {key.replace('lesson', 'Lesson ')}
                    </span>
                  </div>
                  {submission?.grade && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      GRADED
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {lesson.title}
                    </h3>
                    {lesson.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        Personas available
                      </span>
                      <span className="font-bold">
                        {lessonAgents.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Conversations started
                      </span>
                      <span className="font-bold">
                        {chatsWithContent.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        Paper summary
                      </span>
                      <span
                        className={`font-bold ${
                          submission?.paperText
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {submission?.paperText ? (
                          <span className="flex items-center gap-0.5">
                            <Check className="h-3 w-3" />
                            Submitted
                          </span>
                        ) : (
                          'Not submitted'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => onOpenLesson(key)}
                      disabled={lessonAgents.length === 0}
                      className="w-full flex items-center justify-between bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span>Enter scenarios</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPaperLesson(key)}
                      className="w-full flex items-center justify-between bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                      <span>
                        {submission?.paperText
                          ? 'View / revise paper'
                          : 'Submit summary paper'}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Past chats list */}
                  {lessonTranscripts.length > 0 && (
                    <details className="pt-3 border-t">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 font-semibold">
                        Past chats ({lessonTranscripts.length})
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {lessonTranscripts.map((t) => {
                          const count = (t.messages || []).filter(
                            (m) => m.role === 'user',
                          ).length;
                          return (
                            <li key={t.id}>
                              <button
                                onClick={() => setViewingTranscript(t)}
                                className="w-full text-left text-xs text-slate-700 flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors"
                                title="View or delete this conversation"
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  <MessageSquare className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                                  {t.agentName}
                                </span>
                                <span className="text-slate-400 flex-shrink-0">
                                  {count} msgs
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}

                  {/* Graded? show score */}
                  {submission?.grade && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                      <div className="font-bold flex items-center justify-between">
                        <span>Instructor feedback</span>
                        <span>
                          {submission.grade.totalScore} /{' '}
                          {submission.grade.maxTotal}
                        </span>
                      </div>
                      {submission.grade.overallComments && (
                        <p className="mt-1 text-slate-700 line-clamp-3">
                          {submission.grade.overallComments}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {paperLesson && (
        <PaperSubmission
          lessonKey={paperLesson}
          lessonTitle={
            lessons[paperLesson]?.title || paperLesson
          }
          profile={profile}
          existing={mySubmissions.find((s) => s.lessonId === paperLesson)}
          transcripts={myTranscripts.filter(
            (t) => t.lessonId === paperLesson,
          )}
          onSubmit={onSubmitPaper}
          onClose={() => setPaperLesson(null)}
        />
      )}

      {viewingTranscript && (
        <TranscriptViewer
          transcript={viewingTranscript}
          onClose={() => setViewingTranscript(null)}
          onDelete={async (id) => {
            if (onDeleteTranscript) await onDeleteTranscript(id);
          }}
        />
      )}
    </div>
  );
}
