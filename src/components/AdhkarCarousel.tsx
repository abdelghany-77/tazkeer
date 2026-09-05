import React, { useState, useEffect, useRef } from 'react';
import type { AdhkarCategory } from '@/types';
import { DhikrCard } from './DhikrCard';
import { CompletionSheet } from './CompletionSheet';
import { ArrowRight, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { vibrate } from '@/utils/feedback';
import { saveItem, getItem } from '@/utils/storage';

interface AdhkarCarouselProps {
  category: AdhkarCategory;
  onBack: () => void;
  onCategoryCompleted?: (categoryKey: string) => void;
}

export const AdhkarCarousel: React.FC<AdhkarCarouselProps> = ({
  category,
  onBack,
  onCategoryCompleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [counters, setCounters] = useState<number[]>(() =>
    new Array(category.adhkar.length).fill(0)
  );
  const [direction, setDirection] = useState<number>(0); // 1 = next, -1 = prev
  const [isCompletedSheetOpen, setIsCompletedSheetOpen] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `tazkeer_session_${category.key}`;

  // ── Category Lifecycle Fix: Initialize / Reset on entry ──
  useEffect(() => {
    let isMounted = true;
    getItem<{ currentIndex: number; counters: number[]; completed: boolean } | null>(
      storageKey,
      null
    ).then((saved) => {
      if (!isMounted) return;
      if (saved && !saved.completed && Array.isArray(saved.counters)) {
        // Resume in-progress session
        setCurrentIndex(Math.min(saved.currentIndex || 0, category.adhkar.length - 1));
        setCounters(saved.counters);
      } else {
        // Fresh start or previously finished: always start at index 0 with clean counters
        setCurrentIndex(0);
        setCounters(new Array(category.adhkar.length).fill(0));
      }
    });

    return () => {
      isMounted = false;
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, [category.key, category.adhkar.length, storageKey]);

  // Persist session changes
  const saveSession = (idx: number, cnts: number[], completed: boolean) => {
    saveItem(storageKey, { currentIndex: idx, counters: cnts, completed });
  };

  const currentZikr = category.adhkar[currentIndex] || category.adhkar[0];
  const currentCount = counters[currentIndex] || 0;
  const isCurrentFinished = currentCount >= currentZikr.count;

  // Handle counter tap
  const handleCountTap = () => {
    if (isCurrentFinished) return;

    vibrate(20);

    const nextCount = currentCount + 1;
    const newCounters = [...counters];
    newCounters[currentIndex] = nextCount;
    setCounters(newCounters);

    if (nextCount >= currentZikr.count) {
      // Just completed this dhikr
      vibrate([40, 80, 40]);
      setIsFlashing(true);

      const isLastDhikr = currentIndex === category.adhkar.length - 1;

      // Auto-advance after 600ms flash
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        setIsFlashing(false);
        if (isLastDhikr) {
          // Completed entire category
          saveSession(currentIndex, newCounters, true);
          if (onCategoryCompleted) onCategoryCompleted(category.key);
          setIsCompletedSheetOpen(true);
        } else {
          setDirection(1);
          setCurrentIndex((prev) => {
            const nextIdx = prev + 1;
            saveSession(nextIdx, newCounters, false);
            return nextIdx;
          });
        }
      }, 600);
    } else {
      saveSession(currentIndex, newCounters, false);
    }
  };

  const handleNext = () => {
    if (currentIndex < category.adhkar.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => {
        const next = prev + 1;
        saveSession(next, counters, false);
        return next;
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => {
        const next = prev - 1;
        saveSession(next, counters, false);
        return next;
      });
    }
  };

  const handleRestart = () => {
    const cleanCounters = new Array(category.adhkar.length).fill(0);
    setCounters(cleanCounters);
    setCurrentIndex(0);
    setIsCompletedSheetOpen(false);
    saveSession(0, cleanCounters, false);
  };

  // Drag swipe handler
  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 50;
    // In RTL: swipe left (negative x) moves to NEXT, swipe right (positive x) moves to PREV
    if (info.offset.x < -swipeThreshold || info.velocity.x < -400) {
      handleNext();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 400) {
      handlePrev();
    }
  };

  const progressPercent = ((currentIndex + (isCurrentFinished ? 1 : 0)) / category.adhkar.length) * 100;

  // Slide animation variants
  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.25, ease: 'easeOut' as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.2, ease: 'easeIn' as const },
    }),
  };

  return (
    <div className="h-full w-full flex-1 flex flex-col justify-between overflow-hidden bg-primary-bg select-none">
      {/* ── Top Bar with Safe Area Inset ── */}
      <header
        className="w-full px-4 pb-2 flex-shrink-0 bg-primary-surface/80 border-b border-border-subtle/40 backdrop-blur-md z-20"
        style={{ paddingTop: 'max(10px, env(safe-area-inset-top, 10px))' }}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-primary-card/80 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors text-xs font-semibold"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>

          <h2 className="text-base font-bold text-text-primary">{category.title}</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              title="إعادة البدء"
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-xs text-accent-mint px-2 py-0.5 rounded-md bg-accent-mint/10 border border-accent-mint/20">
              {currentIndex + 1} / {category.adhkar.length}
            </span>
          </div>
        </div>

        {/* Linear Category Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-primary-card overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-accent-mint to-accent-emerald transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* ── Dhikr Slide Area ── */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full h-full flex flex-col justify-center cursor-grab active:cursor-grabbing"
          >
            <DhikrCard zikr={currentZikr} currentCount={currentCount} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Controls ── */}
      <footer className="w-full px-4 py-3 flex-shrink-0 bg-primary-surface/90 border-t border-border-subtle/40 backdrop-blur-md flex flex-col items-center gap-3 z-20">
        {/* Navigation & Big Counter Button */}
        <div className="w-full max-w-sm flex items-center justify-between gap-4">
          {/* Prev Button (In RTL, Prev is right arrow icon or chevron pointing right) */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-3 rounded-2xl border transition-all ${
              currentIndex === 0
                ? 'opacity-30 border-transparent text-text-muted cursor-not-allowed'
                : 'bg-primary-card border-border-subtle text-text-primary hover:border-accent-mint/50 active:scale-95'
            }`}
            title="الذكر السابق"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Big Circular Counter Button */}
          <button
            onClick={handleCountTap}
            disabled={isCurrentFinished}
            className={`counter-btn relative shadow-xl active:scale-95 transition-transform ${
              isCurrentFinished ? 'completed cursor-default' : 'neon-glow'
            } ${isFlashing ? 'completion-flash ring-4 ring-accent-gold' : ''}`}
          >
            <div className="flex flex-col items-center justify-center leading-none">
              <span className="text-2xl font-black font-mono">
                {currentZikr.count - currentCount > 0 ? currentZikr.count - currentCount : '✓'}
              </span>
              <span className="text-[10px] font-normal opacity-70 mt-1">
                {isCurrentFinished ? 'اكتمل' : 'متبقي'}
              </span>
            </div>
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={currentIndex === category.adhkar.length - 1}
            className={`p-3 rounded-2xl border transition-all ${
              currentIndex === category.adhkar.length - 1
                ? 'opacity-30 border-transparent text-text-muted cursor-not-allowed'
                : 'bg-primary-card border-border-subtle text-text-primary hover:border-accent-mint/50 active:scale-95'
            }`}
            title="الذكر التالي"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full px-2 py-1 no-scrollbar">
          {category.adhkar.map((z, idx) => {
            const isItemDone = (counters[idx] || 0) >= z.count;
            const isItemActive = idx === currentIndex;
            return (
              <div
                key={idx}
                className={`progress-dot ${isItemActive ? 'active' : ''} ${
                  isItemDone ? 'completed' : ''
                }`}
              />
            );
          })}
        </div>
      </footer>

      {/* Completion Sheet */}
      <CompletionSheet
        isOpen={isCompletedSheetOpen}
        categoryTitle={category.title}
        totalAdhkar={category.adhkar.length}
        onRestart={handleRestart}
        onClose={() => {
          setIsCompletedSheetOpen(false);
          onBack();
        }}
      />
    </div>
  );
};
