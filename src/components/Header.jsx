import React from 'react';
import { Shield, LogOut } from 'lucide-react';

export default function Header({ view, onExit }) {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              A731 Leadership Simulator
            </h1>
            <p className="text-xs text-slate-400">
              Leading Up: Morally Courageous Followership
            </p>
          </div>
        </div>
        {view !== 'landing' && (
          <button
            onClick={onExit}
            className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Exit</span>
          </button>
        )}
      </div>
    </header>
  );
}
