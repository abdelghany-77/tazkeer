import React, { useState, useEffect } from "react";
import { useQuran } from "@/context/QuranContext";
import { usePWA } from "@/hooks/usePWA";
import { SadaqaBanner } from "./SadaqaBanner";
import { getItem, getTodayDateKey } from "@/utils/storage";
import { getActivityLog, getWeekDayDates, type WeeklyActivityLog } from "@/utils/activity";
import { toArabicNumber } from "@/data/surah-data";
import {
  BookOpen,
  TrendingUp,
  Calendar,
  Award,
  Play,
  BarChart3,
  Flame,
  Check,
  Trophy,
  Download,
} from "lucide-react";

interface ProfileViewProps {
  onOpenQuranPage?: (page: number) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenQuranPage,
}) => {
  const { currentPage, khatmah } = useQuran();
  const { isInstallable, installApp } = usePWA();

  const [tasbihTotal, setTasbihTotal] = useState<number>(0);
  const [completedCategoriesCount, setCompletedCategoriesCount] =
    useState<number>(0);
  const [activeActivityTab, setActiveActivityTab] = useState<
    "adhkar" | "quran"
  >("adhkar");
  const [weeklyLog, setWeeklyLog] = useState<WeeklyActivityLog>({});

  useEffect(() => {
    getItem<number>("tazkeer_tasbih_count", 0).then((v) => setTasbihTotal(v));
    getActivityLog().then((log) => setWeeklyLog(log));

    const checkCats = async () => {
      const keys = [
        "morning", "evening", "prayer", "sleep", "wakeup", "general",
        "eating", "travel", "dua", "rain", "anxiety", "home",
      ];
      const today = getTodayDateKey();
      let count = 0;
      for (const k of keys) {
        const s = await getItem<{ completed: boolean; completedDate?: string } | null>(
          `tazkeer_session_${k}`,
          null,
        );
        if (s?.completed && s.completedDate === today) count++;
      }
      setCompletedCategoriesCount(count);
    };
    checkCats();
  }, []);

  const activeQuranPage = khatmah.isActive
    ? khatmah.lastReadPage
    : currentPage || 1;
  const quranPagesRead = khatmah.totalPagesRead || 0;

  const streakDays = completedCategoriesCount > 0 ? 1 : 0;
  const todayAdhkarCount = completedCategoriesCount;
  const weekAdhkarCount = Math.max(todayAdhkarCount, 1);
  const totalAdhkarCount = Math.max(
    tasbihTotal + completedCategoriesCount * 12,
    1,
  );

  // Compute dynamic weekly activity data
  const weekDayDefs = getWeekDayDates();
  const todayKey = getTodayDateKey();

  const weekActivityData = weekDayDefs.map((day) => {
    const record = weeklyLog[day.dateKey] || { quranPages: 0, adhkarCount: 0 };
    return {
      dateKey: day.dateKey,
      name: day.name,
      quranPages: record.quranPages || 0,
      adhkarCount: record.adhkarCount || 0,
      isToday: day.dateKey === todayKey,
    };
  });

  const maxQuranInWeek = Math.max(1, ...weekActivityData.map((d) => d.quranPages));
  const maxAdhkarInWeek = Math.max(1, ...weekActivityData.map((d) => d.adhkarCount));

  const totalQuranThisWeek = weekActivityData.reduce((sum, d) => sum + d.quranPages, 0);
  const totalAdhkarThisWeek = weekActivityData.reduce((sum, d) => sum + d.adhkarCount, 0);

  return (
    <div
      className="h-full flex flex-col justify-start px-3 max-w-2xl mx-auto w-full select-none gap-2.5 overflow-y-auto no-scrollbar"
      style={{
        paddingTop: "max(6px, env(safe-area-inset-top, 6px))",
        paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))",
      }}
    >
      {/* ═══ MASTER UNIFIED STATS & ACTIVITY CONTAINER ═══ */}
      <div className="rounded-3xl p-4 glass-card border border-border-subtle/70 bg-gradient-to-br from-primary-surface/95 via-primary-card/85 to-primary-surface/95 shadow-md flex flex-col gap-3">
        
        {/* ── 1. QURAN SECTION ── */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-accent-mint/15 border border-accent-mint/30 text-accent-mint shadow-inner">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-text-primary leading-tight">
                  القرآن الكريم
                </h3>
                <span className="text-[10px] text-accent-mint font-bold block mt-0.5">
                  {khatmah.isActive
                    ? `مستمر في الختمة — صفحة ${toArabicNumber(activeQuranPage)}`
                    : "ابدأ ختمة جديدة لمتابعة وردك اليومي"}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Quran Stat Pills */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-accent-cyan/10 text-accent-cyan">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(activeQuranPage)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">الصفحة الحالية</span>
            </div>

            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-accent-emerald/10 text-accent-emerald">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(quranPagesRead)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">صفحة مقروءة</span>
            </div>

            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-accent-mint/10 text-accent-mint">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(streakDays || 1)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">أيام القراءة</span>
            </div>

            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-accent-gold/10 text-accent-gold">
                <Award className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(0)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">عدد الختمات</span>
            </div>
          </div>

          {/* Continue Reading Button */}
          <button
            onClick={() => onOpenQuranPage?.(activeQuranPage)}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-accent-mint to-accent-emerald text-primary-bg font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-accent-mint/20 hover:brightness-110"
          >
            <Play className="w-3.5 h-3.5 fill-primary-bg" />
            <span>متابعة القراءة</span>
          </button>
        </div>

        {/* ── LINE SEPARATOR 1 ── */}
        <div className="border-t border-border-subtle/40 my-0.5" />

        {/* ── 2. ADHKAR STATS SECTION ── */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 shadow-inner">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-text-primary leading-tight">
                إحصائيات الأذكار
              </h3>
              <span className="text-[10px] text-text-muted block mt-0.5">
                متابعة الأذكار المكتملة والإنجاز اليومي
              </span>
            </div>
          </div>

          {/* 4 Adhkar Stat Pills */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-amber-500/10 text-amber-500">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(streakDays || 1)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">أيام</span>
            </div>

            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-accent-mint/10 text-accent-mint">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(todayAdhkarCount)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">اليوم</span>
            </div>

            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-cyan-400/10 text-cyan-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(weekAdhkarCount)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">الأسبوع</span>
            </div>

            <div className="py-2 px-1 rounded-2xl bg-primary-card/80 border border-border-subtle/30 flex flex-col items-center text-center gap-0.5 shadow-sm">
              <div className="p-1 rounded-xl bg-purple-400/10 text-purple-400">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs sm:text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(totalAdhkarCount)}
              </span>
              <span className="text-[9px] font-semibold text-text-muted">الإجمالي</span>
            </div>
          </div>
        </div>

        {/* ── LINE SEPARATOR 2 ── */}
        <div className="border-t border-border-subtle/40 my-0.5" />

          {/* ═══ MODERN WEEKLY ACTIVITY CHART ═══ */}
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-text-primary">نشاط الأسبوع</h4>
                <span className="text-[10px] sm:text-xs font-semibold text-accent-mint block mt-0.5">
                  {activeActivityTab === "quran"
                    ? `إجمالي الصفحات: ${toArabicNumber(totalQuranThisWeek)} صفحة`
                    : `إجمالي الأذكار: ${toArabicNumber(totalAdhkarThisWeek)} ذكر`}
                </span>
              </div>

              {/* Segmented Pill Switcher */}
              <div className="flex p-0.5 rounded-xl bg-primary-card border border-border-subtle/60 text-[10px] font-semibold shadow-inner">
                <button
                  onClick={() => setActiveActivityTab("adhkar")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeActivityTab === "adhkar"
                      ? "bg-accent-mint text-primary-bg font-black shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  الأذكار
                </button>
                <button
                  onClick={() => setActiveActivityTab("quran")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeActivityTab === "quran"
                      ? "bg-accent-mint text-primary-bg font-black shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  القرآن
                </button>
              </div>
            </div>

            {/* Modern Expanded Chart Display */}
            <div className="grid grid-cols-7 gap-2 pt-2 items-end">
              {weekActivityData.map((day) => {
                const val = activeActivityTab === "quran" ? day.quranPages : day.adhkarCount;
                const maxVal = activeActivityTab === "quran" ? maxQuranInWeek : maxAdhkarInWeek;
                const heightPercent = val > 0 ? Math.max(22, Math.round((val / maxVal) * 100)) : 10;

                return (
                  <div key={day.dateKey} className="flex flex-col items-center gap-1.5">
                    {/* Top Value Indicator */}
                    <span className={`text-[10px] sm:text-xs font-mono font-bold transition-all ${
                      val > 0 ? (day.isToday ? "text-accent-mint" : "text-text-primary") : "text-text-muted/30"
                    }`}>
                      {val > 0 ? toArabicNumber(val) : "-"}
                    </span>

                    {/* Bar Track & Gradient Fill (Slightly shorter height h-28 sm:h-32) */}
                    <div
                      className={`w-full max-w-[42px] h-28 sm:h-32 rounded-2xl p-1 flex flex-col justify-end transition-all ${
                        day.isToday
                          ? "bg-primary-card border border-accent-mint/50 shadow-inner ring-2 ring-accent-mint/10"
                          : "bg-primary-card/50 border border-border-subtle/25"
                      }`}
                    >
                      <div
                        className={`w-full rounded-xl transition-all duration-500 ${
                          val > 0
                            ? day.isToday
                              ? activeActivityTab === "quran"
                                ? "bg-gradient-to-t from-accent-mint via-accent-emerald to-teal-300 shadow-md shadow-accent-mint/30"
                                : "bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 shadow-md shadow-amber-500/30"
                              : activeActivityTab === "quran"
                                ? "bg-gradient-to-t from-accent-mint/70 to-accent-emerald"
                                : "bg-gradient-to-t from-amber-500/70 to-amber-400"
                            : "bg-white/5"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Day Name */}
                    <span
                      className={`text-[10px] sm:text-xs font-bold ${
                        day.isToday
                          ? "text-accent-mint underline decoration-accent-mint/50 underline-offset-2"
                          : "text-text-muted"
                      }`}
                    >
                      {day.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* ═══ 3. SADAQA BANNER ═══ */}
      <div className="shrink-0">
        <SadaqaBanner />
      </div>

      {/* PWA Install Button if applicable */}
      {isInstallable && (
        <div className="px-3.5 py-2 rounded-2xl glass-card border border-accent-mint/30 bg-accent-mint/5 flex items-center justify-between text-xs shadow-sm w-full shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-accent-mint/20 text-accent-mint">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-text-primary block">تثبيت التطبيق</span>
              <span className="text-[10px] text-text-muted">لتشغيل أسرع</span>
            </div>
          </div>
          <button
            onClick={installApp}
            className="px-3.5 py-1.5 rounded-xl bg-accent-mint text-primary-bg font-bold shadow-sm active:scale-95 hover:bg-accent-emerald transition-colors text-xs"
          >
            تثبيت
          </button>
        </div>
      )}
    </div>
  );
};
