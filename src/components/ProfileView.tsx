import React, { useState } from 'react';
import { AppSettings, RoastIntensity, ScanHistoryItem, formatAuraScore } from '../types/aura';
import { playClickSound } from '../utils/sound';

interface ProfileViewProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  history: ScanHistoryItem[];
  userLevel: number;
  userRankTitle: string;
  onClearHistory: () => void;
  onGoToScan: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  settings,
  onUpdateSettings,
  history,
  userLevel,
  userRankTitle,
  onClearHistory,
  onGoToScan,
}) => {
  const isEs = settings.language === 'es';
  const [handleDraft, setHandleDraft] = useState(settings.handle);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const bestScan =
    history.length > 0 ? history.reduce((a, b) => (b.score > a.score ? b : a), history[0]) : null;
  const worstScan =
    history.length > 0 ? history.reduce((a, b) => (b.score < a.score ? b : a), history[0]) : null;

  const saveHandle = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound(settings.soundEnabled);
    const cleaned = handleDraft.trim() || '@sigma_farmer';
    const normalized = cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
    setHandleDraft(normalized);
    onUpdateSettings({ handle: normalized });
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="flex flex-col w-full px-margin-mobile gap-space-md pb-8">
      {/* Profile Hero Card */}
      <div className="bg-surface-container-lowest p-space-md shadow-[4px_4px_0px_#571bc1] flex items-center gap-4">
        <div className="w-16 h-16 bg-secondary-container p-1 shrink-0 shadow-[2px_2px_0px_#00e478]">
          <img src="/assets/tom-aura.png" alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-label-md text-[10px] text-tertiary uppercase tracking-widest">
            {isEs ? `NVL ${userLevel} // ${userRankTitle}` : `LVL ${userLevel} // ${userRankTitle}`}
          </span>
          <h1 className="font-headline-md text-on-surface uppercase truncate">{settings.handle}</h1>
          <span className="font-body-md text-xs text-on-surface-variant">
            {history.length} {isEs ? 'escaneos completados' : 'scans completed'}
          </span>
        </div>
      </div>

      {/* Handle Editor */}
      <form
        onSubmit={saveHandle}
        className="bg-surface-container-low p-space-sm shadow-[2px_2px_0px_#000000] flex flex-col gap-2"
      >
        <label className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-widest">
          {isEs ? '[ TU ALIAS EN EL RANKING ]' : '[ YOUR LEADERBOARD HANDLE ]'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={24}
            value={handleDraft}
            onChange={(e) => setHandleDraft(e.target.value)}
            className="flex-1 bg-surface-container-lowest border-2 border-surface-container-highest focus:border-tertiary px-3 py-2 text-[16px] font-medium text-on-surface outline-none"
            placeholder="@sigma_farmer"
          />
          <button
            type="submit"
            className="bg-tertiary text-on-tertiary px-4 font-label-md uppercase shadow-[2px_2px_0px_#000000] cursor-pointer"
          >
            {savedToast ? 'OK!' : isEs ? 'GUARDAR' : 'SAVE'}
          </button>
        </div>
      </form>

      {/* Personal Records */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-container-lowest p-space-sm shadow-[3px_3px_0px_#00e478]">
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase block">
            {isEs ? 'MEJOR AURA' : 'BEST AURA'}
          </span>
          <span className="font-headline-md text-tertiary">
            {bestScan ? formatAuraScore(bestScan.score) : '—'}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-space-sm shadow-[3px_3px_0px_#93000a]">
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase block">
            {isEs ? 'PEOR CAÍDA' : 'WORST L'}
          </span>
          <span className="font-headline-md text-error">
            {worstScan ? formatAuraScore(worstScan.score) : '—'}
          </span>
        </div>
      </div>

      {/* Settings Section */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">settings</span>
          <h2 className="font-headline-md text-on-surface uppercase tracking-tight">
            {isEs ? 'CONFIGURACIÓN' : 'SETTINGS'}
          </h2>
        </div>

        {/* AI Personality Mode */}
        <div className="bg-surface-container-lowest p-space-sm shadow-[2px_2px_0px_#571bc1] flex flex-col gap-2">
          <span className="font-label-md text-[10px] text-secondary uppercase tracking-wider">
            {isEs ? 'MODO DE EVALUACIÓN IA' : 'AI EVALUATION PERSONALITY'}
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'normal', labelEs: 'NORMAL', labelEn: 'BALANCED' },
                { id: 'savage', labelEs: 'ROAST 🔥', labelEn: 'SAVAGE 🔥' },
                { id: 'hype', labelEs: 'HYPE ⚡', labelEn: 'HYPE ⚡' },
              ] as Array<{ id: RoastIntensity; labelEs: string; labelEn: string }>
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  playClickSound(settings.soundEnabled);
                  onUpdateSettings({ roastIntensity: mode.id });
                }}
                className={`py-2 font-label-md text-[11px] uppercase cursor-pointer ${
                  settings.roastIntensity === mode.id
                    ? 'bg-primary-container text-on-primary-container shadow-[2px_2px_0px_#000000]'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {isEs ? mode.labelEs : mode.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Language Toggle */}
        <div className="bg-surface-container-lowest p-space-sm shadow-[2px_2px_0px_#571bc1] flex items-center justify-between">
          <div>
            <span className="font-title-md text-on-surface uppercase block">
              {isEs ? 'IDIOMA / LANGUAGE' : 'LANGUAGE / IDIOMA'}
            </span>
            <span className="font-body-md text-xs text-on-surface-variant">
              {isEs ? 'Interfaz y veredictos de la IA' : 'UI & AI verdict language'}
            </span>
          </div>
          <div className="flex gap-1">
            {(['es', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  playClickSound(settings.soundEnabled);
                  onUpdateSettings({ language: lang });
                }}
                className={`px-3 py-1.5 font-label-md uppercase cursor-pointer ${
                  settings.language === lang
                    ? 'bg-tertiary text-on-tertiary shadow-[2px_2px_0px_#000000]'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Arcade Sound Toggle */}
        <button
          type="button"
          onClick={() => {
            const next = !settings.soundEnabled;
            onUpdateSettings({ soundEnabled: next });
            if (next) playClickSound(true);
          }}
          className="bg-surface-container-lowest p-space-sm shadow-[2px_2px_0px_#571bc1] flex items-center justify-between cursor-pointer text-left"
        >
          <div>
            <span className="font-title-md text-on-surface uppercase block">
              {isEs ? 'SONIDOS ARCADE' : 'ARCADE SFX'}
            </span>
            <span className="font-body-md text-xs text-on-surface-variant">
              {isEs ? 'Efectos retro al escanear y revelar aura' : 'Retro synth effects during scans'}
            </span>
          </div>
          <span
            className={`px-3 py-1 font-label-md uppercase ${
              settings.soundEnabled
                ? 'bg-tertiary text-on-tertiary'
                : 'bg-surface-container-high text-outline'
            }`}
          >
            {settings.soundEnabled ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Studio Flash Toggle */}
        <button
          type="button"
          onClick={() => {
            playClickSound(settings.soundEnabled);
            onUpdateSettings({ flashEnabled: !settings.flashEnabled });
          }}
          className="bg-surface-container-lowest p-space-sm shadow-[2px_2px_0px_#571bc1] flex items-center justify-between cursor-pointer text-left"
        >
          <div>
            <span className="font-title-md text-on-surface uppercase block">
              {isEs ? 'FLASH DE ESTUDIO' : 'STUDIO FLASH'}
            </span>
            <span className="font-body-md text-xs text-on-surface-variant">
              {isEs ? 'Iluminación extra al tomar selfie' : 'Extra ring-light flash on capture'}
            </span>
          </div>
          <span
            className={`px-3 py-1 font-label-md uppercase ${
              settings.flashEnabled
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-high text-outline'
            }`}
          >
            {settings.flashEnabled ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Quick Scan CTA */}
        <button
          type="button"
          onClick={() => {
            playClickSound(settings.soundEnabled);
            onGoToScan();
          }}
          className="w-full bg-tertiary text-on-tertiary py-3 font-headline-md uppercase shadow-[4px_4px_0px_#000000] cursor-pointer mt-1"
        >
          {isEs ? 'IR AL ESCÁNER DE AURA ⚡' : 'OPEN AURA SCANNER ⚡'}
        </button>

        {history.length > 0 &&
          (!confirmReset ? (
            <button
              type="button"
              onClick={() => {
                playClickSound(settings.soundEnabled);
                setConfirmReset(true);
              }}
              className="w-full bg-surface-container-low text-error py-2 font-label-md uppercase shadow-[2px_2px_0px_#93000a] cursor-pointer"
            >
              {isEs ? 'REINICIAR ESTADÍSTICAS LOCALES' : 'RESET LOCAL STATS'}
            </button>
          ) : (
            <div className="bg-error-container p-3 flex items-center justify-between gap-2 shadow-[3px_3px_0px_#000000]">
              <span className="font-label-md text-xs text-on-error-container uppercase">
                {isEs ? '¿BORRAR TODO TU HISTORIAL?' : 'RESET ALL LOCAL HISTORY?'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="bg-surface-container-lowest text-on-surface px-3 py-1 font-label-md text-xs uppercase cursor-pointer"
                >
                  {isEs ? 'NO' : 'NO'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound(settings.soundEnabled);
                    setConfirmReset(false);
                    onClearHistory();
                  }}
                  className="bg-surface-container-lowest text-error px-3 py-1 font-label-md text-xs uppercase cursor-pointer"
                >
                  {isEs ? 'SÍ' : 'YES'}
                </button>
              </div>
            </div>
          ))}
      </section>
    </div>
  );
};
