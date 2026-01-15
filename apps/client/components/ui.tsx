import React from 'react';
import { motion as motionOriginal, HTMLMotionProps } from 'framer-motion';

const motion = motionOriginal as any;

// Glass Card - Dark theme compatible
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
    whileHover={onClick ? { scale: 1.02 } : {}}
    onClick={onClick}
    className={`bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl shadow-black/20 rounded-3xl p-6 transition-colors ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

// Primary Button
interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', isLoading, className = '', disabled, ...props }) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-xl',
    md: 'px-6 py-3 rounded-2xl',
    lg: 'px-8 py-4 text-lg rounded-2xl'
  };
  const baseStyle = `relative overflow-hidden font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ${sizeStyles[size]}`;
  
  const variants = {
    primary: "bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10 focus:ring-white",
    secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-sm focus:ring-white/50",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/30 focus:ring-rose-500",
    ghost: "bg-transparent text-white/70 hover:bg-white/10"
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

// Input Field - Dark theme
export const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all ${className}`}
    {...props}
  />
);

export const Select = ({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select
      className={`w-full appearance-none bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all ${className}`}
      {...props}
    />
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
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
    <label className={`block text-xs font-semibold text-white/60 ml-1 mb-1 ${className}`} {...props}>
        {children}
    </label>
);