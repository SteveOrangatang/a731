import React, { useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';

/**
 * Heavy "are you really sure" confirmation dialog used by the destructive
 * Reset-to-seed actions. Differences from a normal confirm modal:
 *
 *   - Rose/red theme so it visually reads as destructive at a glance
 *   - Required acknowledgment checkbox; the Reset button stays disabled
 *     until the user explicitly checks it
 *   - Body slot for action-specific warning text
 *
 * Props:
 *   title         — heading shown at the top
 *   body          — JSX body of the dialog explaining what will happen
 *   ack           — sentence next to the checkbox (e.g. "I understand…")
 *   confirmLabel  — button label, defaults to "Reset"
 *   working       — boolean; show spinner + disable buttons while true
 *   onConfirm     — async function called when user clicks the destructive button
 *   onCancel      — function called when user backs out
 */
export default function ResetConfirmDialog({
  title,
  body,
  ack,
  confirmLabel = 'Reset',
  working = false,
  onConfirm,
  onCancel,
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-rose-600 text-white px-6 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <h3 className="font-bold text-base">{title}</h3>
        </div>

        <div className="px-6 py-5 space-y-4">{body}</div>

        <div className="px-6 py-3 bg-rose-50 border-t border-b border-rose-200">
          <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-800">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={working}
              className="mt-0.5 h-4 w-4 accent-rose-600 cursor-pointer flex-shrink-0"
            />
            <span className="leading-snug">{ack}</span>
          </label>
        </div>

        <div className="px-6 py-3 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={working || !acknowledged}
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-bold hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {working ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {working ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
