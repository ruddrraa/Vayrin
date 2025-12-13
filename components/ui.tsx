import React from 'react';
import { motion as motionOriginal, HTMLMotionProps } from 'framer-motion';

const motion = motionOriginal as any;

// Glass Card
interface CardProps extends HTMLMotionProps<"div"> {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={onClick ? { scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.8)' } : {}}
    onClick={onClick}
    className={`bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl shadow-blue-900/5 rounded-3xl p-6 transition-colors ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

// Primary Button
interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, className = '', disabled, ...props }) => {
  const baseStyle = "relative overflow-hidden rounded-2xl px-6 py-3 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 focus:ring-blue-500",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm focus:ring-slate-400",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/30 focus:ring-rose-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100/50"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
      className={`${baseStyle} ${variants[variant]} ${className} ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
      disabled={isLoading || disabled}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? <span className="animate-spin mr-2">⟳</span> : null}
        {children}
      </span>
    </motion.button>
  );
};

// Input Field
export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
    {...props}
  />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select
      className="w-full appearance-none bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
      {...props}
    />
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      ▼
    </div>
  </div>
);

// Form Label
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Label = ({ children, className = '', ...props }: LabelProps) => (
    <label className={`block text-xs font-semibold text-slate-500 ml-1 mb-1 ${className}`} {...props}>
        {children}
    </label>
);