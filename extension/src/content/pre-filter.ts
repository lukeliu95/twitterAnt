/**
 * 本地初筛器 - 过滤掉不太可能包含信号的推文
 *
 * 简化版 v0.4 - 使用新的议题配置结构
 */

import type { TweetData } from '../shared/types/tweet';
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

  // 失败时返回默认关键词（所有7大议题）
  return getDefaultKeywords();
}

/**
 * 根据议题 ID 获取关键词
 */
async function getKeywordsForTopics(topicIds: string[]): Promise<string[]> {
  // 这里需要从 shared/types/topics.ts 导入 TOPICS 和 getKeywordsForTopicIds
  // 但由于 content script 的限制，我们通过消息传递获取
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
  return getDefaultKeywords();
}

/**
 * 获取默认关键词（所有7大议题）
 */
function getDefaultKeywords(): string[] {
  return [
    // 技术与产品
    'ai', 'gpt', 'chatgpt', 'claude', 'llm', 'web3', 'crypto', 'blockchain', 'react', 'vue', 'saas', 'product hunt', 'launch',
    // 商业与创业
    'funding', 'startup', 'indie hacker', 'marketing', 'growth', 'hiring',
    // 收入与变现
    'revenue', 'income', 'passive income', 'freelance', 'monetization',
    // 数据与洞察
    'data', 'report', 'analysis', 'research', 'metrics', 'trend',
    // 技能与学习
    'learn', 'tutorial', 'guide', 'how to', 'programming', 'design', 'productivity',
    // 观点与讨论
    'my take', 'opinion', 'thoughts', 'hot take', 'debate', 'advice',
    // 社会热点
    'news', 'breaking', 'announcement', 'viral', 'trending',
  ];
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
      this.keywords = getDefaultKeywords();
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
    }

    // 4. 高互动推文（可能是重要信息）
    if (this.isHighEngagement(tweet)) {
      logger.info('Tweet has high engagement:', tweet.engagement.likes, 'likes');
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
   * 检查是否匹配任何关键词
   */
  private matchAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  }

  /**
   * 检查是否是高互动推文
   */
  private isHighEngagement(tweet: TweetData): boolean {
    const { likes, retweets } = tweet.engagement;
    // 从 100/50 降到 10/5
    return likes > 10 || retweets > 5;
  }
}
