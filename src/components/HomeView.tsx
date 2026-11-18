import React, { useState } from 'react';
import {
  AURA_TIERS,
  AppSettings,
  AppTab,
  FeedEntry,
  ScanHistoryItem,
  TrendingPost,
  classifyAuraScore,
  formatAuraScore,
} from '../types/aura';
import { playClickSound } from '../utils/sound';

interface HomeViewProps {
  settings: AppSettings;
  onNavigate: (tab: AppTab) => void;
  onToggleBoost: () => void;
  totalScans: number;
  liveFeed: FeedEntry[];
  latestUserScan: ScanHistoryItem | null;
  trendingPosts: TrendingPost[];
  onReactTrending: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  onNavigate,
  onToggleBoost,
  totalScans,
  liveFeed,
  latestUserScan,
  trendingPosts,
  onReactTrending,
}) => {
  const isEs = settings.language === 'es';
  const [showLatestInHero, setShowLatestInHero] = useState(false);
  const [expandedTierId, setExpandedTierId] = useState<string | null>(null);
  const [showAllTiers, setShowAllTiers] = useState(true);

  const heroScan = showLatestInHero && latestUserScan ? latestUserScan : null;
  const heroTier = heroScan ? classifyAuraScore(heroScan.score) : null;

  const formattedTotalScans = totalScans.toLocaleString(isEs ? 'es-ES' : 'en-US');

  return (
    <div className="flex flex-col w-full px-margin-mobile gap-space-lg pb-6">
      {/* 1. TOP STATS BAR / QUICK HUD */}
      <section className="w-full bg-surface-container-lowest p-space-xs shadow-[2px_2px_0px_#571bc1] flex items-center justify-between gap-space-xs overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-block w-2 h-2 bg-tertiary shadow-[0_0_8px_#00e478] animate-pulse shrink-0" />
          <span className="font-label-md text-label-md text-tertiary truncate uppercase tracking-widest">
            🔥 {formattedTotalScans} {isEs ? 'AURAS ESCANEADAS' : 'AURAS CHECKED'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            playClickSound(settings.soundEnabled);
            onToggleBoost();
          }}
          title={isEs ? 'Activar Boost 2.5x para tu próximo escaneo' : 'Toggle 2.5x Boost for next scan'}
          className={`px-2 py-0.5 flex items-center gap-1 shrink-0 cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] ${
            settings.boostArmed
              ? 'bg-tertiary text-on-tertiary shadow-[2px_2px_0px_#000000]'
              : 'bg-secondary-container text-secondary hover:bg-secondary-container/80'
          }`}
        >
          <span className="material-symbols-outlined text-[13px]">bolt</span>
          <span className="font-label-md text-label-md uppercase font-bold tracking-wider">
            {settings.boostArmed
              ? isEs
                ? 'BOOST 2.5X ACTIVO'
                : '2.5X BOOST ARMED'
              : isEs
              ? 'BOOST 2.5X'
              : '2.5X BOOST'}
          </span>
        </button>
      </section>

      {/* 2. HERO SECTION */}
      <section className="flex flex-col items-center text-center gap-space-sm relative">
        <div className="inline-flex items-center gap-1 bg-surface-container-high px-2 py-0.5 shadow-[2px_2px_0px_#f751a1]">
          <span className="font-label-md text-label-md text-primary tracking-widest uppercase">
            {isEs ? 'MOTOR VIRAL V4.2 // AURA SCANNER' : 'VIRAL ENGINE V4.2 // AURA SCANNER'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface uppercase tracking-tighter">
            {isEs ? (
              <>
                ¿CUÁNTO <span className="text-tertiary">AURA</span> TIENES?
              </>
            ) : (
              <>
                HOW MUCH <span className="text-tertiary">AURA</span> DO YOU HAVE?
              </>
            )}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {isEs ? 'Tu aura. Tus reglas. Tu reputación.' : 'Your aura. Your rules. Your reputation.'}
          </p>
        </div>

        {/* CENTRAL HERO CHARACTER CARD */}
        <div className="relative w-full max-w-xs mt-space-sm aspect-square bg-surface-container-lowest flex items-center justify-center p-2 shadow-[4px_4px_0px_#571bc1]">
          <div className="absolute inset-2 bg-gradient-to-tr from-secondary-container via-primary-container/20 to-tertiary/20 blur-xl opacity-80 pointer-events-none" />
          <img
            alt={heroScan ? 'Tu último escaneo de aura' : 'Tom en traje Aura Meme Character'}
            className="relative z-10 w-full h-full object-cover filter drop-shadow-[0_0_16px_rgba(0,228,120,0.45)]"
            src={heroScan ? heroScan.imageDataUrl : '/assets/tom-aura.png'}
          />

          {/* Top Floating Status */}
          <div className="absolute top-3 z-20 bg-surface-container-highest px-2.5 py-1 shadow-[2px_2px_0px_#00e478] flex items-center gap-1 max-w-[90%]">
            <span className="text-xs">👑</span>
            <span className="font-label-md text-label-md text-on-surface font-extrabold tracking-wider uppercase truncate">
              {heroScan
                ? `${isEs ? 'ESTADO' : 'STATUS'}: ${heroScan.category}`
                : isEs
                ? 'ESTADO: SIGMA NIVEL DIOS'
                : 'STATUS: GOD-TIER SIGMA'}
            </span>
          </div>

          {/* Toggle between Mascot and Latest User Scan */}
          {latestUserScan && (
            <button
              type="button"
              onClick={() => {
                playClickSound(settings.soundEnabled);
                setShowLatestInHero((prev) => !prev);
              }}
              className="absolute top-3 right-3 z-20 bg-surface-container-lowest/90 px-1.5 py-1 shadow-[2px_2px_0px_#f751a1] text-primary hover:text-tertiary cursor-pointer"
              title={isEs ? 'Alternar entre mascota y tu último escaneo' : 'Toggle mascot / your latest scan'}
            >
              <span className="material-symbols-outlined text-sm block">swap_horiz</span>
            </button>
          )}

          {/* Bottom Floating Score Badge */}
          <div
            className="absolute bottom-3 z-20 bg-surface-container-lowest px-3 py-1.5 flex flex-col items-center"
            style={{ boxShadow: `3px 3px 0px ${heroTier ? heroTier.shadowColor : '#f751a1'}` }}
          >
            <div className="flex items-center gap-1">
              <span
                className={`material-symbols-outlined text-base ${heroTier ? heroTier.textClass : 'text-tertiary'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
              <span
                className={`font-headline-md text-headline-md tracking-tight ${
                  heroTier ? heroTier.textClass : 'text-tertiary'
                }`}
              >
                {heroScan ? `${formatAuraScore(heroScan.score)} AURA` : '+1,000,000 AURA'}
              </span>
            </div>
            <span className="font-label-md text-label-md text-secondary tracking-widest uppercase">
              {heroScan
                ? heroScan.handle
                : isEs
                ? 'TOP 0.01% DE LA HUMANIDAD'
                : 'TOP 0.01% OF HUMANS'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. MASSIVE PRIMARY ACTION BUTTON (HERO CTA) */}
      <section className="w-full flex flex-col items-center gap-2">
        <button
          type="button"
          id="scanTriggerBtn"
          onClick={() => {
            playClickSound(settings.soundEnabled);
            onNavigate('scan');
          }}
          className="w-full bg-tertiary text-on-tertiary p-4 flex items-center justify-between shadow-[4px_4px_0px_#571bc1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#571bc1] transition-transform select-none cursor-pointer"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-12 h-12 bg-on-tertiary text-tertiary flex items-center justify-center shadow-[2px_2px_0px_#003919] shrink-0">
              <span className="material-symbols-outlined text-3xl">photo_camera</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md leading-tight text-on-tertiary tracking-tight uppercase">
                {isEs ? 'ESCANEAR MI AURA' : 'CHECK MY AURA'}
              </span>
              <span className="font-label-md text-label-md text-on-tertiary/90 font-bold uppercase tracking-wider">
                {isEs ? 'SUBE TU FOTO O USA LA CÁMARA ⚡' : 'UPLOAD PHOTO OR USE CAMERA ⚡'}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-3xl font-black">arrow_forward</span>
        </button>
        <div className="flex items-center gap-1.5 text-center">
          <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            {isEs
              ? '⚡ MOTOR IA GEMINI • ESCALA -1M A +1M • ENTRETENIMIENTO MEME'
              : '⚡ GEMINI AI ENGINE • SCALE -1M TO +1M • MEME ENTERTAINMENT'}
          </span>
        </div>
      </section>

      {/* 4. AURA LEVELS SECTION (ALL 9 TIERS) */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary-container text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-tight">
              {isEs ? 'NIVELES DE AURA' : 'AURA LEVELS'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              setShowAllTiers((prev) => !prev);
            }}
            className="font-label-md text-label-md text-on-surface-variant hover:text-tertiary uppercase tracking-widest cursor-pointer"
          >
            {isEs
              ? showAllTiers
                ? '[ NIVELES 01-09 ]'
                : '[ VER TODOS 01-09 ]'
              : showAllTiers
              ? '[ TIERS 01-09 ]'
              : '[ SHOW ALL 01-09 ]'}
          </button>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant -mt-1">
          {isEs ? '¿Dónde te ubicas en el universo?' : 'Where do you rank in the universe?'}
        </p>

        <div className="flex flex-col gap-2">
          {(showAllTiers ? AURA_TIERS : [AURA_TIERS[0], AURA_TIERS[1], AURA_TIERS[3], AURA_TIERS[5], AURA_TIERS[8]]).map(
            (tier) => {
              const isExpanded = expandedTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    playClickSound(settings.soundEnabled);
                    setExpandedTierId(isExpanded ? null : tier.id);
                  }}
                  style={{ boxShadow: `3px 3px 0px ${tier.shadowColor}` }}
                  className="text-left w-full bg-surface-container-lowest p-space-sm flex flex-col gap-1.5 cursor-pointer transition-transform active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className={`font-title-md text-title-md font-extrabold uppercase ${tier.textClass}`}>
                      {tier.category}
                    </span>
                    <span
                      className={`font-label-md text-label-md px-1.5 py-0.5 font-bold uppercase shrink-0 ${tier.badgeBgClass} ${tier.badgeTextClass}`}
                    >
                      {isEs ? tier.rangeLabelEs : tier.rangeLabelEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`bg-surface-container-high px-1.5 py-0.5 font-label-md text-label-md tracking-wider uppercase ${tier.textClass}`}
                    >
                      {isEs ? tier.badgeEs : tier.badgeEn}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant italic">
                    {isEs ? tier.quoteEs : tier.quoteEn}
                  </p>
                  <div className="w-full bg-surface-container h-1.5 flex">
                    <div className={`${tier.barClass} ${tier.barWidthClass} h-full`} />
                  </div>
                  {isExpanded && (
                    <div className="pt-1 flex items-center justify-between border-t border-outline-variant/30 mt-1">
                      <span className="font-label-md text-[10px] text-on-surface-variant uppercase">
                        {isEs ? 'TOCA PARA PROBAR ESTE NIVEL EN EL ESCÁNER' : 'TAP TO TEST THIS TIER IN SCANNER'}
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound(settings.soundEnabled);
                          onNavigate('scan');
                        }}
                        className="font-label-md text-[10px] text-tertiary underline uppercase"
                      >
                        {isEs ? 'ESCANEAR →' : 'SCAN →'}
                      </span>
                    </div>
                  )}
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* 5. TRENDING SECTION: 'AURA EN TENDENCIA' */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-2xl">trending_up</span>
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-tight">
              {isEs ? 'AURA EN TENDENCIA' : 'TRENDING AURA'}
            </h2>
          </div>
          <div className="bg-primary-container px-2 py-0.5 shadow-[2px_2px_0px_#000000]">
            <span className="font-label-md text-label-md text-on-primary-container font-extrabold uppercase">
              {isEs ? 'VIRAL EN TIKTOK' : 'VIRAL ON TIKTOK'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {trendingPosts.map((post) => (
            <div
              key={post.id}
              style={{ boxShadow: `2px 2px 0px ${post.shadowColor}` }}
              className="bg-surface-container-low p-space-sm flex flex-col gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-title-md text-title-md text-on-surface uppercase font-black">
                  {isEs ? post.titleEs : post.titleEn}
                </span>
                <span
                  className={`font-label-lg text-label-lg font-extrabold shrink-0 ${
                    post.isPositive ? 'text-tertiary' : 'text-error'
                  }`}
                >
                  {post.auraDelta}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isEs ? post.descEs : post.descEn}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className={`font-label-md text-label-md tracking-widest uppercase ${post.accentClass}`}>
                  {isEs ? post.tagsEs : post.tagsEn}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound(settings.soundEnabled);
                    onReactTrending(post.id);
                  }}
                  className={`px-2 py-0.5 font-label-md text-label-md font-bold cursor-pointer transition-transform active:scale-95 ${
                    post.userReacted
                      ? 'bg-surface-container-highest text-tertiary shadow-[1px_1px_0px_#00e478]'
                      : `${post.accentClass} hover:bg-surface-container-high`
                  }`}
                >
                  {post.emoji} {post.reactions.toLocaleString(isEs ? 'es-ES' : 'en-US')}{' '}
                  {isEs ? 'REACCIONES' : 'REACTS'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. LIVE SCANS FEED */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-tertiary animate-ping" />
            <h2 className="font-headline-md text-headline-md text-on-surface uppercase tracking-tight">
              {isEs ? 'FEED DE ESCANEOS EN VIVO' : 'LIVE SCANS FEED'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound(settings.soundEnabled);
              onNavigate('ranking');
            }}
            className="font-label-md text-label-md text-tertiary tracking-widest uppercase hover:underline cursor-pointer"
          >
            {isEs ? 'VER RANKING →' : 'VIEW RANKING →'}
          </button>
        </div>

        <div className="bg-surface-container-lowest p-space-xs shadow-[2px_2px_0px_#571bc1] flex flex-col gap-1.5">
          {liveFeed.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                playClickSound(settings.soundEnabled);
                onNavigate('scan');
              }}
              className="w-full bg-surface-container px-3 py-3 text-center hover:bg-surface-container-high cursor-pointer"
            >
              <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider">
                {isEs
                  ? 'AÚN NO HAY ESCANEOS GLOBALES — ¡SÉ EL PRIMERO EN ESCANEAR!'
                  : 'NO GLOBAL SCANS YET — BE THE FIRST TO SCAN!'}
              </span>
            </button>
          ) : (
            liveFeed.slice(0, 5).map((entry) => {
              const isPos = entry.score > 0;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    playClickSound(settings.soundEnabled);
                    onNavigate('ranking');
                  }}
                  className="w-full flex items-center justify-between bg-surface-container px-2 py-1.5 transition-all hover:bg-surface-container-high cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span
                      className={`material-symbols-outlined text-sm shrink-0 ${
                        isPos ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      {isPos ? 'bolt' : 'trending_down'}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface truncate">{entry.handle}</span>
                    <span className="font-label-md text-[9px] text-on-surface-variant bg-surface-container-high px-1 py-0.5 truncate hidden sm:inline">
                      {entry.category}
                    </span>
                  </div>
                  <span
                    className={`font-label-md text-label-md font-black shrink-0 ml-2 ${
                      isPos ? 'text-tertiary' : 'text-error'
                    }`}
                  >
                    {formatAuraScore(entry.score)} AURA
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
