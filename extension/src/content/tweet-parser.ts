/**
 * 推文解析器 - 从 DOM 元素提取推文数据
 */

import type { TweetData, TweetAuthor, TweetEngagement, TweetType } from '../shared/types/tweet';
import { CONFIG } from '../shared/constants/config';
import { RETWEET_KEYWORDS, REPLY_KEYWORDS } from '../shared/constants/keywords';
import { logger } from '../shared/utils/logger';

export class TweetParser {
  /**
   * 解析推文数据
   */
  parseTweet(element: Element): TweetData | null {
    try {
      const tweet = {
        id: this.extractTweetId(element),
        text: this.extractText(element),
        author: this.extractAuthor(element),
        engagement: this.extractEngagement(element),
        timestamp: this.extractTimestamp(element),
        url: this.extractUrl(element),
        type: this.detectType(element),
        media: this.extractMedia(element),
        links: this.extractLinks(element),
      };

      // 验证推文数据
      if (!tweet.id || tweet.id === '') {
        logger.debug('Tweet parsing failed: No ID found');
        return null;
      }

      if (!tweet.text || tweet.text.length < 10) {
        logger.debug(`Tweet ${tweet.id}: Too short or empty text`);
        return null;
      }

      logger.debug(`Tweet parsed: ${tweet.id} by @${tweet.author.username} - ${tweet.text.slice(0, 30)}...`);
      return tweet;
    } catch (error) {
      logger.error('[TweetParser] Failed to parse tweet:', error);
      return null;
    }
  }

  /**
   * 提取推文 ID
   */
  private extractTweetId(element: Element): string {
    const link = element.querySelector('a[href*="/status/"]');
    const match = link?.getAttribute('href')?.match(/status\/(\d+)/);
    const id = match?.[1] || '';
    if (!id) {
      logger.debug('No tweet ID found in element');
    }
    return id;
  }

  /**
   * 提取推文文本
   */
  private extractText(element: Element): string {
    const textEl = element.querySelector(CONFIG.SELECTORS.TWEET_TEXT);
    return textEl?.textContent?.trim() || '';
  }

  /**
   * 提取作者信息
   */
  private extractAuthor(element: Element): TweetAuthor {
    const userNameEl = element.querySelector(CONFIG.SELECTORS.USER_NAME);
    const handleEls = element.querySelectorAll(CONFIG.SELECTORS.USER_LINK);

    let username = '';
    let displayName = '';

    // 获取显示名称
    if (userNameEl) {
      const names = userNameEl.textContent?.split('\n') || [];
      displayName = names[0]?.trim() || '';
    }

    // 获取用户名（@handle）
    for (const link of handleEls) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('/status/') && !href.includes('/following')) {
        username = href.replace('/', '');
        break;
      }
    }

    // 检查认证标识
    const verifiedEl = element.querySelector(CONFIG.SELECTORS.VERIFIED);
    const verified = !!verifiedEl;

    // 粉丝数（需要从页面解析或从 API 获取）
    const followerCount = this.parseFollowerCount(userNameEl);

    return { username, displayName, verified, followerCount };
  }

  /**
   * 解析粉丝数
   */
  private parseFollowerCount(element: Element | null): number {
    if (!element) return 0;

    const text = element.textContent || '';
    // 尝试从文本中提取粉丝数
    // 格式可能是 "1.2K followers" 或 "1,234 followers"
    const match = text.match(/([\d,]+\.?\d*[KkMm]?)\s*(followers|关注者)/i);
    if (match) {
      return this.parseCount(match[1]);
    }
    return 0;
  }

  /**
   * 提取互动数据
   */
  private extractEngagement(element: Element): TweetEngagement {
    const engagementEls = element.querySelectorAll(CONFIG.SELECTORS.ENGAGEMENT);
    const engagement: TweetEngagement = {
      replies: 0,
      retweets: 0,
      likes: 0,
      views: 0,
    };

    engagementEls.forEach((el) => {
      const label = el.getAttribute('aria-label') || '';
      const count = this.parseCount(label);

      if (label.toLowerCase().includes('repl')) {
        engagement.replies = count;
      } else if (label.toLowerCase().includes('retweet')) {
        engagement.retweets = count;
      } else if (label.toLowerCase().includes('like')) {
        engagement.likes = count;
      } else if (label.toLowerCase().includes('view')) {
        engagement.views = count;
      }
    });

    return engagement;
  }

  /**
   * 解析数量（支持 K/M 后缀）
   */
  private parseCount(label: string): number {
    const match = label.match(/[\d,]+\.?\d*/);
    if (!match) return 0;

    const numStr = match[0].replace(/,/g, '');
    const num = parseFloat(numStr);

    const lowerLabel = label.toLowerCase();
    const multiplier = lowerLabel.includes('k') ? 1000 : lowerLabel.includes('m') ? 1000000 : 1;

    return Math.floor(num * multiplier);
  }

  /**
   * 提取时间戳
   */
  private extractTimestamp(element: Element): string {
    const timeEl = element.querySelector('time');
    return timeEl?.getAttribute('datetime') || new Date().toISOString();
  }

  /**
   * 提取推文 URL
   */
  private extractUrl(element: Element): string {
    const link = element.querySelector('a[href*="/status/"]');
    const href = link?.getAttribute('href');
    return href ? `https://x.com${href}` : '';
  }

  /**
   * 检测推文类型
   */
  private detectType(element: Element): TweetType {
    const text = element.textContent || '';

    // 检查转推
    for (const keyword of RETWEET_KEYWORDS) {
      if (text.includes(keyword)) return 'retweet';
    }

    // 检查回复
    for (const keyword of REPLY_KEYWORDS) {
      if (text.includes(keyword)) return 'reply';
    }

    // 检查引用推文
    if (element.querySelector('[data-testid="tweet"] [data-testid="tweet"]')) {
      return 'quote';
    }

    return 'original';
  }

  /**
   * 提取媒体文件
   */
  private extractMedia(element: Element): string[] {
    const mediaEls = element.querySelectorAll(CONFIG.SELECTORS.MEDIA);
    return Array.from(mediaEls)
      .map((el) => el.getAttribute('src'))
      .filter((src): src is string => !!src);
  }

  /**
   * 提取外部链接
   */
  private extractLinks(element: Element): string[] {
    const linkEls = element.querySelectorAll(CONFIG.SELECTORS.LINK);
    return Array.from(linkEls)
      .map((el) => el.getAttribute('href'))
      .filter((href): href is string => !!href && href.startsWith('http'));
  }
}
