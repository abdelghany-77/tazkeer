// ═══════════════════════════════════════════════
// TAZKEER v2.0 — Core Type Definitions
// ═══════════════════════════════════════════════

// ── Adhkar ──────────────────────────────────────
export interface Zikr {
  text: string;
  source: string;
  fadl?: string;
  count: number;
}

export interface AdhkarCategory {
  key: string;
  title: string;
  description: string;
  icon: string;
  adhkar: Zikr[];
}

export interface DhikrSessionState {
  categoryKey: string;
  currentIndex: number;
  counters: number[];
  isCompleted: boolean;
}

// ── Quran ────────────────────────────────────────
export interface SurahMeta {
  number: number;
  name: string;
  startPage: number;
}

export interface JuzMeta {
  number: number;
  startPage: number;
  name: string;
}

export interface KhatmahState {
  isActive: boolean;
  goalType: 'days' | 'pages';
  goalValue: number;
  dailyTarget: number;
  startDate: string | null;
  lastReadPage: number;
  completedPages: number[];
  bookmarkedPage: number | null;
  totalPagesRead: number;
  khatmahStartPage: number;
}

export interface QuranViewerState {
  currentPage: number;
  isLoading: boolean;
  currentView: 'setup' | 'dashboard' | 'reader' | 'surah-list';
  mode: 'free' | 'khatmah';
  wirdStart: number;
  wirdEnd: number;
}

// ── Daily Duas ──────────────────────────────────
export interface DailyDua {
  text: string;
  source: string;
}

// ── Theme ───────────────────────────────────────
export type ThemePreset = 'dark' | 'sepia' | 'light';

// ── Prayer Times ────────────────────────────────
export interface PrayerTime {
  name: string;
  nameAr: string;
  time: string;
  icon: string;
}

// ── Tab Navigation ──────────────────────────────
export type TabId = 'home' | 'adhkar' | 'quran' | 'profile';
