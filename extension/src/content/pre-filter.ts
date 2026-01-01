/**
 * 本地初筛器 - 过滤掉不太可能包含信号的推文
 *
 * 增强功能：
 * - 根据用户配置的议题进行过滤
 * - 支持动态加载用户配置
 */

import type { TweetData } from '../shared/types/tweet';
import { SIGNAL_KEYWORDS } from '../shared/constants/keywords';
import { logger } from '../shared/utils/logger';

// 用户配置的关键词缓存
let userConfigKeywords: string[] | null = null;
let lastConfigLoad = 0;
const CONFIG_CACHE_DURATION = 60000; // 1分钟缓存

/**
 * 加载用户配置的关键词
 */
async function loadUserConfigKeywords(): Promise<string[]> {
  const now = Date.now();

  // 使用缓存（如果在有效期内）
  if (userConfigKeywords && (now - lastConfigLoad) < CONFIG_CACHE_DURATION) {
    return userConfigKeywords;
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TOPIC_CONFIG' });

    if (response.success && response.config && response.config.enabledTopics) {
      const enabledTopicIds = response.config.enabledTopics;

      // 从议题配置中获取关键词
      const keywords = await getKeywordsForTopics(enabledTopicIds);

      userConfigKeywords = keywords;
      lastConfigLoad = now;
      logger.debug('Loaded user config keywords:', keywords.length, 'keywords');
      return keywords;
    }
  } catch (error) {
    logger.warn('Failed to load user config, using default keywords:', error);
  }

  // 失败时返回默认关键词（所有类别）
  return Object.values(SIGNAL_KEYWORDS).flat();
}

/**
 * 根据议题 ID 获取关键词
 */
async function getKeywordsForTopics(topicIds: string[]): Promise<string[]> {
  // 这里需要从 shared/types/topics.ts 导入 TOPIC_CATEGORIES
  // 由于 content script 的限制，我们通过消息传递获取
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_KEYWORDS_FOR_TOPICS',
      data: { topicIds }
    });

    if (response.success && response.keywords) {
      return response.keywords;
    }
  } catch (error) {
    logger.warn('Failed to get keywords for topics:', error);
  }

  // 降级：使用默认关键词
  return Object.values(SIGNAL_KEYWORDS).flat();
}

export class PreFilter {
  private keywords: string[] = [];
  private keywordsLoaded = false;

  constructor() {
    // 异步加载关键词
    this.loadKeywords();
  }

  /**
   * 加载用户配置的关键词
   */
  private async loadKeywords(): Promise<void> {
    try {
      this.keywords = await loadUserConfigKeywords();
      this.keywordsLoaded = true;
    } catch (error) {
      logger.error('Failed to load keywords:', error);
      // 使用默认关键词
      this.keywords = Object.values(SIGNAL_KEYWORDS).flat();
      this.keywordsLoaded = true;
    }
  }

  /**
   * 刷新关键词配置（当用户更新配置后调用）
   */
  async refreshKeywords(): Promise<void> {
    userConfigKeywords = null; // 清除缓存
    await this.loadKeywords();
  }
  /**
   * 检查推文是否可能包含信号
   */
  filter(tweet: TweetData): boolean {
    // 1. 过滤转推
    if (tweet.type === 'retweet') {
      return false;
    }

    // 2. 过滤短推文
    if (tweet.text.length < 30) {
      return false;
    }

    const text = tweet.text.toLowerCase();

    // 3. 用户配置的关键词匹配（如果已加载）
    if (this.keywordsLoaded && this.keywords.length > 0) {
      if (this.matchAnyKeyword(text, this.keywords)) {
        logger.info('Tweet matched user config keywords:', tweet.text.slice(0, 50));
        return true;
      }
    } else {
      // 降级：使用旧的关键词匹配
      if (this.matchKeywords(text)) {
        logger.info('Tweet matched default keywords:', tweet.text.slice(0, 50));
        return true;
      }
    }

    // 4. 高互动推文（可能是重要信息）
    if (this.isHighEngagement(tweet)) {
      logger.info('Tweet has engagement:', tweet.engagement.likes, 'likes');
      return true;
    }

    // 5. 大 V 推文（可能包含有价值的观点）
    if (tweet.author.followerCount > 10000) {
      logger.info('Tweet from account with', tweet.author.followerCount, 'followers');
      return true;
    }

    logger.debug('Tweet filtered out');
    return false;
  }

  /**
   * 检查是否匹配任何关键词（旧版本，向后兼容）
   */
  private matchKeywords(text: string): boolean {
    for (const category in SIGNAL_KEYWORDS) {
      const keywords = SIGNAL_KEYWORDS[category as keyof typeof SIGNAL_KEYWORDS];
      if (keywords && this.matchAnyKeyword(text, keywords)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查是否匹配特定类别的关键词
   */
  private matchAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  }

  /**
   * 检查是否是高互动推文 - 降低门槛用于测试
   */
  private isHighEngagement(tweet: TweetData): boolean {
    const { likes, retweets } = tweet.engagement;
    // 从 100/50 降到 10/5
    return likes > 10 || retweets > 5;
  }
}
