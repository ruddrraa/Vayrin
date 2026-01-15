import React from 'react';
import { Activity, LogOut } from 'lucide-react';

interface SidebarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onLogout,
}) => {
  return (
    <aside className="w-20 lg:w-64 bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col items-center lg:items-start py-8 lg:px-6 fixed h-full z-20 transition-all duration-300 overflow-y-auto">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3 text-white font-bold text-2xl shrink-0">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-black/40">
          <Activity className="text-black" size={20} />
        </div>
        <span className="hidden lg:block tracking-tight">VAYRIN</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 w-full space-y-4 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {tab.icon}
            <span className="hidden lg:block font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="mt-8 lg:mt-auto flex items-center gap-4 text-white/60 hover:text-white px-4 mb-4 shrink-0 cursor-pointer"
      >
        <LogOut size={24} />
        <span className="hidden lg:block">Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
