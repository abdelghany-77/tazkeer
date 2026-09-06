import React, { useState } from 'react';
import { useQuran } from '@/context/QuranContext';
import {
  Calendar,
  FileText,
  Bookmark,
  Hourglass,
  BookOpen,
  RotateCcw,
  BookMarked,
  Sparkles,
  Layers,
  Plus,
  Minus,
  Flag,
} from 'lucide-react';
import {
  toArabicNumber,
  getSurahForPage,
  JUZ_DATA,
  TOTAL_QURAN_PAGES,
} from '@/data/surah-data';

interface KhatmahDashboardProps {
  onContinueWird: (startPage: number, endPage: number, targetPage?: number) => void;
  onBack: () => void;
}

export const KhatmahDashboard: React.FC<KhatmahDashboardProps> = ({
  onContinueWird,
  onBack,
}) => {
  const { khatmah, startKhatmah, resetKhatmah } = useQuran();

  // Setup form state
  const [startMode, setStartMode] = useState<'beginning' | 'page' | 'juz'>('beginning');
  const [customStartPage, setCustomStartPage] = useState<number>(1);
  const [selectedJuzNumber, setSelectedJuzNumber] = useState<number>(1);

  const [goalType, setGoalType] = useState<'days' | 'pages'>('days');
  const [goalValue, setGoalValue] = useState<number>(30);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Active Khatmah calculations (taking khatmahStartPage into account)
  const khatmahStartPage = khatmah.khatmahStartPage || 1;
  const khatmahTotalPages = Math.max(1, TOTAL_QURAN_PAGES - khatmahStartPage + 1);
  const dailyTarget = Math.max(1, khatmah.dailyTarget || 20);
  const totalWirds = Math.ceil(khatmahTotalPages / dailyTarget);

  // Determine current active wird index (1-based)
  const readPagesCount = Math.min(khatmahTotalPages, khatmah.totalPagesRead);
  const lastPage = Math.max(khatmahStartPage, Math.min(TOTAL_QURAN_PAGES, khatmah.lastReadPage));

  const currentWirdIndex = Math.min(
    totalWirds,
    Math.max(1, Math.floor((lastPage - khatmahStartPage) / dailyTarget) + 1)
  );

  const wirdStartPage = khatmahStartPage + (currentWirdIndex - 1) * dailyTarget;
  const wirdEndPage = Math.min(TOTAL_QURAN_PAGES, wirdStartPage + dailyTarget - 1);
  const wirdTotalPages = wirdEndPage - wirdStartPage + 1;

  // Pages read inside the current wird (count actual completed pages in range)
  const pagesReadInCurrentWird = khatmah.completedPages.filter(
    (p) => p >= wirdStartPage && p <= wirdEndPage
  ).length;

  // Check if current wird is fully completed
  const isCurrentWirdComplete = pagesReadInCurrentWird >= wirdTotalPages;

  // Overall Khatmah progress percent
  const overallPercent = Math.min(100, Math.round((readPagesCount / khatmahTotalPages) * 100));

  // Surahs covered by this Wird
  const startSurah = getSurahForPage(wirdStartPage);
  const endSurah = getSurahForPage(wirdEndPage);
  const surahsLabel =
    startSurah.name === endSurah.name
      ? startSurah.name
      : `${startSurah.name} — ${endSurah.name}`;

  // Days calculations
  let daysPassed = 1;
  let daysRemaining = khatmah.goalValue || 30;
  if (khatmah.startDate) {
    const startMillis = new Date(khatmah.startDate).getTime();
    const diffDays = Math.floor((Date.now() - startMillis) / (1000 * 60 * 60 * 24));
    daysPassed = Math.max(1, diffDays + 1);
    const targetDays = khatmah.goalType === 'days' ? khatmah.goalValue : totalWirds;
    daysRemaining = Math.max(0, targetDays - daysPassed);
  }

  // Determine effective starting page for new khatmah setup
  const getEffectiveStartPage = (): number => {
    if (startMode === 'page') return Math.max(1, Math.min(TOTAL_QURAN_PAGES, customStartPage));
    if (startMode === 'juz') {
      const foundJuz = JUZ_DATA.find((j) => j.number === selectedJuzNumber);
      return foundJuz ? foundJuz.startPage : 1;
    }
    return 1;
  };

  const effectiveStartPage = getEffectiveStartPage();
  const effectiveRemainingPages = Math.max(1, TOTAL_QURAN_PAGES - effectiveStartPage + 1);

  const handleStart = () => {
    startKhatmah(goalType, Math.max(1, goalValue), effectiveStartPage);
  };

  const handleReadWird = () => {
    // If current wird is complete, start reading from next wird
    if (isCurrentWirdComplete && currentWirdIndex < totalWirds) {
      const nextWirdStart = khatmahStartPage + currentWirdIndex * dailyTarget;
      const nextWirdEnd = Math.min(TOTAL_QURAN_PAGES, nextWirdStart + dailyTarget - 1);
      onContinueWird(nextWirdStart, nextWirdEnd, nextWirdStart);
    } else {
      const targetPage = Math.max(wirdStartPage, Math.min(wirdEndPage, lastPage));
      onContinueWird(wirdStartPage, wirdEndPage, targetPage);
    }
  };

  const handleNextWird = () => {
    if (currentWirdIndex < totalWirds) {
      const nextWirdStart = khatmahStartPage + currentWirdIndex * dailyTarget;
      const nextWirdEnd = Math.min(TOTAL_QURAN_PAGES, nextWirdStart + dailyTarget - 1);
      onContinueWird(nextWirdStart, nextWirdEnd, nextWirdStart);
    }
  };

  const updateGoalValue = (delta: number) => {
    setGoalValue((prev) => Math.max(1, prev + delta));
  };

  const updateStartPage = (delta: number) => {
    setCustomStartPage((prev) => Math.max(1, Math.min(TOTAL_QURAN_PAGES, prev + delta)));
  };

  return (
    <div className="h-full flex flex-col max-w-lg mx-auto w-full px-4 py-3 overflow-y-auto no-scrollbar select-none">
      {khatmah.isActive ? (
        /* ── Active Khatmah Dashboard ── */
        <div className="flex flex-col items-center w-full space-y-4 pb-6 pt-1 shrink-0">
          {/* 1. Circular Progress Indicator */}
          <div className="flex flex-col items-center justify-center my-1 relative">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* SVG Circular Ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#1c2834"
                  strokeWidth="8"
                  className="opacity-70"
                />
                {/* Progress Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#00bba7"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - overallPercent / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  %{toArabicNumber(overallPercent)}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  {toArabicNumber(readPagesCount)} / {toArabicNumber(khatmahTotalPages)} صفحة
                </span>
              </div>
            </div>
          </div>

          {/* 2. "الورد الحالي" Card */}
          <div className="w-full rounded-2xl bg-[#131c26] border border-[#223344] p-4 text-center shadow-lg relative overflow-hidden">
            {/* Top row: Badge on right (in RTL), Title with Icon on left */}
            <div className="flex items-center justify-between mb-3">
              {/* Amber Pill Badge */}
              <span className="px-3 py-1 rounded-lg bg-[#d97706] text-white text-xs font-bold shadow-sm">
                الورد {toArabicNumber(currentWirdIndex)} من {toArabicNumber(totalWirds)}
              </span>

              {/* Title with Quran Icon */}
              <div className="flex items-center gap-1.5 text-[#00bba7]">
                <BookOpen className="w-5 h-5" />
                <h3 className="text-base font-bold">الورد الحالي</h3>
              </div>
            </div>

            {/* Page Range Text */}
            <h2 className="text-xl sm:text-2xl font-black text-white my-1">
              صفحة {toArabicNumber(wirdStartPage)} إلى {toArabicNumber(wirdEndPage)}
            </h2>

            {/* Surah Coverage */}
            <p className="text-xs text-neutral-400 font-medium mb-3">
              {surahsLabel}
            </p>

            {/* Progress Bar inside Wird */}
            <div className="w-full h-1.5 rounded-full bg-[#202f3e] overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isCurrentWirdComplete ? 'bg-[#d97706]' : 'bg-[#00bba7]'}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((pagesReadInCurrentWird / wirdTotalPages) * 100)
                  )}%`,
                }}
              />
            </div>

            {/* Bottom count */}
            <div className="text-[11px] text-neutral-400 font-mono">
              {toArabicNumber(pagesReadInCurrentWird)} / {toArabicNumber(wirdTotalPages)} صفحة
              {isCurrentWirdComplete && (
                <span className="text-[#d97706] font-bold mr-2">✓ اكتمل</span>
              )}
            </div>
          </div>

          {/* 3. 2x2 Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-3">
            {/* Top-Right: صفحة / ورد */}
            <div className="rounded-2xl bg-[#131c26] border border-[#1f2d3c] p-3.5 flex flex-col items-center justify-center text-center shadow-md">
              <FileText className="w-6 h-6 text-[#00bba7] mb-1.5" />
              <span className="text-xl font-black text-white font-mono">
                {toArabicNumber(dailyTarget)}
              </span>
              <span className="text-xs text-neutral-400 mt-0.5">صفحة / ورد</span>
            </div>

            {/* Top-Left: يوم مضى */}
            <div className="rounded-2xl bg-[#131c26] border border-[#1f2d3c] p-3.5 flex flex-col items-center justify-center text-center shadow-md">
              <Calendar className="w-6 h-6 text-[#00bba7] mb-1.5" />
              <span className="text-xl font-black text-white font-mono">
                {toArabicNumber(daysPassed)}
              </span>
              <span className="text-xs text-neutral-400 mt-0.5">يوم مضى</span>
            </div>

            {/* Bottom-Right: يوم متبقي */}
            <div className="rounded-2xl bg-[#131c26] border border-[#1f2d3c] p-3.5 flex flex-col items-center justify-center text-center shadow-md">
              <Hourglass className="w-6 h-6 text-[#00bba7] mb-1.5" />
              <span className="text-xl font-black text-white font-mono">
                {toArabicNumber(daysRemaining)}
              </span>
              <span className="text-xs text-neutral-400 mt-0.5">يوم متبقي</span>
            </div>

            {/* Bottom-Left: آخر صفحة */}
            <div className="rounded-2xl bg-[#131c26] border border-[#1f2d3c] p-3.5 flex flex-col items-center justify-center text-center shadow-md">
              <Bookmark className="w-6 h-6 text-[#00bba7] mb-1.5" />
              <span className="text-xl font-black text-white font-mono">
                {toArabicNumber(lastPage)}
              </span>
              <span className="text-xs text-neutral-400 mt-0.5">آخر صفحة</span>
            </div>
          </div>

          {/* 4. Action Buttons Stack */}
          <div className="w-full flex flex-col gap-3 pt-2">
            {/* Button: الانتقال للورد التالي (when current wird is complete) */}
            {isCurrentWirdComplete && currentWirdIndex < totalWirds && (
              <button
                onClick={handleNextWird}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#d97706]/30 active:scale-98 transition-all animate-pulse"
              >
                <Sparkles className="w-5 h-5" />
                <span>الانتقال للورد التالي</span>
              </button>
            )}

            {/* Button 1: متابعة الورد (Solid Emerald Green) */}
            <button
              onClick={handleReadWird}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0e8055] hover:bg-[#119463] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#0e8055]/30 active:scale-98 transition-all"
            >
              <BookOpen className="w-5 h-5" />
              <span>{isCurrentWirdComplete ? 'مراجعة الورد' : 'متابعة الورد'}</span>
            </button>

            {/* Button 2: قراءة حرة (فهرس السور) (Outlined Green) */}
            <button
              onClick={onBack}
              className="w-full py-3 px-4 rounded-2xl bg-transparent hover:bg-[#0e8055]/10 border border-[#0e8055] text-[#00bba7] font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <BookMarked className="w-4 h-4" />
              <span>قراءة حرة (فهرس السور)</span>
            </button>

            {/* Button 3: ختمة جديدة / إعادة الختمة (Outlined Red) */}
            {showResetConfirm ? (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-center space-y-2.5">
                <p className="text-red-400 font-bold">هل أنت متأكد من رغبتك في إعادة ضبط الختمة؟</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      resetKhatmah();
                      setShowResetConfirm(false);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700"
                  >
                    نعم، بدء ختمة جديدة
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-1.5 rounded-xl bg-[#131c26] text-neutral-300 border border-neutral-700 hover:bg-[#1f2d3c]"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 px-4 rounded-2xl bg-transparent hover:bg-red-500/10 border border-red-500/70 text-red-400 font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ختمة جديدة</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── Setup New Khatmah Screen ── */
        <div className="rounded-3xl p-5 sm:p-6 glass-card border border-border-subtle bg-primary-surface/90 shadow-xl space-y-5 my-auto shrink-0 w-full">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-mint/15 text-accent-mint border border-accent-mint/30 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-text-primary">ابدأ خطة ختم القرآن الكريم</h3>
            <p className="text-xs text-text-muted mt-1">
              حدد من أين تريد البدء وهدفك القادم، وسيقوم التطبيق بتنظيم الورد ومتابعة تقدمك
            </p>
          </div>

          {/* ── 1. Start Location Selection (من أين تريد البدء؟) ── */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-accent-mint" />
              <span>نقطة بداية الختمة:</span>
            </label>

            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-primary-card/80 border border-border-subtle/70">
              <button
                type="button"
                onClick={() => setStartMode('beginning')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  startMode === 'beginning'
                    ? 'bg-accent-mint text-primary-bg shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                من البداية
              </button>
              <button
                type="button"
                onClick={() => setStartMode('page')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  startMode === 'page'
                    ? 'bg-accent-mint text-primary-bg shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                صفحة محددة
              </button>
              <button
                type="button"
                onClick={() => setStartMode('juz')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  startMode === 'juz'
                    ? 'bg-accent-mint text-primary-bg shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                جزء محدد
              </button>
            </div>

            {/* Controls depending on mode */}
            {startMode === 'beginning' && (
              <div className="p-3 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-[11px] text-accent-mint text-center font-medium">
                تبدأ الختمة من الصفحة الأولى (سورة الفاتحة) — صفحة ١
              </div>
            )}

            {startMode === 'page' && (
              <div className="p-3.5 rounded-2xl bg-primary-card/90 border border-border-subtle/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary">رقم الصفحة:</span>
                  <span className="text-xs text-accent-mint font-bold">
                    سورة {getSurahForPage(customStartPage).name}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateStartPage(-10)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle text-xs font-mono font-bold active:scale-95"
                  >
                    -١٠
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStartPage(-1)}
                    className="p-2 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={TOTAL_QURAN_PAGES}
                    value={customStartPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setCustomStartPage(Math.max(1, Math.min(TOTAL_QURAN_PAGES, val)));
                      }
                    }}
                    className="w-20 py-1.5 text-center font-mono font-bold text-base bg-[#131c26] text-accent-gold border border-accent-gold/40 rounded-xl focus:outline-none focus:border-accent-gold"
                  />

                  <button
                    type="button"
                    onClick={() => updateStartPage(1)}
                    className="p-2 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStartPage(10)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle text-xs font-mono font-bold active:scale-95"
                  >
                    +١٠
                  </button>
                </div>
              </div>
            )}

            {startMode === 'juz' && (
              <div className="p-3.5 rounded-2xl bg-primary-card/90 border border-border-subtle/80 space-y-2">
                <label className="text-xs font-bold text-text-secondary block">اختر الجزء:</label>
                <select
                  value={selectedJuzNumber}
                  onChange={(e) => setSelectedJuzNumber(parseInt(e.target.value, 10))}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#131c26] text-white border border-border-subtle text-xs font-bold focus:outline-none focus:border-accent-mint cursor-pointer"
                >
                  {JUZ_DATA.map((juz) => (
                    <option key={juz.number} value={juz.number} className="bg-[#131c26] text-white">
                      {juz.name} (صفحة {toArabicNumber(juz.startPage)})
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-accent-mint font-medium text-center pt-1">
                  تبدأ من الصفحة {toArabicNumber(effectiveStartPage)}
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Goal Type Selector (طريقة الحساب) ── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-accent-mint" />
              <span>نوع الهدف:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGoalType('days');
                  setGoalValue(30);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  goalType === 'days'
                    ? 'bg-accent-mint text-primary-bg border-accent-mint shadow-md'
                    : 'bg-primary-card text-text-secondary border-border-subtle hover:border-text-muted'
                }`}
              >
                ختم في عدد أيام
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalType('pages');
                  setGoalValue(20);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  goalType === 'pages'
                    ? 'bg-accent-mint text-primary-bg border-accent-mint shadow-md'
                    : 'bg-primary-card text-text-secondary border-border-subtle hover:border-text-muted'
                }`}
              >
                عدد صفحات باليوم
              </button>
            </div>
          </div>

          {/* ── 3. Custom Value Selector with Input & Presets ── */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-muted">
                {goalType === 'days' ? 'المدة المستهدفة (بالأيام):' : 'عدد الصفحات اليومية:'}
              </label>
              <span className="text-[11px] text-text-muted">ادخل أو اختر أي رقم</span>
            </div>

            {/* Custom Input with Stepper */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-primary-card/90 border border-border-subtle/80">
              <button
                type="button"
                onClick={() => updateGoalValue(goalType === 'days' ? -5 : -2)}
                className="px-2.5 py-1.5 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle text-xs font-mono font-bold active:scale-95"
              >
                {goalType === 'days' ? '-٥' : '-٢'}
              </button>
              <button
                type="button"
                onClick={() => updateGoalValue(-1)}
                className="p-2 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={goalType === 'days' ? 365 : effectiveRemainingPages}
                  value={goalValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setGoalValue(Math.max(1, val));
                    }
                  }}
                  className="w-20 py-1.5 text-center font-mono font-bold text-lg bg-[#131c26] text-accent-gold border border-accent-gold/40 rounded-xl focus:outline-none focus:border-accent-gold"
                />
                <span className="text-xs font-bold text-text-secondary">
                  {goalType === 'days' ? 'يوم' : 'صفحة'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => updateGoalValue(1)}
                className="p-2 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => updateGoalValue(goalType === 'days' ? 5 : 2)}
                className="px-2.5 py-1.5 rounded-xl bg-[#131c26] text-text-secondary hover:text-white border border-border-subtle text-xs font-mono font-bold active:scale-95"
              >
                {goalType === 'days' ? '+٥' : '+٢'}
              </button>
            </div>

            {/* Presets Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(goalType === 'days' ? [7, 15, 30, 45, 60, 90] : [3, 5, 10, 15, 20, 30]).map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGoalValue(preset)}
                    className={`flex-1 min-w-[50px] py-1.5 rounded-xl border font-mono text-xs font-bold transition-all ${
                      goalValue === preset
                        ? 'bg-accent-gold/20 text-accent-gold border-accent-gold'
                        : 'bg-primary-card text-text-muted border-border-subtle hover:text-text-primary'
                    }`}
                  >
                    {toArabicNumber(preset)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* ── 4. Calculation Preview Card ── */}
          <div className="p-3.5 rounded-2xl bg-primary-card/70 border border-border-subtle/60 text-xs text-text-secondary space-y-1.5">
            <div className="flex justify-between items-center">
              <span>نقطة البداية:</span>
              <span className="font-bold text-text-primary font-mono">
                صفحة {toArabicNumber(effectiveStartPage)}
              </span>
            </div>
            {effectiveStartPage > 1 && (
              <div className="flex justify-between items-center">
                <span>إجمالي الصفحات المطلوبة:</span>
                <span className="font-bold text-accent-cyan font-mono">
                  {toArabicNumber(effectiveRemainingPages)} صفحة
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span>الورد اليومي المحسوب:</span>
              <span className="font-bold text-accent-mint font-mono">
                {toArabicNumber(
                  goalType === 'days'
                    ? Math.ceil(effectiveRemainingPages / goalValue)
                    : goalValue
                )}{' '}
                صفحة / يوم
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>المدة التقريبية:</span>
              <span className="font-bold text-accent-gold font-mono">
                {toArabicNumber(
                  goalType === 'days'
                    ? goalValue
                    : Math.ceil(effectiveRemainingPages / goalValue)
                )}{' '}
                يوماً
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3.5 rounded-2xl bg-accent-mint text-primary-bg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-mint/20 hover:bg-accent-emerald active:scale-98 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>بدء الختمة ومتابعة الورد</span>
          </button>
        </div>
      )}
    </div>
  );
};
