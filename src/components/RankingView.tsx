import React, { useMemo, useState } from 'react';
import { AppSettings, FeedEntry, ScanHistoryItem, classifyAuraScore, formatAuraScore } from '../types/aura';
import { playClickSound } from '../utils/sound';

interface RankingViewProps {
  settings: AppSettings;
  leaderboard: FeedEntry[];
  userHistory: ScanHistoryItem[];
  onRefresh: () => void;
  onGoToScan: () => void;
}

type RankingFilter = 'all' | 'sigma' | 'negative';

export const RankingView: React.FC<RankingViewProps> = ({
  settings,
  leaderboard,
  userHistory,
  onRefresh,
  onGoToScan,
}) => {
  const isEs = settings.language === 'es';
  const [filter, setFilter] = useState<RankingFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const mergedEntries = useMemo(() => {
    const map = new Map<string, FeedEntry>();
    for (const item of leaderboard) {
      map.set(item.id, item);
    }
    for (const u of userHistory) {
      map.set(u.id, {
        id: u.id,
        handle: u.handle,
        score: u.score,
        category: u.category,
        comment: u.funnyComment,
        createdAt: u.createdAt,
        isUser: true,
      });
    }
    const list = Array.from(map.values());
    if (filter === 'sigma') {
      return list.filter((e) => e.score >= 50000).sort((a, b) => b.score - a.score);
    }
    if (filter === 'negative') {
      return list.filter((e) => e.score <= 0).sort((a, b) => a.score - b.score);
    }
    return list.sort((a, b) => b.score - a.score);
  }, [leaderboard, userHistory, filter]);

  const handleRefresh = async () => {
    playClickSound(settings.soundEnabled);
    setRefreshing(true);
    await onRefresh();
    window.setTimeout(() => setRefreshing(false), 350);
  };

  return (
    <div className="flex flex-col w-full px-margin-mobile gap-space-md pb-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-label-md text-[10px] text-primary tracking-widest uppercase">
            {isEs ? '[ TABLA GLOBAL EN VIVO ]' : '[ LIVE GLOBAL LEADERBOARD ]'}
          </span>
          <h1 className="font-headline-lg-mobile text-on-surface uppercase tracking-tight">
            {isEs ? 'RANKING DE AURA' : 'AURA RANKING'}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="bg-surface-container-high px-2.5 py-2 shadow-[2px_2px_0px_#571bc1] text-tertiary hover:bg-surface-container-highest cursor-pointer flex items-center gap-1"
          title={isEs ? 'Actualizar ranking' : 'Refresh ranking'}
        >
          <span className={`material-symbols-outlined text-lg ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          <span className="font-label-md text-[10px] uppercase">{isEs ? 'SYNC' : 'SYNC'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-surface-container-lowest p-1 shadow-[2px_2px_0px_#571bc1]">
        {(
          [
            { id: 'all', labelEs: 'GLOBAL', labelEn: 'GLOBAL' },
            { id: 'sigma', labelEs: 'TOP SIGMA', labelEn: 'TOP SIGMA' },
            { id: 'negative', labelEs: 'CAÍDOS 💀', labelEn: 'L TIER 💀' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              setFilter(tab.id);
            }}
            className={`py-2 font-label-md text-label-md uppercase tracking-wider cursor-pointer transition-colors ${
              filter === tab.id
                ? 'bg-tertiary text-on-tertiary shadow-[2px_2px_0px_#000000]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {isEs ? tab.labelEs : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Ranked Cards */}
      <div className="flex flex-col gap-2">
        {mergedEntries.length === 0 ? (
          <div className="bg-surface-container-lowest p-space-md text-center shadow-[3px_3px_0px_#571bc1]">
            <p className="font-body-md text-on-surface-variant">
              {filter === 'all'
                ? isEs
                  ? 'Aún no hay escaneos registrados. ¡Escanea tu primera foto para inaugurar el ranking!'
                  : 'No scans recorded yet. Scan your first photo to kick off the ranking!'
                : isEs
                ? 'No hay registros en esta categoría todavía.'
                : 'No entries in this category yet.'}
            </p>
          </div>
        ) : (
          mergedEntries.map((entry, idx) => {
            const tier = classifyAuraScore(entry.score);
            const rankNum = idx + 1;
            return (
              <div
                key={entry.id}
                style={{ boxShadow: `3px 3px 0px ${entry.isUser ? '#00e478' : tier.shadowColor}` }}
                className={`bg-surface-container-lowest p-space-sm flex flex-col gap-1.5 ${
                  entry.isUser ? 'border border-tertiary' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-7 h-7 flex items-center justify-center font-headline-md text-sm shrink-0 ${
                        rankNum === 1
                          ? 'bg-tertiary text-on-tertiary'
                          : rankNum === 2
                          ? 'bg-primary-container text-on-primary-container'
                          : rankNum === 3
                          ? 'bg-secondary-container text-secondary'
                          : 'bg-surface-container-high text-on-surface'
                      }`}
                    >
                      #{rankNum}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-title-md text-on-surface font-extrabold truncate">
                          {entry.handle}
                        </span>
                        {entry.isUser && (
                          <span className="bg-tertiary text-on-tertiary px-1 text-[9px] font-extrabold uppercase">
                            {isEs ? 'TÚ' : 'YOU'}
                          </span>
                        )}
                      </div>
                      <span className={`font-label-md text-[10px] uppercase ${tier.textClass}`}>
                        {entry.category}
                      </span>
                    </div>
                  </div>
                  <span className={`font-headline-md text-lg font-black shrink-0 ${tier.textClass}`}>
                    {formatAuraScore(entry.score)}
                  </span>
                </div>
                <p className="font-body-md text-xs text-on-surface-variant italic line-clamp-2">
                  &ldquo;{entry.comment}&rdquo;
                </p>
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          playClickSound(settings.soundEnabled);
          onGoToScan();
        }}
        className="w-full bg-tertiary text-on-tertiary p-3.5 flex items-center justify-center gap-2 shadow-[4px_4px_0px_#571bc1] font-headline-md uppercase cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
      >
        <span className="material-symbols-outlined">photo_camera</span>
        <span>{isEs ? 'ESCANEAR PARA SUBIR EN EL RANKING' : 'SCAN TO CLIMB THE RANKING'}</span>
      </button>
    </div>
  );
};
