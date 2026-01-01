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
import { logger } from '../shared/utils/logger';
import type { TweetData, Signal, UserFeedback } from '../shared/types/tweet';

// 初始化组件
const backendAPI = new BackendAPI();
const tweetQueue = new TweetQueueManager(backendAPI);

// 设置默认配置
setupDefaultConfig();

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

    case 'SEND_FEEDBACK':
      handleSendFeedback(message.data)
        .then(() => sendResponse({ success: true }))
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
function handleNewTweet(tweet: TweetData): void {
  logger.debug('Received new tweet:', tweet.id);
  tweetQueue.add(tweet);
}

/**
 * 处理获取信号请求
 */
async function handleGetSignals(data?: { userId?: string }): Promise<Signal[]> {
  try {
    const userId = data?.userId;
    const signals = await backendAPI.getSignals(userId);
    logger.info(`Retrieved ${signals.length} signals`);
    return signals;
  } catch (error) {
    logger.error('Failed to get signals:', error);
    throw error;
  }
}

/**
 * 处理发送反馈
 */
async function handleSendFeedback(feedback?: UserFeedback & { userId?: string }): Promise<void> {
  try {
    if (!feedback || !feedback.signalId) {
      throw new Error('Invalid feedback data');
    }
    await backendAPI.sendFeedback(feedback);
    logger.info('Feedback sent:', feedback.action);
  } catch (error) {
    logger.error('Failed to send feedback:', error);
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
