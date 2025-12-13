import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, Building2, Activity, Truck, Loader2, CheckCircle2 } from 'lucide-react';
import { Role } from '../../types';
import { supabase } from '../../supabaseClient';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: Role;
  onSwitchToSignIn: () => void;
  onSuccess: () => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onSwitchToSignIn,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const getNamePlaceholder = () => {
    switch (targetRole) {
      case 'HOSPITAL': return "e.g. St. Mary's Hospital";
      case 'DRIVER': return "e.g. John Driver";
      default: return "e.g. John Doe";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[SignUp] Attempting registration for:', email, 'as', targetRole);

      // Step 1: Create auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            role: targetRole,
          },
        },
      });

      console.log('[SignUp] Auth response:', { data, error: authError });

      if (authError) {
        throw authError;
      }

      if (!data.user) {
        throw new Error('No user returned from registration');
      }

      // Step 2: Create profile directly (don't wait for trigger)
      console.log('[SignUp] Creating profile for user:', data.user.id);
      
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email.trim(),
        name: name.trim(),
        role: targetRole,
        is_hospital_open: targetRole === 'HOSPITAL' ? true : null,
      });

      if (profileError) {
        console.error('[SignUp] Profile creation error:', profileError);
        // Don't throw - user is created, profile will be created on first login
      }

      console.log('[SignUp] Success!');

      // Check if email confirmation is required
      if (data.session) {
        // Session exists = auto-confirmed (development mode or email not required)
        onSuccess();
      } else {
        // No session = email confirmation required
        setShowSuccess(true);
      }
    } catch (err: any) {
      console.error('[SignUp] Error:', err);

      // Better error messages
      if (err.message?.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.message?.includes('valid email')) {
        setError('Please enter a valid email address.');
      } else if (err.message?.includes('Password')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
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

  // Success state - email confirmation needed
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl p-8 z-10 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
          <p className="text-slate-400 mb-6">
            We've sent a confirmation link to <span className="text-white font-medium">{email}</span>. 
            Click the link to activate your account.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
          >
            Got it
          </button>
        </motion.div>
      </div>
    );
  }

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
        <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-[60px]" />

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
          <h2 className="text-3xl font-bold text-white mb-2">Join LifeLine</h2>
          <p className="text-slate-500 text-sm">Create your account to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 ml-1">
              {targetRole === 'HOSPITAL' ? 'Hospital Name' : 'Full Name'}
            </label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
              placeholder={getNamePlaceholder()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              disabled={isLoading}
            />
          </div>
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
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 ml-1">Minimum 6 characters</p>
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
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className={`font-semibold hover:underline ${styles.link}`}
          >
            Log In
          </button>
        </div>
      </motion.div>
    </div>
  );
};
