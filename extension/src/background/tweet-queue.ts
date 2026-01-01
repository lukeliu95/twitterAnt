/**
 * 推文队列管理器
 *
 * 负责管理待发送到后端的推文队列
 */

import type { TweetData } from '../shared/types/tweet';
import { CONFIG } from '../shared/constants/config';
import { logger } from '../shared/utils/logger';
import { MessageQueue } from '../shared/utils/message-queue';

export class TweetQueueManager {
  private queue: MessageQueue<TweetData>;

  constructor(private readonly backendAPI: BackendAPI) {
    // 创建消息队列
    this.queue = new MessageQueue<TweetData>(
      CONFIG.TWEET_BATCH.SIZE,
      CONFIG.TWEET_BATCH.INTERVAL,
      CONFIG.RETRY.MAX_ATTEMPTS,
      this.processBatch.bind(this)
    );
  }

  /**
   * 添加推文到队列
   */
  add(tweet: TweetData): void {
    logger.debug('Tweet added to queue:', tweet.id);
    this.queue.add(tweet);
  }

  /**
   * 处理批次推文
   */
  private async processBatch(tweets: TweetData[]): Promise<void> {
    logger.info(`Processing batch of ${tweets.length} tweets`);

    try {
      await this.backendAPI.sendTweets(tweets);
      logger.info('Successfully sent tweets to backend');
    } catch (error) {
      logger.error('Failed to send tweets to backend:', error);
      throw error;
    }
  }

  /**
   * 强制刷新队列（用于休眠前）
   */
  forceFlush(): void {
    logger.info('Force flushing queue');
    this.queue.forceFlush();
  }

  /**
   * 获取队列大小
   */
  get size(): number {
    return this.queue.size;
  }
}

/**
 * 后端 API 接口
 */
export interface BackendAPI {
  sendTweets(tweets: TweetData[]): Promise<void>;
}
