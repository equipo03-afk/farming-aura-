import React from 'react';
import { AppTab, Language } from '../types/aura';
import { playClickSound } from '../utils/sound';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  language: Language;
  soundEnabled: boolean;
  historyCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  language,
  soundEnabled,
  historyCount,
}) => {
  const items: Array<{ id: AppTab; icon: string; labelEs: string; labelEn: string }> = [
    { id: 'home', icon: 'sports_esports', labelEs: 'INICIO', labelEn: 'HOME' },
    { id: 'ranking', icon: 'leaderboard', labelEs: 'RANKING', labelEn: 'RANKING' },
    { id: 'history', icon: 'history_toggle_off', labelEs: 'HISTORIAL', labelEn: 'HISTORY' },
    { id: 'profile', icon: 'shield_person', labelEs: 'PERFIL', labelEn: 'PROFILE' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(87,27,193,0.25)] border-t border-outline-variant/30">
      <div className="flex justify-around items-stretch h-16 px-space-xs">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                playClickSound(soundEnabled);
                onSelectTab(item.id);
              }}
              className={`relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] flex-1 transition-colors gap-0.5 cursor-pointer ${
                isActive
                  ? 'text-tertiary shadow-[inset_0_-2px_0_0_#00e478]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              <span className="font-label-md text-label-md tracking-wider uppercase">
                {language === 'es' ? item.labelEs : item.labelEn}
              </span>
              {item.id === 'history' && historyCount > 0 && (
                <span className="absolute top-1.5 right-4 bg-primary-container text-on-primary-container px-1 text-[9px] font-extrabold leading-tight shadow-[1px_1px_0px_#000]">
                  {historyCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
