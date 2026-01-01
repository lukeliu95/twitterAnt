/**
 * Twitter Extractor - Content Script 主入口
 *
 * 功能：
 * 1. 监听 DOM 变化，检测新推文
 * 2. 解析推文数据
 * 3. 本地初筛
 * 4. 发送到 Background Service Worker
 */

import { TweetParser } from './tweet-parser';
import { DOMObserver } from './dom-observer';
import { PreFilter } from './pre-filter';
import { logger } from '../shared/utils/logger';
import type { TweetData } from '../shared/types/tweet';

// 确保只运行一次
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  logger.info('Twitter Extractor initialized');

  // 检查是否在 Twitter/X 域名
  if (!isTwitterDomain()) {
    logger.warn('Not on Twitter domain, skipping');
    return;
  }

  // 初始化组件
  const parser = new TweetParser();
  const preFilter = new PreFilter();

  // 创建 DOM 监听器
  const observer = new DOMObserver(
    (tweet) => {
      // 新推文回调
      handleNewTweet(tweet, parser, preFilter);
    },
    (element) => parser.parseTweet(element)
  );

  // 等待页面加载完成后启动监听
  if (document.body) {
    observer.start();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.start();
    });
  }

  // 监听页面导航（Twitter 是 SPA）
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      logger.debug('URL changed, re-scanning');
      setTimeout(() => observer.scan(), 1000);
    }
  }).observe(document.body!, { childList: true, subtree: true });
}

/**
 * 检查是否在 Twitter 域名
 */
function isTwitterDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'twitter.com' ||
         hostname === 'x.com' ||
         hostname.endsWith('.twitter.com') ||
         hostname.endsWith('.x.com');
}

/**
 * 处理新推文
 */
function handleNewTweet(
  tweet: TweetData,
  parser: TweetParser,
  preFilter: PreFilter
): void {
  logger.debug('New tweet found:', tweet.id);

  // 本地初筛
  if (!preFilter.filter(tweet)) {
    logger.debug('Tweet filtered out by pre-filter');
    return;
  }

  // 发送到 Background
  sendTweetToBackground(tweet);
}

/**
 * 检查扩展上下文是否有效
 */
function isExtensionContextValid(): boolean {
  try {
    // 尝试访问 runtime.id，如果上下文无效会抛出错误
    return chrome.runtime && chrome.runtime.id !== undefined;
  } catch {
    return false;
  }
}

/**
 * 发送推文到 Background Service Worker
 */
function sendTweetToBackground(tweet: TweetData): void {
  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    logger.debug('Extension context invalidated, skipping message send');
    return;
  }

  try {
    chrome.runtime.sendMessage({
      type: 'NEW_TWEET',
      data: tweet,
    }).catch((error: Error) => {
      // 检查是否是上下文失效错误
      if (error.message.includes('Extension context invalidated') ||
          error.message.includes('message port closed')) {
        logger.debug('Extension context invalidated, skipping until page refresh');
        return;
      }
      logger.error('Failed to send tweet to background:', error);
    });
  } catch (error) {
    // 静默处理上下文失效错误
    const err = error as Error;
    if (!err.message.includes('Extension context invalidated')) {
      logger.error('Error sending message:', error);
    }
  }
}

// 导出供测试使用
export { TweetParser, DOMObserver, PreFilter };
