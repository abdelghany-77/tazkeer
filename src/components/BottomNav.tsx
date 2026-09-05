import React from 'react';
import type { TabId } from '@/types';
import { Home, BookOpen, Award } from 'lucide-react';
import { MisbahaIcon } from './icons/MisbahaIcon';

interface BottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'الرئيسية', icon: <Home className="w-5 h-5" /> },
    { id: 'adhkar', label: 'الأذكار', icon: <MisbahaIcon className="w-5 h-5" /> },
    { id: 'quran', label: 'المصحف', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'profile', label: 'الإنجاز', icon: <Award className="w-5 h-5" /> },
  ];

  return (
    <nav className="bottom-nav border-t border-border-subtle/50 bg-primary-surface/90 backdrop-blur-xl z-40">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`bottom-nav-item flex-1 py-1 flex flex-col items-center justify-center transition-all ${
              isActive ? 'active text-accent-mint scale-105' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <div className={`transition-transform duration-200 ${isActive ? 'translate-y-[-2px]' : ''}`}>
              {tab.icon}
            </div>
            <span className={`text-[11px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-accent-mint' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
