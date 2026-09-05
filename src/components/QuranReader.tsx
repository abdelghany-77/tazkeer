import React, { useState, useEffect } from 'react';
import { useQuran } from '@/context/QuranContext';
import {
  getPageImageUrl,
  getSurahForPage,
  getJuzForPage,
  getSurahPageRange,
  toArabicNumber,
  TOTAL_QURAN_PAGES,
} from '@/data/surah-data';
import {
  ArrowRight,
  Bookmark,
  Settings,
  Sparkles,
} from 'lucide-react';
import { QuranSettingsModal } from './QuranSettingsModal';
import { motion, AnimatePresence } from 'framer-motion';

// Global in-memory cache of fully downloaded Quran page URLs
const loadedPageCache = new Set<string>();

interface QuranReaderProps {
  onBackToIndex: () => void;
}

export const QuranReader: React.FC<QuranReaderProps> = ({ onBackToIndex }) => {
  const {
    currentPage,
    setCurrentPage,
    bookmarkedPage,
    setBookmark,
    removeBookmark,
    quranTheme,
    activeSurahNumber,
    setActiveSurahNumber,
    scope,
    setScope,
    wirdRange,
    markPageRead,
  } = useQuran();

  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [direction, setDirection] = useState<number>(0);
  const currentImageUrl = getPageImageUrl(currentPage);
  const [imgLoaded, setImgLoaded] = useState<boolean>(() => loadedPageCache.has(currentImageUrl));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Only mark page read in khatmah when reading within a Wird
  useEffect(() => {
    if (scope === 'wird') {
      markPageRead(currentPage);
    }
  }, [currentPage, scope, markPageRead]);

  // Determine active Surah and its bounds
  const currentSurah = getSurahForPage(currentPage);
  const targetSurahNumber = activeSurahNumber ?? currentSurah.number;
  const surahRange = getSurahPageRange(targetSurahNumber);

  // If in 'surah' mode, clamp page bounds to this Surah. If in 'wird' mode, clamp to wirdRange
  const minPage =
    scope === 'surah'
      ? surahRange.startPage
      : scope === 'wird' && wirdRange
      ? wirdRange.startPage
      : 1;

  const maxPage =
    scope === 'surah'
      ? surahRange.endPage
      : scope === 'wird' && wirdRange
      ? wirdRange.endPage
      : TOTAL_QURAN_PAGES;

  // Ultra-fast page preloading & in-memory cache
  useEffect(() => {
    const url = getPageImageUrl(currentPage);
    if (loadedPageCache.has(url)) {
      setImgLoaded(true);
    } else {
      // Probe if browser has cached the image
      const probe = new Image();
      probe.src = url;
      if (probe.complete && probe.naturalWidth > 0) {
        loadedPageCache.add(url);
        setImgLoaded(true);
      } else {
        setImgLoaded(false);
      }
    }

    // Aggressively prefetch forward (+1, +2, +3, +4) and backward (-1, -2)
    const offsetsToPrefetch = [1, 2, 3, 4, -1, -2];
    offsetsToPrefetch.forEach((offset) => {
      const targetPage = currentPage + offset;
      if (targetPage >= 1 && targetPage <= TOTAL_QURAN_PAGES) {
        const prefetchUrl = getPageImageUrl(targetPage);
        if (!loadedPageCache.has(prefetchUrl)) {
          const img = new Image();
          img.src = prefetchUrl;
          img.onload = () => loadedPageCache.add(prefetchUrl);
        }
      }
    });
  }, [currentPage]);

  // If page falls outside range when switching modes, clamp it
  useEffect(() => {
    if (scope === 'surah') {
      if (currentPage < surahRange.startPage) {
        setCurrentPage(surahRange.startPage);
      } else if (currentPage > surahRange.endPage) {
        setCurrentPage(surahRange.endPage);
      }
    } else if (scope === 'wird' && wirdRange) {
      if (currentPage < wirdRange.startPage) {
        setCurrentPage(wirdRange.startPage);
      } else if (currentPage > wirdRange.endPage) {
        setCurrentPage(wirdRange.endPage);
      }
    }
  }, [scope, surahRange.startPage, surahRange.endPage, wirdRange, currentPage, setCurrentPage]);

  const currentJuz = getJuzForPage(currentPage);
  const isBookmarked = bookmarkedPage === currentPage;
  const isDark = quranTheme === 'dark';
  const isSepia = quranTheme === 'sepia';
  const isLight = quranTheme === 'light';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Next page (In RTL reading: left is forward/next page)
  const goToNextPage = () => {
    if (currentPage < maxPage) {
      setDirection(1);
      setCurrentPage(currentPage + 1);
    } else if (scope === 'surah') {
      showToast(`نهاية سورة ${currentSurah.name}`);
    } else if (scope === 'wird') {
      showToast('أتممت قراءة الورد اليومي بارك الله فيك');
    }
  };

  // Prev page (In RTL reading: right is backward/prev page)
  const goToPrevPage = () => {
    if (currentPage > minPage) {
      setDirection(-1);
      setCurrentPage(currentPage - 1);
    } else if (scope === 'surah') {
      showToast(`بداية سورة ${currentSurah.name}`);
    } else if (scope === 'wird') {
      showToast('أنت في بداية الورد اليومي');
    }
  };

  // Swipe handler for touch / drag
  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 35;
    if (info.offset.x < -threshold || info.velocity.x < -250) {
      goToNextPage();
    } else if (info.offset.x > threshold || info.velocity.x > 250) {
      goToPrevPage();
    }
  };

  const toggleBookmark = () => {
    if (isBookmarked) {
      removeBookmark();
    } else {
      setBookmark(currentPage);
    }
  };

  // Toggle between browsing scopes: wird -> surah -> all
  const toggleScope = () => {
    if (scope === 'wird') {
      setActiveSurahNumber(currentSurah.number);
      setScope('surah');
      showToast(`وضع تصفح سورة ${currentSurah.name}`);
    } else if (scope === 'surah') {
      setScope('all');
      showToast('وضع تصفح المصحف كاملاً');
    } else {
      if (wirdRange) {
        setScope('wird');
        showToast('وضع تصفح الورد اليومي');
      } else {
        setActiveSurahNumber(currentSurah.number);
        setScope('surah');
        showToast(`وضع تصفح سورة ${currentSurah.name}`);
      }
    }
  };

  // Calculate page within scope
  const pageInSurah = currentPage - surahRange.startPage + 1;
  const totalSurahPages = surahRange.totalPages;

  const pageInWird = wirdRange ? currentPage - wirdRange.startPage + 1 : 1;
  const totalWirdPages = wirdRange ? wirdRange.endPage - wirdRange.startPage + 1 : 1;

  // Dynamic theme background colors
  const themeBgColor = isSepia
    ? '#F5F0E8'
    : isLight
    ? '#FFFFFF'
    : '#000000';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none transition-colors duration-200"
      style={{
        backgroundColor: themeBgColor,
        height: '100dvh',
        width: '100vw',
      }}
      data-quran-theme={quranTheme}
    >
      {/* ── Top Bar: Matching Reference Design with Dynamic Island / Notch Inset ── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`px-3 shrink-0 flex items-center justify-between z-30 ${
              isDark
                ? 'bg-black/95 text-white border-b border-neutral-900'
                : isSepia
                ? 'bg-[#EFE6D8]/95 border-b border-[#D8CCB9] text-[#5C4B37]'
                : 'bg-white/95 border-b border-slate-200 text-slate-800'
            } backdrop-blur-md`}
            style={{
              paddingTop: 'max(8px, env(safe-area-inset-top, 8px))',
              paddingBottom: '8px',
            }}
          >
            {/* Right side in RTL: Circular Back Button */}
            <button
              onClick={onBackToIndex}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isDark
                  ? 'bg-[#1b2b24] text-white hover:bg-[#253d32] border border-[#2e473b]/50 shadow-sm active:scale-95'
                  : isSepia
                  ? 'bg-[#E3D7C4] text-[#5C4B37] hover:bg-[#D8CCB9] border border-[#CBBDA6] active:scale-95'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 active:scale-95'
              }`}
              title="فهرس السور"
            >
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Center: Surah Name & Page/Juz info (tap to toggle scope) */}
            <div
              onClick={toggleScope}
              className="flex flex-col items-center justify-center text-center cursor-pointer group select-none"
              title="انقر للتبديل بين تصفح الورد أو السورة أو كامل المصحف"
            >
              <h3 className={`text-sm sm:text-base font-bold leading-tight drop-shadow-sm transition-all flex items-center gap-1.5 ${
                isDark ? 'text-accent-mint group-hover:brightness-110' : isSepia ? 'text-[#8A5A2B]' : 'text-[#0E8055]'
              }`}>
                سورة {currentSurah.name}
                {scope === 'surah' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-mint/15 text-accent-mint border border-accent-mint/30 font-normal">
                    السورة
                  </span>
                )}
                {scope === 'wird' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold border border-accent-gold/40 font-normal">
                    الورد اليومي
                  </span>
                )}
              </h3>
              <span className={`text-[11px] font-medium mt-0.5 ${
                isDark ? 'text-neutral-300' : isSepia ? 'text-[#7A6953]' : 'text-slate-500'
              }`}>
                {scope === 'wird'
                  ? `صفحة ${toArabicNumber(currentPage)} (ورد: ${toArabicNumber(pageInWird)} من ${toArabicNumber(totalWirdPages)})`
                  : `صفحة ${toArabicNumber(currentPage)} • ${currentJuz.name}`}
              </span>
            </div>

            {/* Left side in RTL: Circular Settings & Bookmark Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isDark
                    ? 'bg-[#1b2b24] text-white hover:bg-[#253d32] border border-[#2e473b]/50 shadow-sm active:scale-95'
                    : isSepia
                    ? 'bg-[#E3D7C4] text-[#5C4B37] hover:bg-[#D8CCB9] border border-[#CBBDA6] active:scale-95'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 active:scale-95'
                }`}
                title="الإعدادات والمظهر"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleBookmark}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isDark
                    ? 'bg-[#1b2b24] hover:bg-[#253d32] border border-[#2e473b]/50 shadow-sm active:scale-95'
                    : isSepia
                    ? 'bg-[#E3D7C4] hover:bg-[#D8CCB9] border border-[#CBBDA6] active:scale-95'
                    : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 active:scale-95'
                } ${isBookmarked ? 'text-accent-gold' : isDark ? 'text-white' : 'text-slate-700'}`}
                title="العلامة المرجعية"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-accent-gold text-accent-gold' : ''}`} />
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── Mushaf Page Viewport: Maximized Height & Width for High Readability ── */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-0 w-full h-full min-h-0"
        style={{ backgroundColor: themeBgColor }}
      >
        {/* Animated Page Image */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentPage}
            initial={{ opacity: 0.85, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0.85, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full h-full flex items-center justify-center relative pointer-events-none p-0"
          >
            {/* Loading placeholder skeleton / spinner */}
            {!imgLoaded && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ backgroundColor: themeBgColor }}
              >
                <div className={`w-8 h-8 rounded-full border-2 animate-spin ${
                  isDark
                    ? 'border-accent-mint/30 border-t-accent-mint'
                    : isSepia
                    ? 'border-amber-700/30 border-t-amber-700'
                    : 'border-emerald-600/30 border-t-emerald-600'
                }`} />
                <span
                  className={`text-xs font-mono ${
                    isDark
                      ? 'text-neutral-400'
                      : isSepia
                      ? 'text-amber-900/60'
                      : 'text-slate-500'
                  }`}
                >
                  جاري تحميل صفحة {toArabicNumber(currentPage)}...
                </span>
              </div>
            )}

            <img
              src={currentImageUrl}
              alt={`صفحة ${currentPage}`}
              loading="eager"
              decoding="async"
              onLoad={() => {
                loadedPageCache.add(currentImageUrl);
                setImgLoaded(true);
              }}
              className={`mushaf-image object-fill transition-opacity duration-150 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                filter: isDark
                  ? 'invert(1) grayscale(1) brightness(0.9) contrast(1.6)'
                  : isSepia
                  ? 'sepia(0.55) contrast(1.15) brightness(0.96) saturate(1.2)'
                  : 'contrast(1.08) brightness(1.02)',
                mixBlendMode: isDark ? 'normal' : 'multiply',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Physically Fixed Left / Center / Right Click Zones (LTR container avoids RTL flex flip) ── */}
        <div className="absolute inset-0 z-20 pointer-events-auto select-none" dir="ltr">
          {/* PHYSICAL LEFT: In Arabic reading (RTL), advancing to the NEXT page means clicking the LEFT side */}
          <div
            onClick={goToNextPage}
            className="absolute left-0 top-0 bottom-0 w-[38%] cursor-pointer active:bg-accent-mint/[0.03] transition-colors"
            title="الصفحة التالية (اليسار)"
          />

          {/* PHYSICAL CENTER: Toggle Controls */}
          <div
            onClick={() => setControlsVisible(!controlsVisible)}
            className="absolute left-[38%] top-0 bottom-0 w-[24%] cursor-pointer"
            title="إظهار/إخفاء عناصر التحكم"
          />

          {/* PHYSICAL RIGHT: In Arabic reading (RTL), going back to the PREVIOUS page means clicking the RIGHT side */}
          <div
            onClick={goToPrevPage}
            className="absolute right-0 top-0 bottom-0 w-[38%] cursor-pointer active:bg-accent-gold/[0.03] transition-colors"
            title="الصفحة السابقة (اليمين)"
          />
        </div>

        {/* Floating Toast Message */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-12 z-40 px-3.5 py-1.5 rounded-xl bg-black/90 border border-accent-mint/40 text-neutral-100 text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 pointer-events-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-mint" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Controls: Minimalist Scrubber Matching Reference Photo with Safe Area Inset ── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.footer
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`px-4 pt-1.5 shrink-0 flex flex-col gap-1 z-30 ${
              isDark
                ? 'bg-black/95 text-white border-t border-neutral-900'
                : isSepia
                ? 'bg-[#EFE6D8]/95 border-t border-[#D8CCB9] text-[#5C4B37]'
                : 'bg-white/95 border-t border-slate-200 text-slate-800'
            } backdrop-blur-md`}
            style={{
              paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
            }}
          >
            {/* Numbers Row matching photo: Right shows page/total, Left shows percentage */}
            <div className="flex items-center justify-between text-xs font-mono font-bold px-0.5">
              <span className={isDark ? 'text-accent-mint tracking-wider' : isSepia ? 'text-[#8A5A2B]' : 'text-[#0E8055]'}>
                {scope === 'wird'
                  ? `${toArabicNumber(totalWirdPages)} / ${toArabicNumber(pageInWird)}`
                  : scope === 'surah'
                  ? `${toArabicNumber(totalSurahPages)} / ${toArabicNumber(pageInSurah)}`
                  : `${toArabicNumber(TOTAL_QURAN_PAGES)} / ${toArabicNumber(currentPage)}`}
              </span>

              <span className={isDark ? 'text-accent-mint tracking-wider' : isSepia ? 'text-[#8A5A2B]' : 'text-[#0E8055]'}>
                %{toArabicNumber(Math.round((currentPage / TOTAL_QURAN_PAGES) * 100))}
              </span>
            </div>

            {/* Ultra-slim green progress slider */}
            <div className="w-full relative flex items-center py-0.5">
              <input
                type="range"
                min={minPage}
                max={maxPage}
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                className={`w-full accent-accent-mint h-1 rounded-full cursor-pointer ${
                  isDark ? 'bg-neutral-800' : isSepia ? 'bg-[#D8CCB9]' : 'bg-slate-200'
                }`}
              />
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <QuranSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
