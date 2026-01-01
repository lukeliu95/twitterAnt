/**
 * Background Service Worker
 *
 * 负责：
 * 1. 接收来自 Content Script 的推文
 * 2. 管理推文队列
 * 3. 与后端 API 通信
 * 4. 响应来自 Side Panel 的请求
 */

import { BackendAPI } from './backend-api';
import { TweetQueueManager } from './tweet-queue';
import { configManager } from './config-manager';
import { logger } from '../shared/utils/logger';
import type { TweetData, Signal, UserFeedback } from '../shared/types/tweet';

// 初始化组件
const backendAPI = new BackendAPI();
const tweetQueue = new TweetQueueManager(backendAPI);

// 设置默认配置
setupDefaultConfig();

// 初始化议题配置
configManager.getConfig().then(config => {
  logger.info('Topic config initialized:', config.enabledTopics);
});

/**
 * 消息路由
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  logger.debug('Received message:', message.type);

  switch (message.type) {
    case 'NEW_TWEET':
      handleNewTweet(message.data as TweetData);
      sendResponse({ success: true });
      break;

    case 'GET_SIGNALS':
      handleGetSignals(message.data)
        .then((signals) => sendResponse({ signals }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'TOGGLE_BOOKMARK':
      handleToggleBookmark(message.data)
        .then((saved) => sendResponse({ success: true, saved }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'DELETE_SIGNAL':
      handleDeleteSignal(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'UPDATE_NOTES':
      handleUpdateNotes(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'BATCH_DELETE_SIGNALS':
      handleBatchDeleteSignals(message.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'GET_TOPIC_CONFIG':
      handleGetTopicConfig()
        .then((config) => sendResponse({ success: true, config }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'UPDATE_TOPIC_CONFIG':
      handleUpdateTopicConfig(message.data)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'RESET_TOPIC_CONFIG':
      handleResetTopicConfig()
        .then((config) => sendResponse({ success: true, config }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    case 'GET_KEYWORDS_FOR_TOPICS':
      handleGetKeywordsForTopics(message.data)
        .then((keywords) => sendResponse({ success: true, keywords }))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // 异步响应

    default:
      logger.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }

  return false;
});

/**
 * 处理新推文
 */
async function handleNewTweet(tweet: TweetData): Promise<void> {
  logger.debug('Received new tweet:', tweet.id);
  tweetQueue.add(tweet);

  // 通知 Side Panel 信号可能已更新
  // 延迟通知以确保队列已处理
  setTimeout(async () => {
    try {
      // 尝试向 Side Panel 发送更新通知
      await chrome.runtime.sendMessage({
        type: 'SIGNALS_UPDATED',
      });
      logger.debug('Sent SIGNALS_UPDATED notification');
    } catch (error) {
      // Side Panel 可能未打开，忽略错误
      logger.debug('Could not notify Side Panel (might be closed)');
    }
  }, 2000);
}

/**
 * 处理获取信号请求
 */
async function handleGetSignals(data?: { savedOnly?: boolean; type?: string }): Promise<Signal[]> {
  try {
    const signals = await backendAPI.getSignals(data?.savedOnly, data?.type);
    logger.info(`Retrieved ${signals.length} signals`);
    return signals;
  } catch (error) {
    logger.error('Failed to get signals:', error);
    throw error;
  }
}

/**
 * 处理切换书签
 */
async function handleToggleBookmark(data?: { signalId: string }): Promise<boolean> {
  try {
    if (!data || !data.signalId) {
      throw new Error('Invalid signal data');
    }
    const isSaved = await backendAPI.toggleBookmark(data.signalId);
    logger.info(`Bookmark ${isSaved ? 'added' : 'removed'} for signal ${data.signalId}`);
    return isSaved;
  } catch (error) {
    logger.error('Failed to toggle bookmark:', error);
    throw error;
  }
}

/**
 * 处理删除信号
 */
async function handleDeleteSignal(data?: { signalId: string }): Promise<void> {
  try {
    if (!data || !data.signalId) {
      throw new Error('Invalid signal data');
    }
    await backendAPI.deleteSignal(data.signalId);
    logger.info('Signal deleted:', data.signalId);
  } catch (error) {
    logger.error('Failed to delete signal:', error);
    throw error;
  }
}

/**
 * 处理更新备注
 */
async function handleUpdateNotes(data?: { signalId: string; notes: string }): Promise<void> {
  try {
    if (!data || !data.signalId) {
      throw new Error('Invalid signal data');
    }
    await backendAPI.updateNotes(data.signalId, data.notes || '');
    logger.info(`Notes updated for signal ${data.signalId}`);
  } catch (error) {
    logger.error('Failed to update notes:', error);
    throw error;
  }
}

/**
 * 处理批量删除信号
 */
async function handleBatchDeleteSignals(data?: { ids: string[] }): Promise<{ deleted: number; total: number }> {
  try {
    if (!data || !Array.isArray(data.ids) || data.ids.length === 0) {
      throw new Error('Invalid signal data');
    }
    const result = await backendAPI.batchDeleteSignals(data.ids);
    logger.info(`Batch deleted ${result.deleted}/${result.total} signals`);
    return result;
  } catch (error) {
    logger.error('Failed to batch delete signals:', error);
    throw error;
  }
}

/**
 * 处理获取议题配置请求
 */
async function handleGetTopicConfig() {
  try {
    const config = await configManager.getConfig();
    return config;
  } catch (error) {
    logger.error('Failed to get topic config:', error);
    throw error;
  }
}

/**
 * 处理更新议题配置请求
 */
async function handleUpdateTopicConfig(data?: { topicIds: string[] }) {
  try {
    if (!data || !Array.isArray(data.topicIds)) {
      return { success: false, error: 'Invalid topic data' };
    }
    const result = await configManager.updateTopics(data.topicIds);
    return result;
  } catch (error) {
    logger.error('Failed to update topic config:', error);
    throw error;
  }
}

/**
 * 处理重置议题配置请求
 */
async function handleResetTopicConfig() {
  try {
    await configManager.resetToDefault();
    const config = await configManager.getConfig();
    return config;
  } catch (error) {
    logger.error('Failed to reset topic config:', error);
    throw error;
  }
}

/**
 * 处理获取议题关键词请求
 */
async function handleGetKeywordsForTopics(data?: { topicIds: string[] }) {
  try {
    if (!data || !Array.isArray(data.topicIds)) {
      throw new Error('Invalid topic IDs');
    }

    // 导入议题配置
    const { TOPIC_CATEGORIES } = await import('../shared/types/topics');
    const keywords: string[] = [];

    for (const categoryId in TOPIC_CATEGORIES) {
      const category = TOPIC_CATEGORIES[categoryId];
      for (const topic of category.topics) {
        if (data.topicIds.includes(topic.id)) {
          keywords.push(...topic.keywords);
        }
      }
    }

    // 去重
    return [...new Set(keywords)];
  } catch (error) {
    logger.error('Failed to get keywords for topics:', error);
    throw error;
  }
}

/**
 * 设置默认配置
 */
function setupDefaultConfig(): void {
  chrome.storage.local.get(['config'], (result) => {
    if (!result.config) {
      const defaultConfig = {
        enabled: true,
        signalTypes: ['demand', 'revenue', 'skill', 'trend'],
        language: 'auto',
      };
      chrome.storage.local.set({ config: defaultConfig });
      logger.info('Default config set');
    }
  });
}

/**
 * 监听插件图标点击 - 打开 Side Panel
 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 打开侧边栏
    await chrome.sidePanel.open({ windowId: tab.windowId });
    logger.info('Side panel opened from icon click');
  } catch (error) {
    logger.error('Failed to open side panel:', error);
  }
});

/**
 * 监听插件安装/更新
 */
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // 首次安装
    setupDefaultConfig();

    // 打开欢迎页面（可选）
    // chrome.tabs.create({ url: 'https://money-signal.com/welcome' });
  }
});

/**
 * 监听 Service Worker 休眠前事件
 */
chrome.runtime.onSuspend.addListener(() => {
  logger.info('Service worker suspending, flushing queue');
  tweetQueue.forceFlush();
});

// 定期发送队列中的推文
setInterval(() => {
  if (tweetQueue.size > 0) {
    logger.debug(`Queue size: ${tweetQueue.size}`);
  }
}, 60000); // 每分钟记录一次

// 导出供测试使用
export { BackendAPI, TweetQueueManager };
