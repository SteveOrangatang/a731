import React, { useState } from 'react';
import { Shield, Lock, ShieldAlert } from 'lucide-react';
import { SUPER_ADMIN_PASSCODE } from '../config/constants';

export default function SiteAccessGate({ siteAccessCodes, onGranted }) {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError]         = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = codeInput.trim();
    if (code === SUPER_ADMIN_PASSCODE || siteAccessCodes.includes(code)) {
      sessionStorage.setItem('a731_access', 'true');
      onGranted();
    } else {
      setError('Invalid access code. Contact your instructor.');
      setCodeInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full text-center">
        {/* Branding */}
        <div className="mb-10">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-14 w-14 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
            A731 Leadership Simulator
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Leading Up: Morally Courageous Followership
          </p>
        </div>

        {/* Code card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-white uppercase tracking-widest">
              Access Required
            </h2>
          </div>
          <p className="text-slate-400 text-xs mb-6">
            Enter the access code provided by your instructor.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              required
              autoFocus
              placeholder="••••••••"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500 text-center tracking-[0.35em] text-lg font-mono"
            />
            {error && (
              <p className="flex items-center justify-center gap-1.5 text-red-400 text-xs font-medium">
                <ShieldAlert className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-amber-500 text-slate-900 py-3 rounded-lg font-bold hover:bg-amber-400 active:scale-[0.98] transition-all text-sm uppercase tracking-widest"
            >
              Enter
            </button>
          </form>
        </div>

        <p className="text-slate-700 text-xs mt-8">
          CGSC Fort Leavenworth · A731
        </p>
      </div>
    </div>
  );
}
