import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import Header from './Header';
import AgentRoster from './AgentRoster';
import ChatPanel from './ChatPanel';
import { useChat } from '../hooks/useChat';
import { getStageProgress } from '../foundry/client';

export default function ScenarioView({
  scenario,
  scenarioKey,
  agents,
  store,
  onBackToDashboard,
  onAdminClick,
}) {
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [progress, setProgress] = useState({
    leaderEngaged: false,
    subordinatesEngaged: 0,
    totalSubordinates: 0,
    leaderPersonaId: null,
  });

  const refreshProgress = useCallback(async () => {
    try {
      const p = await getStageProgress(scenarioKey);
      setProgress(p);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[scenario-view] getStageProgress failed:', err);
    }
  }, [scenarioKey]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const chat = useChat({
    scenarioId: scenarioKey,
    onAfterSend: () => {
      refreshProgress();
      store.refreshMyConversations?.();
    },
  });

  const activeAgents = agents.filter(
    (a) => a.active !== false && a.scenarioId === scenarioKey,
  );

  // Stage gating: stage 2 unlocks once the leader is engaged; stage 3 unlocks
  // once at least 2 subordinates have a USER message (capped to total if a
  // scenario has fewer than 2 peers configured).
  const totalSubordinates = activeAgents.filter((a) => a.role !== 'leader').length;
  const requiredEngagement = Math.min(2, totalSubordinates);
  const stage2Unlocked = progress.leaderEngaged;
  const stage3Unlocked = progress.subordinatesEngaged >= requiredEngagement;
  const stageLocks = {
    stage2Unlocked,
    stage3Unlocked,
    subordinatesEngaged: progress.subordinatesEngaged,
    totalSubordinates,
    requiredEngagement,
  };

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
        {store.isAdmin && (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-700 font-semibold"
            title="Delete all conversations in this scenario (admin only)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset scenario
          </button>
        )}
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
            error={chat.error}
          />
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900">Reset this scenario?</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will delete every conversation in
              <span className="font-semibold"> {scenario?.title || scenarioKey}</span>
              . Brand-new on next visit. This can't be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await store.resetScenarioTranscripts(scenarioKey);
                  chat.selectAgent(null);
                  setConfirmReset(false);
                  refreshProgress();
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
