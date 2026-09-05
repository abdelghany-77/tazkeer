import React, { useState } from 'react';
import { SURAH_DATA, JUZ_DATA, toArabicNumber } from '@/data/surah-data';
import { useQuran } from '@/context/QuranContext';
import { Search, Bookmark, BookOpen, Layers } from 'lucide-react';

interface SurahListProps {
  onSelectPage: (page: number, surahNumber?: number) => void;
  onOpenKhatmah: () => void;
}

export const SurahList: React.FC<SurahListProps> = ({ onSelectPage, onOpenKhatmah }) => {
  const { bookmarkedPage, khatmah, setActiveSurahNumber, setScope, setWirdRange } = useQuran();
  const [activeTab, setActiveTab] = useState<'surahs' | 'juz'>('surahs');
  const [query, setQuery] = useState('');

  const filteredSurahs = SURAH_DATA.filter(
    (s) => s.name.includes(query) || String(s.number).includes(query) || String(s.startPage).includes(query)
  );

  const filteredJuz = JUZ_DATA.filter(
    (j) => j.name.includes(query) || String(j.number).includes(query) || String(j.startPage).includes(query)
  );

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full px-4 py-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary">فهرس القرآن الكريم</h1>
          <p className="text-xs text-text-muted mt-0.5">تصفح المصحف الشريف بالسور والأجزاء</p>
        </div>

        <button
          onClick={onOpenKhatmah}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-gold/15 border border-accent-gold/40 text-accent-gold hover:bg-accent-gold/25 text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <Layers className="w-4 h-4" />
          <span>{khatmah.isActive ? 'متابعة الختمة' : 'بدء ختمة'}</span>
        </button>
      </div>

      {/* Bookmark quick jump if exists */}
      {bookmarkedPage && (
        <div
          onClick={() => {
            setActiveSurahNumber(null);
            setWirdRange(null);
            setScope('all');
            onSelectPage(bookmarkedPage);
          }}
          className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-accent-gold/10 border border-accent-gold/30 hover:border-accent-gold/60 transition-all cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-gold/20 text-accent-gold">
              <Bookmark className="w-4 h-4 fill-accent-gold" />
            </div>
            <div>
              <span className="text-xs font-bold text-accent-gold block">العلامة المرجعية</span>
              <span className="text-[11px] text-text-muted">انقر للمتابعة من صفحة {bookmarkedPage}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-accent-gold group-hover:translate-x-1 transition-transform">
            متابعة ←
          </span>
        </div>
      )}

      {/* Search & Tabs */}
      <div className="flex flex-col gap-2.5 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeTab === 'surahs' ? 'ابحث عن سورة بالاسم أو الرقم...' : 'ابحث عن جزء...'}
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-primary-card/70 border border-border-subtle focus:border-accent-mint focus:outline-none text-xs text-text-primary placeholder:text-text-muted transition-colors"
          />
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-primary-card/80 p-1 border border-border-subtle/50">
          <button
            onClick={() => setActiveTab('surahs')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'surahs'
                ? 'bg-accent-mint text-primary-bg shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            السور ({SURAH_DATA.length})
          </button>
          <button
            onClick={() => setActiveTab('juz')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'juz'
                ? 'bg-accent-mint text-primary-bg shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            الأجزاء ({JUZ_DATA.length})
          </button>
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto pb-10 space-y-2 no-scrollbar">
        {activeTab === 'surahs' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredSurahs.map((surah) => (
              <div
                key={surah.number}
                onClick={() => {
                  setActiveSurahNumber(surah.number);
                  setWirdRange(null);
                  setScope('surah');
                  onSelectPage(surah.startPage, surah.number);
                }}
                className="flex items-center justify-between p-3 rounded-xl glass-card border border-border-subtle/70 hover:border-accent-mint/40 hover:bg-primary-surface transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-card border border-border-subtle flex items-center justify-center font-mono text-xs font-bold text-accent-mint group-hover:border-accent-mint/40">
                    {toArabicNumber(surah.number)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary group-hover:text-accent-mint transition-colors">
                      سورة {surah.name}
                    </h4>
                    <span className="text-[10px] text-text-muted">
                      الصفحة {toArabicNumber(surah.startPage)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-text-muted group-hover:text-accent-mint transition-colors">
                  <BookOpen className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredJuz.map((juz) => (
              <div
                key={juz.number}
                onClick={() => {
                  setActiveSurahNumber(null);
                  setWirdRange(null);
                  setScope('all');
                  onSelectPage(juz.startPage);
                }}
                className="flex items-center justify-between p-3.5 rounded-xl glass-card border border-border-subtle/70 hover:border-accent-mint/40 hover:bg-primary-surface transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-card border border-border-subtle flex items-center justify-center font-mono text-xs font-bold text-accent-gold group-hover:border-accent-gold/40">
                    {toArabicNumber(juz.number)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary group-hover:text-accent-mint transition-colors">
                      {juz.name}
                    </h4>
                    <span className="text-[10px] text-text-muted">
                      يبدأ من صفحة {toArabicNumber(juz.startPage)}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-bold text-accent-mint opacity-0 group-hover:opacity-100 transition-opacity">
                  فتح ←
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
