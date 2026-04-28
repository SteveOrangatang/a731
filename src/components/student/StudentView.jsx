import React, { useState, useMemo } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import Header from '../Header';
import AgentRoster from './AgentRoster';
import ChatPanel from './ChatPanel';

export default function StudentView({
  agents,
  chat,
  profile,
  lessonKey,
  lesson,
  lessonTitle,
  transcripts,
  onExit,
  onBackToDashboard,
}) {
  const [briefingOpen, setBriefingOpen] = useState(true);

  const activeAgents = agents.filter(
    (a) =>
      a.active !== false && (a.lessonId || 'lesson1') === lessonKey,
  );

  // ── Compute stage gating from existing transcripts ─────────────────────────
  // Stage 2 unlocks once the leader has at least one student turn.
  // Stage 3 unlocks after 3+ of the 4 subordinates have at least one student turn.
  const stageLocks = useMemo(() => {
    const myTranscripts = (transcripts || []).filter(
      (t) =>
        (t.userId === profile?.uid || t.userId === profile?.id) &&
        t.lessonId === lessonKey,
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
    // Stage 3 unlocks once enough peers/subordinates have been engaged. With
    // 4 peers we use 3-of-4 (give the student some flexibility); with 3 peers
    // we require all 3.
    const totalSubordinates = subordinates.length;
    const requiredEngagement = totalSubordinates >= 4 ? 3 : totalSubordinates;
    const stage3Unlocked = subordinatesEngaged >= requiredEngagement;

    return {
      stage2Unlocked,
      stage3Unlocked,
      subordinatesEngaged,
      totalSubordinates,
      requiredEngagement,
    };
  }, [activeAgents, transcripts, profile, lessonKey]);

  const hasBriefing =
    lesson &&
    (lesson.description ||
      lesson.objectives ||
      lesson.studentInstructions);

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <Header view="student" onExit={onExit} />

      <div className="bg-white border-b px-4 py-2 flex items-center gap-3">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-bold text-slate-800">{lessonTitle}</span>
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
              {lesson.description && (
                <p className="leading-relaxed">{lesson.description}</p>
              )}
              {lesson.objectives && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Objectives
                  </h4>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {lesson.objectives}
                  </p>
                </div>
              )}
              {lesson.studentInstructions && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Instructions
                  </h4>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {lesson.studentInstructions}
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
            studentRank={profile?.rank}
            studentName={profile?.lastName}
          />
        </div>
      </div>
    </div>
  );
}
