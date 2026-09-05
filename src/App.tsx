import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { QuranProvider } from './context/QuranContext';
import { HomeScreen } from './components/HomeScreen';
import { AdhkarView } from './components/AdhkarView';
import { QuranView } from './components/QuranView';
import { ProfileView } from './components/ProfileView';
import { BottomNav } from './components/BottomNav';
import { TasbihModal } from './components/TasbihModal';
import { QiblaModal } from './components/QiblaModal';
import type { TabId } from './types';

import { useQuran } from './context/QuranContext';

function TazkeerApp() {
  const { isReaderOpen } = useQuran();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isTasbihOpen, setIsTasbihOpen] = useState<boolean>(false);
  const [isQiblaOpen, setIsQiblaOpen] = useState<boolean>(false);

  // Jump targets when navigating from Home
  const [targetAdhkarCategory, setTargetAdhkarCategory] = useState<string | null>(null);
  const [targetQuranPage, setTargetQuranPage] = useState<number | null>(null);

  const handleOpenAdhkarCategory = (categoryKey: string) => {
    setTargetAdhkarCategory(categoryKey);
    setActiveTab('adhkar');
  };

  const handleOpenQuranPage = (page: number) => {
    setTargetQuranPage(page);
    setActiveTab('quran');
  };

  return (
    <div className="h-full w-full flex-1 flex flex-col overflow-hidden bg-primary-bg text-text-primary">
      {/* ── Main Tab Content ── */}
      <main className="flex-1 w-full overflow-hidden relative flex flex-col">
        {activeTab === 'home' && (
          <HomeScreen
            onOpenAdhkarCategory={handleOpenAdhkarCategory}
            onOpenQuranPage={handleOpenQuranPage}
            onOpenTasbih={() => setIsTasbihOpen(true)}
            onOpenQibla={() => setIsQiblaOpen(true)}
          />
        )}

        {activeTab === 'adhkar' && (
          <AdhkarView
            onOpenTasbih={() => setIsTasbihOpen(true)}
            initialCategoryKey={targetAdhkarCategory}
            onClearInitialCategory={() => setTargetAdhkarCategory(null)}
          />
        )}

        {activeTab === 'quran' && (
          <QuranView
            initialPage={targetQuranPage}
            onClearInitialPage={() => setTargetQuranPage(null)}
          />
        )}

        {activeTab === 'profile' && <ProfileView onOpenQuranPage={handleOpenQuranPage} />}
      </main>

      {/* ── Bottom Navigation (hidden when in Quran Reader for full immersion) ── */}
      {!isReaderOpen && <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />}

      {/* ── Global Standalone Modals ── */}
      <TasbihModal isOpen={isTasbihOpen} onClose={() => setIsTasbihOpen(false)} />
      <QiblaModal isOpen={isQiblaOpen} onClose={() => setIsQiblaOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QuranProvider>
        <TazkeerApp />
      </QuranProvider>
    </ThemeProvider>
  );
}
