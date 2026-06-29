import React from 'react';
import { Layers } from 'lucide-react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gov-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      {/* Brand Title Area */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex bg-gov-500/15 border border-gov-500/30 p-3 rounded-2xl mb-4 shadow-lg shadow-gov-950/20">
          <Layers className="h-8 w-8 text-gov-400" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">SETU PORTAL</h2>
        <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Single Window E-Coordination for Town Utilities
        </p>
      </div>

      {/* Auth Card Content */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="glass-panel p-6 sm:p-10 rounded-3xl shadow-glass border border-slate-800">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
