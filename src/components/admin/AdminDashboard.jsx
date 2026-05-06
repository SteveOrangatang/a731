import React, { useState } from 'react';
import { Loader2, Activity, X } from 'lucide-react';
import Header from '../Header';
import TranscriptsTab from './TranscriptsTab';
import PersonasTab from './PersonasTab';
import SecurityTab from './SecurityTab';
import LessonsTab from './LessonsTab';
import SubmissionsTab from './SubmissionsTab';
import UsersTab from './UsersTab';
import AnalysesTab from './AnalysesTab';
import { testModelRotation } from '../../utils/gemini';

export default function AdminDashboard({ firestoreSync, onCreateAdmin, onExit }) {
  const [tab, setTab] = useState('submissions');
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState(null);

  const {
    agents,
    users,
    allTranscripts,
    lessons,
    rubrics,
    submissions,
    analyses,
    toggleAgent,
    deleteAgent,
    createAgent,
    updateAgent,
    resetPersonasToSeed,
    deleteTranscript,
    upsertLesson,
    deleteLesson,
    reassignAgentsLesson,
    resetLessonsToSeed,
    saveRubric,
    upsertSubmission,
    deleteSubmission,
    approveUser,
    rejectUser,
    setUserRole,
    removeUser,
    assignScenarioToUser,
    setScenarioDifficulty,
    getApiKeyConfig,
    setApiKeyConfig,
    clearApiKey,
    deleteAnalysis,
  } = firestoreSync;

  const pendingCount = (users || []).filter(
    (u) => u.status === 'pending',
  ).length;

  const handleTestModels = async () => {
    setDiagOpen(true);
    setDiagRunning(true);
    setDiagResults(null);
    try {
      const results = await testModelRotation();
      setDiagResults(results);
    } catch (err) {
      setDiagResults([{ model: '(error)', status: 'error', detail: err.message }]);
    } finally {
      setDiagRunning(false);
    }
  };

  const tabs = [
    ['submissions', 'Submissions & Grading'],
    ['analyses', 'Scenario Analyses'],
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
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleTestModels}
              disabled={diagRunning}
              className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              title="Ping each Gemini model in the rotation and report availability"
            >
              {diagRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5 text-indigo-500" />
              )}
              {diagRunning ? 'Testing…' : 'Test Gemini rotation'}
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
          {tab === 'analyses' && (
            <AnalysesTab
              analyses={analyses}
              lessons={lessons}
              onDelete={deleteAnalysis}
            />
          )}
          {tab === 'users' && (
            <UsersTab
              users={users}
              lessons={lessons}
              onApprove={approveUser}
              onReject={rejectUser}
              onSetRole={setUserRole}
              onRemove={removeUser}
              onAssignScenario={assignScenarioToUser}
              onSetDifficulty={setScenarioDifficulty}
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
              onResetToSeed={resetPersonasToSeed}
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
              onResetToSeed={resetLessonsToSeed}
            />
          )}
          {tab === 'settings' && (
            <SecurityTab
              users={users}
              onCreateAdmin={onCreateAdmin}
              onSetRole={setUserRole}
              onRemoveUser={removeUser}
              onGetApiKeyConfig={getApiKeyConfig}
              onSetApiKey={setApiKeyConfig}
              onClearApiKey={clearApiKey}
            />
          )}
        </div>
      </div>

      {diagOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Gemini Rotation Status
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pings each model in the rotation with a one-token prompt.
                  Models that report <span className="font-semibold text-emerald-700">ok</span> are available right now.
                  <span className="font-semibold text-amber-700"> rate-limited</span> means temporarily capped (will recover on its own).
                  <span className="font-semibold text-rose-700"> not-found</span> or <span className="font-semibold text-rose-700">forbidden</span> means your API key cannot use that model;
                  remove it from your VITE_GEMINI_FALLBACK_MODELS.
                </p>
              </div>
              <button
                onClick={() => setDiagOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {diagRunning ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pinging each model in the rotation…
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="text-left p-2 w-12">Key</th>
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2 w-32">Status</th>
                      <th className="text-left p-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(diagResults || []).map((r, i) => (
                      <tr key={`${r.keyIndex}-${r.model}-${i}`}>
                        <td className="p-2 font-mono text-xs text-slate-500">
                          #{r.keyIndex || 1}
                        </td>
                        <td className="p-2 font-mono text-xs">{r.model}</td>
                        <td className="p-2">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              r.status === 'ok'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'rate-limited'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2 text-xs text-slate-600 truncate max-w-md">
                          {r.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleTestModels}
                disabled={diagRunning}
                className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Re-test
              </button>
              <button
                onClick={() => setDiagOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
