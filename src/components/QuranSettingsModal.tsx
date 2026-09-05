import React from 'react';
import { X, Moon, Sun, Bookmark, Check } from 'lucide-react';
import { useQuran } from '@/context/QuranContext';
import type { ThemePreset } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface QuranSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuranSettingsModal: React.FC<QuranSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    currentPage,
    bookmarkedPage,
    setBookmark,
    removeBookmark,
    quranTheme,
    setQuranTheme,
  } = useQuran();

  const isCurrentBookmarked = bookmarkedPage === currentPage;

  const themes: { id: ThemePreset; name: string; icon: React.ReactNode; bg: string }[] = [
    {
      id: 'dark',
      name: 'داكن (أسود)',
      icon: <Moon className="w-4 h-4" />,
      bg: 'bg-black text-white border-neutral-700',
    },
    {
      id: 'sepia',
      name: 'بيج / رملي',
      icon: <Sun className="w-4 h-4 text-amber-700" />,
      bg: 'bg-[#F5F0E8] text-[#5C4B37] border-amber-300',
    },
    {
      id: 'light',
      name: 'فاتح',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      bg: 'bg-white text-slate-900 border-slate-200',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-sm rounded-3xl p-6 glass-card border border-border-subtle bg-primary-surface/95 shadow-2xl flex flex-col text-right relative overflow-hidden"
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-border-subtle/50 mb-4">
              <h3 className="font-bold text-sm text-text-primary">إعدادات المصحف الشريف</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Theme Selector */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-text-muted block mb-2">
                مظهر صفحة المصحف:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setQuranTheme(t.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${t.bg} ${
                      quranTheme === t.id
                        ? 'ring-2 ring-accent-mint scale-[1.03]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="mb-1">{t.icon}</div>
                    <span className="text-xs font-bold">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bookmark Action */}
            <div className="mb-4 pt-3 border-t border-border-subtle/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-primary block">العلامة المرجعية</span>
                  <span className="text-[11px] text-text-muted">
                    {bookmarkedPage ? `محفوظة عند صفحة ${bookmarkedPage}` : 'لا توجد علامة محفوظة'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (isCurrentBookmarked) {
                      removeBookmark();
                    } else {
                      setBookmark(currentPage);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrentBookmarked
                      ? 'bg-accent-gold/20 border border-accent-gold text-accent-gold'
                      : 'bg-primary-card border border-border-subtle text-text-primary hover:border-accent-mint'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isCurrentBookmarked ? 'fill-accent-gold' : ''}`} />
                  <span>{isCurrentBookmarked ? 'إزالة العلامة' : 'حفظ الصفحة'}</span>
                </button>
              </div>
            </div>

            {/* Done Button */}
            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 rounded-xl bg-accent-mint text-primary-bg font-bold text-xs flex items-center justify-center gap-1 shadow-md hover:bg-accent-emerald transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>تم</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
