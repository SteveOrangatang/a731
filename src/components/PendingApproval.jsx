import React from 'react';
import { Mail, Clock, ShieldAlert, LogOut, Settings } from 'lucide-react';
import Header from './Header';

/**
 * Shown to a signed-in user whose profile.status !== 'approved'. Students
 * wait here until an instructor approves (or rejects) their account.
 */
export default function PendingApproval({ profile, onSignOut, onAdminClick }) {
  const rejected = profile.status === 'rejected';
  const removed = profile.status === 'removed';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header view="landing" />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100 text-center">
          {rejected || removed ? (
            <>
              <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                <ShieldAlert className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Access not available
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                {rejected
                  ? 'Your account request was not approved. Contact your instructor if you believe this is a mistake.'
                  : 'Your account has been removed from this site. Contact your instructor if you need access restored.'}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-7 w-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Waiting for approval
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Thanks for registering, {profile.rank} {profile.lastName}. Your
                account is pending instructor approval. Once approved you will
                see your lessons and dashboard automatically.
              </p>
            </>
          )}

          <div className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Mail className="h-3.5 w-3.5" />
            {profile.email}
          </div>

          <div className="mt-8 flex flex-col gap-2">
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded-md font-semibold hover:bg-slate-900 transition-colors text-sm"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            <button
              onClick={onAdminClick}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-700"
            >
              <Settings className="h-3 w-3" />
              Admin Portal
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
