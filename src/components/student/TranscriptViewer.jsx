import React, { useState } from 'react';
import { X, Trash2, MessageSquare, User, Bot, AlertTriangle } from 'lucide-react';

/**
 * Read-only modal showing a past student transcript. Offers a Delete button
 * that asks for confirmation before permanently removing the conversation.
 *
 * Props:
 *   transcript       — the transcript object from Firestore
 *   onClose          — close the viewer without doing anything
 *   onDelete(id)     — permanently delete this transcript by id; modal will close
 */
export default function TranscriptViewer({ transcript, onClose, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  if (!transcript) return null;

  const userMessages = (transcript.messages || []).filter(
    (m) => m.role === 'user',
  );

  const handleDelete = async () => {
    setWorking(true);
    setError('');
    try {
      await onDelete(transcript.id);
      onClose();
    } catch (err) {
      setError(err?.message || 'Delete failed. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <h3 className="font-bold text-slate-900 truncate">
                Conversation with {transcript.agentName}
              </h3>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {userMessages.length} message{userMessages.length === 1 ? '' : 's'} sent
              {transcript.lessonId && (
                <span className="ml-2 inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold uppercase text-[10px]">
                  {transcript.lessonId.replace('lesson', 'Lesson ')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-grow overflow-y-auto p-5 bg-slate-50 space-y-3">
          {(transcript.messages || []).length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-8">
              This conversation has no messages.
            </div>
          ) : (
            transcript.messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  m.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {m.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-800 border'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between gap-3 flex-wrap">
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2 w-full">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {!confirming ? (
            <>
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete conversation
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="text-sm text-slate-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Permanently delete this conversation? Your instructor will
                  also lose access to it, including for grading.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={working}
                  className="px-3 py-1.5 border rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={working}
                  className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {working ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
