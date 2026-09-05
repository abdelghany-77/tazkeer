import React, { useState, useEffect } from "react";
import { Clock, MapPin, Sun, Moon, Sunrise, Compass } from "lucide-react";
import {
  getPrayerTimes,
  DEFAULT_COORDS,
  type Coordinates,
  type PrayerTimeItem,
} from "@/utils/prayerTimes";

interface PrayerTimesSectionProps {
  onOpenQibla?: () => void;
}

export const PrayerTimesSection: React.FC<PrayerTimesSectionProps> = ({
  onOpenQibla,
}) => {
  const [prayers, setPrayers] = useState<PrayerTimeItem[]>([]);
  const [nextCountdown, setNextCountdown] = useState<string>("");
  const [nextPrayerName, setNextPrayerName] = useState<string>("");
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_COORDS);
  const [locationName, setLocationName] = useState<string>("القاهرة، مصر");

  useEffect(() => {
    let isMounted = true;
    getPrayerTimes(coords).then((times) => {
      if (isMounted) setPrayers(times);
    });
    return () => {
      isMounted = false;
    };
  }, [coords]);

  // Countdown timer for next prayer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const upcoming = prayers.find((p) => p.isNext);
      if (upcoming) {
        setNextPrayerName(upcoming.nameAr);
        const diffMs = upcoming.rawDate.getTime() - now.getTime();
        if (diffMs > 0) {
          const totalSecs = Math.floor(diffMs / 1000);
          const h = Math.floor(totalSecs / 3600);
          const m = Math.floor((totalSecs % 3600) / 60);
          const s = totalSecs % 60;
          const pad = (n: number) => (n < 10 ? "0" + n : String(n));
          setNextCountdown(`${pad(h)}:${pad(m)}:${pad(s)}`);
        } else {
          setNextCountdown("حان وقت الصلاة");
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [prayers]);

  const handleRequestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setLocationName("الموقع الحالي");
        },
        () => {
          // ignore or keep default
        },
      );
    }
  };

  const getPrayerIcon = (id: PrayerTimeItem["id"]) => {
    switch (id) {
      case "fajr":
        return <Sunrise className="w-4 h-4" />;
      case "sunrise":
        return <Sun className="w-4 h-4 text-accent-gold" />;
      case "dhuhr":
        return <Sun className="w-4 h-4 text-amber-400" />;
      case "asr":
        return <Sun className="w-4 h-4 text-orange-400" />;
      case "maghrib":
        return <SunsetIcon className="w-4 h-4 text-rose-400" />;
      case "isha":
        return <Moon className="w-4 h-4 text-indigo-300" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="rounded-2xl px-3.5 py-3 glass-card border border-border-subtle shadow-sm w-full flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border-subtle/50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-mint" />
          <span className="text-xs font-bold text-text-primary">
            مواقيت الصلاة
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRequestLocation}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
            title="تحديد الموقع"
          >
            <MapPin className="w-3.5 h-3.5 text-accent-emerald" />
            <span>{locationName}</span>
          </button>

          {onOpenQibla && (
            <button
              onClick={onOpenQibla}
              className="flex items-center gap-1 text-[10px] font-bold text-accent-mint hover:text-accent-emerald bg-accent-mint/10 border border-accent-mint/30 px-2 py-1 rounded-lg transition-colors"
              title="اتجاه القبلة"
            >
              <Compass className="w-3 h-3" />
              <span>القبلة</span>
            </button>
          )}
        </div>
      </div>

      {nextPrayerName && nextCountdown && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-accent-mint/10 border border-accent-mint/30 mb-2.5 text-[11px]">
          <span className="font-semibold text-accent-mint">
            الصلاة القادمة:{" "}
            <strong className="text-text-primary font-bold">
              {nextPrayerName}
            </strong>
          </span>
          <span
            className="font-mono text-accent-mint font-bold tracking-wider"
            dir="ltr"
          >
            {nextCountdown}
          </span>
        </div>
      )}

      {/* Grid of prayer cards — 3 per row, fills remaining space */}
      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0 auto-rows-fr">
        {prayers.map((prayer) => (
          <div
            key={prayer.id}
            className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all ${
              prayer.isNext
                ? "bg-accent-mint/15 border-accent-mint text-accent-mint shadow-sm shadow-accent-mint/20 scale-[1.02]"
                : "bg-primary-surface/60 border-border-subtle/50 text-text-secondary hover:border-border-subtle"
            }`}
          >
            <div className="mb-0.5">{getPrayerIcon(prayer.id)}</div>
            <span className="text-[10px] font-bold leading-tight">{prayer.nameAr}</span>
            <span
              className="text-[10px] font-semibold mt-0.5 font-mono text-text-primary"
              dir="ltr"
            >
              {prayer.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function SunsetIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 10V2" />
      <path d="m4.93 10.93 1.41 1.41" />
      <path d="M2 18h20" />
      <path d="M20 18a8 8 0 1 0-16 0" />
      <path d="m19.07 10.93-1.41 1.41" />
      <path d="M16 6h6" />
      <path d="M16 10h6" />
    </svg>
  );
}
