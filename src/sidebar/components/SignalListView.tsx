import React, { useState, useEffect } from 'react';
import { RotateCcw, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { SignalCard } from './SignalCard';
import { useStore } from '../store';

export const SignalListView: React.FC = () => {
  const { signals, addSignal } = useStore();
  
  // 信号统计
  const [signalStats, setSignalStats] = useState({
    total: 0,      // 总信号数
    highValue: 0,  // 高价值信号数 (score >= 85)
    mediumValue: 0 // 中价值信号数 (score 70-84)
  });

  useEffect(() => {
    // 加载保存的统计
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tsfSignalStats'], (result) => {
        if (result.tsfSignalStats) {
          setSignalStats(result.tsfSignalStats);
        }
      });
    }

    // 监听来自 content script 的统计更新
    const handleMessage = (message: any) => {
      if (message.type === 'SIGNAL_STATS_UPDATED') {
        setSignalStats(message.data);
      } else if (message.type === 'NEW_SIGNAL') {
        // 同时也在这里接收新信号以确保实时性
        addSignal(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [addSignal]);

  const handleResetStats = () => {
    const emptyStats = { total: 0, highValue: 0, mediumValue: 0 };
    setSignalStats(emptyStats);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ tsfSignalStats: emptyStats });
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* 信号统计面板 */}
      <div className="p-4 bg-white border-b border-border-color">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-accent-color" />
            <h3 className="font-bold text-text-primary">信号概览</h3>
          </div>
          <button 
            onClick={handleResetStats}
            className="text-xs text-text-tertiary hover:text-accent-color flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} />
            重置统计
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-secondary rounded-lg p-3 flex flex-col items-center justify-center border border-border-color/50">
            <span className="text-xl font-bold text-text-primary">{signalStats.total}</span>
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">总信号</span>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 flex flex-col items-center justify-center border border-emerald-100">
            <span className="text-xl font-bold text-emerald-600">{signalStats.highValue}</span>
            <span className="text-[10px] text-emerald-600/70 uppercase tracking-wider font-medium">高价值</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 flex flex-col items-center justify-center border border-blue-100">
            <span className="text-xl font-bold text-blue-600">{signalStats.mediumValue}</span>
            <span className="text-[10px] text-blue-600/70 uppercase tracking-wider font-medium">中价值</span>
          </div>
        </div>
      </div>

      {/* 信号列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-widest flex items-center gap-2">
            <Zap size={12} />
            实时趋势流
          </h4>
          <span className="text-[10px] text-text-tertiary bg-bg-secondary px-2 py-0.5 rounded-full">
            逐条分析中
          </span>
        </div>

        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center mb-3">
              <BarChart3 size={24} className="text-text-tertiary" />
            </div>
            <p className="text-sm text-text-secondary font-medium">暂无发现信号</p>
            <p className="text-xs text-text-tertiary mt-1">在 Twitter 浏览时会自动捕获</p>
          </div>
        ) : (
          <div className="space-y-1">
            {signals.map((signal) => (
              <SignalCard 
                key={signal.signalId} 
                signal={signal}
                onOpenTweet={(url) => window.open(url, '_blank')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
