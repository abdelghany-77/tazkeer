import React, { createContext, useContext, useState, useEffect } from 'react';
import type { KhatmahState, ThemePreset } from '@/types';
import { getItem, saveItem } from '@/utils/storage';

interface QuranContextType {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  bookmarkedPage: number | null;
  setBookmark: (page: number) => void;
  removeBookmark: () => void;
  khatmah: KhatmahState;
  startKhatmah: (goalType: 'days' | 'pages', goalValue: number, startPage?: number) => void;
  resetKhatmah: () => void;
  markPageRead: (page: number) => void;
  quranTheme: ThemePreset;
  setQuranTheme: (theme: ThemePreset) => void;
  activeSurahNumber: number | null;
  setActiveSurahNumber: (num: number | null) => void;
  scope: 'surah' | 'wird' | 'all';
  setScope: (scope: 'surah' | 'wird' | 'all') => void;
  wirdRange: { startPage: number; endPage: number } | null;
  setWirdRange: (range: { startPage: number; endPage: number } | null) => void;
  isReaderOpen: boolean;
  setIsReaderOpen: (open: boolean) => void;
}

const DEFAULT_KHATMAH: KhatmahState = {
  isActive: false,
  goalType: 'days',
  goalValue: 30,
  dailyTarget: 20,
  startDate: null,
  lastReadPage: 1,
  completedPages: [],
  bookmarkedPage: null,
  totalPagesRead: 0,
  khatmahStartPage: 1,
};

const QuranContext = createContext<QuranContextType | undefined>(undefined);

export const QuranProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPageState] = useState<number>(() => {
    const saved = localStorage.getItem('tazkeer_quran_last_page');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [bookmarkedPage, setBookmarkedPageState] = useState<number | null>(() => {
    const saved = localStorage.getItem('tazkeer_quran_bookmark');
    return saved ? parseInt(saved, 10) : null;
  });

  const [khatmah, setKhatmahState] = useState<KhatmahState>(DEFAULT_KHATMAH);

  const [quranTheme, setQuranThemeState] = useState<ThemePreset>(() => {
    const saved = localStorage.getItem('tazkeer_quran_theme');
    if (saved === 'light' || saved === 'sepia' || saved === 'dark') return saved;
    return 'dark';
  });

  // Load Khatmah from IndexedDB
  useEffect(() => {
    getItem<KhatmahState>('tazkeer_khatmah_state', DEFAULT_KHATMAH).then((state) => {
      setKhatmahState(state);
    });
  }, []);

  const setCurrentPage = (page: number) => {
    const clamped = Math.max(1, Math.min(604, page));
    setCurrentPageState(clamped);
    localStorage.setItem('tazkeer_quran_last_page', String(clamped));
  };

  const setBookmark = (page: number) => {
    setBookmarkedPageState(page);
    localStorage.setItem('tazkeer_quran_bookmark', String(page));
  };

  const removeBookmark = () => {
    setBookmarkedPageState(null);
    localStorage.removeItem('tazkeer_quran_bookmark');
  };

  const startKhatmah = (goalType: 'days' | 'pages', goalValue: number, startPage: number = 1) => {
    const remainingPages = Math.max(1, 604 - startPage + 1);
    const dailyTarget = goalType === 'days' ? Math.ceil(remainingPages / goalValue) : goalValue;
    const newState: KhatmahState = {
      isActive: true,
      goalType,
      goalValue,
      dailyTarget,
      startDate: new Date().toISOString(),
      lastReadPage: startPage,
      completedPages: [],
      bookmarkedPage,
      totalPagesRead: 0,
      khatmahStartPage: startPage,
    };
    setKhatmahState(newState);
    saveItem('tazkeer_khatmah_state', newState);
  };

  const resetKhatmah = () => {
    setKhatmahState(DEFAULT_KHATMAH);
    saveItem('tazkeer_khatmah_state', DEFAULT_KHATMAH);
  };

  const markPageRead = (page: number) => {
    if (!khatmah.isActive) return;
    const alreadyRead = khatmah.completedPages.includes(page);
    const newPages = alreadyRead ? khatmah.completedPages : [...khatmah.completedPages, page];
    // Always track the highest page ever read so progress never regresses
    const newLastReadPage = Math.max(khatmah.lastReadPage, page);
    if (!alreadyRead || newLastReadPage !== khatmah.lastReadPage) {
      const updated: KhatmahState = {
        ...khatmah,
        completedPages: newPages,
        totalPagesRead: newPages.length,
        lastReadPage: newLastReadPage,
      };
      setKhatmahState(updated);
      saveItem('tazkeer_khatmah_state', updated);
    }
  };

  const setQuranTheme = (theme: ThemePreset) => {
    setQuranThemeState(theme);
    localStorage.setItem('tazkeer_quran_theme', theme);
  };

  const [activeSurahNumber, setActiveSurahNumber] = useState<number | null>(null);
  const [scope, setScope] = useState<'surah' | 'wird' | 'all'>('surah');
  const [wirdRange, setWirdRange] = useState<{ startPage: number; endPage: number } | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState<boolean>(false);

  return (
    <QuranContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        bookmarkedPage,
        setBookmark,
        removeBookmark,
        khatmah,
        startKhatmah,
        resetKhatmah,
        markPageRead,
        quranTheme,
        setQuranTheme,
        activeSurahNumber,
        setActiveSurahNumber,
        scope,
        setScope,
        wirdRange,
        setWirdRange,
        isReaderOpen,
        setIsReaderOpen,
      }}
    >
      {children}
    </QuranContext.Provider>
  );
};

export const useQuran = (): QuranContextType => {
  const context = useContext(QuranContext);
  if (!context) {
    throw new Error('useQuran must be used within a QuranProvider');
  }
  return context;
};
