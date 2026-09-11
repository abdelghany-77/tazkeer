import React, { useState } from 'react';
import { useQuran } from '@/context/QuranContext';
import { SurahList } from './SurahList';
import { QuranReader } from './QuranReader';
import { KhatmahDashboard } from './KhatmahDashboard';

interface QuranViewProps {
  initialPage?: number | null;
  onClearInitialPage?: () => void;
}

export const QuranView: React.FC<QuranViewProps> = ({ initialPage, onClearInitialPage }) => {
  const { setCurrentPage, setActiveSurahNumber, setScope, setWirdRange, setIsReaderOpen } = useQuran();
  const [subView, setSubView] = useState<'index' | 'reader' | 'khatmah'>(() => {
    if (initialPage) {
      return 'reader';
    }
    return 'index';
  });

  React.useEffect(() => {
    setIsReaderOpen(subView === 'reader');
    return () => setIsReaderOpen(false);
  }, [subView, setIsReaderOpen]);

  // Handle external jump (like Friday Kahf banner or Bookmark)
  React.useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
      if (initialPage === 293) {
        // Surah Al-Kahf is Surah 18
        setActiveSurahNumber(18);
        setScope('surah');
      }
      setSubView('reader');
      if (onClearInitialPage) onClearInitialPage();
    }
  }, [initialPage, setCurrentPage, setActiveSurahNumber, setScope, onClearInitialPage]);

  const handleSelectPage = (page: number, surahNumber?: number) => {
    setCurrentPage(page);
    setWirdRange(null);
    if (surahNumber) {
      setActiveSurahNumber(surahNumber);
      setScope('surah');
    } else {
      setScope('all');
    }
    setSubView('reader');
  };

  const handleContinueWird = (startPage: number, endPage: number, targetPage?: number) => {
    const pageToOpen = targetPage ?? startPage;
    setCurrentPage(pageToOpen);
    setWirdRange({ startPage, endPage });
    setScope('wird');
    setSubView('reader');
  };

  return (
    <div className="h-full w-full flex-1 overflow-hidden flex flex-col">
      {subView === 'reader' && (
        <QuranReader onBackToIndex={() => setSubView('index')} />
      )}
      {subView === 'index' && (
        <SurahList
          onSelectPage={handleSelectPage}
          onOpenKhatmah={() => setSubView('khatmah')}
        />
      )}
      {subView === 'khatmah' && (
        <KhatmahDashboard
          onContinueWird={handleContinueWird}
          onBack={() => setSubView('index')}
        />
      )}
    </div>
  );
};
