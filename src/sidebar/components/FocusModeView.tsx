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
  const [blurredCount, setBlurredCount] = useState(0);

  useEffect(() => {
    // 加载保存的设置
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tsfFocusSettings'], (result) => {
        if (result.tsfFocusSettings) {
          setSettings(result.tsfFocusSettings);
        }
      });
    }

    // 监听来自 content script 的消息
    const handleMessage = (message: any) => {
      if (message.type === 'FOCUS_MODE_UPDATED') {
        setBlurredCount(message.data.blurredCount || 0);
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

      {/* 统计信息 */}
      <div className="focus-stats">
        <div className="stat-item">
          <span className="stat-icon">📦</span>
          <span>已弱化 <strong>{blurredCount}</strong> 条</span>
        </div>
        <button className="reset-btn" onClick={handleReset}>
          <RotateCcw size={14} />
          全部恢复
        </button>
      </div>

      {/* 提示 */}
      <div className="focus-tip">
        💡 按住 <kbd>Shift</kbd> 临时显示全部内容
      </div>

      {/* 快捷操作 */}
      <div className="quick-actions">
        <h4>快捷操作</h4>
        <div className="action-list">
          <button
            className="action-btn"
            onClick={() => chrome.runtime.sendMessage({ type: 'TOGGLE_SIDEBAR' })}
          >
            隐藏/显示侧边栏
          </button>
          <button
            className="action-btn"
            onClick={() => chrome.runtime.sendMessage({ type: 'CLEAR_ALL_SIGNALS' })}
          >
            清除所有信号
          </button>
        </div>
      </div>
    </div>
  );
};
