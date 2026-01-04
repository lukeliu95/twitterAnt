import React, { useState, useEffect } from 'react';
import { Target, Sliders, RotateCcw } from 'lucide-react';

interface FocusModeSettings {
  mode: 'focused' | 'balanced' | 'all';
  threshold: number;
}

interface FocusModeViewProps {
  onSettingsChange: (settings: FocusModeSettings) => void;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<FocusModeSettings>({
    mode: 'balanced',
    threshold: 70
  });
  const [collectionCount, setCollectionCount] = useState(100); // 收集条数
  const [autoMonitoring, setAutoMonitoring] = useState(false); // 自动监控

  // 新增：信号统计
  const [signalStats, setSignalStats] = useState({
    total: 0,      // 总信号数
    highValue: 0,  // 高价值信号数 (score >= 85)
    mediumValue: 0 // 中价值信号数 (score 70-84)
  });

  useEffect(() => {
    // 加载保存的设置
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tsfFocusSettings', 'tsfCollectionCount', 'tsfAutoMonitoring', 'tsfSignalStats'], (result) => {
        if (result.tsfFocusSettings) {
          setSettings(result.tsfFocusSettings);
        }
        if (result.tsfCollectionCount) {
          setCollectionCount(result.tsfCollectionCount);
        }
        if (result.tsfAutoMonitoring !== undefined) {
          setAutoMonitoring(result.tsfAutoMonitoring);
        }
        if (result.tsfSignalStats) {
          setSignalStats(result.tsfSignalStats);
        }
      });
    }

    // 监听来自 content script 的消息
    const handleMessage = (message: any) => {
      if (message.type === 'SIGNAL_STATS_UPDATED') {
        setSignalStats(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleModeChange = (mode: 'focused' | 'balanced' | 'all') => {
    const newSettings = { ...settings, mode };
    setSettings(newSettings);
    onSettingsChange(newSettings);

    // 同步到 content script
    chrome.runtime.sendMessage({
      type: 'SET_FOCUS_MODE',
      data: newSettings
    });

    // 保存到 storage
    chrome.storage.local.set({
      tsfFocusSettings: newSettings
    });
  };

  const handleThresholdChange = (threshold: number) => {
    let newMode: 'focused' | 'balanced' | 'all' = 'all';

    if (threshold >= 70) {
      newMode = 'focused';
    } else if (threshold >= 50) {
      newMode = 'balanced';
    }

    const newSettings = { ...settings, threshold, mode: newMode };
    setSettings(newSettings);
    onSettingsChange(newSettings);

    // 同步到 content script
    chrome.runtime.sendMessage({
      type: 'SET_FOCUS_MODE',
      data: newSettings
    });

    // 保存到 storage
    chrome.storage.local.set({
      tsfFocusSettings: newSettings
    });
  };

  const handleReset = () => {
    const newSettings = { mode: 'all' as const, threshold: 0 };
    setSettings(newSettings);
    onSettingsChange(newSettings);

    // 同步到 content script
    chrome.runtime.sendMessage({
      type: 'RESET_FOCUS_MODE',
      data: newSettings
    });

    // 保存到 storage
    chrome.storage.local.set({
      tsfFocusSettings: newSettings
    });
  };

  return (
    <div className="focus-mode-view">
      <div className="view-header">
        <Target size={20} />
        <h3>专注模式</h3>
      </div>

      <p className="view-description">
        视觉弱化低价值内容，专注于高价值信息
      </p>

      {/* 模式选择 */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${settings.mode === 'focused' ? 'active' : ''}`}
          onClick={() => handleModeChange('focused')}
        >
          <span className="mode-icon">🔥</span>
          <div className="mode-content">
            <strong>聚焦</strong>
            <span>70+ 分</span>
          </div>
        </button>

        <button
          className={`mode-btn ${settings.mode === 'balanced' ? 'active' : ''}`}
          onClick={() => handleModeChange('balanced')}
        >
          <span className="mode-icon">📊</span>
          <div className="mode-content">
            <strong>平衡</strong>
            <span>50+ 分</span>
          </div>
        </button>

        <button
          className={`mode-btn ${settings.mode === 'all' ? 'active' : ''}`}
          onClick={() => handleModeChange('all')}
        >
          <span className="mode-icon">🌊</span>
          <div className="mode-content">
            <strong>全部</strong>
            <span>无过滤</span>
          </div>
        </button>
      </div>

      {/* 强度滑块 */}
      <div className="threshold-control">
        <div className="threshold-header">
          <span className="threshold-label">
            <Sliders size={16} />
            过滤强度
          </span>
          <span className="threshold-value">{settings.threshold}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.threshold}
          onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
          className="threshold-slider"
        />
        <div className="threshold-labels">
          <span>显示全部</span>
          <span>只看精华</span>
        </div>
      </div>

      {/* 信号统计 */}
      <div className="signal-stats-card">
        <div className="stats-header">
          <h4>信号统计</h4>
          <button className="reset-btn" onClick={handleReset}>
            <RotateCcw size={14} />
            全部恢复
          </button>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{signalStats.total}</span>
            <span className="stat-label">发现信号</span>
          </div>
          <div className="stat-card">
            <span className="stat-number stat-high">{signalStats.highValue}</span>
            <span className="stat-label">高价值 (85+)</span>
          </div>
          <div className="stat-card">
            <span className="stat-number stat-medium">{signalStats.mediumValue}</span>
            <span className="stat-label">中价值 (70+)</span>
          </div>
        </div>
      </div>

      {/* 提示 */}
      <div className="focus-tip">
        💡 按住 <kbd>Shift</kbd> 临时显示全部内容
      </div>

      {/* 监控设置 */}
      <div className="monitoring-settings">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-text-primary">分析与监控</h4>
          <button
            onClick={() => {
              chrome.runtime.sendMessage({ type: 'START_TIMELINE_ANALYSIS' });
            }}
            className="px-3 py-1.5 bg-accent-color text-white rounded-lg text-sm font-medium hover:bg-accent-color/90 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={14} />
            开始分析
          </button>
        </div>

        {/* 收集条数 */}
        <div className="setting-item">
          <label className="setting-label">分析条数</label>
          <div className="setting-options">
            {[50, 100, 200].map(count => (
              <button
                key={count}
                className={`option-btn ${collectionCount === count ? 'active' : ''}`}
                onClick={() => {
                  setCollectionCount(count);
                  chrome.storage.local.set({ tsfCollectionCount: count });
                }}
              >
                {count} 条
              </button>
            ))}
          </div>
        </div>

        {/* 自动监控开关 */}
        <div className="setting-item">
          <label className="setting-label">
            <input
              type="checkbox"
              checked={autoMonitoring}
              onChange={(e) => {
                const enabled = e.target.checked;
                setAutoMonitoring(enabled);
                chrome.storage.local.set({ tsfAutoMonitoring: enabled });

                // 通知 background 启用/禁用自动监控
                chrome.runtime.sendMessage({
                  type: enabled ? 'START_AUTO_MONITORING' : 'STOP_AUTO_MONITORING'
                });
              }}
              className="setting-checkbox"
            />
            <span>实时自动监控新推文</span>
          </label>
          <p className="setting-description">
            自动分析时间线上的新推文，无需手动触发
          </p>
        </div>
      </div>
    </div>
  );
};
