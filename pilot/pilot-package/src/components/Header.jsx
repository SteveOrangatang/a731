import React from 'react';
import { Shield, Settings, ArrowLeft } from 'lucide-react';

export default function Header({ onAdminClick, onBack, backLabel }) {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              A731 Pilot Preview
            </h1>
            <p className="text-xs text-slate-400">
              Ethical Decision-Making Simulator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel || 'Back'}
            </button>
          )}
          {onAdminClick && (
            <button
              onClick={onAdminClick}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
              title="Open admin"
            >
              <Settings className="h-4 w-4" />
              Admin
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
