import React, { useState } from 'react';
import type { Zikr } from '@/types';
import { Copy, Check, Info, Sparkles } from 'lucide-react';
import { toArabicNumber } from '@/data/surah-data';

interface DhikrCardProps {
  zikr: Zikr;
  currentCount: number;
}

export const DhikrCard: React.FC<DhikrCardProps> = ({ zikr, currentCount }) => {
  const [copied, setCopied] = useState(false);
  const [showFadl, setShowFadl] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${zikr.text}\n\n[المصدر: ${zikr.source}]${zikr.fadl ? `\n[الفضل: ${zikr.fadl}]` : ''}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const isFinished = currentCount >= zikr.count;

  return (
    <div className="w-full flex-1 flex flex-col justify-between overflow-y-auto px-4 py-2 select-text no-scrollbar">
      <div className="flex flex-col items-center text-center space-y-4 my-auto py-2">
        {/* Main Arabic Dhikr Text */}
        <div className="relative w-full max-w-xl mx-auto">
          <p className="dhikr-text leading-[2.3] sm:leading-[2.5] font-semibold text-text-primary">
            {zikr.text}
          </p>
        </div>

        {/* Source & Fadl information */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {zikr.source && (
            <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-primary-surface/90 border border-border-subtle text-text-muted flex items-center gap-1">
              <Info className="w-3 h-3 text-accent-emerald" />
              <span>{zikr.source}</span>
            </span>
          )}

          {zikr.fadl && (
            <button
              onClick={() => setShowFadl(!showFadl)}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold flex items-center gap-1 hover:bg-accent-gold/20 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>{showFadl ? 'إخفاء الفضل' : 'فضل الذكر'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary-surface hover:bg-white/10 text-text-muted hover:text-text-primary border border-border-subtle flex items-center gap-1 transition-colors"
            title="نسخ الذكر"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-accent-mint" />
                <span className="text-accent-mint">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>نسخ</span>
              </>
            )}
          </button>
        </div>

        {/* Fadl text box if shown */}
        {zikr.fadl && showFadl && (
          <div className="w-full max-w-lg mx-auto p-3 rounded-xl bg-accent-gold/5 border border-accent-gold/20 text-text-secondary text-xs leading-relaxed text-right">
            <span className="font-bold text-accent-gold block mb-1">الفضل:</span>
            {zikr.fadl}
          </div>
        )}
      </div>

      {/* Repetition target pill */}
      <div className="w-full flex justify-center pb-2">
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
            isFinished
              ? 'bg-accent-gold/20 text-accent-gold border-accent-gold'
              : 'bg-primary-card text-accent-mint border-accent-mint/30'
          }`}
        >
          التكرار المطلوب: {toArabicNumber(zikr.count)} {zikr.count === 1 ? 'مرة' : 'مرات'}
        </span>
      </div>
    </div>
  );
};
