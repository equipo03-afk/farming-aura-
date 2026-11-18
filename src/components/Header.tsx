import React from 'react';
import { AppSettings, AppTab } from '../types/aura';
import { playClickSound } from '../utils/sound';

interface HeaderProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  settings: AppSettings;
  userLevel: number;
  userRankTitle: string;
  flashBoost: boolean;
  onToggleFlash: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  settings,
  userLevel,
  userRankTitle,
  flashBoost,
  onToggleFlash,
}) => {
  const isEs = settings.language === 'es';

  if (activeTab === 'scan') {
    return (
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 pt-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label={isEs ? 'Volver' : 'Go back'}
              onClick={() => {
                playClickSound(settings.soundEnabled);
                onNavigate('home');
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-container-high text-on-surface hover:text-tertiary active:translate-y-0.5 transition-all shadow-[2px_2px_0px_#571bc1] cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 bg-surface-container-high flex items-center justify-center shadow-[2px_2px_0px_#571bc1]">
                <span className="material-symbols-outlined text-tertiary text-xl drop-shadow-[0_0_8px_#00e478]">
                  bolt
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md tracking-tight text-on-surface uppercase leading-none">
                  Aura Capture
                </span>
                <span className="font-label-md text-[10px] text-tertiary tracking-widest leading-none uppercase mt-0.5">
                  AURA SCANNER
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              aria-label={isEs ? 'Alternar flash de estudio' : 'Toggle studio flash'}
              onClick={() => {
                playClickSound(settings.soundEnabled);
                onToggleFlash();
              }}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center font-headline-md px-3 text-label-lg tracking-widest uppercase shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
                flashBoost
                  ? 'bg-tertiary text-on-tertiary'
                  : 'bg-primary text-on-primary-fixed'
              }`}
              title={isEs ? 'Flash de estudio' : 'Studio flash'}
            >
              <span className="material-symbols-outlined text-xl">
                {flashBoost ? 'flash_on' : 'flash_off'}
              </span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  const tabTitles: Record<Exclude<AppTab, 'scan'>, { es: string; en: string }> = {
    home: { es: 'INICIO', en: 'HOME' },
    ranking: { es: 'RANKING', en: 'RANKING' },
    history: { es: 'HISTORIAL', en: 'HISTORY' },
    profile: { es: 'PERFIL', en: 'PROFILE' },
  };

  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm">
        <button
          type="button"
          onClick={() => {
            playClickSound(settings.soundEnabled);
            onNavigate('home');
          }}
          className="flex items-center gap-space-sm cursor-pointer text-left"
        >
          <div className="w-8 h-8 bg-tertiary text-on-tertiary flex items-center justify-center shadow-[2px_2px_0px_#571bc1]">
            <span className="material-symbols-outlined text-xl font-black">bolt</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface uppercase leading-none">
              {isEs ? tabTitles[activeTab].es : tabTitles[activeTab].en}
            </span>
            <span className="font-label-md text-[9px] text-primary tracking-widest uppercase leading-none mt-0.5">
              AURA SCANNER
            </span>
          </div>
        </button>

        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              onNavigate('profile');
            }}
            className="flex items-center gap-1 bg-surface-container-high px-space-xs py-1 shadow-[2px_2px_0px_#571bc1] cursor-pointer hover:bg-surface-container-highest transition-colors"
            title={isEs ? 'Ver nivel y configuración' : 'View level & settings'}
          >
            <span className="material-symbols-outlined text-tertiary text-[14px]">bolt</span>
            <span className="font-label-md text-label-md text-tertiary tracking-widest uppercase">
              {isEs ? `NVL ${userLevel}` : `LVL ${userLevel}`} {userRankTitle}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              onNavigate('profile');
            }}
            aria-label={isEs ? 'Perfil y configuración' : 'Profile and settings'}
            className="p-0.5 bg-secondary-container flex items-center justify-center cursor-pointer hover:bg-primary-container transition-colors"
          >
            <img
              alt="Perfil Aura"
              className="w-8 h-8 object-cover"
              src="/assets/tom-aura.png"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
