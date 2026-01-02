import React from 'react';
import { Settings } from 'lucide-react';

interface StatusBarProps {
  isScanning: boolean;
  scannedCount: number;
  signalCount: number;
  onSettingsClick: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isScanning,
  scannedCount,
  signalCount,
  onSettingsClick
}) => {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-bg-primary border-b border-border-color">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
          }`} 
        />
        <span className="text-sm text-text-secondary font-medium">
          {isScanning ? '雷达运行中' : '雷达暂停'}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <span>已扫描 {scannedCount}</span>
        <span className="text-border-color">|</span>
        <span className="text-accent-color font-medium">发现 {signalCount} 信号</span>
      </div>

      {/* Settings */}
      <button 
        onClick={onSettingsClick}
        className="p-1.5 rounded-md hover:bg-hover-bg text-text-secondary transition-colors"
      >
        <Settings size={18} />
      </button>
    </div>
  );
};
