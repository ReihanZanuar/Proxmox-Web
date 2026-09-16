import React from 'react';
import { Layers, Terminal, Activity, Palette } from 'lucide-react';

export type TabId = 'instances' | 'ssh' | 'cluster' | 'settings';

interface BottomNavProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  runningCount: number;
  hasActiveSSH?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  runningCount,
  hasActiveSSH = false,
}) => {
  const tabs = [
    {
      id: 'instances' as TabId,
      label: 'Instances',
      icon: Layers,
      badge: runningCount > 0 ? `${runningCount}` : undefined,
    },
    {
      id: 'ssh' as TabId,
      label: hasActiveSSH ? 'SSH (Live)' : 'Quick SSH',
      icon: Terminal,
      dot: hasActiveSSH,
    },
    {
      id: 'cluster' as TabId,
      label: 'Nodes',
      icon: Activity,
    },
    {
      id: 'settings' as TabId,
      label: 'Settings',
      icon: Palette,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-theme-surface border-t border-theme-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full py-1 relative transition-all ${
                isActive
                  ? 'text-theme-accent font-bold scale-105'
                  : 'text-theme-text-muted hover:text-theme-text-primary'
              }`}
              aria-label={tab.label}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${isActive ? 'stroke-[2.25px]' : 'stroke-[1.75px]'}`}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-theme-running text-white">
                    {tab.badge}
                  </span>
                )}
                {tab.dot && !tab.badge && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-theme-running animate-pulse ring-2 ring-theme-surface" />
                )}
              </div>
              <span className={`text-[11px] mt-1 ${isActive ? 'font-bold text-theme-text-primary' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-theme-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
