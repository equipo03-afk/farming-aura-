import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { HistoryView } from './components/HistoryView';
import { HomeView } from './components/HomeView';
import { ProfileView } from './components/ProfileView';
import { RankingView } from './components/RankingView';
import { ScannerView } from './components/ScannerView';
import {
  AppSettings,
  AppTab,
  FeedEntry,
  ScanHistoryItem,
  TrendingPost,
} from './types/aura';
import { fetchJsonSafe } from './utils/api';

const HISTORY_KEY = 'aura_scanner_history_v1';
const SETTINGS_KEY = 'aura_scanner_settings_v1';
const TRENDING_KEY = 'aura_scanner_trending_v1';

const DEFAULT_SETTINGS: AppSettings = {
  handle: '@sigma_farmer',
  language: 'es',
  soundEnabled: true,
  flashEnabled: false,
  roastIntensity: 'normal',
  boostArmed: false,
};

const INITIAL_TRENDING: TrendingPost[] = [
  {
    id: 'trend-1',
    titleEs: 'EL INCIDENTE DEL 67',
    titleEn: 'THE 67 INCIDENT',
    auraDelta: '+67,000 AURA',
    isPositive: true,
    descEs: 'Mantener la legendaria mirada 67 sin parpadear ni una vez en clase.',
    descEn: 'Pulling off the legendary 67 stare without blinking once in homeroom.',
    tagsEs: '#SIGMA #AURAWARS',
    tagsEn: '#SIGMA #AURAWARS',
    reactions: 842100,
    emoji: '🔥',
    shadowColor: '#571bc1',
    accentClass: 'text-secondary',
  },
  {
    id: 'trend-2',
    titleEs: 'FARMEO MÁXIMO DE AURA',
    titleEn: 'ULTIMATE AURA FARMING',
    auraDelta: '+500,000 AURA',
    isPositive: true,
    descEs: 'Cruzar a una abuelita la calle mientras escuchas phonk en cámara lenta.',
    descEn: 'Helping grandma cross the street while listening to phonk in slow motion.',
    tagsEs: '#NIVELDIOS #MOMENTO_W',
    tagsEn: '#GODTIER #W_MOMENT',
    reactions: 1204500,
    emoji: '⚡',
    shadowColor: '#00e478',
    accentClass: 'text-tertiary',
  },
  {
    id: 'trend-3',
    titleEs: 'EL GUANTELETE SIGMA',
    titleEn: 'THE SIGMA GAUNTLET',
    auraDelta: '+85,000 AURA',
    isPositive: true,
    descEs: 'Mantener contacto visual inquebrantable cuando alguien te pita en el paso peatonal.',
    descEn: 'Refusing to break eye contact when someone honks at the crosswalk.',
    tagsEs: '#IMPERTURBABLE #REY',
    tagsEn: '#UNBOTHERED #KING',
    reactions: 950320,
    emoji: '🗿',
    shadowColor: '#f751a1',
    accentClass: 'text-primary',
  },
  {
    id: 'trend-4',
    titleEs: 'DEDUCCIÓN DE IMPUESTO DE AURA',
    titleEn: 'AURA TAX DEDUCTION',
    auraDelta: '-250,000 AURA',
    isPositive: false,
    descEs: 'Saludar con emoción con la mano a alguien que en realidad saludaba al de atrás.',
    descEn: 'Waving back enthusiastically at someone who was waving at the person behind you.',
    tagsEs: '#HUMILLACION #ARCO_DE_RECUPERACION',
    tagsEn: '#MASSIVE_L #RECOVERY_ARC',
    reactions: 2108400,
    emoji: '💀',
    shadowColor: '#93000a',
    accentClass: 'text-error',
  },
];

function getInitialTab(): AppTab {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname;
  if (path === '/scan') return 'scan';
  if (path === '/ranking') return 'ranking';
  if (path === '/history') return 'history';
  if (path === '/profile') return 'profile';
  return 'home';
}

function loadHistorySafe(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ScanHistoryItem =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.score === 'number' &&
        typeof item.imageDataUrl === 'string'
    );
  } catch {
    return [];
  }
}

function persistHistorySafe(items: ScanHistoryItem[]): void {
  let candidate = [...items];
  while (candidate.length >= 0) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(candidate));
      return;
    } catch {
      if (candidate.length === 0) return;
      candidate = candidate.slice(0, candidate.length - 1);
    }
  }
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(getInitialTab);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [history, setHistory] = useState<ScanHistoryItem[]>(loadHistorySafe);

  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>(() => {
    try {
      const raw = localStorage.getItem(TRENDING_KEY);
      if (!raw) return INITIAL_TRENDING;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? (parsed as TrendingPost[]) : INITIAL_TRENDING;
    } catch {
      return INITIAL_TRENDING;
    }
  });

  const [totalScans, setTotalScans] = useState(0);
  const [liveFeed, setLiveFeed] = useState<FeedEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<FeedEntry[]>([]);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await fetchJsonSafe<{
        totalScans: number;
        recent: FeedEntry[];
        leaderboard: FeedEntry[];
      }>('/api/feed', undefined, settings.language);
      setTotalScans(typeof data.totalScans === 'number' ? data.totalScans : 0);
      setLiveFeed(Array.isArray(data.recent) ? data.recent : []);
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
    } catch {
      // Offline / transient fetch ignore
    }
  }, [settings.language]);

  useEffect(() => {
    fetchFeed();
    const interval = window.setInterval(fetchFeed, 18000);
    return () => window.clearInterval(interval);
  }, [fetchFeed]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Storage full fallback
    }
  }, [settings]);

  useEffect(() => {
    persistHistorySafe(history);
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(TRENDING_KEY, JSON.stringify(trendingPosts));
    } catch {
      // Storage full fallback
    }
  }, [trendingPosts]);

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    const targetPath = tab === 'home' ? '/' : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleUpdateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleScanComplete = useCallback(
    (item: ScanHistoryItem) => {
      setHistory((prev) => [item, ...prev.filter((existing) => existing.id !== item.id)].slice(0, 30));
      setSettings((prev) => (prev.boostArmed ? { ...prev, boostArmed: false } : prev));
      fetchFeed();
    },
    [fetchFeed]
  );

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleReactTrending = useCallback((id: string) => {
    setTrendingPosts((prev) =>
      prev.map((post) => {
        if (post.id !== id) return post;
        const nextReacted = !post.userReacted;
        return {
          ...post,
          userReacted: nextReacted,
          reactions: nextReacted ? post.reactions + 1 : Math.max(0, post.reactions - 1),
        };
      })
    );
  }, []);

  const { userLevel, userRankTitle } = useMemo(() => {
    if (history.length === 0) {
      return { userLevel: 1, userRankTitle: 'INICIAL' };
    }
    const best = Math.max(...history.map((h) => h.score));
    const level = Math.min(999, 1 + history.length * 3 + (best >= 100000 ? 15 : best >= 10000 ? 5 : 0));
    const rank =
      best === 1000000
        ? 'INFINITO'
        : best >= 500000
        ? 'DIVINO'
        : best >= 100000
        ? 'LEYENDA'
        : best >= 50000
        ? 'SIGMA'
        : best > 0
        ? 'FARMER'
        : 'NPC';
    return { userLevel: level, userRankTitle: rank };
  }, [history]);

  return (
    <div className="min-h-[100dvh] w-full bg-surface text-on-surface flex justify-center">
      <div className="relative w-full max-w-[480px] min-h-[100dvh] flex flex-col bg-surface md:border-x md:border-outline-variant/30 md:shadow-[0_0_64px_rgba(87,27,193,0.18)]">
        <Header
          activeTab={activeTab}
          onNavigate={navigate}
          settings={settings}
          userLevel={userLevel}
          userRankTitle={userRankTitle}
          flashBoost={settings.flashEnabled}
          onToggleFlash={() => handleUpdateSettings({ flashEnabled: !settings.flashEnabled })}
        />

        <main
          className="flex flex-col relative w-full min-h-[100dvh]"
          style={{
            paddingTop: 'calc(5rem + env(safe-area-inset-top, 0px))',
            paddingBottom:
              activeTab === 'scan'
                ? 'calc(2rem + env(safe-area-inset-bottom, 0px))'
                : 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {activeTab === 'home' && (
            <HomeView
              settings={settings}
              onNavigate={navigate}
              onToggleBoost={() => handleUpdateSettings({ boostArmed: !settings.boostArmed })}
              totalScans={totalScans}
              liveFeed={liveFeed}
              latestUserScan={history[0] ?? null}
              trendingPosts={trendingPosts}
              onReactTrending={handleReactTrending}
            />
          )}

          {activeTab === 'scan' && (
            <ScannerView
              settings={settings}
              flashBoost={settings.flashEnabled}
              onToggleFlash={() => handleUpdateSettings({ flashEnabled: !settings.flashEnabled })}
              onScanComplete={handleScanComplete}
              onGoToHistory={() => navigate('history')}
            />
          )}

          {activeTab === 'ranking' && (
            <RankingView
              settings={settings}
              leaderboard={leaderboard}
              userHistory={history}
              onRefresh={fetchFeed}
              onGoToScan={() => navigate('scan')}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              settings={settings}
              history={history}
              onDeleteItem={handleDeleteHistoryItem}
              onClearAll={handleClearHistory}
              onGoToScan={() => navigate('scan')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              history={history}
              userLevel={userLevel}
              userRankTitle={userRankTitle}
              onClearHistory={handleClearHistory}
              onGoToScan={() => navigate('scan')}
            />
          )}
        </main>

        {activeTab !== 'scan' && (
          <BottomNav
            activeTab={activeTab}
            onSelectTab={navigate}
            language={settings.language}
            soundEnabled={settings.soundEnabled}
            historyCount={history.length}
          />
        )}
      </div>
    </div>
  );
};

export default App;
