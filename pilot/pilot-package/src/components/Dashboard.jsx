import React from 'react';
import { BookOpen, Users, ArrowRight, MessageSquare } from 'lucide-react';
import Header from './Header';

function scenarioKeysSorted(scenarios) {
  return Object.values(scenarios || {})
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map((s) => s.scenarioId);
}

export default function Dashboard({
  scenarios,
  agents,
  transcripts,
  onOpenScenario,
  onAdminClick,
}) {
  const keys = scenarioKeysSorted(scenarios);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header onAdminClick={onAdminClick} />

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Scenarios</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pick a scenario to begin. Each one has a leader, four subordinate
            archetypes, and a brief-back stage. Your conversations are saved
            so you can step away and pick up later.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {keys.map((key) => {
            const scenario = scenarios[key] || { title: key };
            const scenarioAgents = agents.filter(
              (a) => a.scenarioId === key && a.active !== false,
            );
            const scenarioTranscripts = transcripts.filter(
              (t) => t.scenarioId === key,
            );
            const chatsWithContent = scenarioTranscripts.filter(
              (t) => (t.messageCount || 0) > 0,
            );

            return (
              <button
                key={key}
                onClick={() => onOpenScenario(key)}
                className="text-left bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {key.replace('lesson', 'Scenario ')}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {scenario.title}
                    </h3>
                    {scenario.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                        {scenario.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        Personas
                      </span>
                      <span className="font-bold">{scenarioAgents.length}</span>
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
                  </div>

                  <div className="pt-2">
                    <span className="w-full flex items-center justify-between bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-semibold">
                      <span>Enter scenario</span>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {keys.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-sm text-amber-900">
              No scenarios defined. Open the Admin tab to add one.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
