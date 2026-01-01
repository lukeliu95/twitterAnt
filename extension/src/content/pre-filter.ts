/**
 * 本地初筛器 - 过滤掉不太可能包含信号的推文
 */

import type { TweetData } from '../shared/types/tweet';
import { SIGNAL_KEYWORDS } from '../shared/constants/keywords';
import { logger } from '../shared/utils/logger';

export class PreFilter {
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

    // 3. 关键词匹配
    const text = tweet.text.toLowerCase();
    if (this.matchKeywords(text)) {
      logger.info('Tweet matched keywords:', tweet.text.slice(0, 50));
      return true;
    }

    // 4. 高互动推文（可能是重要信息）- 降低门槛用于测试
    if (this.isHighEngagement(tweet)) {
      logger.info('Tweet has engagement:', tweet.engagement.likes, 'likes');
      return true;
    }

    // 5. 大 V 推文（可能包含有价值的观点）- 降低门槛
    if (tweet.author.followerCount > 10000) {
      logger.info('Tweet from account with', tweet.author.followerCount, 'followers');
      return true;
    }

    // 测试模式：让更多推文通过
    if (tweet.text.length > 50) {
      logger.debug('Tweet passed test filter:', tweet.text.slice(0, 30));
      return true;
    }

    logger.debug('Tweet filtered out');
    return false;
  }

  /**
   * 检查是否匹配任何关键词
   */
  private matchKeywords(text: string): boolean {
    for (const category in SIGNAL_KEYWORDS) {
      const keywords = SIGNAL_KEYWORDS[category as keyof typeof SIGNAL_KEYWORDS];
      if (this.matchAnyKeyword(text, keywords)) {
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
