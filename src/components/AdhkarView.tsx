import React, { useState, useEffect } from 'react';
import type { AdhkarCategory } from '@/types';
import { adhkarCategories } from '@/data/adhkar';
import { AdhkarHub } from './AdhkarHub';
import { AdhkarCarousel } from './AdhkarCarousel';

interface AdhkarViewProps {
  onOpenTasbih: () => void;
  initialCategoryKey?: string | null;
  onClearInitialCategory?: () => void;
}

export const AdhkarView: React.FC<AdhkarViewProps> = ({
  onOpenTasbih,
  initialCategoryKey,
  onClearInitialCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AdhkarCategory | null>(() => {
    if (initialCategoryKey) {
      return adhkarCategories.find((c) => c.key === initialCategoryKey) || null;
    }
    return null;
  });

  useEffect(() => {
    if (initialCategoryKey) {
      const found = adhkarCategories.find((c) => c.key === initialCategoryKey);
      if (found) setSelectedCategory(found);
    }
  }, [initialCategoryKey]);

  const handleBack = () => {
    setSelectedCategory(null);
    if (onClearInitialCategory) onClearInitialCategory();
  };

  return (
    <div className="h-full w-full flex-1 overflow-hidden flex flex-col">
      {selectedCategory ? (
        <AdhkarCarousel category={selectedCategory} onBack={handleBack} />
      ) : (
        <AdhkarHub onSelectCategory={setSelectedCategory} onOpenTasbih={onOpenTasbih} />
      )}
    </div>
  );
};
