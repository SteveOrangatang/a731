import React, { useState } from 'react';
import { X, Upload, FileText, Loader2, Check } from 'lucide-react';
import { extractTextFromFile } from '../../utils/fileParsers';

/**
 * Modal for submitting (or revising) a short paper summary for a lesson.
 * Supports paste-in-textarea or .docx / .pdf / .txt file upload.
 */
export default function PaperSubmission({
  lessonKey,
  lessonTitle,
  profile,
  existing,
  transcripts,
  onSubmit,
  onClose,
}) {
  const [text, setText] = useState(existing?.paperText || '');
  const [fileName, setFileName] = useState(existing?.paperFileName || '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus('Extracting text…');
    try {
      const extracted = await extractTextFromFile(file);
      setText(extracted);
      setFileName(file.name);
      setStatus('File extracted. Review below before submitting.');
    } catch (err) {
      setStatus('Error: ' + (err.message || 'unable to read file'));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      setStatus('Paper is empty — please paste or upload text first.');
      return;
    }
    setBusy(true);
    setStatus('Saving…');
    try {
      await onSubmit({
        id: existing?.id,
        userId: profile.uid || profile.id,
        studentRank: profile.rank,
        studentName: profile.lastName,
        studentEmail: profile.email,
        lessonId: lessonKey,
        paperText: text.trim(),
        paperFileName: fileName || null,
        transcriptIds: transcripts.map((t) => t.id),
      });
      setStatus('Saved.');
      setTimeout(onClose, 700);
    } catch (err) {
      setStatus('Save failed: ' + (err.message || 'unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Paper Summary
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lessonTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Write a short summary paper describing your conversation(s) in this
            lesson and how you worked toward your desired outcome based on the
            lesson objectives. Paste it below or upload a file (.docx, .pdf, .txt).
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 bg-slate-100 border text-slate-700 px-3 py-2 rounded-md text-xs font-semibold hover:bg-slate-200 cursor-pointer transition-colors">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload file
              <input
                type="file"
                accept=".docx,.pdf,.txt,.md"
                onChange={handleFile}
                className="hidden"
                disabled={busy}
              />
            </label>
            {fileName && (
              <span className="text-xs text-slate-500 truncate">
                <Check className="h-3 w-3 inline mr-1 text-emerald-600" />
                {fileName}
              </span>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or write your summary paper here…"
            className="w-full border rounded-md p-3 h-64 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <p className="text-[11px] text-slate-400">
            {text.length.toLocaleString()} characters
            {transcripts.length > 0 && (
              <> · {transcripts.length} conversation{transcripts.length > 1 ? 's' : ''} linked</>
            )}
          </p>

          {status && (
            <p className="text-xs text-emerald-700 font-semibold">{status}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || !text.trim()}
            className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
          >
            {existing ? 'Update Paper' : 'Submit Paper'}
          </button>
        </div>
      </div>
    </div>
  );
}
