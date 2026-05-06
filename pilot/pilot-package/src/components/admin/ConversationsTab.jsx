import React, { useEffect, useState } from 'react';
import {
  Download,
  Trash2,
  RefreshCcw,
  MessageSquare,
  Filter,
  Eye,
} from 'lucide-react';
import { loadConversation } from '../../foundry/client';

export default function ConversationsTab({
  listAll,
  exportAll,
  deleteOne,
  scenarios,
  agents,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterScenario, setFilterScenario] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [viewing, setViewing] = useState(null); // loaded conversation
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAll({
        scenarioId: filterScenario || undefined,
        userId: filterUser || undefined,
      });
      setRows(result || []);
    } catch (err) {
      setError(err?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterScenario, filterUser]);

  const personaLookup = Object.fromEntries(
    (agents || []).map((a) => [a.personaId, `${a.rank} ${a.name}`]),
  );
  const scenarioLookup = Object.fromEntries(
    Object.values(scenarios || {}).map((s) => [s.scenarioId, s.title]),
  );

  const handleExport = async (format) => {
    try {
      const payload = await exportAll({
        scenarioId: filterScenario || undefined,
        userId: filterUser || undefined,
        exportFormat: format,
      });
      const blob = new Blob([payload.content], { type: payload.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || 'Export failed');
    }
  };

  const handleView = async (conversationId) => {
    try {
      const loaded = await loadConversation(conversationId);
      setViewing(loaded);
    } catch (err) {
      setError(err?.message || 'Could not load conversation');
    }
  };

  const handleDelete = async (conversationId) => {
    if (!window.confirm('Delete this conversation and its messages? Cannot be undone.')) return;
    try {
      await deleteOne(conversationId);
      refresh();
    } catch (err) {
      setError(err?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="p-5 bg-slate-50 border-b">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h3 className="font-bold text-slate-800">All conversations</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 text-sm text-slate-700 px-3 py-2 rounded-md hover:bg-slate-200"
              title="Refresh"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center gap-1.5 bg-slate-700 text-white text-sm px-3 py-2 rounded-md font-semibold hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 bg-emerald-700 text-white text-sm px-3 py-2 rounded-md font-semibold hover:bg-emerald-800"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={filterScenario}
            onChange={(e) => setFilterScenario(e.target.value)}
            className="border bg-white rounded-md px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All scenarios</option>
            {Object.values(scenarios || {})
              .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
              .map((s) => (
                <option key={s.scenarioId} value={s.scenarioId}>
                  {s.title}
                </option>
              ))}
          </select>
          <input
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Filter by user ID…"
            className="border bg-white rounded-md px-3 py-1.5 text-sm outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="p-6 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">
          No conversations match your filters.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Scenario</th>
              <th className="text-left p-3">Persona</th>
              <th className="text-left p-3">Mode</th>
              <th className="text-right p-3">Msgs</th>
              <th className="text-left p-3">Last activity</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.conversationId} className="hover:bg-slate-50 group">
                <td className="p-3 font-mono text-xs text-slate-700">{r.userId}</td>
                <td className="p-3">{scenarioLookup[r.scenarioId] || r.scenarioId}</td>
                <td className="p-3">{personaLookup[r.personaId] || r.personaId}</td>
                <td className="p-3">
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {r.mode}
                  </span>
                </td>
                <td className="p-3 text-right font-bold">{r.messageCount}</td>
                <td className="p-3 text-xs text-slate-500">
                  {new Date(r.lastMessageAt).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleView(r.conversationId)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                      title="View transcript"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.conversationId)}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {viewing && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-sm">
                  {personaLookup[viewing.conversation.personaId] ||
                    viewing.conversation.personaId}{' '}
                  ·{' '}
                  {scenarioLookup[viewing.conversation.scenarioId] ||
                    viewing.conversation.scenarioId}
                </h3>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                Close
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50">
              {viewing.messages.map((m) => (
                <div
                  key={m.messageId}
                  className={`flex ${
                    m.role === 'USER' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      m.role === 'USER'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border text-slate-800'
                    }`}
                  >
                    <div className="text-[10px] opacity-60 mb-1">
                      {m.role === 'USER' ? 'Student' : 'Persona'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
