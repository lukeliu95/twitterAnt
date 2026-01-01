/**
 * Side Panel 主入口
 * Alan Cooper 设计原则：简化交互，减少认知负荷
 *
 * 核心交互：
 * - 点击🔖图标保存/取消保存
 * - 无其他按钮，保持界面简洁
 */

import { logger } from '../shared/utils/logger';
import type { Signal } from '../shared/types/tweet';

logger.info('Side Panel initialized');

// 状态
let signals: Signal[] = [];
let loading = false;
let isOfflineMode = false;
let currentView: 'all' | 'saved' = 'all';
let currentFilter: string = 'all';
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
    const signalsResponse = await chrome.runtime.sendMessage({
      type: 'GET_SIGNALS',
      data: {
        savedOnly: currentView === 'saved',
        type: currentFilter === 'all' ? undefined : currentFilter,
      },
    });

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

    logger.info(`Loaded ${signals.length} signals (${currentView} view)`);

    if (signals.length === 0) {
      renderEmptyWithHint();
    } else {
      renderSignals();
    }
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
      <button onclick="location.reload()" class="retry-btn">重试</button>
    </div>
    <style>
      .retry-btn {
        margin-top: 16px;
        padding: 8px 16px;
        background: #1fa1f1;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      }
    </style>
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
        ${isSavedView ? '点击🔖保存感兴趣的信号' : '浏览 Twitter 时我们会自动发现赚钱机会'}
      </p>
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
    <div class="signals-container">
      ${renderHeader()}
      <div class="signals-list">
        ${signalsHtml}
      </div>
    </div>
    ${getStyles()}
  `;
}

/**
 * 渲染头部
 */
function renderHeader(): string {
  const savedCount = signals.filter(s => s.saved).length;
  const totalCount = signals.length;

  return `
    <div class="header">
      <div class="header-tabs">
        <button class="tab-btn ${currentView === 'all' ? 'active' : ''}" onclick="switchView('all')">
          全部 <span class="count">${totalCount}</span>
        </button>
        <button class="tab-btn ${currentView === 'saved' ? 'active' : ''}" onclick="switchView('saved')">
          已保存 <span class="count">${savedCount}</span>
        </button>
      </div>

      ${currentView === 'all' ? `
        <div class="filter-chips">
          <button class="chip ${currentFilter === 'all' ? 'active' : ''}" onclick="setFilter('all')">全部</button>
          <button class="chip ${currentFilter === 'demand' ? 'active' : ''}" onclick="setFilter('demand')">需求</button>
          <button class="chip ${currentFilter === 'revenue' ? 'active' : ''}" onclick="setFilter('revenue')">收入</button>
          <button class="chip ${currentFilter === 'skill' ? 'active' : ''}" onclick="setFilter('skill')">技能</button>
          <button class="chip ${currentFilter === 'trend' ? 'active' : ''}" onclick="setFilter('trend')">趋势</button>
        </div>
      ` : ''}

      <button class="refresh-btn" onclick="manualRefresh()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
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
  const isExpanded = expandedSignals.has(signal.id);
  const isSaved = signal.saved || false;
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
    <div class="signal-card ${isSaved ? 'saved' : ''}" data-signal-id="${signal.id}">
      <!-- 顶部：类型标签、时间、评分、书签图标 -->
      <div class="card-header">
        <div class="header-left">
          <span class="type-badge" style="background: ${typeColors[signal.type]}20; color: ${typeColors[signal.type]};">
            ${typeLabels[signal.type]}
          </span>
          <span class="time">${timeStr}</span>
        </div>
        <div class="header-right">
          <span class="score">${scoreStars}</span>
          <button class="bookmark-btn ${isSaved ? 'saved' : ''}" onclick="toggleBookmark('${signal.id}')" title="${isSaved ? '取消保存' : '保存'}">
            ${isSaved ? '🔥' : '🔖'}
          </button>
        </div>
      </div>

      <!-- 摘要 -->
      <p class="summary">${signal.summary}</p>

      <!-- 展开详情 -->
      ${isExpanded ? `
        <div class="details">
          <p class="detail-item"><strong>原因：</strong>${signal.reason}</p>
          <p class="detail-item"><strong>行动计划：</strong></p>
          <ul class="action-list">
            ${signal.actionPlan.map((item: string) => `<li>${item}</li>`).join('')}
          </ul>
          <p class="detail-item"><strong>匹配技能：</strong>${signal.matchedSkills?.join(', ') || '暂无'}</p>
          <p class="detail-item"><strong>竞争程度：</strong>${signal.competition || '暂无分析'}</p>

          <!-- 原推文区域 -->
          <div class="tweet-box">
            <div class="tweet-header">
              <span class="tweet-label">原文</span>
              <button class="translate-btn" onclick="toggleTranslate('${signal.id}')">
                ${isTranslated ? '显示原文' : '翻译'}
              </button>
            </div>
            <p class="tweet-text">${isTranslated ? translateText(signal.originalTweet.text) : signal.originalTweet.text}</p>
            <a href="${signal.originalTweet.url}" target="_blank" class="tweet-link">查看推文 →</a>
          </div>
        </div>
      ` : ''}

      <!-- 展开按钮 -->
      <button class="expand-btn" onclick="toggleExpand('${signal.id}')">
        ${isExpanded ? '收起详情 ▲' : '展开详情 ▼'}
      </button>
    </div>
  `;
}

/**
 * 切换书签状态
 */
async function toggleBookmark(signalId: string): Promise<void> {
  logger.info(`Toggle bookmark: ${signalId}`);

  try {
    await chrome.runtime.sendMessage({
      type: 'TOGGLE_BOOKMARK',
      data: { signalId },
    });

    // 更新本地状态
    const signal = signals.find(s => s.id === signalId);
    if (signal) {
      signal.saved = !signal.saved;
      logger.info(`Bookmark ${signal.saved ? 'added' : 'removed'} for signal ${signalId}`);
    }

    renderSignals();
  } catch (error) {
    logger.error('Failed to toggle bookmark:', error);
  }
}

/**
 * 切换展开状态
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
 * 简单翻译
 */
function translateText(text: string): string {
  // TODO: 接入真实翻译 API
  return `[翻译] ${text}`;
}

/**
 * 切换视图
 */
function switchView(view: 'all' | 'saved'): void {
  currentView = view;
  loadSignals();
}

/**
 * 设置筛选
 */
function setFilter(filter: string): void {
  currentFilter = filter;
  loadSignals();
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

/**
 * 获取样式
 */
function getStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: #000;
        color: #e7e9ea;
      }

      .signals-container {
        min-height: 100vh;
        background: #000;
      }

      /* 头部样式 */
      .header {
        padding: 12px 16px;
        border-bottom: 1px solid #2f3336;
        position: sticky;
        top: 0;
        background: #000;
        z-index: 10;
      }

      .header-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .tab-btn {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid #2f3336;
        border-radius: 20px;
        color: #71767b;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .tab-btn:hover {
        background: #16181c;
      }

      .tab-btn.active {
        background: #1d9bf0;
        border-color: #1d9bf0;
        color: #fff;
      }

      .tab-btn .count {
        opacity: 0.7;
        font-size: 12px;
      }

      .filter-chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .chip {
        padding: 6px 12px;
        background: transparent;
        border: 1px solid #2f3336;
        border-radius: 16px;
        color: #71767b;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      }

      .chip:hover {
        background: #16181c;
      }

      .chip.active {
        background: #1d9bf0;
        border-color: #1d9bf0;
        color: #fff;
      }

      .refresh-btn {
        position: absolute;
        top: 12px;
        right: 16px;
        padding: 6px;
        background: transparent;
        border: none;
        color: #71767b;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .refresh-btn:hover {
        background: #16181c;
        color: #1d9bf0;
      }

      /* 信号卡片样式 */
      .signals-list {
        padding: 12px 16px 80px 16px;
      }

      .signal-card {
        background: #16181c;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        border: 1px solid #2f3336;
        transition: all 0.2s;
      }

      .signal-card.saved {
        border-color: #f91880;
      }

      .signal-card:hover {
        background: #1d1f23;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .type-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
      }

      .time {
        font-size: 12px;
        color: #71767b;
      }

      .score {
        color: #ffd700;
        font-size: 14px;
      }

      .bookmark-btn {
        padding: 6px 8px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.2s;
        border-radius: 4px;
      }

      .bookmark-btn:hover {
        background: #2f3336;
        transform: scale(1.1);
      }

      .bookmark-btn.saved {
        color: #f91880;
      }

      .summary {
        font-size: 15px;
        line-height: 1.5;
        margin-bottom: 12px;
        color: #e7e9ea;
      }

      .expand-btn {
        padding: 6px 0;
        background: transparent;
        border: none;
        color: #1d9bf0;
        cursor: pointer;
        font-size: 13px;
        width: 100%;
        text-align: center;
      }

      .details {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #2f3336;
      }

      .detail-item {
        font-size: 13px;
        color: #71767b;
        line-height: 1.6;
        margin-bottom: 8px;
      }

      .action-list {
        margin: 8px 0;
        padding-left: 20px;
        color: #71767b;
        font-size: 13px;
        line-height: 1.6;
      }

      .tweet-box {
        margin-top: 12px;
        padding: 12px;
        background: #000;
        border-radius: 8px;
        border: 1px solid #2f3336;
      }

      .tweet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .tweet-label {
        font-size: 12px;
        color: #71767b;
      }

      .translate-btn {
        padding: 4px 8px;
        background: transparent;
        border: 1px solid #2f3336;
        border-radius: 4px;
        color: #1d9bf0;
        cursor: pointer;
        font-size: 11px;
      }

      .translate-btn:hover {
        background: #16181c;
      }

      .tweet-text {
        font-size: 13px;
        color: #71767b;
        line-height: 1.5;
        margin-bottom: 8px;
      }

      .tweet-link {
        display: inline-block;
        font-size: 12px;
        color: #1d9bf0;
        text-decoration: none;
      }

      .tweet-link:hover {
        text-decoration: underline;
      }

      /* 空状态样式 */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }

      .empty-state svg {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .empty-state p {
        font-size: 16px;
        margin-bottom: 8px;
      }
    </style>
  `;
}

// 全局函数
(window as any).toggleBookmark = toggleBookmark;
(window as any).toggleExpand = toggleExpand;
(window as any).toggleTranslate = toggleTranslate;
(window as any).switchView = switchView;
(window as any).setFilter = setFilter;
(window as any).manualRefresh = manualRefresh;

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
