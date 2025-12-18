
import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './views/LandingPage';
import HospitalDashboard from './views/HospitalDashboard';
import UserDashboard from './views/UserDashboard';
import DriverDashboard from './views/DriverDashboard';
import { AnimatePresence, motion as motionOriginal } from 'framer-motion';
import { Activity } from 'lucide-react';

const motion = motionOriginal as any;

// Full-screen loading component
const LoadingScreen = () => (
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

const MainLayout = () => {
  const { userRole, isLoadingAuth } = useApp();

  // Show loading screen while checking auth session
  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-slate-50 text-slate-800 selection:bg-blue-200">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-400/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <AnimatePresence mode="wait">
        {userRole === 'GUEST' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10"
          >
            <LandingPage />
          </motion.div>
        )}
        {userRole === 'HOSPITAL' && (
          <motion.div
            key="hospital"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative z-10"
          >
            <HospitalDashboard />
          </motion.div>
        )}
        {userRole === 'USER' && (
          <motion.div
            key="user"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative z-10"
          >
            <UserDashboard />
          </motion.div>
        )}
         {userRole === 'DRIVER' && (
          <motion.div
            key="driver"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative z-10"
          >
            <DriverDashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}