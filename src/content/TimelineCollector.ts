// TimelineCollector - 时间线收集器
// 自动收集用户主页时间线的推文
import { Tweet } from '../types';

export interface CollectionProgress {
  phase: 'idle' | 'collecting' | 'analyzing' | 'completed' | 'error';
  collected: number;
  target: number;
  message: string;
}

export class TimelineCollector {
  private collectedTweets: Map<string, Partial<Tweet>> = new Map();
  private isCollecting: boolean = false;
  private scrollInterval: NodeJS.Timeout | null = null;
  private scrollAttempts: number = 0;
  private maxScrollAttempts: number = 30;
  private progressCallback: ((progress: CollectionProgress) => void) | null = null;

  /**
   * 开始收集时间线
   */
  async collectTimeline(
    targetCount: number = 100,
    progressCallback?: (progress: CollectionProgress) => void
  ): Promise<Partial<Tweet>[]> {
    if (this.isCollecting) {
      console.log('TimelineCollector: Already collecting');
      return [];
    }

    this.isCollecting = true;
    this.progressCallback = progressCallback || null;
    this.collectedTweets.clear();
    this.scrollAttempts = 0;

    // 检查当前页面
    const isOnHomepage = window.location.pathname === '/home' ||
                          window.location.pathname === '/';

    if (!isOnHomepage) {
      // 导航到主页
      window.location.href = '/home';
      // 等待页面加载
      await this.waitForPageLoad();
    }

    // 报告开始收集
    this.reportProgress({
      phase: 'collecting',
      collected: 0,
      target: targetCount,
      message: '正在收集时间线...'
    });

    // 先收集已存在的推文
    this.collectExistingTweets();

    // 开始滚动收集
    await this.startAutoScroll(targetCount);

    // 完成收集
    const tweets = Array.from(this.collectedTweets.values());

    this.reportProgress({
      phase: 'completed',
      collected: tweets.length,
      target: targetCount,
      message: `收集完成！共收集 ${tweets.length} 条推文`
    });

    this.isCollecting = false;

    // 收集完成后，滚动到页面顶部，方便用户从最新内容开始查看
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    return tweets;
  }

  /**
   * 等待页面加载
   */
  private async waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        // 额外等待 Twitter 动态内容加载
        setTimeout(resolve, 2000);
      } else {
        window.addEventListener('load', () => {
          setTimeout(resolve, 2000);
        });
      }
    });
  }

  /**
   * 收集已存在的推文
   */
  private collectExistingTweets() {
    const tweetElements = document.querySelectorAll('[data-testid="tweet"]');

    tweetElements.forEach((tweetElement) => {
      const element = tweetElement as HTMLElement;
      const tweetData = this.extractTweetData(element);

      if (tweetData && tweetData.tweetId && !this.collectedTweets.has(tweetData.tweetId)) {
        this.collectedTweets.set(tweetData.tweetId, tweetData);
      }
    });

    this.reportProgress({
      phase: 'collecting',
      collected: this.collectedTweets.size,
      target: this.collectedTweets.size + 50, // 临时目标
      message: `已收集 ${this.collectedTweets.size} 条...`
    });
  }

  /**
   * 开始自动滚动
   */
  private async startAutoScroll(targetCount: number): Promise<void> {
    return new Promise((resolve) => {
      this.scrollInterval = setInterval(() => {
        const currentCount = this.collectedTweets.size;

        // 检查是否达到目标
        if (currentCount >= targetCount) {
          console.log(`TimelineCollector: Collected ${currentCount} tweets, stopping`);
          this.stopAutoScroll();
          resolve();
          return;
        }

        // 检查是否超过最大滚动次数
        if (this.scrollAttempts >= this.maxScrollAttempts) {
          console.log(`TimelineCollector: Max scroll attempts reached`);
          this.stopAutoScroll();
          resolve();
          return;
        }

        this.scrollAttempts++;
        this.performScroll();

        // 检查是否到达底部
        setTimeout(() => {
          const scrollHeight = document.documentElement.scrollHeight;
          const currentScroll = window.scrollY;
          const windowHeight = window.innerHeight;

          if (currentScroll + windowHeight >= scrollHeight - 100) {
            console.log('TimelineCollector: Reached bottom');
            this.stopAutoScroll();
            resolve();
          }
        }, 1000);

        // 报告进度
        this.reportProgress({
          phase: 'collecting',
          collected: currentCount,
          target: targetCount,
          message: `正在收集... ${currentCount}/${targetCount}`
        });

      }, 1500); // 每1.5秒滚动一次
    });
  }

  /**
   * 执行滚动
   */
  private performScroll() {
    const scrollHeight = document.documentElement.scrollHeight;
    window.scrollTo({
      top: scrollHeight,
      behavior: 'smooth'
    });
  }

  /**
   * 停止自动滚动
   */
  private stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  /**
   * 提取推文数据
   */
  private extractTweetData(element: HTMLElement): Partial<Tweet> | null {
    try {
      const tweetId = this.getTweetId(element);
      if (!tweetId) return null;

      return {
        tweetId: tweetId,
        authorHandle: this.getAuthorHandle(element),
        authorName: this.getAuthorName(element),
        content: this.getContent(element),
        timestamp: this.getTimestamp(element),
        engagement: {
          replies: this.getEngagement(element, 'reply'),
          retweets: this.getEngagement(element, 'retweet'),
          likes: this.getEngagement(element, 'like'),
          views: this.getEngagement(element, 'view')
        },
        tweetUrl: `https://x.com/i/status/${tweetId}`,
        capturedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('TimelineCollector: Error extracting tweet:', error);
      return null;
    }
  }

  /**
   * 获取推文 ID
   */
  private getTweetId(element: HTMLElement): string | undefined {
    const link = element.querySelector('a[href*="/status/"]');
    return (link as HTMLAnchorElement)?.href.match(/status\/(\d+)/)?.[1];
  }

  /**
   * 获取作者 handle
   */
  private getAuthorHandle(element: HTMLElement): string {
    const el = element.querySelector('[data-testid="User-Name"] a[href^="/"]');
    return el?.textContent?.replace('@', '') || '';
  }

  /**
   * 获取作者名称
   */
  private getAuthorName(element: HTMLElement): string {
    const el = element.querySelector('[data-testid="User-Name"] span');
    return el?.textContent || '';
  }

  /**
   * 获取推文内容
   */
  private getContent(element: HTMLElement): string {
    // 尝试多种选择器以提高兼容性
    let content = element.querySelector('[data-testid="tweetText"]')?.textContent || '';

    // 如果没找到，尝试其他可能的选择器
    if (!content) {
      // 尝试通过 lang 属性查找
      const langDiv = element.querySelector('div[lang]');
      if (langDiv) {
        content = langDiv.textContent || '';
      }
    }

    // 如果还是没找到，尝试查找文章元素
    if (!content) {
      const article = element.closest('article');
      if (article) {
        const textDivs = article.querySelectorAll('div[lang], div[data-testid="tweetText"]');
        if (textDivs.length > 0) {
          content = Array.from(textDivs).map(div => div.textContent).join(' ').trim();
        }
      }
    }

    return content.trim();
  }

  /**
   * 获取时间戳
   */
  private getTimestamp(element: HTMLElement): string {
    const timeEl = element.querySelector('time');
    return timeEl?.getAttribute('datetime') || new Date().toISOString();
  }

  /**
   * 获取互动数据
   */
  private getEngagement(element: HTMLElement, type: string): number {
    const selector = `[data-testid="${type}"]`;
    const el = element.querySelector(selector);

    if (!el) return 0;

    const text = el.textContent || '';
    const match = text.match(/([\d.]+)([KMB]?)/);

    if (!match) return 0;

    const num = parseFloat(match[1]);
    const suffix = match[2];
    const multipliers: Record<string, number> = { K: 1000, M: 1000000, B: 1000000000 };
    return Math.round(num * (multipliers[suffix] || 1));
  }

  /**
   * 报告进度
   */
  private reportProgress(progress: CollectionProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }

    // 也发送到 chrome runtime
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'TIMELINE_COLLECTION_PROGRESS',
        data: progress
      }).catch(() => {});
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.stopAutoScroll();
    this.collectedTweets.clear();
    this.isCollecting = false;
  }
}
