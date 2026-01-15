import React from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen flex bg-black text-white">
      <Sidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
      />
      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8">{children}</main>
    </div>
  );
};

export default DashboardLayout;
