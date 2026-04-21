import React, { useState } from 'react';
import { Settings, Mail, Lock, User, Award } from 'lucide-react';
import Header from './Header';
import { hasFirebase } from '../config/firebase';

/**
 * Landing screen: shows login or signup form.
 * On success, onLogin fires and App.jsx routes the student to the dashboard.
 */
export default function AuthPanel({ auth, onAdminClick }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rank, setRank] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await auth.signUp({
          email: email.trim(),
          password,
          rank: rank.trim().toUpperCase(),
          lastName: lastName.trim(),
        });
      } else {
        await auth.signIn({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err?.message?.replace('Firebase: ', '') || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header view="landing" />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">
            {mode === 'signup' ? 'Create Student Account' : 'Student Sign In'}
          </h2>
          <p className="text-xs text-slate-500 text-center mb-6">
            {mode === 'signup'
              ? 'Register to access the leadership simulation and your personal dashboard.'
              : 'Log in to view your lessons, past chats, and submitted papers.'}
          </p>
          {!hasFirebase && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
              Firebase not configured. Add your <code>.env.local</code> values
              to enable persistence.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Rank
                    </label>
                    <div className="relative">
                      <Award className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="MAJ"
                        value={rank}
                        onChange={(e) => setRank(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.mil"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded p-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-emerald-700 text-white py-3 rounded-md font-semibold hover:bg-emerald-800 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Working…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setError('');
                setMode(mode === 'signup' ? 'login' : 'signup');
              }}
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium"
            >
              {mode === 'signup'
                ? 'Have an account? Sign in.'
                : 'New here? Create an account.'}
            </button>
          </div>

          <div className="mt-10 pt-6 border-t text-center">
            <button
              onClick={onAdminClick}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center w-full"
            >
              <Settings className="h-3 w-3 mr-1" />
              Admin Portal
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
