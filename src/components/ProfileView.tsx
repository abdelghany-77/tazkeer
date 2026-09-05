import React, { useState, useEffect } from "react";
import { useQuran } from "@/context/QuranContext";
import { usePWA } from "@/hooks/usePWA";
import { SadaqaBanner } from "./SadaqaBanner";
import { getItem } from "@/utils/storage";
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

  useEffect(() => {
    getItem<number>("tazkeer_tasbih_count", 0).then((v) => setTasbihTotal(v));

    const checkCats = async () => {
      const keys = [
        "morning", "evening", "prayer", "sleep", "wakeup", "general",
        "eating", "travel", "dua", "rain", "anxiety", "home",
      ];
      let count = 0;
      for (const k of keys) {
        const s = await getItem<{ completed: boolean } | null>(
          `tazkeer_session_${k}`,
          null,
        );
        if (s?.completed) count++;
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

  const todayDayIndex = new Date().getDay();

  const weekDays = [
    { id: "sat", name: "السبت", dayIndex: 6, adhkarVal: 75, quranVal: 80 },
    { id: "sun", name: "الأحد", dayIndex: 0, adhkarVal: 15, quranVal: 20 },
    { id: "mon", name: "الإثنين", dayIndex: 1, adhkarVal: 15, quranVal: 15 },
    { id: "tue", name: "الثلاثاء", dayIndex: 2, adhkarVal: 15, quranVal: 15 },
    { id: "wed", name: "الأربعاء", dayIndex: 3, adhkarVal: 15, quranVal: 15 },
    { id: "thu", name: "الخميس", dayIndex: 4, adhkarVal: 15, quranVal: 15 },
    { id: "fri", name: "الجمعة", dayIndex: 5, adhkarVal: 15, quranVal: 25 },
  ];

  return (
    <div
      className="h-full flex flex-col px-3 max-w-2xl mx-auto w-full select-none gap-2.5"
      style={{
        paddingTop: "max(8px, env(safe-area-inset-top, 8px))",
        paddingBottom: "4px",
      }}
    >
      {/* ═══ MERGED STATS CONTAINER (Quran + Adhkar Stats) ═══ */}
      <div className="rounded-3xl p-4 glass-card border border-border-subtle bg-primary-surface/90 shadow-sm w-full flex-1 min-h-0 flex flex-col justify-between gap-3 overflow-y-auto">
        
        {/* ── Quran Section ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent-mint">
              <BookOpen className="w-5 h-5" />
              <h3 className="text-base font-black text-text-primary">
                القرآن الكريم
              </h3>
            </div>
          </div>

          <p className="text-[11px] text-text-muted text-center leading-tight">
            {khatmah.isActive
              ? `مستمر في الختمة - صفحة ${toArabicNumber(activeQuranPage)}`
              : "لم تبدأ ختمة بعد. اذهب إلى تبويب القرآن لبدء ختمة جديدة."}
          </p>

          <div className="grid grid-cols-4 gap-2 mt-1">
            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <BookOpen className="w-4 h-4 text-accent-cyan" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(activeQuranPage)}
              </span>
              <span className="text-[9px] text-text-muted">الصفحة الحالية</span>
            </div>

            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <TrendingUp className="w-4 h-4 text-accent-emerald" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(quranPagesRead)}
              </span>
              <span className="text-[9px] text-text-muted">صفحة مقروءة</span>
            </div>

            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <Calendar className="w-4 h-4 text-accent-cyan" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(streakDays || 1)}
              </span>
              <span className="text-[9px] text-text-muted">أيام القراءة</span>
            </div>

            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <Award className="w-4 h-4 text-accent-gold" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(0)}
              </span>
              <span className="text-[9px] text-text-muted">عدد الختمات</span>
            </div>
          </div>

          <button
            onClick={() => onOpenQuranPage?.(activeQuranPage)}
            className="w-full mt-1 py-2.5 rounded-2xl border border-accent-mint/40 bg-accent-mint/10 hover:bg-accent-mint/20 text-accent-mint font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm"
          >
            <Play className="w-4 h-4 fill-accent-mint/30" />
            <span>متابعة القراءة</span>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle/40" />

        {/* ── Adhkar Stats Section ── */}
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5">
          <div className="flex items-center gap-2 text-accent-mint">
            <BarChart3 className="w-5 h-5" />
            <h3 className="text-base font-black text-text-primary">
              إحصائيات الأذكار
            </h3>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(streakDays || 1)}
              </span>
              <span className="text-[9px] text-text-muted">أيام</span>
            </div>

            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <Check className="w-4 h-4 text-accent-mint" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(todayAdhkarCount)}
              </span>
              <span className="text-[9px] text-text-muted">اليوم</span>
            </div>

            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(weekAdhkarCount)}
              </span>
              <span className="text-[9px] text-text-muted">الأسبوع</span>
            </div>

            <div className="py-2 px-1.5 rounded-2xl bg-primary-card/75 border border-border-subtle/50 flex flex-col items-center text-center gap-0.5">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm font-mono text-text-primary leading-tight">
                {toArabicNumber(totalAdhkarCount)}
              </span>
              <span className="text-[9px] text-text-muted">الإجمالي</span>
            </div>
          </div>

          {/* Weekly Activity Header & Toggle */}
          <div className="flex items-center justify-between mt-1">
            <h4 className="text-xs font-bold text-text-muted">نشاط الأسبوع</h4>
            <div className="flex p-0.5 rounded-xl bg-primary-card/90 border border-border-subtle/60 text-[10px] font-semibold">
              <button
                onClick={() => setActiveActivityTab("adhkar")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeActivityTab === "adhkar"
                    ? "bg-accent-mint/20 text-accent-mint font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                الأذكار
              </button>
              <button
                onClick={() => setActiveActivityTab("quran")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeActivityTab === "quran"
                    ? "bg-accent-mint/20 text-accent-mint font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                القرآن
              </button>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="grid grid-cols-7 gap-1.5 flex-1 min-h-[70px]">
            {weekDays.map((day) => {
              const isToday = day.dayIndex === todayDayIndex;
              const barPercent =
                activeActivityTab === "adhkar" ? day.adhkarVal : day.quranVal;

              return (
                <div key={day.id} className="flex flex-col items-center gap-1 min-h-0">
                  <div
                    className={`flex-1 min-h-0 w-full rounded-xl flex flex-col justify-end p-0.5 overflow-hidden transition-all ${
                      isToday
                        ? "bg-primary-card/90 border border-accent-mint/40 shadow-sm"
                        : "bg-primary-card/40 border border-border-subtle/30"
                    }`}
                  >
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isToday
                          ? "bg-gradient-to-t from-accent-mint to-accent-emerald shadow-sm"
                          : "bg-accent-mint/25"
                      }`}
                      style={{ height: `${barPercent}%` }}
                    />
                  </div>
                  <span
                    className={`text-[9px] font-bold shrink-0 ${
                      isToday ? "text-accent-mint" : "text-text-muted"
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

      {/* ═══ SADAQA BANNER (Bigger Card at Bottom) ═══ */}
      <SadaqaBanner />

      {/* PWA Install Button if applicable */}
      {isInstallable && (
        <div className="px-3.5 py-2.5 rounded-2xl glass-card border border-accent-mint/30 bg-accent-mint/5 flex items-center justify-between text-xs shadow-sm w-full shrink-0">
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
