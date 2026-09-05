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
} from 'lucide-react';
import { toArabicNumber, getSurahForPage, TOTAL_QURAN_PAGES } from '@/data/surah-data';

interface KhatmahDashboardProps {
  onContinueWird: (startPage: number, endPage: number, targetPage?: number) => void;
  onBack: () => void;
}

export const KhatmahDashboard: React.FC<KhatmahDashboardProps> = ({
  onContinueWird,
  onBack,
}) => {
  const { khatmah, startKhatmah, resetKhatmah } = useQuran();
  const [goalType, setGoalType] = useState<'days' | 'pages'>('days');
  const [goalValue, setGoalValue] = useState<number>(30);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const totalPages = TOTAL_QURAN_PAGES; // 604
  const dailyTarget = Math.max(1, khatmah.dailyTarget || 20);
  const totalWirds = Math.ceil(totalPages / dailyTarget);

  // Determine current active wird index (1-based)
  // Last read page determines which wird the user is currently on
  const readPagesCount = Math.min(totalPages, khatmah.totalPagesRead);
  const lastPage = Math.max(1, Math.min(totalPages, khatmah.lastReadPage));

  const currentWirdIndex = Math.min(
    totalWirds,
    Math.max(1, Math.floor((lastPage - 1) / dailyTarget) + 1)
  );

  const wirdStartPage = (currentWirdIndex - 1) * dailyTarget + 1;
  const wirdEndPage = Math.min(totalPages, currentWirdIndex * dailyTarget);
  const wirdTotalPages = wirdEndPage - wirdStartPage + 1;

  // Pages read inside the current wird
  const pagesReadInCurrentWird = Math.max(
    0,
    Math.min(wirdTotalPages, lastPage >= wirdStartPage ? lastPage - wirdStartPage + 1 : 0)
  );

  // Overall Khatmah progress percent
  const overallPercent = Math.min(100, Math.round((readPagesCount / totalPages) * 100));

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

  const handleStart = () => {
    startKhatmah(goalType, goalValue, 1);
  };

  const handleReadWird = () => {
    // Open reader starting at lastReadPage (or wirdStartPage if earlier) Clamped to wird range
    const targetPage = Math.max(wirdStartPage, Math.min(wirdEndPage, lastPage));
    onContinueWird(wirdStartPage, wirdEndPage, targetPage);
  };

  return (
    <div className="h-full flex flex-col max-w-lg mx-auto w-full px-4 py-3 overflow-y-auto no-scrollbar select-none">
      {khatmah.isActive ? (
        /* ── Active Khatmah Dashboard matching exact user reference screenshots ── */
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
                  {toArabicNumber(readPagesCount)} / {toArabicNumber(totalPages)} صفحة
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
                className="h-full bg-[#00bba7] rounded-full transition-all duration-500"
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
            {/* Button 1: متابعة الورد (Solid Emerald Green) */}
            <button
              onClick={handleReadWird}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0e8055] hover:bg-[#119463] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#0e8055]/30 active:scale-98 transition-all"
            >
              <BookOpen className="w-5 h-5" />
              <span>متابعة الورد</span>
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
        <div className="rounded-3xl p-6 glass-card border border-border-subtle bg-primary-surface/90 shadow-xl space-y-5 my-auto shrink-0 w-full">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-mint/15 text-accent-mint border border-accent-mint/30 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-text-primary">ابدأ خطة ختم القرآن الكريم</h3>
            <p className="text-xs text-text-muted mt-1">
              حدد هدفك وسيقوم التطبيق بحساب الورد اليومي وتقسيمه ومتابعة تقدمك
            </p>
          </div>

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-2">نوع الهدف:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
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

          {/* Value Selector */}
          <div>
            <label className="text-xs font-bold text-text-muted block mb-2">
              {goalType === 'days' ? 'المدة المستهدفة (بالأيام):' : 'عدد الصفحات اليومية:'}
            </label>
            <div className="flex items-center gap-2">
              {[
                goalType === 'days' ? 15 : 10,
                goalType === 'days' ? 30 : 20,
                goalType === 'days' ? 60 : 30,
              ].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setGoalValue(preset)}
                  className={`flex-1 py-2 rounded-xl border font-mono text-xs font-bold transition-all ${
                    goalValue === preset
                      ? 'bg-accent-gold/20 text-accent-gold border-accent-gold'
                      : 'bg-primary-card text-text-muted border-border-subtle hover:text-text-primary'
                  }`}
                >
                  {toArabicNumber(preset)} {goalType === 'days' ? 'يوم' : 'صفحة'}
                </button>
              ))}
            </div>
          </div>

          {/* Daily calculation preview */}
          <div className="p-3.5 rounded-2xl bg-primary-card/70 border border-border-subtle/60 text-xs text-text-secondary space-y-1">
            <div className="flex justify-between">
              <span>الورد اليومي المحسوب:</span>
              <span className="font-bold text-accent-mint font-mono">
                {toArabicNumber(goalType === 'days' ? Math.ceil(604 / goalValue) : goalValue)} صفحة / يوم
              </span>
            </div>
            <div className="flex justify-between">
              <span>المدة التقريبية:</span>
              <span className="font-bold text-accent-gold font-mono">
                {toArabicNumber(goalType === 'days' ? goalValue : Math.ceil(604 / goalValue))} يوماً
              </span>
            </div>
          </div>

          <button
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
