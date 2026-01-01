/**
 * DOM 监听器 - 监听新推文的加载
 */

import type { TweetData } from '../shared/types/tweet';
import { CONFIG } from '../shared/constants/config';
import { logger } from '../shared/utils/logger';

export class DOMObserver {
  private processedTweets = new Set<string>();
  private observer: MutationObserver | null = null;
  private scanThrottleTimer: number | null = null;
  private readonly SCAN_THROTTLE = 500; // ms

  constructor(
    private readonly onTweetFound: (tweet: TweetData) => void,
    private readonly parseTweet: (element: Element) => TweetData | null
  ) {}

  /**
   * 启动监听
   */
  start(): void {
    if (this.observer) {
      logger.warn('DOMObserver already started');
      return;
    }

    const timeline = this.findTimelineContainer();
    if (!timeline) {
      logger.error('Timeline container not found');
      return;
    }

    this.observer = new MutationObserver(() => {
      this.throttledScan();
    });

    this.observer.observe(timeline, {
      childList: true,
      subtree: true,
    });

    logger.info('DOMObserver started');

    // 初始扫描
    this.scanTweets();
  }

  /**
   * 停止监听
   */
  stop(): void {
    this.observer?.disconnect();
    this.observer = null;

    if (this.scanThrottleTimer) {
      clearTimeout(this.scanThrottleTimer);
      this.scanThrottleTimer = null;
    }

    logger.info('DOMObserver stopped');
  }

  /**
   * 查找时间线容器
   */
  private findTimelineContainer(): Element | null {
    const selectors = [
      CONFIG.SELECTORS.TIMELINE,
      'div[data-testid="primaryColumn"]',
      'main[role="main"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  /**
   * 节流扫描
   */
  private throttledScan(): void {
    if (this.scanThrottleTimer) {
      return;
    }

    this.scanThrottleTimer = window.setTimeout(() => {
      this.scanTweets();
      this.scanThrottleTimer = null;
    }, this.SCAN_THROTTLE);
  }

  /**
   * 扫描推文
   */
  private scanTweets(): void {
    const tweetElements = document.querySelectorAll(CONFIG.SELECTORS.TWEET);
    let newCount = 0;
    let parsedCount = 0;
    let filteredCount = 0;

    logger.debug(`Scanning ${tweetElements.length} tweet elements...`);

    tweetElements.forEach((element) => {
      const tweet = this.parseTweet(element);

      if (tweet && tweet.id) {
        parsedCount++;
        if (!this.processedTweets.has(tweet.id)) {
          this.processedTweets.add(tweet.id);
          this.onTweetFound(tweet);
          newCount++;
        }
      } else {
        filteredCount++;
      }
    });

    // 清理过期的 ID（防止内存泄漏）
    if (this.processedTweets.size > CONFIG.TWEET_BATCH.MAX_CACHE_SIZE) {
      const idsArray = Array.from(this.processedTweets);
      this.processedTweets = new Set(idsArray.slice(-500));
    }

    if (tweetElements.length > 0) {
      logger.info(`Tweet scan: ${tweetElements.length} elements, ${parsedCount} parsed, ${newCount} new, ${filteredCount} filtered`);
    }
  }

  /**
   * 手动触发扫描
   */
  scan(): void {
    this.scanTweets();
  }

  /**
   * 获取已处理的推文数量
   */
  getProcessedCount(): number {
    return this.processedTweets.size;
  }

  /**
   * 清空已处理的推文
   */
  clearProcessed(): void {
    this.processedTweets.clear();
  }
}
