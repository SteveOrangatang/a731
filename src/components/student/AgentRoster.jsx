import React from 'react';
import { Users } from 'lucide-react';

export default function AgentRoster({ agents, selectedAgent, onSelect }) {
  return (
    <div className="w-64 bg-white border-r flex flex-col flex-shrink-0">
      <div className="p-4 bg-slate-100 border-b">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Unit Roster
        </h3>
      </div>
      <div className="flex-grow overflow-y-auto p-2 space-y-1">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
              selectedAgent?.id === agent.id
                ? 'bg-emerald-50 border-l-4 border-emerald-600'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-200 text-slate-700 rounded-full h-9 w-9 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {agent.rank}
              </div>
              <span className="font-semibold text-slate-800 text-sm">
                {agent.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
