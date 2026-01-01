/**
 * Side Panel 主入口
 */

import { logger } from '../shared/utils/logger';
import type { Signal } from '../shared/types/tweet';

logger.info('Side Panel initialized');

// 状态
let signals: Signal[] = [];
let savedSignalIds: Set<string> = new Set();
let loading = false;
let isOfflineMode = false;
let currentView: 'all' | 'saved' = 'all';
let currentFilter: string = 'all'; // all, demand, revenue, skill, trend
let expandedSignals: Set<string> = new Set();
let translatedSignals: Set<string> = new Set();

// DOM 元素
const app = document.getElementById('app');

// 自动刷新间隔（10秒）
const AUTO_REFRESH_INTERVAL = 10000;
let refreshTimer: number | null = null;

/**
 * 加载信号
 */
async function loadSignals(): Promise<void> {
  if (loading) return;

  loading = true;

  try {
    // 并行获取信号和已保存列表
    const [signalsResponse, savedResponse] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'GET_SIGNALS' }),
      chrome.runtime.sendMessage({ type: 'GET_SAVED_SIGNALS' })
    ]);

    if (!signalsResponse) {
      throw new Error('No response from background');
    }

    if (signalsResponse.error) {
      if (signalsResponse.error.includes('Failed to fetch') || signalsResponse.error.includes('API error')) {
        isOfflineMode = true;
        renderOfflineMode();
        return;
      }
      throw new Error(signalsResponse.error);
    }

    isOfflineMode = false;
    signals = signalsResponse.signals || [];
    savedSignalIds = new Set(savedResponse?.savedIds || []);

    logger.info(`Loaded ${signals.length} signals, ${savedSignalIds.size} saved`);

    renderSignals();
  } catch (error) {
    logger.error('Failed to load signals:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network error')) {
      isOfflineMode = true;
      renderOfflineMode();
    } else {
      renderEmptyWithHint();
    }
  } finally {
    loading = false;
  }
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
      <p style="font-size: 13px; color: #8899a6;">后端服务未响应</p>
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
 * 渲染空状态
 */
function renderEmptyWithHint(): void {
  if (!app) return;

  const isSavedView = currentView === 'saved';
  app.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <p style="font-size: 16px;">${isSavedView ? '暂无保存的信号' : '暂无信号'}</p>
      <p style="font-size: 13px; color: #8899a6; margin-top: 8px;">
        ${isSavedView ? '点击"🔖 保存"按钮收藏感兴趣的信号' : '浏览 Twitter 时我们会自动发现赚钱机会'}
      </p>
    </div>
  `;
}

/**
 * 渲染信号列表
 */
function renderSignals(): void {
  if (!app) return;

  // 根据当前视图筛选
  let filteredSignals = signals;
  if (currentView === 'saved') {
    filteredSignals = signals.filter(s => savedSignalIds.has(s.id));
  } else if (currentFilter !== 'all') {
    filteredSignals = signals.filter(s => s.type === currentFilter);
  }

  if (filteredSignals.length === 0) {
    renderEmptyWithHint();
    return;
  }

  const signalsHtml = filteredSignals.map((signal) => renderSignalCard(signal)).join('');

  app.innerHTML = `
    <div style="padding: 0 0 16px 0;">
      ${renderHeader()}
      ${signalsHtml}
    </div>
  `;

  // 绑定事件
  bindSignalCardEvents();
}

/**
 * 渲染头部
 */
function renderHeader(): string {
  const savedCount = signals.filter(s => savedSignalIds.has(s.id)).length;

  return `
    <div style="padding: 12px 16px; border-bottom: 1px solid #38444d;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="display: flex; gap: 8px;">
          <button onclick="switchView('all')" class="view-btn ${currentView === 'all' ? 'active' : ''}" data-view="all">
            全部 (${signals.length})
          </button>
          <button onclick="switchView('saved')" class="view-btn ${currentView === 'saved' ? 'active' : ''}" data-view="saved">
            已保存 (${savedCount})
          </button>
        </div>
        <button onclick="manualRefresh()" style="
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #38444d;
          border-radius: 4px;
          color: #1fa1f1;
          cursor: pointer;
          font-size: 12px;
        ">刷新</button>
      </div>

      ${currentView === 'all' ? `
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${renderFilterButtons()}
        </div>
      ` : ''}
    </div>
    <style>
      .view-btn {
        padding: 6px 12px;
        background: transparent;
        border: 1px solid #38444d;
        border-radius: 4px;
        color: #8899a6;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      .view-btn:hover {
        background: #22303c;
      }
      .view-btn.active {
        background: #1fa1f1;
        border-color: #1fa1f1;
        color: white;
      }
      .filter-btn {
        padding: 4px 10px;
        background: transparent;
        border: 1px solid #38444d;
        border-radius: 12px;
        color: #8899a6;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s;
      }
      .filter-btn:hover {
        background: #22303c;
      }
      .filter-btn.active {
        background: #1fa1f1;
        border-color: #1fa1f1;
        color: white;
      }
    </style>
  `;
}

/**
 * 渲染筛选按钮
 */
function renderFilterButtons(): string {
  const filters = [
    { value: 'all', label: '全部', color: '#8899a6' },
    { value: 'demand', label: '需求', color: '#1fa1f1' },
    { value: 'revenue', label: '收入', color: '#17bf63' },
    { value: 'skill', label: '技能', color: '#ffd700' },
    { value: 'trend', label: '趋势', color: '#e0245e' },
  ];

  return filters.map(f => `
    <button onclick="setFilter('${f.value}')" class="filter-btn ${currentFilter === f.value ? 'active' : ''}" data-filter="${f.value}">
      ${f.label}
    </button>
  `).join('');
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
  const isExpanded = expandedSignals.has(signal.id);
  const isSaved = savedSignalIds.has(signal.id);
  const isTranslated = translatedSignals.has(signal.id);

  // 格式化本地时间
  const createdDate = new Date(signal.createdAt);
  const timeStr = createdDate.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <div class="signal-card" data-signal-id="${signal.id}" style="
      background: #192734;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid ${isSaved ? '#ffd700' : '#38444d'};
    ">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <span class="signal-type" style="
            background: ${typeColors[signal.type]}20;
            color: ${typeColors[signal.type]};
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          ">${typeLabels[signal.type]}</span>
          <span style="font-size: 11px; color: #666; margin-left: 8px;">${timeStr}</span>
          ${isSaved ? '<span style="color: #ffd700; margin-left: 8px;">🔖</span>' : ''}
        </div>
        <span class="signal-score" style="color: #ffd700; font-size: 14px;">${scoreStars}</span>
      </div>

      <p class="signal-summary" style="
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 12px;
        color: #ffffff;
      ">${signal.summary}</p>

      <button onclick="toggleExpand('${signal.id}')" class="expand-btn" style="
        background: transparent;
        border: none;
        color: #1fa1f1;
        cursor: pointer;
        font-size: 12px;
        padding: 0;
        margin-bottom: 8px;
      ">${isExpanded ? '收起详情 ▲' : '展开详情 ▼'}</button>

      ${isExpanded ? `
        <div class="signal-details" style="
          background: #0d1117;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 13px;
          color: #8899a6;
        ">
          <p style="margin-bottom: 8px;"><strong>原因：</strong>${signal.reason}</p>
          <p style="margin-bottom: 8px;"><strong>行动计划：</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            ${signal.actionPlan.map((item: string) => `<li>${item}</li>`).join('')}
          </ul>
          <p style="margin-top: 8px; margin-bottom: 8px;"><strong>匹配技能：</strong>${signal.matchedSkills?.join(', ') || '暂无'}</p>
          <p><strong>竞争程度：</strong>${signal.competition || '暂无分析'}</p>
        </div>

        <div class="signal-tweet" style="
          background: #0d1117;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 12px; color: #666;">原文</span>
            <button onclick="toggleTranslate('${signal.id}')" class="translate-btn" data-signal-id="${signal.id}" style="
              background: transparent;
              border: 1px solid #38444d;
              border-radius: 4px;
              padding: 4px 8px;
              color: #1fa1f1;
              cursor: pointer;
              font-size: 11px;
            ">${isTranslated ? '显示原文' : '翻译'}</button>
          </div>
          <p class="tweet-text" style="
            font-size: 13px;
            color: #8899a6;
            line-height: 1.5;
            margin: 0;
          ">${isTranslated ? translateText(signal.originalTweet.text) : signal.originalTweet.text}</p>
          <a href="${signal.originalTweet.url}" target="_blank" style="
            display: inline-block;
            margin-top: 8px;
            font-size: 11px;
            color: #1fa1f1;
            text-decoration: none;
          ">查看推文 →</a>
        </div>
      ` : ''}

      <div class="signal-actions" style="display: flex; gap: 8px;">
        ${isSaved ? `
          <button onclick="handleUnsave('${signal.id}')" class="action-btn unsave-btn" data-signal-id="${signal.id}" style="
            flex: 1;
            padding: 8px;
            background: #ffd70020;
            border: 1px solid #ffd700;
            border-radius: 6px;
            color: #ffd700;
            cursor: pointer;
            font-size: 13px;
          ">🔖 已保存</button>
        ` : `
          <button onclick="handleSave('${signal.id}')" class="action-btn save-btn" data-signal-id="${signal.id}" style="
            flex: 1;
            padding: 8px;
            background: #192734;
            border: 1px solid #38444d;
            border-radius: 6px;
            color: #1fa1f1;
            cursor: pointer;
            font-size: 13px;
          ">🔖 保存</button>
        `}
        <button onclick="handleAction('${signal.id}', 'acted')" class="action-btn" style="
          flex: 1;
          padding: 8px;
          background: #192734;
          border: 1px solid #38444d;
          border-radius: 6px;
          color: #17bf63;
          cursor: pointer;
          font-size: 13px;
        ">✓ 已行动</button>
        <button onclick="handleAction('${signal.id}', 'ignored')" class="action-btn" style="
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
 * 绑定信号卡片事件
 */
function bindSignalCardEvents(): void {
  // 可以在这里添加其他事件绑定
}

/**
 * 简单翻译（使用浏览器 API 或备用翻译）
 */
function translateText(text: string): string {
  // 这里使用简单的翻译标记
  // 实际应该调用翻译 API
  return `[翻译] ${text}`;
}

/**
 * 切换视图
 */
function switchView(view: 'all' | 'saved'): void {
  currentView = view;
  renderSignals();
}

/**
 * 设置筛选
 */
function setFilter(filter: string): void {
  currentFilter = filter;
  renderSignals();
}

/**
 * 切换展开/收起
 */
function toggleExpand(signalId: string): void {
  if (expandedSignals.has(signalId)) {
    expandedSignals.delete(signalId);
  } else {
    expandedSignals.add(signalId);
  }
  renderSignals();
}

/**
 * 切换翻译
 */
function toggleTranslate(signalId: string): void {
  if (translatedSignals.has(signalId)) {
    translatedSignals.delete(signalId);
  } else {
    translatedSignals.add(signalId);
  }
  renderSignals();
}

/**
 * 处理保存
 */
async function handleSave(signalId: string): Promise<void> {
  logger.info(`Saving signal: ${signalId}`);

  try {
    await chrome.runtime.sendMessage({
      type: 'SEND_FEEDBACK',
      data: { signalId, action: 'saved' },
    });

    savedSignalIds.add(signalId);
    renderSignals();
    logger.info('Signal saved successfully');
  } catch (error) {
    logger.error('Failed to save signal:', error);
  }
}

/**
 * 处理取消保存
 */
async function handleUnsave(signalId: string): Promise<void> {
  logger.info(`Unsaving signal: ${signalId}`);

  try {
    await chrome.runtime.sendMessage({
      type: 'UNSAVE_SIGNAL',
      data: { signalId },
    });

    savedSignalIds.delete(signalId);
    renderSignals();
    logger.info('Signal unsaved successfully');
  } catch (error) {
    logger.error('Failed to unsave signal:', error);
  }
}

/**
 * 处理行动/忽略
 */
async function handleAction(signalId: string, action: string): Promise<void> {
  logger.info(`Signal action: ${signalId} - ${action}`);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SEND_FEEDBACK',
      data: { signalId, action },
    });

    if (response.success) {
      // 从列表中移除（已行动和忽略会删除信号）
      signals = signals.filter((s) => s.id !== signalId);
      savedSignalIds.delete(signalId);
      renderSignals();
      logger.info(`${action} feedback sent successfully`);
    }
  } catch (error) {
    logger.error('Failed to send feedback:', error);
  }
}

/**
 * 手动刷新
 */
function manualRefresh(): void {
  logger.info('Manual refresh triggered');
  loadSignals();
}

/**
 * 启动自动刷新
 */
function startAutoRefresh(): void {
  if (refreshTimer) return;

  refreshTimer = window.setInterval(() => {
    logger.debug('Auto refreshing signals...');
    loadSignals();
  }, AUTO_REFRESH_INTERVAL);

  logger.info(`Auto refresh started (interval: ${AUTO_REFRESH_INTERVAL}ms)`);
}

/**
 * 停止自动刷新
 */
function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    logger.info('Auto refresh stopped');
  }
}

// 全局暴露给 HTML 使用
(window as any).handleSave = handleSave;
(window as any).handleUnsave = handleUnsave;
(window as any).handleAction = handleAction;
(window as any).manualRefresh = manualRefresh;
(window as any).switchView = switchView;
(window as any).setFilter = setFilter;
(window as any).toggleExpand = toggleExpand;
(window as any).toggleTranslate = toggleTranslate;

// 页面加载时获取信号
loadSignals();

// 启动自动刷新
startAutoRefresh();

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SIGNALS_UPDATED') {
    loadSignals();
  }
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});
