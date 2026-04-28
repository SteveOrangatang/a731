import React from 'react';
import { Users, Star, ShieldCheck, Lock } from 'lucide-react';

const ARCHETYPE_TONE = {
  loyalist: { label: 'Loyalist', color: 'text-rose-700' },
  operator: { label: 'Operator', color: 'text-amber-700' },
  stickler: { label: 'Stickler', color: 'text-slate-600' },
  partner: { label: 'Partner', color: 'text-emerald-700' },
};

/**
 * Stage-grouped roster:
 *   Stage 1 INTAKE        — the leader (initial briefing)
 *   Stage 2 INVESTIGATION — four subordinates
 *   Stage 3 BRIEFBACK     — the leader again (after subordinates)
 *
 * Stage 2 unlocks once the leader has been spoken with. Stage 3 unlocks
 * after the student has spoken with at least three of the four subordinates.
 */
export default function AgentRoster({ agents, selectedAgent, onSelect, stageLocks }) {
  // Sort by displayOrder so subordinates appear in a consistent order.
  const sorted = [...agents].sort(
    (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99),
  );
  const leader = sorted.find((a) => a.role === 'leader') || null;
  const subordinates = sorted.filter((a) => a.role !== 'leader');

  const stage2Unlocked = stageLocks ? stageLocks.stage2Unlocked : true;
  const stage3Unlocked = stageLocks ? stageLocks.stage3Unlocked : true;

  return (
    <div className="w-72 bg-white border-r flex flex-col flex-shrink-0">
      <div className="p-4 bg-slate-100 border-b">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Scenario Roster
        </h3>
      </div>
      <div className="flex-grow overflow-y-auto p-2 space-y-4">
        {leader && (
          <StageGroup
            label="Stage 1 — Intake"
            sub="Receive the order from the leader"
            locked={false}
          >
            <AgentRow
              agent={leader}
              selected={selectedAgent?.id === leader.id}
              onSelect={onSelect}
            />
          </StageGroup>
        )}

        <StageGroup
          label="Stage 2 — Investigation"
          sub={
            stage2Unlocked
              ? `Engage your team (${subordinates.length})`
              : 'Talk to the leader first'
          }
          locked={!stage2Unlocked}
        >
          {subordinates.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              selected={selectedAgent?.id === agent.id}
              onSelect={stage2Unlocked ? onSelect : null}
              disabled={!stage2Unlocked}
            />
          ))}
        </StageGroup>

        {leader && (
          <StageGroup
            label="Stage 3 — Brief-back"
            sub={
              stage3Unlocked
                ? 'Return to the leader to brief your recommendation'
                : `Engage ${stageLocks?.requiredEngagement || 3} of ${subordinates.length} first`
            }
            locked={!stage3Unlocked}
          >
            <AgentRow
              agent={leader}
              selected={selectedAgent?.id === leader.id && stage3Unlocked}
              onSelect={stage3Unlocked ? onSelect : null}
              briefback={true}
              disabled={!stage3Unlocked}
            />
          </StageGroup>
        )}
      </div>
    </div>
  );
}

function StageGroup({ label, sub, locked, children }) {
  return (
    <div>
      <div className="px-3 py-1 flex items-center gap-1.5">
        {locked ? (
          <Lock className="h-3 w-3 text-slate-400" />
        ) : (
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
        )}
        <span className={`text-[10px] font-bold uppercase tracking-widest ${locked ? 'text-slate-400' : 'text-slate-600'}`}>
          {label}
        </span>
      </div>
      {sub && (
        <p className="px-3 text-[11px] text-slate-500 mb-1 leading-tight">{sub}</p>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function AgentRow({ agent, selected, onSelect, briefback, disabled }) {
  const archetype = agent.archetype && ARCHETYPE_TONE[agent.archetype];
  return (
    <button
      onClick={() => !disabled && onSelect && onSelect(agent, briefback ? 'briefback' : undefined)}
      disabled={disabled}
      className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
        selected
          ? 'bg-emerald-50 border-l-4 border-emerald-600'
          : disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-full h-9 w-9 flex items-center justify-center font-bold text-xs flex-shrink-0 ${
          agent.role === 'leader' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
        }`}>
          {agent.rank}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 text-sm truncate flex items-center gap-1">
            {agent.role === 'leader' && <Star className="h-3 w-3 text-indigo-500 flex-shrink-0" />}
            {agent.name}
            {briefback && (
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold ml-1">
                BRIEF-BACK
              </span>
            )}
          </div>
          {archetype && (
            <div className={`text-[10px] font-semibold ${archetype.color}`}>
              {archetype.label}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
