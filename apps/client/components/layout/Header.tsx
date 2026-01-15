import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        {subtitle && <div className="mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </header>
  );
};

export default Header;
