import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface FridayBannerProps {
  onOpenKahf: () => void;
  forceShow?: boolean;
}

export const FridayBanner: React.FC<FridayBannerProps> = ({ onOpenKahf, forceShow = false }) => {
  const isFriday = new Date().getDay() === 5 || forceShow;

  if (!isFriday) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative shrink-0 w-full overflow-hidden rounded-xl px-3 py-2.5 my-1 border border-accent-mint/40 bg-gradient-to-r from-emerald-950/70 via-primary-surface/90 to-teal-950/70 backdrop-blur-md shadow-sm shadow-accent-mint/5"
    >
      {/* Animated glow */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-accent-mint/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-mint/20 border border-accent-mint/40 flex items-center justify-center text-accent-mint shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-accent-mint uppercase tracking-wider">سُنَّة يوم الجمعة</span>
              <span className="w-1 h-1 rounded-full bg-accent-mint animate-ping" />
            </div>
            <h3 className="text-[11px] font-bold text-text-primary mt-0.5 leading-tight">قراءة سورة الكهف نُورٌ بين الجُمعتين</h3>
          </div>
        </div>

        <button
          onClick={onOpenKahf}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-mint text-primary-bg font-bold text-[10px] hover:bg-accent-emerald transition-all shadow-sm active:scale-95"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>اقرأ</span>
        </button>
      </div>
    </motion.div>
  );
};
