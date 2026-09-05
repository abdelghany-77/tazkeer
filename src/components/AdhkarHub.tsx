import React, { useState, useEffect } from 'react';
import { adhkarCategories } from '@/data/adhkar';
import type { AdhkarCategory } from '@/types';
import {
  Sunrise,
  Moon,
  Sun,
  Star,
  Plane,
  Heart,
  CloudRain,
  HeartPulse,
  Home,
  CheckCircle2,
  Search,
  BookOpen,
} from 'lucide-react';
import { MisbahaIcon } from './icons/MisbahaIcon';
import { getItem } from '@/utils/storage';

interface AdhkarHubProps {
  onSelectCategory: (category: AdhkarCategory) => void;
  onOpenTasbih: () => void;
}

export const AdhkarHub: React.FC<AdhkarHubProps> = ({ onSelectCategory, onOpenTasbih }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load completion statuses from storage
    const loadStatuses = async () => {
      const map: Record<string, boolean> = {};
      for (const cat of adhkarCategories) {
        const session = await getItem<{ completed: boolean } | null>(`tazkeer_session_${cat.key}`, null);
        if (session?.completed) {
          map[cat.key] = true;
        }
      }
      setCompletedMap(map);
    };
    loadStatuses();
  }, []);

  const filteredCategories = adhkarCategories.filter(
    (c) =>
      c.title.includes(searchQuery) ||
      c.description.includes(searchQuery) ||
      c.adhkar.some((z) => z.text.includes(searchQuery))
  );

  const completedCount = Object.values(completedMap).filter(Boolean).length;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sunrise':
        return <Sunrise className="w-6 h-6 text-amber-400" />;
      case 'Moon':
        return <Moon className="w-6 h-6 text-indigo-400" />;
      case 'Sun':
        return <Sun className="w-6 h-6 text-accent-gold" />;
      case 'Star':
        return <Star className="w-6 h-6 text-accent-mint" />;
      case 'Plane':
        return <Plane className="w-6 h-6 text-cyan-400" />;
      case 'Heart':
        return <Heart className="w-6 h-6 text-rose-400" />;
      case 'CloudRain':
        return <CloudRain className="w-6 h-6 text-blue-400" />;
      case 'HeartPulse':
        return <HeartPulse className="w-6 h-6 text-emerald-400" />;
      case 'Home':
        return <Home className="w-6 h-6 text-amber-300" />;
      default:
        return <BookOpen className="w-6 h-6 text-accent-mint" />;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto px-4 py-4 max-w-4xl mx-auto w-full no-scrollbar select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary">أذكار المسلم</h1>
          <p className="text-xs text-text-muted mt-0.5">
            حصن المسلم من أذكار الكتاب والسنة النبوية
          </p>
        </div>

        <button
          onClick={onOpenTasbih}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-mint/15 border border-accent-mint/40 text-accent-mint hover:bg-accent-mint/25 text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <MisbahaIcon className="w-4 h-4" />
          <span>المسبحة</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن ذكر أو باب..."
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-primary-card/70 border border-border-subtle focus:border-accent-mint focus:outline-none text-xs text-text-primary placeholder:text-text-muted transition-colors"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 px-3 py-1.5 rounded-xl bg-primary-surface/80 border border-border-subtle/50 text-xs text-text-muted">
          <span>المكتمل اليوم:</span>
          <span className="font-mono font-bold text-accent-mint">
            {completedCount} / {adhkarCategories.length}
          </span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-8">
        {filteredCategories.map((cat) => {
          const isDone = completedMap[cat.key];
          return (
            <div
              key={cat.key}
              onClick={() => onSelectCategory(cat)}
              className={`relative overflow-hidden rounded-2xl p-4 glass-card border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.02] active:scale-98 ${
                isDone
                  ? 'border-accent-gold/40 bg-accent-gold/5 shadow-sm'
                  : 'border-border-subtle hover:border-accent-mint/40 bg-primary-surface/80'
              }`}
            >
              {/* Category Glow on Hover */}
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-accent-mint/5 group-hover:bg-accent-mint/15 rounded-full blur-xl pointer-events-none transition-all" />

              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="p-2.5 rounded-xl bg-primary-card border border-border-subtle group-hover:border-accent-mint/30 shadow-inner">
                  {renderIcon(cat.icon)}
                </div>

                {isDone && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold border border-accent-gold/30">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>مكتمل</span>
                  </span>
                )}
              </div>

              <div className="relative z-10">
                <h3 className="font-bold text-sm sm:text-base text-text-primary group-hover:text-accent-mint transition-colors">
                  {cat.title}
                </h3>
                <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                  {cat.description}
                </p>
                <div className="mt-3 pt-2 border-t border-border-subtle/40 flex items-center justify-between text-[10px] text-text-muted font-mono">
                  <span>{cat.adhkar.length} ذكر</span>
                  <span className="text-accent-mint opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                    ابدأ ←
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
