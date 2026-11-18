import React, { useMemo, useState } from 'react';
import { AppSettings, ScanHistoryItem, classifyAuraScore, formatAuraScore } from '../types/aura';
import { generateAuraShareCard } from '../utils/shareCard';
import { playClickSound } from '../utils/sound';

interface HistoryViewProps {
  settings: AppSettings;
  history: ScanHistoryItem[];
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onGoToScan: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  settings,
  history,
  onDeleteItem,
  onClearAll,
  onGoToScan,
}) => {
  const isEs = settings.language === 'es';
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleSelectForCompare = (id: string) => {
    playClickSound(settings.soundEnabled);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparedPair = useMemo(() => {
    if (selectedIds.length !== 2) return null;
    const first = history.find((h) => h.id === selectedIds[0]);
    const second = history.find((h) => h.id === selectedIds[1]);
    if (!first || !second) return null;
    return [first, second] as const;
  }, [selectedIds, history]);

  const handleDownload = async (item: ScanHistoryItem) => {
    playClickSound(settings.soundEnabled);
    try {
      const { dataUrl } = await generateAuraShareCard(item, settings.language);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `aura-scanner-${item.score}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setFeedback(isEs ? '¡TARJETA PNG DESCARGADA!' : 'PNG CARD DOWNLOADED!');
      window.setTimeout(() => setFeedback(null), 2200);
    } catch {
      setFeedback(isEs ? 'ERROR AL GENERAR PNG' : 'PNG EXPORT ERROR');
    }
  };

  const handleShare = async (item: ScanHistoryItem) => {
    playClickSound(settings.soundEnabled);
    const text = isEs
      ? `⚡ AURA SCANNER: ${formatAuraScore(item.score)} AURA (${item.category}) — "${item.funnyComment}"`
      : `⚡ AURA SCANNER: ${formatAuraScore(item.score)} AURA (${item.category}) — "${item.funnyComment}"`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'AURA SCANNER', text });
      } else {
        await navigator.clipboard.writeText(text);
        setFeedback(isEs ? '¡COPIADO AL PORTAPAPELES!' : 'COPIED TO CLIPBOARD!');
        window.setTimeout(() => setFeedback(null), 2200);
      }
    } catch {
      // User cancelled share sheet
    }
  };

  const bestScore = history.length > 0 ? Math.max(...history.map((h) => h.score)) : 0;

  return (
    <div className="flex flex-col w-full px-margin-mobile gap-space-md pb-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-label-md text-[10px] text-primary tracking-widest uppercase">
            {isEs ? '[ REGISTRO BIOMÉTRICO LOCAL ]' : '[ LOCAL SCAN ARCHIVE ]'}
          </span>
          <h1 className="font-headline-lg-mobile text-on-surface uppercase tracking-tight">
            {isEs ? 'HISTORIAL DE AURA' : 'AURA HISTORY'}
          </h1>
        </div>
        {history.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              setCompareMode((prev) => !prev);
              setSelectedIds([]);
            }}
            className={`px-2.5 py-2 font-label-md text-[11px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-[2px_2px_0px_#000000] ${
              compareMode ? 'bg-tertiary text-on-tertiary' : 'bg-secondary-container text-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-base">compare_arrows</span>
            <span>{compareMode ? (isEs ? 'SALIR' : 'EXIT') : isEs ? 'COMPARAR' : 'COMPARE'}</span>
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-container-lowest p-space-sm shadow-[2px_2px_0px_#571bc1]">
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase block">
            {isEs ? 'ESCANEOS GUARDADOS' : 'SAVED SCANS'}
          </span>
          <span className="font-headline-md text-tertiary">{history.length}</span>
        </div>
        <div className="bg-surface-container-lowest p-space-sm shadow-[2px_2px_0px_#f751a1]">
          <span className="font-label-md text-[10px] text-on-surface-variant uppercase block">
            {isEs ? 'RÉCORD MÁXIMO' : 'ALL-TIME HIGH'}
          </span>
          <span className="font-headline-md text-primary">
            {history.length > 0 ? formatAuraScore(bestScore) : '—'}
          </span>
        </div>
      </div>

      {feedback && (
        <div className="bg-tertiary text-on-tertiary px-3 py-1.5 font-label-md text-center uppercase">
          {feedback}
        </div>
      )}

      {/* Compare Instructions & Side-by-Side Comparison */}
      {compareMode && (
        <div className="bg-surface-container-low p-space-sm shadow-[3px_3px_0px_#00e478] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-tertiary uppercase">
              {isEs
                ? `MODO COMPARACIÓN (${selectedIds.length}/2 SELECCIONADOS)`
                : `COMPARE MODE (${selectedIds.length}/2 SELECTED)`}
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="font-label-md text-[10px] text-on-surface-variant underline uppercase cursor-pointer"
              >
                {isEs ? 'LIMPIAR' : 'RESET'}
              </button>
            )}
          </div>

          {comparedPair ? (
            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {comparedPair.map((item) => {
                  const tier = classifyAuraScore(item.score);
                  const isWinner =
                    (item.id === comparedPair[0].id && item.score >= comparedPair[1].score) ||
                    (item.id === comparedPair[1].id && item.score > comparedPair[0].score);
                  return (
                    <div
                      key={item.id}
                      className={`bg-surface-container-lowest p-2 flex flex-col gap-1 border ${
                        isWinner ? 'border-tertiary' : 'border-outline-variant/40'
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-surface-container">
                        <img src={item.imageDataUrl} alt="" className="w-full h-full object-cover" />
                        {isWinner && (
                          <span className="absolute top-1 left-1 bg-tertiary text-on-tertiary px-1.5 py-0.5 font-label-md text-[9px] uppercase">
                            👑 {isEs ? 'GANADOR' : 'WINNER'}
                          </span>
                        )}
                      </div>
                      <span className={`font-headline-md text-base font-black ${tier.textClass}`}>
                        {formatAuraScore(item.score)}
                      </span>
                      <span className="font-label-md text-[10px] text-on-surface-variant uppercase truncate">
                        {item.category}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-surface-container-lowest px-3 py-2 text-center shadow-[2px_2px_0px_#571bc1]">
                <span className="font-label-md text-xs text-secondary uppercase">
                  {isEs ? 'DIFERENCIA DE AURA: ' : 'AURA DELTA: '}
                </span>
                <span className="font-headline-md text-base text-tertiary">
                  {Math.abs(comparedPair[0].score - comparedPair[1].score).toLocaleString(isEs ? 'es-ES' : 'en-US')} AURA
                </span>
              </div>
            </div>
          ) : (
            <p className="font-body-md text-xs text-on-surface-variant">
              {isEs
                ? 'Toca dos escaneos abajo para enfrentarlos cara a cara.'
                : 'Tap any two scans below to compare them head-to-head.'}
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {history.length === 0 ? (
        <div className="bg-surface-container-lowest p-space-lg text-center shadow-[4px_4px_0px_#571bc1] flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-secondary">history_toggle_off</span>
          <h2 className="font-headline-md text-on-surface uppercase">
            {isEs ? 'AÚN NO TIENES ESCANEOS' : 'NO SCANS YET'}
          </h2>
          <p className="font-body-md text-on-surface-variant">
            {isEs
              ? 'Sube una foto o toma una selfie para guardar tu primer resultado de aura aquí.'
              : 'Upload a photo or take a selfie to save your first aura scan here.'}
          </p>
          <button
            type="button"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              onGoToScan();
            }}
            className="bg-tertiary text-on-tertiary px-5 py-3 font-headline-md uppercase shadow-[3px_3px_0px_#000000] cursor-pointer"
          >
            {isEs ? 'ESCANEAR AHORA' : 'SCAN NOW'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((item) => {
            const tier = classifyAuraScore(item.score);
            const isSelected = selectedIds.includes(item.id);
            const dateStr = new Date(item.createdAt).toLocaleString(isEs ? 'es-ES' : 'en-US', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                onClick={compareMode ? () => toggleSelectForCompare(item.id) : undefined}
                style={{ boxShadow: `3px 3px 0px ${isSelected ? '#00e478' : tier.shadowColor}` }}
                className={`bg-surface-container-lowest p-space-sm flex flex-col gap-2 ${
                  compareMode ? 'cursor-pointer' : ''
                } ${isSelected ? 'ring-2 ring-tertiary' : ''}`}
              >
                <div className="flex gap-3">
                  <div className="w-20 h-24 bg-surface-container shrink-0 overflow-hidden border border-outline-variant/40">
                    <img src={item.imageDataUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-headline-md text-xl font-black ${tier.textClass}`}>
                          {formatAuraScore(item.score)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 font-label-md text-[10px] uppercase shrink-0 ${tier.badgeBgClass} ${tier.badgeTextClass}`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <p className="font-body-md text-xs text-on-surface mt-1 line-clamp-2">
                        &ldquo;{item.funnyComment}&rdquo;
                      </p>
                    </div>
                    <span className="font-label-md text-[10px] text-outline uppercase">{dateStr}</span>
                  </div>
                </div>

                <p className="font-body-md text-xs text-on-surface-variant bg-surface-container-low p-2">
                  {item.explanation}
                </p>

                {Array.isArray(item.highlights) && item.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.highlights.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-surface-container-high px-1.5 py-0.5 font-label-md text-[9px] text-tertiary uppercase"
                      >
                        [ {tag} ]
                      </span>
                    ))}
                  </div>
                )}

                {!compareMode && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleShare(item)}
                        className="bg-surface-container-high hover:text-tertiary px-2.5 py-1.5 font-label-md text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">share</span>
                        <span>{isEs ? 'COMPARTIR' : 'SHARE'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="bg-surface-container-high hover:text-secondary px-2.5 py-1.5 font-label-md text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        <span>PNG</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound(settings.soundEnabled);
                        setSelectedIds((prev) => prev.filter((sid) => sid !== item.id));
                        onDeleteItem(item.id);
                      }}
                      className="bg-error-container/70 hover:bg-error-container text-on-error-container px-2.5 py-1.5 font-label-md text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>{isEs ? 'BORRAR' : 'DELETE'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Clear All Control */}
          <div className="pt-2">
            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => {
                  playClickSound(settings.soundEnabled);
                  setConfirmClearAll(true);
                }}
                className="w-full bg-surface-container-low text-error py-2.5 font-label-md uppercase tracking-wider shadow-[2px_2px_0px_#93000a] cursor-pointer"
              >
                {isEs ? 'VACIAR TODO EL HISTORIAL' : 'CLEAR ALL HISTORY'}
              </button>
            ) : (
              <div className="bg-error-container p-3 flex items-center justify-between gap-2 shadow-[3px_3px_0px_#000000]">
                <span className="font-label-md text-xs text-on-error-container uppercase">
                  {isEs ? '¿BORRAR TODOS LOS REGISTROS?' : 'DELETE ALL RECORDS?'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="bg-surface-container-lowest text-on-surface px-3 py-1 font-label-md text-xs uppercase cursor-pointer"
                  >
                    {isEs ? 'NO' : 'NO'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound(settings.soundEnabled);
                      setConfirmClearAll(false);
                      onClearAll();
                    }}
                    className="bg-surface-container-lowest text-error px-3 py-1 font-label-md text-xs uppercase cursor-pointer"
                  >
                    {isEs ? 'SÍ, BORRAR' : 'YES, DELETE'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
