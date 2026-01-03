import React from 'react';
import { X, MoreHorizontal, Home, Target } from 'lucide-react';

interface HeaderProps {
  onSettingsClick?: () => void;
  onHomeClick?: () => void;
  onFocusModeClick?: () => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onHomeClick,
  onFocusModeClick,
  onClose
}) => {
  return (
    <div className="flex flex-col px-4 pt-3 pb-2 bg-bg-primary">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
           <span className="font-serif text-base font-bold text-text-primary">Trend Signal Free - TSF</span>
           <span className="text-[10px] text-text-tertiary bg-gray-100 px-1.5 py-0.5 rounded">v0.52</span>
        </div>

        <div className="flex items-center gap-1 text-text-secondary">
          {onHomeClick && (
            <button
              onClick={onHomeClick}
              className="p-1.5 rounded hover:bg-hover-bg transition-colors"
              title="Home"
            >
              <Home size={16} />
            </button>
          )}
          {onFocusModeClick && (
            <button
              onClick={onFocusModeClick}
              className="p-1.5 rounded hover:bg-hover-bg transition-colors"
              title="Focus Mode"
            >
              <Target size={16} />
            </button>
          )}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-1.5 rounded hover:bg-hover-bg transition-colors"
              title="Settings"
            >
              <MoreHorizontal size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-hover-bg transition-colors"
            title="Close Sidebar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
