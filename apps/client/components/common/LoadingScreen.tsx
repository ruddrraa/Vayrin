import React from 'react';
import { Activity } from 'lucide-react';

export const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
    <div className="relative">
      {/* Subtle pulse */}
      <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl animate-pulse" />

      {/* Logo */}
      <div className="relative w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-black/40 mb-8">
        <Activity size={40} className="text-black" />
      </div>
    </div>

    <div className="text-center">
      <h1 className="text-2xl font-bold text-white mb-2">VAYRIN</h1>
      <div className="flex items-center gap-2 text-white/60">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

export default LoadingScreen;
