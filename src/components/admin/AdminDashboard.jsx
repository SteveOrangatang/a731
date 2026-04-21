import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import Header from '../Header';
import TranscriptsTab from './TranscriptsTab';
import PersonasTab from './PersonasTab';
import SecurityTab from './SecurityTab';
import LessonsTab from './LessonsTab';
import SubmissionsTab from './SubmissionsTab';
import UsersTab from './UsersTab';

export default function AdminDashboard({ firestoreSync, onCreateAdmin, onExit }) {
  const [tab, setTab] = useState('submissions');
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');

  const {
    agents,
    users,
    allTranscripts,
    lessons,
    rubrics,
    submissions,
    toggleAgent,
    deleteAgent,
    createAgent,
    updateAgent,
    deleteTranscript,
    upsertLesson,
    deleteLesson,
    reassignAgentsLesson,
    saveRubric,
    upsertSubmission,
    deleteSubmission,
    approveUser,
    rejectUser,
    setUserRole,
    removeUser,
    seedDemoData,
  } = firestoreSync;

  const pendingCount = (users || []).filter(
    (u) => u.status === 'pending',
  ).length;

  const handleSeed = async () => {
    if (
      !window.confirm(
        'Load demo course content and a sample student chat + submission? This overwrites the three default lessons with richer text and creates a demo student.',
      )
    )
      return;
    setSeeding(true);
    setSeedStatus('');
    try {
      const result = await seedDemoData();
      setSeedStatus(
        `Seeded ${result.lessons} lessons${
          result.seededTranscript ? ' + demo transcript & submission' : ''
        }.`,
      );
      setTimeout(() => setSeedStatus(''), 4000);
    } catch (err) {
      setSeedStatus('Seed failed: ' + (err.message || 'unknown error'));
    } finally {
      setSeeding(false);
    }
  };

  const tabs = [
    ['submissions', 'Submissions & Grading'],
    ['users', pendingCount > 0 ? `Users (${pendingCount})` : 'Users'],
    ['transcripts', 'All Transcripts'],
    ['agents', 'Personas'],
    ['lessons', 'Lessons & Rubrics'],
    ['settings', 'Security'],
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header view="admin_dashboard" onExit={onExit} />
      <div className="max-w-7xl mx-auto w-full px-4 py-8 flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Instructor Dashboard
            </h2>
            {seedStatus && (
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                {seedStatus}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              title="Load rich demo content and a sample student conversation + paper"
            >
              {seeding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              )}
              {seeding ? 'Seeding…' : 'Seed Demo Data'}
            </button>
            <div className="flex bg-white rounded-md border p-1 shadow-sm flex-wrap">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 text-sm rounded transition-all ${
                    tab === key
                      ? 'bg-slate-100 font-bold text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[400px]">
          {tab === 'submissions' && (
            <SubmissionsTab
              submissions={submissions}
              transcripts={allTranscripts}
              lessons={lessons}
              rubrics={rubrics}
              onUpsertSubmission={upsertSubmission}
              onDeleteSubmission={deleteSubmission}
            />
          )}
          {tab === 'users' && (
            <UsersTab
              users={users}
              onApprove={approveUser}
              onReject={rejectUser}
              onSetRole={setUserRole}
              onRemove={removeUser}
            />
          )}
          {tab === 'transcripts' && (
            <TranscriptsTab
              transcripts={allTranscripts}
              onDelete={deleteTranscript}
            />
          )}
          {tab === 'agents' && (
            <PersonasTab
              agents={agents}
              lessons={lessons}
              onToggle={toggleAgent}
              onDelete={deleteAgent}
              onCreate={createAgent}
              onUpdate={updateAgent}
            />
          )}
          {tab === 'lessons' && (
            <LessonsTab
              lessons={lessons}
              rubrics={rubrics}
              agents={agents}
              onUpsertLesson={upsertLesson}
              onDeleteLesson={deleteLesson}
              onReassignAgents={reassignAgentsLesson}
              onSaveRubric={saveRubric}
            />
          )}
          {tab === 'settings' && (
            <SecurityTab
              users={users}
              onCreateAdmin={onCreateAdmin}
              onSetRole={setUserRole}
              onRemoveUser={removeUser}
            />
          )}
        </div>
      </div>
    </div>
  );
}
