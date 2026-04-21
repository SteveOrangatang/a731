import React, { useState } from 'react';
import { Lock, ShieldAlert, Shield, Key, Plus, Trash2 } from 'lucide-react';

export default function SecurityTab({
  siteAccessCodes,
  storedPasscodes,
  onAddSiteCode,
  onRemoveSiteCode,
  onAddPasscode,
  onRemovePasscode,
}) {
  const [newSiteCode, setNewSiteCode]       = useState('');
  const [siteCodeStatus, setSiteCodeStatus] = useState('');
  const [newPasscode, setNewPasscode]        = useState('');
  const [passcodeStatus, setPasscodeStatus]  = useState('');

  const handleAddSiteCode = async (e) => {
    e.preventDefault();
    const p = newSiteCode.trim();
    if (!p) return;
    try {
      await onAddSiteCode(p);
      setSiteCodeStatus('Code added.');
      setNewSiteCode('');
      setTimeout(() => setSiteCodeStatus(''), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPasscode = async (e) => {
    e.preventDefault();
    const p = newPasscode.trim();
    if (!p) return;
    try {
      await onAddPasscode(p);
      setPasscodeStatus('Passcode added.');
      setNewPasscode('');
      setTimeout(() => setPasscodeStatus(''), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl space-y-10">
        {/* ── SECTION 1: Site Access Codes ── */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
            <Lock className="h-5 w-5 mr-2 text-amber-500" />
            Site Access Codes
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            These codes unlock the splash screen entry gate. Share one with each
            student or cohort. The master key (CPTAMERICA) always works and does
            not appear here.
          </p>

          <form onSubmit={handleAddSiteCode} className="mb-6 flex gap-2">
            <div className="flex-grow relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={newSiteCode}
                onChange={(e) => setNewSiteCode(e.target.value)}
                placeholder="New access code..."
                className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-amber-400 uppercase"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-500 text-slate-900 px-6 py-2 rounded-md font-bold hover:bg-amber-400 flex items-center whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Code
            </button>
          </form>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Active Site Access Codes
            </div>
            <div className="divide-y">
              {siteAccessCodes.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 italic">
                  No codes added yet. Only the master key can access.
                </div>
              ) : (
                siteAccessCodes.map((p) => (
                  <div
                    key={p}
                    className="px-4 py-3 flex justify-between items-center hover:bg-slate-50"
                  >
                    <code className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded font-mono">
                      {p}
                    </code>
                    <button
                      onClick={() => onRemoveSiteCode(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded transition-colors"
                      title="Revoke code"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          {siteCodeStatus && (
            <p className="mt-3 text-sm text-emerald-700 font-bold">
              {siteCodeStatus}
            </p>
          )}
        </div>

        {/* ── SECTION 2: Admin Passcodes ── */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center">
            <ShieldAlert className="h-5 w-5 mr-2 text-slate-500" />
            Admin Passcodes
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            These codes grant access to this Instructor Dashboard (not the
            student sim).
          </p>

          <div className="mb-6 p-4 bg-slate-50 rounded-lg border flex items-center shadow-sm">
            <Shield className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
            <div>
              <div className="font-bold text-slate-900 text-sm">
                Master admin key active
              </div>
              <div className="text-xs text-slate-500">
                Set via VITE_SUPER_ADMIN_PASSCODE env variable
              </div>
            </div>
          </div>

          <form onSubmit={handleAddPasscode} className="mb-6 flex gap-2">
            <div className="flex-grow relative">
              <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                placeholder="New admin passcode..."
                className="w-full pl-10 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-800 text-white px-6 py-2 rounded-md font-bold hover:bg-slate-900 flex items-center whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Key
            </button>
          </form>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Additional Admin Keys
            </div>
            <div className="divide-y">
              {storedPasscodes.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 italic">
                  No additional admin keys configured.
                </div>
              ) : (
                storedPasscodes.map((p) => (
                  <div
                    key={p}
                    className="px-4 py-3 flex justify-between items-center group hover:bg-slate-50"
                  >
                    <code className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                      {p}
                    </code>
                    <button
                      onClick={() => onRemovePasscode(p)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          {passcodeStatus && (
            <p className="mt-3 text-sm text-emerald-700 font-bold">
              {passcodeStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
