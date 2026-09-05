import React from "react";
import {
  getFormattedHijriDate,
  getFormattedGregorianDate,
} from "@/utils/prayerTimes";
import { FridayBanner } from "./FridayBanner";
import { DailyDuaCard } from "./DailyDuaCard";
import { PrayerTimesSection } from "./PrayerTimesSection";
import { Sunrise, Moon, BookOpen, ChevronLeft } from "lucide-react";
import { MisbahaIcon } from "./icons/MisbahaIcon";
import { useQuran } from "@/context/QuranContext";
import { toArabicNumber } from "@/data/surah-data";

interface HomeScreenProps {
  onOpenAdhkarCategory: (categoryKey: string) => void;
  onOpenQuranPage: (page: number) => void;
  onOpenTasbih: () => void;
  onOpenQibla: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenAdhkarCategory,
  onOpenQuranPage,
  onOpenTasbih,
  onOpenQibla,
}) => {
  const { currentPage, bookmarkedPage, khatmah } = useQuran();
  const hijriDate = getFormattedHijriDate();
  const gregorianDate = getFormattedGregorianDate();

  const resumePage =
    bookmarkedPage || (khatmah.isActive ? khatmah.lastReadPage : currentPage);

  // Get day name in Arabic
  const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayName = dayNames[new Date().getDay()];

  return (
    <div
      className="h-full flex flex-col px-3 max-w-2xl mx-auto w-full select-none gap-2"
      style={{
        paddingTop: "max(8px, env(safe-area-inset-top, 8px))",
        paddingBottom: "4px",
      }}
    >
      {/* ═══ Section 1: تاريخ اليوم ═══ */}
      <div className="relative w-full overflow-hidden rounded-2xl px-4 py-3 glass-card border border-border-subtle bg-gradient-to-br from-primary-surface/90 via-primary-card/70 to-primary-surface/90 shadow-sm">
        <div className="absolute -top-12 -left-12 w-28 h-28 bg-accent-mint/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-accent-mint tracking-wider block">
              تاريخ اليوم
            </span>
            <h2 className="text-lg font-black text-text-primary leading-tight">
              {dayName}
            </h2>
            <span className="text-xs text-text-secondary block mt-0.5">
              {hijriDate}
            </span>
            <span className="text-[10px] text-text-muted block">
              {gregorianDate}
            </span>
          </div>
          <div className="p-1 rounded-xl bg-primary-card/90 border border-accent-gold/30 shadow-inner flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/images/icon.png"
              alt="ذَكِّرْ"
              className="w-10 h-10 rounded-lg object-contain shadow-sm"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                if (target.parentElement) {
                  target.parentElement.innerHTML =
                    '<span class="text-xl font-serif text-accent-gold p-1.5">☪</span>';
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Friday Kahf Banner (conditional) ── */}
      <FridayBanner onOpenKahf={() => onOpenQuranPage(293)} />

      {/* ═══ Section 2: دعاء اليوم — expands to fill available space ═══ */}
      <div className="flex-1 min-h-0 flex flex-col">
        <DailyDuaCard />
      </div>

      {/* ═══ Section 3: Quick Actions 2×2 Grid ═══ */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <div
          onClick={() => onOpenAdhkarCategory("morning")}
          className="px-3 py-3 rounded-2xl glass-card border border-border-subtle hover:border-amber-400/50 hover:bg-amber-400/5 transition-all cursor-pointer group flex items-center justify-between shadow-sm active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400">
              <Sunrise className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-text-primary group-hover:text-amber-400 transition-colors leading-tight">
                أذكار الصباح
              </h4>
              <span className="text-[10px] text-text-muted">ابدأ يومك بذكر</span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-text-muted group-hover:text-amber-400 transition-colors" />
        </div>

        <div
          onClick={() => onOpenAdhkarCategory("evening")}
          className="px-3 py-3 rounded-2xl glass-card border border-border-subtle hover:border-indigo-400/50 hover:bg-indigo-400/5 transition-all cursor-pointer group flex items-center justify-between shadow-sm active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-400/15 border border-indigo-400/30 text-indigo-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-text-primary group-hover:text-indigo-400 transition-colors leading-tight">
                أذكار المساء
              </h4>
              <span className="text-[10px] text-text-muted">تحصين المساء</span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-text-muted group-hover:text-indigo-400 transition-colors" />
        </div>

        <div
          onClick={() => onOpenQuranPage(resumePage)}
          className="px-3 py-3 rounded-2xl glass-card border border-border-subtle hover:border-accent-mint/50 hover:bg-accent-mint/5 transition-all cursor-pointer group flex items-center justify-between shadow-sm active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-mint/15 border border-accent-mint/30 text-accent-mint">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-text-primary group-hover:text-accent-mint transition-colors leading-tight">
                متابعة القرآن
              </h4>
              <span className="text-[10px] text-text-muted">صفحة {toArabicNumber(resumePage)}</span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-text-muted group-hover:text-accent-mint transition-colors" />
        </div>

        <div
          onClick={onOpenTasbih}
          className="px-3 py-3 rounded-2xl glass-card border border-border-subtle hover:border-accent-gold/50 hover:bg-accent-gold/5 transition-all cursor-pointer group flex items-center justify-between shadow-sm active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-gold/15 border border-accent-gold/30 text-accent-gold">
              <MisbahaIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-text-primary group-hover:text-accent-gold transition-colors leading-tight">
                المسبحة
              </h4>
              <span className="text-[10px] text-text-muted">تسبيح واستغفار</span>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-text-muted group-hover:text-accent-gold transition-colors" />
        </div>
      </div>

      {/* ═══ Section 4: مواقيت الصلاة — expands to fill remaining space ═══ */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PrayerTimesSection onOpenQibla={onOpenQibla} />
      </div>
    </div>
  );
};
