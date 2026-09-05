import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Award, RotateCcw, ArrowRight } from 'lucide-react';

interface CompletionSheetProps {
  isOpen: boolean;
  categoryTitle: string;
  totalAdhkar: number;
  onRestart: () => void;
  onClose: () => void;
}

export const CompletionSheet: React.FC<CompletionSheetProps> = ({
  isOpen,
  categoryTitle,
  totalAdhkar,
  onRestart,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 glass-card border border-accent-gold/40 bg-primary-surface/95 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Top decorative drag handle for mobile */}
            <div className="w-12 h-1.5 rounded-full bg-border-subtle mb-4 sm:hidden" />

            {/* Glowing gold backdrops */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent-gold/20 rounded-full blur-3xl pointer-events-none" />

            {/* Celebration Icon */}
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-accent-gold/20 border-2 border-accent-gold flex items-center justify-center text-accent-gold shadow-lg shadow-accent-gold/20">
                <Award className="w-10 h-10 animate-bounce" />
              </div>
              <CheckCircle2 className="w-6 h-6 text-accent-mint absolute -bottom-1 -right-1 bg-primary-surface rounded-full fill-accent-mint text-primary-surface" />
            </div>

            <h2 className="text-xl font-black text-text-primary mb-1">تَقَبَّلَ اللَّهُ طَاعَتَكُمْ!</h2>
            <p className="text-sm text-text-secondary mb-4">
              أتممت قراءة <strong className="text-accent-gold">{categoryTitle}</strong> كاملة ({totalAdhkar} أذكار).
            </p>

            <div className="w-full p-4 rounded-2xl bg-primary-card/70 border border-border-subtle/70 mb-6 text-xs text-text-muted space-y-1">
              <div className="flex justify-between">
                <span>الأذكار المنجزة:</span>
                <span className="font-bold text-accent-mint font-mono">{totalAdhkar} / {totalAdhkar}</span>
              </div>
              <div className="flex justify-between">
                <span>الحالة:</span>
                <span className="font-bold text-accent-gold">مكتمل اليوم ✓</span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full flex gap-3">
              <button
                onClick={onRestart}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-card hover:bg-white/10 text-text-secondary border border-border-subtle font-bold text-sm transition-colors active:scale-98"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة البدء</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-accent-gold hover:bg-amber-500 text-primary-bg font-bold text-sm shadow-md transition-colors active:scale-98"
              >
                <span>العودة للأذكار</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
