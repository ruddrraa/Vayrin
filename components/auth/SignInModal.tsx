import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, Building2, Activity, Truck, Loader2 } from 'lucide-react';
import { Role } from '../../types';
import { supabase } from '../../supabaseClient';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: Role;
  onSwitchToSignUp: () => void;
  onSuccess: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onSwitchToSignUp,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const getRoleIcon = () => {
    switch (targetRole) {
      case 'HOSPITAL': return <Building2 size={12} />;
      case 'USER': return <Activity size={12} />;
      case 'DRIVER': return <Truck size={12} />;
      default: return <Activity size={12} />;
    }
  };

  const getRoleColor = () => {
    switch (targetRole) {
      case 'HOSPITAL': return 'blue';
      case 'USER': return 'rose';
      case 'DRIVER': return 'amber';
      default: return 'blue';
    }
  };

  const color = getRoleColor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[SignIn] Attempting login for:', email);
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        console.error('[SignIn] Auth error:', authError);
        throw authError;
      }

      if (!data.user || !data.session) {
        throw new Error('No user/session returned from authentication');
      }

      console.log('[SignIn] Auth success, user:', data.user.email);
      
      // Close modal immediately - AppContext will handle the rest
      setIsLoading(false);
      onSuccess();
      
    } catch (err: any) {
      console.error('[SignIn] Error:', err);
      setIsLoading(false);
      
      // Better error messages
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    }
  };

  const colorClasses = {
    blue: {
      badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20',
      link: 'text-blue-400',
    },
    rose: {
      badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      button: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20',
      link: 'text-rose-400',
    },
    amber: {
      badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20',
      link: 'text-amber-400',
    },
  };

  const styles = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl p-8 z-10 overflow-hidden"
      >
        {/* Decorative Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500" />
        <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] bg-blue-500/10 rounded-full blur-[60px]" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-8 relative z-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 border ${styles.badge}`}>
            {getRoleIcon()}
            {targetRole} PORTAL
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-slate-500 text-sm">Enter your credentials to access the network.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 ml-1">Email Address</label>
            <input
              type="email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 ml-1">Password</label>
            <input
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${styles.button} ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-slate-500">
          New to LifeLine?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className={`font-semibold hover:underline ${styles.link}`}
          >
            Sign Up
          </button>
        </div>
      </motion.div>
    </div>
  );
};
