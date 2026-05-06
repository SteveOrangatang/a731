import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  UserPlus,
  Trash2,
  Mail,
  Key,
  KeyRound,
  Eye,
  EyeOff,
  User as UserIcon,
  AlertTriangle,
  Loader2,
  Check,
  Save,
  RefreshCw,
} from 'lucide-react';

const RANKS = [
  '', '1LT', '2LT', 'CPT', 'MAJ', 'LTC', 'COL',
  'SFC', 'MSG', 'SGM', 'CSM',
  'CW2', 'CW3', 'CW4',
  'Dr.', 'Mr.', 'Ms.',
];

/**
 * Admin user management. Admins are full Firebase Auth accounts with
 * role='admin'. This tab is where an existing admin creates additional
 * admin accounts (email + password) and revokes / removes them.
 *
 * The master env-var passcode (VITE_SUPER_ADMIN_PASSCODE) remains as a
 * bootstrap fallback so you can always get in if no admin account exists yet.
 */
export default function SecurityTab({
  users,
  onCreateAdmin,
  onSetRole,
  onRemoveUser,
  onGetApiKeyConfig,
  onSetApiKey,
  onClearApiKey,
  currentAdmin,
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    rank: '',
    lastName: '',
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const admins = useMemo(
    () =>
      (users || [])
        .filter((u) => u.role === 'admin')
        .sort((a, b) =>
          (a.lastName || '').localeCompare(b.lastName || ''),
        ),
    [users],
  );

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters (Firebase minimum).');
      return;
    }
    if (!form.lastName.trim()) {
      setError('Last name is required.');
      return;
    }
    setBusy(true);
    try {
      await onCreateAdmin({
        email: form.email.trim(),
        password: form.password,
        rank: form.rank.trim(),
        lastName: form.lastName.trim(),
      });
      setStatus(`Admin account created for ${form.email.trim()}.`);
      setForm({ email: '', password: '', rank: '', lastName: '' });
      setTimeout(() => setStatus(''), 3500);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (u) => {
    setError('');
    setRowBusy(u.uid);
    try {
      await onSetRole(u.uid, 'student');
    } catch (err) {
      setError(err?.message || 'Revoke failed.');
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl space-y-10">
        {/* ── Gemini API key ── */}
        <ApiKeySection
          onGetApiKeyConfig={onGetApiKeyConfig}
          onSetApiKey={onSetApiKey}
          onClearApiKey={onClearApiKey}
          currentAdmin={currentAdmin}
        />

        {/* ── Master bootstrap notice ── */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
            <ShieldAlert className="h-5 w-5 mr-2 text-slate-500" />
            Admin access
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Admins are full accounts (email + password) with the admin role.
            They sign in like any student and see an <strong>Admin Portal</strong> button
            on their dashboard. Use the form below to create additional admins.
          </p>
          <div className="p-4 bg-slate-50 rounded-lg border flex items-start gap-3 shadow-sm">
            <Shield className="h-5 w-5 text-amber-600 mr-1 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <div className="font-bold text-slate-900 text-sm mb-1">
                Master bootstrap key
              </div>
              The value in <code className="bg-slate-200 px-1 rounded">VITE_SUPER_ADMIN_PASSCODE</code> still
              unlocks the Instructor Dashboard from the hidden <em>Admin Portal</em> link
              on the login screen. Keep this key out of student hands — it&#39;s your
              emergency way in if no admin account exists yet.
            </div>
          </div>
        </div>

        {/* ── Create new admin ── */}
        <div>
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-600" />
            Create admin account
          </h4>

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="email@example.mil"
                  className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Password (6+ chars)"
                  className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={form.rank}
                onChange={(e) => update('rank', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">(No rank)</option>
                {RANKS.filter(Boolean).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                placeholder="Last name"
                className="sm:col-span-2 px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {status && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 flex items-center gap-2">
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{status}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {busy ? 'Creating…' : 'Create admin'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Existing admins ── */}
        <div>
          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-600" />
            Current admin accounts
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold uppercase">
              {admins.length}
            </span>
          </h4>
          {admins.length === 0 ? (
            <div className="border border-dashed rounded-lg p-6 text-center text-xs text-slate-400">
              No admin accounts yet. Create one above, or promote an existing
              user from the <strong>Users</strong> tab.
            </div>
          ) : (
            <div className="border rounded-lg divide-y overflow-hidden">
              {admins.map((u) => (
                <div
                  key={u.uid}
                  className="p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {u.rank} {u.lastName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      disabled={rowBusy === u.uid}
                      onClick={() => handleRevoke(u)}
                      className="inline-flex items-center gap-1.5 bg-white border text-slate-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                      title="Remove admin rights (account becomes a regular student)"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Revoke admin
                    </button>
                    <button
                      disabled={rowBusy === u.uid}
                      onClick={() => setConfirmRemove(u)}
                      className="inline-flex items-center gap-1.5 bg-white border text-red-600 border-red-200 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                      title="Delete this admin profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmRemove && (
        <ConfirmRemoveModal
          user={confirmRemove}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={async () => {
            setRowBusy(confirmRemove.uid);
            try {
              await onRemoveUser(confirmRemove.uid);
              setConfirmRemove(null);
            } catch (err) {
              setError(err?.message || 'Remove failed.');
            } finally {
              setRowBusy(null);
            }
          }}
        />
      )}
    </div>
  );
}

function ConfirmRemoveModal({ user, onCancel, onConfirm }) {
  const [working, setWorking] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-50 rounded-full">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              Remove {user.rank} {user.lastName}?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Their admin profile will be deleted and they will lose access
              immediately. The Firebase Auth record is NOT deleted, so they
              could re-register unless you also delete the auth record from
              the Firebase console.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={working}
            className="px-4 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={working}
            onClick={async () => {
              setWorking(true);
              await onConfirm();
              setWorking(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {working ? 'Removing…' : 'Remove admin'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiKeySection({ onGetApiKeyConfig, onSetApiKey, onClearApiKey, currentAdmin }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!onGetApiKeyConfig) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const c = await onGetApiKeyConfig();
      setConfig(c);
    } catch (err) {
      setError(err?.message || 'Could not load API key status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setError('');
    setStatus('');
    if (!draft.trim()) {
      setError('Paste a key value before saving.');
      return;
    }
    setBusy(true);
    try {
      await onSetApiKey(
        draft.trim(),
        currentAdmin?.email || currentAdmin?.lastName || null,
      );
      setStatus('API key saved. The next chat reply will use the new key.');
      setDraft('');
      await refresh();
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setError(err?.message || 'Could not save key.');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (
      !window.confirm(
        'Clear the saved Gemini API key? The proxy will fall back to GEMINI_API_KEY in the deployment environment, or fail with "no key configured" if none is set there.',
      )
    )
      return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await onClearApiKey(currentAdmin?.email || currentAdmin?.lastName || null);
      setStatus('Key cleared.');
      await refresh();
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setError(err?.message || 'Could not clear key.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
        <KeyRound className="h-5 w-5 mr-2 text-emerald-600" />
        Gemini API key
      </h3>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        The Gemini key powers every persona conversation and every analysis the
        students run. It's stored in Firestore (admin-readable only) and consumed
        by the server-side proxy at <code className="bg-slate-200 px-1 rounded">/api/gemini</code>.
        The key never reaches the browser — students cannot extract it from
        DevTools. To rotate, paste the new key and click Save. The next chat
        request will use it.
      </p>

      <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading current key status…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-slate-700">
                Current key:{' '}
                {config?.hasKey ? (
                  <span className="font-mono bg-white border px-2 py-0.5 rounded">
                    {config.masked || 'set'}
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold">
                    Not set (proxy falls back to GEMINI_API_KEY env var)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={busy}
                className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </div>
            {config?.lastUpdated && (
              <div className="text-[10px] text-slate-500">
                Last updated {new Date(config.lastUpdated).toLocaleString()}
                {config.updatedBy ? ` by ${config.updatedBy}` : ''}.
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 pt-2 border-t">
              <label className="block text-xs font-semibold text-slate-700">
                {config?.hasKey ? 'Replace key' : 'Set key'}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={show ? 'text' : 'password'}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="AIza…"
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full pl-10 pr-10 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                    title={show ? 'Hide' : 'Show'}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>

              {config?.hasKey && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={busy}
                    className="text-xs text-slate-500 hover:text-rose-700 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear saved key
                  </button>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {status && (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{status}</span>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use')
    return 'That email already has an account. Promote it from the Users tab instead.';
  if (code === 'auth/invalid-email') return 'That email address is not valid.';
  if (code === 'auth/weak-password')
    return 'Password is too weak — Firebase requires at least 6 characters.';
  return err?.message || 'Create failed. Please try again.';
}
