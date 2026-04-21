import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { SUPER_ADMIN_PASSCODE } from '../config/constants';

export default function AdminLogin({ storedPasscodes, onSuccess, onBack }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode === SUPER_ADMIN_PASSCODE || storedPasscodes.includes(passcode)) {
      onSuccess();
      setError('');
    } else {
      setError('Invalid passcode.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center">
          <ShieldAlert className="h-6 w-6 mr-2 text-amber-500" />
          Admin Access
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            placeholder="Admin Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full px-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-slate-500"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full bg-slate-800 text-white py-2 rounded-md font-semibold hover:bg-slate-900 transition-colors"
          >
            Login
          </button>
        </form>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-slate-500 w-full text-center hover:text-slate-700"
        >
          Return
        </button>
      </div>
    </div>
  );
}
