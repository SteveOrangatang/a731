import React from 'react';
import {
  ChevronRight,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { exportTranscript } from '../../utils/exportTranscript';

export default function TranscriptsTab({ transcripts, onDelete }) {
  if (transcripts.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        No transcripts recorded yet.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {transcripts.map((t) => (
        <details key={t.id} className="p-4 group">
          <summary className="flex justify-between items-center cursor-pointer list-none">
            <div className="flex items-center gap-3 flex-wrap">
              <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0" />
              <span className="font-bold text-slate-800">
                {t.studentRank} {t.studentName}
              </span>
              <span className="text-slate-400">/</span>
              <span className="text-emerald-700 font-medium">
                {t.agentName}
              </span>
              {t.isMoralCourageChallenge && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  MC
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportTranscript(t);
                }}
                className="text-xs flex items-center text-slate-600 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this transcript permanently?'))
                    onDelete(t.id);
                }}
                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </summary>
          <div className="mt-4 ml-8 bg-slate-50 p-6 rounded-lg text-sm max-h-96 overflow-y-auto border border-slate-200 shadow-inner">
            {t.messages?.map((m, i) => (
              <div key={i} className="mb-3 leading-relaxed">
                <span
                  className={`font-bold mr-2 uppercase text-[10px] tracking-wider ${
                    m.role === 'user' ? 'text-emerald-700' : 'text-slate-600'
                  }`}
                >
                  {m.role === 'user' ? 'Student' : 'Agent'}:
                </span>
                <span className="text-slate-800">{m.text}</span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
