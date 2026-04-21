import React from 'react';
import { Settings } from 'lucide-react';
import Header from './Header';
import { hasFirebase } from '../config/firebase';

export default function Landing({
  studentRank,
  setStudentRank,
  studentName,
  setStudentName,
  onStudentLogin,
  onAdminClick,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (studentRank.trim() && studentName.trim()) onStudentLogin();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Header view="landing" />
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            Simulation Access
          </h2>
          {!hasFirebase && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
              Firebase not configured. Add your <code>.env.local</code> values
              to enable persistence.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rank
              </label>
              <input
                type="text"
                required
                placeholder="e.g., MAJ"
                value={studentRank}
                onChange={(e) => setStudentRank(e.target.value)}
                className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Smith"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-700 text-white py-3 rounded-md font-semibold hover:bg-emerald-800 transition-colors"
            >
              Enter Scenario
            </button>
          </form>
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
