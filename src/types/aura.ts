export type AppTab = 'home' | 'scan' | 'ranking' | 'history' | 'profile';
export type Language = 'es' | 'en';
export type RoastIntensity = 'normal' | 'savage' | 'hype';

export type AuraCategory =
  | 'AURA NEGATIVA 💀'
  | 'NPC'
  | 'SIN AURA'
  | 'AURA NORMAL'
  | 'AURA ALTA'
  | 'SIGMA'
  | 'AURA LEGENDARIA'
  | 'AURA DIVINA'
  | 'AURA INFINITA 🔥';

export interface AuraTierInfo {
  id: string;
  category: AuraCategory;
  min: number;
  max: number;
  rangeLabelEs: string;
  rangeLabelEn: string;
  badgeEs: string;
  badgeEn: string;
  quoteEs: string;
  quoteEn: string;
  accentColor: string;
  shadowColor: string;
  textClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  barClass: string;
  barWidthClass: string;
}

export const AURA_TIERS: AuraTierInfo[] = [
  {
    id: 'negative',
    category: 'AURA NEGATIVA 💀',
    min: -1000000,
    max: -100000,
    rangeLabelEs: '-1.000.000 A -100.000',
    rangeLabelEn: '-1,000,000 TO -100,000',
    badgeEs: '💀 DAÑO EMOCIONAL CRÍTICO',
    badgeEn: '💀 DOWN BAD / EMOTIONAL DAMAGE',
    quoteEs: '"Tropezó en público y volteó a mirar a la banqueta"',
    quoteEn: '"Tripped in public and looked back at the sidewalk"',
    accentColor: '#ffb4ab',
    shadowColor: '#93000a',
    textClass: 'text-error',
    badgeBgClass: 'bg-error-container',
    badgeTextClass: 'text-on-error-container',
    barClass: 'bg-error',
    barWidthClass: 'w-1/12',
  },
  {
    id: 'npc',
    category: 'NPC',
    min: -99999,
    max: 0,
    rangeLabelEs: '-99.999 A 0',
    rangeLabelEn: '-99,999 TO 0',
    badgeEs: '😐 AJUSTES DE FÁBRICA',
    badgeEn: '😐 DEFAULT SETTINGS',
    quoteEs: '"Toma agua del grifo con un tenedor"',
    quoteEn: '"Drinks tap water with a fork"',
    accentColor: '#a68992',
    shadowColor: '#35343a',
    textClass: 'text-outline',
    badgeBgClass: 'bg-surface-container-highest',
    badgeTextClass: 'text-on-surface',
    barClass: 'bg-outline',
    barWidthClass: 'w-2/12',
  },
  {
    id: 'none',
    category: 'SIN AURA',
    min: 1,
    max: 999,
    rangeLabelEs: '1 A 999',
    rangeLabelEn: '1 TO 999',
    badgeEs: '🫥 PRESENCIA EN MODO AVIÓN',
    badgeEn: '🫥 AIRPLANE MODE PRESENCE',
    quoteEs: '"Entra a la sala y nadie se da cuenta"',
    quoteEn: '"Walks into the room and nobody notices"',
    accentColor: '#debec8',
    shadowColor: '#574048',
    textClass: 'text-on-surface-variant',
    badgeBgClass: 'bg-surface-container-high',
    badgeTextClass: 'text-on-surface-variant',
    barClass: 'bg-on-surface-variant',
    barWidthClass: 'w-3/12',
  },
  {
    id: 'normal',
    category: 'AURA NORMAL',
    min: 1000,
    max: 9999,
    rangeLabelEs: '1.000 A 9.999',
    rangeLabelEn: '1,000 TO 9,999',
    badgeEs: '🙂 CIUDADANO COMÚN',
    badgeEn: '🙂 AVERAGE CITIZEN',
    quoteEs: '"Fingir que lee un mensaje importante mientras camina"',
    quoteEn: '"Pretending to check an important text while walking"',
    accentColor: '#d0bcff',
    shadowColor: '#5516be',
    textClass: 'text-secondary',
    badgeBgClass: 'bg-secondary-container',
    badgeTextClass: 'text-on-secondary-container',
    barClass: 'bg-secondary',
    barWidthClass: 'w-4/12',
  },
  {
    id: 'high',
    category: 'AURA ALTA',
    min: 10000,
    max: 49999,
    rangeLabelEs: '10.000 A 49.999',
    rangeLabelEn: '10,000 TO 49,999',
    badgeEs: '⚡ ENERGÍA EN ASCENSO',
    badgeEn: '⚡ RISING ENERGY',
    quoteEs: '"Siempre llega justo cuando empieza su canción"',
    quoteEn: '"Always arrives right when their song drops"',
    accentColor: '#d0bcff',
    shadowColor: '#571bc1',
    textClass: 'text-secondary',
    badgeBgClass: 'bg-secondary-container',
    badgeTextClass: 'text-secondary',
    barClass: 'bg-secondary',
    barWidthClass: 'w-6/12',
  },
  {
    id: 'sigma',
    category: 'SIGMA',
    min: 50000,
    max: 99999,
    rangeLabelEs: '50.000 A 99.999',
    rangeLabelEn: '50,000 TO 99,999',
    badgeEs: '🗿 REY IMPERTÉRRITO',
    badgeEn: '🗿 UNBOTHERED KING',
    quoteEs: '"Camina en cámara lenta sin mirar atrás jamás"',
    quoteEn: '"Walks in slow motion without ever looking back"',
    accentColor: '#ffb0cd',
    shadowColor: '#f751a1',
    textClass: 'text-primary',
    badgeBgClass: 'bg-primary-container',
    badgeTextClass: 'text-on-primary-container',
    barClass: 'bg-primary-container',
    barWidthClass: 'w-8/12',
  },
  {
    id: 'legendary',
    category: 'AURA LEGENDARIA',
    min: 100000,
    max: 499999,
    rangeLabelEs: '100.000 A 499.999',
    rangeLabelEn: '100,000 TO 499,999',
    badgeEs: '👑 PROTAGONISTA DE ANIME',
    badgeEn: '👑 MAIN CHARACTER ENERGY',
    quoteEs: '"Su sola entrada cambia la banda sonora del lugar"',
    quoteEn: '"Their entrance shifts the room soundtrack"',
    accentColor: '#ffb0cd',
    shadowColor: '#f751a1',
    textClass: 'text-primary',
    badgeBgClass: 'bg-primary',
    badgeTextClass: 'text-on-primary',
    barClass: 'bg-primary',
    barWidthClass: 'w-10/12',
  },
  {
    id: 'divine',
    category: 'AURA DIVINA',
    min: 500000,
    max: 999999,
    rangeLabelEs: '500.000 A 999.999',
    rangeLabelEn: '500,000 TO 999,999',
    badgeEs: '✨ MÁS ALLÁ DE LA COMPRENSIÓN',
    badgeEn: '✨ BEYOND COMPREHENSION',
    quoteEs: '"El protagonista del que todos citan frases"',
    quoteEn: '"The protagonist everyone quotes"',
    accentColor: '#00e478',
    shadowColor: '#00a656',
    textClass: 'text-tertiary',
    badgeBgClass: 'bg-tertiary',
    badgeTextClass: 'text-on-tertiary',
    barClass: 'bg-tertiary',
    barWidthClass: 'w-11/12',
  },
  {
    id: 'infinite',
    category: 'AURA INFINITA 🔥',
    min: 1000000,
    max: 1000000,
    rangeLabelEs: '1.000.000',
    rangeLabelEn: '1,000,000',
    badgeEs: '🔥 DIOS SUPREMO DEL AURA',
    badgeEn: '🔥 SUPREME AURA DEITY',
    quoteEs: '"Rompió el medidor galáctico de aura al primer parpadeo"',
    quoteEn: '"Shattered the galactic aura meter on first blink"',
    accentColor: '#00e478',
    shadowColor: '#00e478',
    textClass: 'text-tertiary',
    badgeBgClass: 'bg-tertiary',
    badgeTextClass: 'text-on-tertiary',
    barClass: 'bg-tertiary shadow-[0_0_12px_#00e478]',
    barWidthClass: 'w-full',
  },
];

export function classifyAuraScore(rawScore: number): AuraTierInfo {
  const score = Math.max(-1000000, Math.min(1000000, Math.round(rawScore)));
  if (score === 1000000) return AURA_TIERS[8];
  if (score >= 500000) return AURA_TIERS[7];
  if (score >= 100000) return AURA_TIERS[6];
  if (score >= 50000) return AURA_TIERS[5];
  if (score >= 10000) return AURA_TIERS[4];
  if (score >= 1000) return AURA_TIERS[3];
  if (score >= 1) return AURA_TIERS[2];
  if (score >= -99999) return AURA_TIERS[1];
  return AURA_TIERS[0];
}

export function formatAuraScore(score: number): string {
  const abs = Math.abs(Math.round(score)).toLocaleString('es-ES');
  if (score > 0) return `+${abs}`;
  if (score < 0) return `-${abs}`;
  return '0';
}

export interface AuraScanResult {
  id?: string;
  createdAt?: string;
  score: number;
  category: AuraCategory;
  funnyComment: string;
  explanation: string;
  highlights: string[];
  boostApplied?: boolean;
}

export interface ScanHistoryItem extends AuraScanResult {
  id: string;
  imageDataUrl: string;
  createdAt: string;
  handle: string;
}

export interface FeedEntry {
  id: string;
  handle: string;
  score: number;
  category: AuraCategory;
  comment: string;
  createdAt: string;
  isUser?: boolean;
}

export interface TrendingPost {
  id: string;
  titleEs: string;
  titleEn: string;
  auraDelta: string;
  isPositive: boolean;
  descEs: string;
  descEn: string;
  tagsEs: string;
  tagsEn: string;
  reactions: number;
  emoji: string;
  shadowColor: string;
  accentClass: string;
  userReacted?: boolean;
}

export interface AppSettings {
  handle: string;
  language: Language;
  soundEnabled: boolean;
  flashEnabled: boolean;
  roastIntensity: RoastIntensity;
  boostArmed: boolean;
}
