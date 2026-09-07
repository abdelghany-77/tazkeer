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
  const { khatmah, scope, setCurrentPage, setActiveSurahNumber, setScope, setWirdRange, setIsReaderOpen } = useQuran();
  const [subView, setSubView] = useState<'index' | 'reader' | 'khatmah'>(() => {
    if (initialPage) {
      return 'reader';
    }
    if (khatmah.isActive) {
      return 'khatmah';
    }
    return 'index';
  });

  const [returnSubView, setReturnSubView] = useState<'index' | 'khatmah'>(() => {
    if (khatmah.isActive) return 'khatmah';
    return 'index';
  });

  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);

  // Sync subView if Khatmah state loads asynchronously
  React.useEffect(() => {
    if (!hasAutoNavigated && !initialPage && khatmah.isActive) {
      setSubView('khatmah');
      setReturnSubView('khatmah');
      setHasAutoNavigated(true);
    }
  }, [khatmah.isActive, initialPage, hasAutoNavigated]);

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
    setReturnSubView('index');
    setSubView('reader');
  };

  const handleContinueWird = (startPage: number, endPage: number, targetPage?: number) => {
    const pageToOpen = targetPage ?? startPage;
    setCurrentPage(pageToOpen);
    setWirdRange({ startPage, endPage });
    setScope('wird');
    setReturnSubView('khatmah');
    setSubView('reader');
  };

  const handleBackFromReader = () => {
    if (scope === 'wird' || khatmah.isActive) {
      setSubView('khatmah');
    } else {
      setSubView(returnSubView);
    }
  };

  return (
    <div className="h-full w-full flex-1 overflow-hidden flex flex-col">
      {subView === 'reader' && (
        <QuranReader onBackToIndex={handleBackFromReader} />
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
