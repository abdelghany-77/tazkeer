import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { MisbahaIcon } from './icons/MisbahaIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { vibrate } from '@/utils/feedback';
import { getItem, saveItem } from '@/utils/storage';

interface TasbihModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ADHKAR = [
  'سُبْحَانَ اللَّهِ',
  'الْحَمْدُ لِلَّهِ',
  'لَا إِلَهَ إِلَّا اللَّهُ',
  'اللَّهُ أَكْبَرُ',
  'أَسْتَغْفِرُ اللَّهَ',
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
  'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',
];

const TARGET_PRESETS = [33, 100, 0]; // 0 = unlimited

export const TasbihModal: React.FC<TasbihModalProps> = ({ isOpen, onClose }) => {
  const [count, setCount] = useState<number>(0);
  const [target, setTarget] = useState<number>(33);
  const [selectedZikr, setSelectedZikr] = useState<string>(PRESET_ADHKAR[0]);
  const [rounds, setRounds] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      getItem<number>('tazkeer_tasbih_count', 0).then((saved) => setCount(saved));
      getItem<number>('tazkeer_tasbih_rounds', 0).then((saved) => setRounds(saved));
    }
  }, [isOpen]);

  const handleIncrement = () => {
    vibrate(20);

    setCount((prev) => {
      const next = prev + 1;
      saveItem('tazkeer_tasbih_count', next);

      // Check target reach
      if (target > 0 && next % target === 0) {
        vibrate([50, 100, 50]);
        setRounds((r) => {
          const newRounds = r + 1;
          saveItem('tazkeer_tasbih_rounds', newRounds);
          return newRounds;
        });
      }

      return next;
    });
  };

  const handleReset = () => {
    vibrate(40);
    setCount(0);
    setRounds(0);
    saveItem('tazkeer_tasbih_count', 0);
    saveItem('tazkeer_tasbih_rounds', 0);
  };

  const currentRoundProgress = target > 0 ? (count % target) : count;
  const progressPercent = target > 0 ? (currentRoundProgress / target) * 100 : 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm rounded-3xl p-6 glass-card border border-accent-mint/30 bg-primary-surface/95 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Ambient glow */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-accent-mint/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-border-subtle/50 mb-3">
              <div className="flex items-center gap-2 text-accent-mint font-bold text-sm">
                <MisbahaIcon className="w-5 h-5" />
                <span>المِسْبَحَةُ الإلِكْتِرُونِيَّة</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dhikr selection pills */}
            <div className="w-full overflow-x-auto py-1 mb-3 flex gap-1.5 no-scrollbar">
              {PRESET_ADHKAR.map((z) => (
                <button
                  key={z}
                  onClick={() => setSelectedZikr(z)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedZikr === z
                      ? 'bg-accent-mint text-primary-bg shadow-sm'
                      : 'bg-primary-card text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>

            {/* Target Selectors */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-text-muted">الهدف:</span>
              {TARGET_PRESETS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono transition-all ${
                    target === t
                      ? 'bg-accent-emerald/20 text-accent-mint border border-accent-mint/40'
                      : 'bg-primary-card text-text-muted hover:text-text-primary'
                  }`}
                >
                  {t === 0 ? 'مفتوح' : t}
                </button>
              ))}
            </div>

            {/* Main Tasbih Click Button with Circular Progress */}
            <div className="relative my-2 flex items-center justify-center">
              {/* SVG circular progress */}
              <svg className="w-56 h-56 transform -rotate-90">
                <circle
                  cx="112"
                  cy="112"
                  r="96"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-primary-card"
                  fill="transparent"
                />
                <circle
                  cx="112"
                  cy="112"
                  r="96"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 96}
                  strokeDashoffset={2 * Math.PI * 96 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  className="text-accent-mint transition-all duration-200"
                  fill="transparent"
                />
              </svg>

              {/* Tap Button Inside */}
              <button
                onClick={handleIncrement}
                className="absolute inset-4 rounded-full bg-gradient-to-br from-primary-card via-primary-surface to-primary-card border-2 border-accent-mint/40 shadow-inner flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer select-none"
              >
                <span className="text-xs text-text-muted font-medium mb-1">اضغط للتسبيح</span>
                <span className="font-mono text-4xl font-black text-accent-mint tracking-tight" dir="ltr">
                  {count}
                </span>
                {target > 0 && (
                  <span className="text-[11px] font-mono text-text-muted mt-1">
                    {currentRoundProgress} / {target}
                  </span>
                )}
              </button>
            </div>

            {/* Rounds / Details & Reset */}
            <div className="w-full flex items-center justify-between mt-4 pt-3 border-t border-border-subtle/50 px-2">
              <div className="text-right">
                <span className="text-[11px] text-text-muted block">الدورات المكتملة</span>
                <span className="font-bold text-sm text-accent-gold font-mono">{rounds}</span>
              </div>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-card hover:bg-red-500/10 hover:text-red-400 text-text-muted border border-border-subtle transition-colors text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
