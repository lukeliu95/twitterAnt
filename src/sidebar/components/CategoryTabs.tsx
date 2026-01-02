import React from 'react';
import { Category } from '@/types';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  counts: Record<string, number>;
  onCategoryChange: (categoryId: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  counts,
  onCategoryChange
}) => {
  return (
    <div className="sticky top-[53px] z-[9] bg-bg-primary border-b border-border-color overflow-x-auto no-scrollbar">
      <div className="flex gap-2 px-4 py-2 min-w-max">
        <button
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all border ${
            activeCategory === 'all'
              ? 'bg-accent-light border-accent-color text-accent-color font-semibold'
              : 'bg-transparent border-transparent hover:bg-hover-bg text-text-secondary'
          }`}
          onClick={() => onCategoryChange('all')}
        >
          <span>全部</span>
          {counts['all'] > 0 && (
            <span className={`text-[10px] px-1.5 rounded-full ${
              activeCategory === 'all' ? 'bg-accent-color text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {counts['all']}
            </span>
          )}
        </button>

        {categories.map(cat => (
          <button
            key={cat.id}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all border ${
              activeCategory === cat.id
                ? 'bg-accent-light border-accent-color text-accent-color font-semibold'
                : 'bg-transparent border-transparent hover:bg-hover-bg text-text-secondary'
            }`}
            onClick={() => onCategoryChange(cat.id)}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            {counts[cat.id] > 0 && (
              <span className={`text-[10px] px-1.5 rounded-full ${
                activeCategory === cat.id ? 'bg-accent-color text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {counts[cat.id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
