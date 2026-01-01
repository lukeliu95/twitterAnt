/**
 * Side Panel 主入口
 */

import { logger } from '../shared/utils/logger';
import type { Signal } from '../shared/types/tweet';

logger.info('Side Panel initialized');

// 状态
let signals: Signal[] = [];
let loading = false;
let isOfflineMode = false;

// DOM 元素
const app = document.getElementById('app');

/**
 * 加载信号
 */
async function loadSignals(): Promise<void> {
  if (loading) return;

  loading = true;
  renderLoading();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SIGNALS',
    });

    if (!response) {
      throw new Error('No response from background');
    }

    if (response.error) {
      // 检查是否是网络错误
      if (response.error.includes('Failed to fetch') || response.error.includes('API error')) {
        isOfflineMode = true;
        renderOfflineMode();
        return;
      }
      throw new Error(response.error);
    }

    isOfflineMode = false;
    signals = response.signals || [];
    logger.info(`Loaded ${signals.length} signals`);

    if (signals.length === 0) {
      renderEmptyWithHint();
    } else {
      renderSignals();
    }
  } catch (error) {
    logger.error('Failed to load signals:', error);
    // 检查是否是真正的网络错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network error')) {
      isOfflineMode = true;
      renderOfflineMode();
    } else {
      // 其他错误也显示空状态
      renderEmptyWithHint();
    }
  } finally {
    loading = false;
  }
}

/**
 * 渲染加载状态
 */
function renderLoading(): void {
  if (!app) return;

  app.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>正在加载信号...</p>
    </div>
  `;
}

/**
 * 渲染离线模式
 */
function renderOfflineMode(): void {
  if (!app) return;

  app.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p style="font-size: 16px; margin-bottom: 8px;">离线模式</p>
      <p style="font-size: 13px; color: #8899a6; line-height: 1.6;">
        后端服务尚未启动<br>
        插件正在监听 Twitter，但暂无法分析信号
      </p>
      <div style="margin-top: 20px; padding: 12px; background: #192734; border-radius: 8px; text-align: left;">
        <p style="font-size: 12px; color: #8899a6; margin: 0;">测试推文检测：</p>
        <p style="font-size: 11px; color: #666; margin-top: 8px;">在 Service Worker 控制台查看日志</p>
      </div>
      <button onclick="location.reload()" style="
        margin-top: 16px;
        padding: 8px 16px;
        background: #1fa1f1;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      ">重试</button>
    </div>
  `;
}

/**
 * 渲染空状态（带提示）
 */
function renderEmptyWithHint(): void {
  if (!app) return;

  app.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <p style="font-size: 16px;">暂无信号</p>
      <p style="font-size: 13px; color: #8899a6; margin-top: 8px; line-height: 1.6;">
        浏览 Twitter 时我们会自动发现赚钱机会
      </p>
      <div style="margin-top: 20px; padding: 12px; background: #192734; border-radius: 8px; text-align: left; max-width: 300px; margin-left: auto; margin-right: auto;">
        <p style="font-size: 12px; color: #8899a6; margin: 0 0 8px 0;">💡 提示：</p>
        <ul style="font-size: 11px; color: #666; margin: 0; padding-left: 20px; text-align: left;">
          <li>在 Twitter 时间线上滚动</li>
          <li>寻找包含关键词的推文</li>
          <li>查看 Service Worker 日志</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * 渲染信号列表
 */
function renderSignals(): void {
  if (!app) return;

  if (signals.length === 0) {
    renderEmptyWithHint();
    return;
  }

  const signalsHtml = signals.map((signal) => renderSignalCard(signal)).join('');

  app.innerHTML = `
    <div style="padding: 0 0 16px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 16px;">
        <span style="font-size: 14px; color: #8899a6;">发现 ${signals.length} 个信号</span>
        <button onclick="location.reload()" style="
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #38444d;
          border-radius: 4px;
          color: #1fa1f1;
          cursor: pointer;
          font-size: 12px;
        ">刷新</button>
      </div>
      ${signalsHtml}
    </div>
  `;
}

/**
 * 渲染单个信号卡片
 */
function renderSignalCard(signal: Signal): string {
  const typeLabels = {
    demand: '需求缺口',
    revenue: '收入验证',
    skill: '技能需求',
    trend: '趋势机会',
  };

  const typeColors = {
    demand: '#1fa1f1',
    revenue: '#17bf63',
    skill: '#ffd700',
    trend: '#e0245e',
  };

  const scoreStars = '★'.repeat(signal.score) + '☆'.repeat(5 - signal.score);

  return `
    <div class="signal-card" style="
      background: #192734;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid #38444d;
    ">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <span class="signal-type" style="
          background: ${typeColors[signal.type]}20;
          color: ${typeColors[signal.type]};
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        ">${typeLabels[signal.type]}</span>
        <span class="signal-score" style="color: #ffd700; font-size: 14px;">${scoreStars}</span>
      </div>

      <p class="signal-summary" style="
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 12px;
        color: #ffffff;
      ">${signal.summary}</p>

      <div class="signal-tweet" style="
        background: #0d1117;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 13px;
        color: #8899a6;
      ">${signal.originalTweet.text.slice(0, 100)}${signal.originalTweet.text.length > 100 ? '...' : ''}</div>

      <div class="signal-actions" style="display: flex; gap: 8px;">
        <button onclick="handleSignalAction('${signal.id}', 'saved')" style="
          flex: 1;
          padding: 8px;
          background: #192734;
          border: 1px solid #38444d;
          border-radius: 6px;
          color: #1fa1f1;
          cursor: pointer;
          font-size: 13px;
        ">🔖 保存</button>
        <button onclick="handleSignalAction('${signal.id}', 'acted')" style="
          flex: 1;
          padding: 8px;
          background: #192734;
          border: 1px solid #38444d;
          border-radius: 6px;
          color: #17bf63;
          cursor: pointer;
          font-size: 13px;
        ">✓ 已行动</button>
        <button onclick="handleSignalAction('${signal.id}', 'ignored')" style="
          flex: 1;
          padding: 8px;
          background: #192734;
          border: 1px solid #38444d;
          border-radius: 6px;
          color: #8899a6;
          cursor: pointer;
          font-size: 13px;
        ">✗ 忽略</button>
      </div>
    </div>
  `;
}

/**
 * 处理信号操作
 */
async function handleSignalAction(signalId: string, action: string): Promise<void> {
  logger.info(`Signal action: ${signalId} - ${action}`);

  try {
    await chrome.runtime.sendMessage({
      type: 'SEND_FEEDBACK',
      data: { signalId, action },
    });

    // 从列表中移除
    signals = signals.filter((s) => s.id !== signalId);
    renderSignals();

    logger.info('Feedback sent successfully');
  } catch (error) {
    logger.error('Failed to send feedback:', error);
  }
}

// 全局暴露给 HTML 使用
(window as any).handleSignalAction = handleSignalAction;

// 页面加载时获取信号
loadSignals();

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SIGNALS_UPDATED') {
    loadSignals();
  }
});
