import React, { useState, useMemo } from 'react';
import {
  Users,
  Check,
  X,
  Shield,
  ShieldAlert,
  Trash2,
  Mail,
  Clock,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';

export default function UsersTab({
  users,
  lessons,
  onApprove,
  onReject,
  onSetRole,
  onRemove,
  onAssignScenario,
  onSetDifficulty,
}) {
  const [busy, setBusy] = useState(null); // uid currently being mutated
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Sorted scenario options (lessonId -> title)
  const scenarioOptions = useMemo(() => {
    return Object.values(lessons || {})
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((l) => ({ id: l.id, title: l.title || l.id }));
  }, [lessons]);

  const { pending, approved, other } = useMemo(() => {
    const p = [];
    const a = [];
    const o = [];
    (users || []).forEach((u) => {
      if (u.status === 'pending') p.push(u);
      else if (u.status === 'approved' || !u.status) a.push(u);
      else o.push(u);
    });
    const byDate = (x, y) =>
      (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0);
    return {
      pending: p.sort(byDate),
      approved: a.sort((x, y) => (x.lastName || '').localeCompare(y.lastName || '')),
      other: o.sort(byDate),
    };
  }, [users]);

  const withBusy = async (uid, fn) => {
    setError('');
    setBusy(uid);
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
          <Users className="h-5 w-5 mr-2 text-indigo-500" />
          Users
        </h3>
        <p className="text-xs text-slate-500 max-w-2xl">
          Approve or reject new account requests, promote trusted users to
          admin, and remove anyone who no longer belongs. Removing a user
          deletes their profile; they can sign in but will see an access
          message until you re-approve or they re-register.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Pending approvals ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-amber-600" />
          <h4 className="font-bold text-slate-800 text-sm">
            Pending approvals
          </h4>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center text-xs text-slate-400">
            No pending requests.
          </div>
        ) : (
          <div className="border rounded-lg divide-y overflow-hidden">
            {pending.map((u) => (
              <div
                key={u.uid}
                className="p-4 flex flex-wrap items-center justify-between gap-3 bg-amber-50"
              >
                <UserMeta user={u} />
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy === u.uid}
                    onClick={() => withBusy(u.uid, () => onApprove(u.uid))}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    disabled={busy === u.uid}
                    onClick={() => withBusy(u.uid, () => onReject(u.uid))}
                    className="inline-flex items-center gap-1.5 bg-white border text-slate-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Approved accounts ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Check className="h-4 w-4 text-emerald-600" />
          <h4 className="font-bold text-slate-800 text-sm">
            Approved accounts
          </h4>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">
            {approved.length}
          </span>
        </div>
        {approved.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center text-xs text-slate-400">
            No approved accounts yet.
          </div>
        ) : (
          <div className="border rounded-lg divide-y overflow-hidden">
            {approved.map((u) => (
              <div
                key={u.uid}
                className="p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <UserMeta
                  user={u}
                  scenarioOptions={scenarioOptions}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {onAssignScenario && (
                    <ScenarioMultiSelect
                      user={u}
                      scenarioOptions={scenarioOptions}
                      busy={busy === u.uid}
                      onAssign={(ids) =>
                        withBusy(u.uid, () => onAssignScenario(u.uid, ids))
                      }
                      onSetDifficulty={
                        onSetDifficulty
                          ? (id, level) =>
                              withBusy(u.uid, () =>
                                onSetDifficulty(u.uid, id, level),
                              )
                          : null
                      }
                    />
                  )}
                  {u.role === 'admin' ? (
                    <button
                      disabled={busy === u.uid}
                      onClick={() =>
                        withBusy(u.uid, () => onSetRole(u.uid, 'student'))
                      }
                      className="inline-flex items-center gap-1.5 bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                      title="Remove admin rights"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Revoke Admin
                    </button>
                  ) : (
                    <button
                      disabled={busy === u.uid}
                      onClick={() =>
                        withBusy(u.uid, () => onSetRole(u.uid, 'admin'))
                      }
                      className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      title="Grant admin rights"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Make Admin
                    </button>
                  )}
                  <button
                    disabled={busy === u.uid}
                    onClick={() => setConfirmRemove(u)}
                    className="inline-flex items-center gap-1.5 bg-white border text-red-600 border-red-200 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                    title="Remove this user"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Other (rejected / removed, but somehow still in the collection) ── */}
      {other.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <X className="h-4 w-4 text-slate-400" />
            <h4 className="font-bold text-slate-800 text-sm">
              Rejected / removed
            </h4>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
              {other.length}
            </span>
          </div>
          <div className="border rounded-lg divide-y overflow-hidden">
            {other.map((u) => (
              <div
                key={u.uid}
                className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50"
              >
                <UserMeta user={u} />
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy === u.uid}
                    onClick={() => withBusy(u.uid, () => onApprove(u.uid))}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Re-approve
                  </button>
                  <button
                    disabled={busy === u.uid}
                    onClick={() => setConfirmRemove(u)}
                    className="inline-flex items-center gap-1.5 bg-white border text-red-600 border-red-200 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {confirmRemove && (
        <ConfirmRemoveModal
          user={confirmRemove}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={async () => {
            await withBusy(confirmRemove.uid, () =>
              onRemove(confirmRemove.uid),
            );
            setConfirmRemove(null);
          }}
        />
      )}
    </div>
  );
}

function userAssignedIds(user) {
  if (Array.isArray(user.assignedScenarioIds)) {
    return user.assignedScenarioIds.filter(Boolean);
  }
  if (user.assignedScenarioId) return [user.assignedScenarioId];
  return [];
}

function userDifficulty(user, scenarioId) {
  return user?.scenarioDifficulty?.[scenarioId] === 'hard' ? 'hard' : 'normal';
}

function ScenarioMultiSelect({
  user,
  scenarioOptions,
  busy,
  onAssign,
  onSetDifficulty,
}) {
  const [open, setOpen] = useState(false);
  const assigned = userAssignedIds(user);

  const toggle = (id) => {
    const next = assigned.includes(id)
      ? assigned.filter((x) => x !== id)
      : [...assigned, id];
    onAssign(next);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="text-xs border rounded px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
        title="Assign one or more scenarios"
      >
        <span>
          {assigned.length === 0
            ? 'Assign scenarios'
            : `${assigned.length} scenario${assigned.length === 1 ? '' : 's'}`}
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 z-40 bg-white border rounded-md shadow-lg p-2 w-80 overflow-y-auto"
            style={{ maxHeight: 'min(32rem, calc(100vh - 8rem))' }}
          >
            {scenarioOptions.length === 0 && (
              <div className="text-xs text-slate-400 px-2 py-1">No scenarios available</div>
            )}
            {scenarioOptions.map((s) => {
              const isOn = assigned.includes(s.id);
              const level = userDifficulty(user, s.id);
              return (
                <div
                  key={s.id}
                  className={`px-2 py-1.5 rounded ${isOn ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(s.id)}
                      disabled={busy}
                      className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                    />
                    <span className="text-xs text-slate-700 flex-1">{s.title}</span>
                  </label>
                  {isOn && onSetDifficulty && (
                    <div className="mt-1.5 ml-6 inline-flex items-center gap-0.5 bg-white border rounded text-[10px] font-bold uppercase">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.preventDefault();
                          onSetDifficulty(s.id, 'normal');
                        }}
                        className={`px-2 py-0.5 rounded-l ${
                          level === 'normal'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Leaders capitulate when concerns are answered (recommended)"
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.preventDefault();
                          onSetDifficulty(s.id, 'hard');
                        }}
                        className={`px-2 py-0.5 rounded-r ${
                          level === 'hard'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Leaders resist indefinitely; original behavior"
                      >
                        Hard
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {assigned.length > 0 && (
              <div className="border-t mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => onAssign([])}
                  disabled={busy}
                  className="w-full text-left text-xs text-rose-700 hover:bg-rose-50 rounded px-2 py-1.5"
                >
                  Clear all assignments
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserMeta({ user, scenarioOptions = [] }) {
  const assigned = userAssignedIds(user);
  const titles = assigned
    .map((id) => scenarioOptions.find((s) => s.id === id)?.title)
    .filter(Boolean);
  return (
    <div className="min-w-0 flex items-center gap-3">
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
        <UserIcon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">
            {user.rank} {user.lastName}
          </span>
          {titles.map((title) => (
            <span
              key={title}
              className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase truncate max-w-xs"
            >
              {title}
            </span>
          ))}
          {user.role === 'admin' && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" />
              Admin
            </span>
          )}
          {user.status === 'pending' && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase">
              Pending
            </span>
          )}
          {user.status === 'rejected' && (
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">
              Rejected
            </span>
          )}
          {user.demo && (
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
              Demo
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
          <Mail className="h-3 w-3" />
          <span className="truncate">{user.email}</span>
        </div>
      </div>
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
              Their profile will be deleted and they will lose access
              immediately. Their past transcripts and submissions will stay
              in the database. The Firebase Auth account itself is untouched
              — they could register again unless you also delete the auth
              record server-side.
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
            {working ? 'Removing…' : 'Remove User'}
          </button>
        </div>
      </div>
    </div>
  );
}
