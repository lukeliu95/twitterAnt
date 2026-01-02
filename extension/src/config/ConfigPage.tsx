/**
 * 议题配置页面 - ConfigPage.tsx - 简化版 v0.4
 *
 * 用户可以选择自己感兴趣的热门议题
 * 设计原则（Alan Cooper）：
 * - 目标导向：让用户快速配置想看什么内容
 * - 清晰展示：用图标和数量帮助用户理解
 * - 即时反馈：实时显示选择的信号量预估
 */

import { useState, useEffect } from 'react';
import { TOPICS, DEFAULT_TOPICS, MIN_TOPICS_REQUIRED, MAX_TOPICS_ALLOWED, estimateSignalCount, type TopicConfig } from '../shared/types/topics';
import './ConfigPage.css';

interface ConfigPageProps {
  onClose: () => void;
}

export function ConfigPage({ onClose }: ConfigPageProps) {
  const [enabledTopics, setEnabledTopics] = useState<Set<string>>(new Set(DEFAULT_TOPICS));
  const [config, setConfig] = useState<TopicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 加载当前配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await chrome.runtime.sendMessage({ type: 'GET_TOPIC_CONFIG' });
      if (response.success && response.config) {
        setConfig(response.config);
        setEnabledTopics(new Set(response.config.enabledTopics));
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    const newEnabled = new Set(enabledTopics);
    if (newEnabled.has(topicId)) {
      // 至少保留 MIN_TOPICS_REQUIRED 个
      if (newEnabled.size > MIN_TOPICS_REQUIRED) {
        newEnabled.delete(topicId);
      } else {
        setError(`至少需要选择 ${MIN_TOPICS_REQUIRED} 个议题`);
        setTimeout(() => setError(null), 2000);
        return;
      }
    } else {
      // 最多选择 MAX_TOPICS_ALLOWED 个
      if (newEnabled.size < MAX_TOPICS_ALLOWED) {
        newEnabled.add(topicId);
      } else {
        setError(`最多只能选择 ${MAX_TOPICS_ALLOWED} 个议题`);
        setTimeout(() => setError(null), 2000);
        return;
      }
    }
    setEnabledTopics(newEnabled);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const topicIds = Array.from(enabledTopics);
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_TOPIC_CONFIG',
        data: { topicIds }
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError(response.error || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要恢复默认配置吗？')) return;

    try {
      setSaving(true);
      const response = await chrome.runtime.sendMessage({ type: 'RESET_TOPIC_CONFIG' });
      if (response.success && response.config) {
        setConfig(response.config);
        setEnabledTopics(new Set(response.config.enabledTopics));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to reset config:', err);
      setError('重置失败');
    } finally {
      setSaving(false);
    }
  };

  const estimatedSignals = estimateSignalCount(Array.from(enabledTopics));

  if (loading) {
    return (
      <div className="config-page">
        <div className="config-loading">加载配置中...</div>
      </div>
    );
  }

  return (
    <div className="config-page">
      {/* Header */}
      <div className="config-header">
        <div className="config-title">
          <span>🔧 趋势信号设置</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="config-message error">{error}</div>
      )}
      {success && (
        <div className="config-message success">✓ 配置已保存</div>
      )}

      {/* Description */}
      <div className="config-description">
        选择你感兴趣的热门议题，我们会根据你的选择筛选相关信号
      </div>

      {/* Summary */}
      <div className="config-summary">
        <div className="summary-item">
          <span className="summary-label">当前选择：</span>
          <span className="summary-value">{enabledTopics.size} 个议题</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">预计每日信号：</span>
          <span className="summary-value highlight">~{estimatedSignals} 条</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">选择范围：</span>
          <span className="summary-value">{MIN_TOPICS_REQUIRED} - {MAX_TOPICS_ALLOWED} 个</span>
        </div>
      </div>

      {/* Topics List */}
      <div className="topics-container">
        {TOPICS.map(topic => {
          const isEnabled = enabledTopics.has(topic.id);
          return (
            <div
              key={topic.id}
              className={`topic-item ${isEnabled ? 'enabled' : ''} ${topic.isRecommended ? 'recommended' : ''}`}
              onClick={() => toggleTopic(topic.id)}
            >
              <div className="topic-info">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleTopic(topic.id)}
                  className="topic-checkbox"
                />
                <span className="topic-icon">{topic.icon}</span>
                <div className="topic-content">
                  <div className="topic-header-row">
                    <span className="topic-label">{topic.label}</span>
                    {topic.isRecommended && (
                      <span className="topic-recommended-badge">推荐</span>
                    )}
                  </div>
                  <span className="topic-description">{topic.description}</span>
                </div>
              </div>
              <div className="topic-meta">
                <span className="topic-signals">~{topic.estimatedSignals}/日</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="config-actions">
        <button
          className="action-btn secondary"
          onClick={handleReset}
          disabled={saving}
        >
          恢复默认
        </button>
        <button
          className="action-btn primary"
          onClick={handleSave}
          disabled={saving || enabledTopics.size < MIN_TOPICS_REQUIRED}
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}
