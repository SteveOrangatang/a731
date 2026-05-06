import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import Header from './Header';
import AgentRoster from './AgentRoster';
import ChatPanel from './ChatPanel';
import { useChat } from '../hooks/useChat';

export default function ScenarioView({
  scenario,
  scenarioKey,
  agents,
  store,
  scenarios,
  onBackToDashboard,
  onAdminClick,
}) {
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);

  const chat = useChat(store, scenarios, scenarioKey);

  const activeAgents = agents.filter(
    (a) =>
      a.active !== false && (a.lessonId || 'lesson1') === scenarioKey,
  );

  const stageLocks = useMemo(() => {
    const myTranscripts = (store.transcripts || []).filter(
      (t) => t.lessonId === scenarioKey,
    );
    const turnCount = (transcript) =>
      (transcript?.messages || []).filter((m) => m.role === 'user').length;

    const leader = activeAgents.find((a) => a.role === 'leader');
    const leaderTranscript =
      leader && myTranscripts.find((t) => t.agentId === leader.id);
    const stage2Unlocked = leaderTranscript ? turnCount(leaderTranscript) >= 1 : false;

    const subordinates = activeAgents.filter((a) => a.role !== 'leader');
    const subordinateTurnCounts = subordinates.map((s) => {
      const t = myTranscripts.find((tx) => tx.agentId === s.id);
      return turnCount(t);
    });
    const subordinatesEngaged = subordinateTurnCounts.filter((n) => n >= 1).length;
    const totalSubordinates = subordinates.length;
    // Brief-back unlocks once the student has engaged at least 2 subordinates
    // (capped at total in case a scenario has fewer than 2 peers configured).
    const requiredEngagement = Math.min(2, totalSubordinates);
    const stage3Unlocked = subordinatesEngaged >= requiredEngagement;

    return {
      stage2Unlocked,
      stage3Unlocked,
      subordinatesEngaged,
      totalSubordinates,
      requiredEngagement,
    };
  }, [activeAgents, store.transcripts, scenarioKey]);

  const hasBriefing =
    scenario &&
    (scenario.description ||
      scenario.objectives ||
      scenario.studentInstructions);

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <Header onAdminClick={onAdminClick} />

      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              chat.selectAgent(null);
              onBackToDashboard();
            }}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-bold text-slate-800">{scenario?.title || scenarioKey}</span>
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-700 font-semibold"
          title="Delete all conversations in this scenario"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset scenario
        </button>
      </div>

      {hasBriefing && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <button
            onClick={() => setBriefingOpen(!briefingOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-emerald-100 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <BookOpen className="h-4 w-4" />
              Lesson briefing
            </span>
            {briefingOpen ? (
              <ChevronDown className="h-4 w-4 text-emerald-700" />
            ) : (
              <ChevronRight className="h-4 w-4 text-emerald-700" />
            )}
          </button>
          {briefingOpen && (
            <div className="px-4 pb-4 space-y-3 text-sm text-slate-700">
              {scenario.description && (
                <p className="leading-relaxed">{scenario.description}</p>
              )}
              {scenario.objectives && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Objectives
                  </h4>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {scenario.objectives}
                  </p>
                </div>
              )}
              {scenario.studentInstructions && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Instructions
                  </h4>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {scenario.studentInstructions}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-grow flex overflow-hidden">
        <AgentRoster
          agents={activeAgents}
          selectedAgent={chat.selectedAgent}
          onSelect={chat.selectAgent}
          stageLocks={stageLocks}
        />
        <div className="flex-grow flex flex-col overflow-hidden">
          <ChatPanel
            selectedAgent={chat.selectedAgent}
            messages={chat.messages}
            inputText={chat.inputText}
            setInputText={chat.setInputText}
            isTyping={chat.isTyping}
            messagesEndRef={chat.messagesEndRef}
            onSendMessage={chat.sendMessage}
          />
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900">Reset this scenario?</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will delete every conversation you've had in
              <span className="font-semibold"> {scenario?.title || scenarioKey}</span>
              . You'll start fresh from the leader briefing. This can't be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  store.resetScenarioTranscripts(scenarioKey);
                  chat.selectAgent(null);
                  setConfirmReset(false);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-semibold hover:bg-rose-700 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
