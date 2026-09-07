import React, { useState, useEffect } from "react";
import { dailyDuas } from "@/data/daily-duas";
import type { DailyDua } from "@/types";
import { RefreshCw, Copy, Check, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const DailyDuaCard: React.FC = () => {
  const [currentDua, setCurrentDua] = useState<DailyDua>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const day = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dailyDuas[day % dailyDuas.length] || dailyDuas[0];
  });

  const [copied, setCopied] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleShuffle = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 500);
    const randomIndex = Math.floor(Math.random() * dailyDuas.length);
    setCurrentDua(dailyDuas[randomIndex]);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${currentDua.text}\n[${currentDua.source}]`,
      );
      setCopied(true);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden rounded-2xl px-4 py-3 glass-card border border-accent-gold/25 bg-gradient-to-br from-primary-surface/95 via-primary-card/75 to-primary-surface/95 shadow-sm flex flex-col">
      {/* Decorative ambient glow */}
      <div className="absolute -top-8 -right-8 w-20 h-20 bg-accent-gold/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-accent-mint/10 rounded-full blur-xl pointer-events-none" />

      {/* Header with title and action buttons */}
      <div className="relative z-10 flex items-center justify-between pb-2 border-b border-border-subtle/50 mb-auto">
        <div className="flex items-center gap-1.5 text-accent-gold font-bold text-xs">
          <Quote className="w-3.5 h-3.5 rotate-180 text-accent-mint" />
          <span>دعاء اليوم</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleShuffle}
            title="دعاء آخر"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors active:scale-95"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRotating ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={handleCopy}
            title="نسخ الدعاء"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors active:scale-95 flex items-center gap-0.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-accent-mint" />
                <span className="text-accent-mint text-[10px]">تم</span>
              </>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Dua content — vertically centered in remaining space */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDua.text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 w-full"
          >
            <p className="font-quran text-sm sm:text-base text-text-primary leading-[2] text-center px-1">
              "{currentDua.text}"
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Source badge at bottom */}
      <div className="relative z-10 flex justify-center mt-auto pt-1">
        <span className="inline-block text-[10px] font-medium px-3 py-0.5 rounded-full bg-primary-surface/80 border border-border-subtle text-text-muted">
          {currentDua.source}
        </span>
      </div>
    </div>
  );
};
