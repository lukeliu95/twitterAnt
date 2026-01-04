// Content Script
import { Tweet } from '../types';
import { SignalIndicatorManager } from './SignalIndicatorManager';
import { FocusModeController } from './FocusModeController';
import { TimelineCollector } from './TimelineCollector';
import { TimelinePromptManager } from './TimelinePromptManager';

// 导入详细卡片样式
import './signal-card-styles.css';

// Sidebar Manager to handle iframe injection
class SidebarManager {
  private iframe: HTMLIFrameElement | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.init();
  }

  init() {
    // Check saved state
    chrome.storage.local.get(['sidebarVisible'], (result) => {
      if (result.sidebarVisible) {
        this.show();
      }
    });

    // Listen for toggle message
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'TOGGLE_SIDEBAR') {
        this.toggle();
        sendResponse({ success: true }); // Respond to acknowledge receipt
      } else if (message.type === 'SHOW_SIDEBAR') {
        // 显示侧边栏，可选指定视图
        this.show();
        // 如果指定了视图，通知侧边栏切换视图
        if (message.data && message.data.view) {
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'SWITCH_SIDEBAR_VIEW',
              data: { view: message.data.view }
            }).catch(() => {});
          }, 100);
        }
        sendResponse({ success: true });
      } else if (message.type === 'SHOW_SETTINGS_FOR_ANALYSIS') {
        // 显示侧边栏用于查看分析进度
        if (!this.isVisible) {
          this.show();
        }
        sendResponse({ success: true });
      }
      return true;
    });

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      // Security check: ensure message is from our iframe
      // In production, you might want to check origin, but extension iframes have chrome-extension:// origin
      if (event.data.source === 'tsf-sidebar' && event.data.type === 'CLOSE_SIDEBAR') {
        this.hide();
      }
    });
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (!this.iframe) {
      this.createIframe();
    }
    if (this.iframe) {
      this.iframe.style.transform = 'translateX(0)';
      this.isVisible = true;

      // Shift body content to make room for sidebar
      document.body.style.transition = 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      document.body.style.marginRight = '420px';

      chrome.storage.local.set({ sidebarVisible: true });
    }
  }

  hide() {
    if (this.iframe) {
      this.iframe.style.transform = 'translateX(100%)';
      this.isVisible = false;

      // Reset body content
      document.body.style.marginRight = '0px';

      chrome.storage.local.set({ sidebarVisible: false });
    }
  }

  createIframe() {
    this.iframe = document.createElement('iframe');
    this.iframe.src = chrome.runtime.getURL('src/sidebar/index.html');
    this.iframe.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      border: none;
      z-index: 2147483647;
      box-shadow: -4px 0 16px rgba(0,0,0,0.1);
      background: white;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(100%);
    `;
    document.body.appendChild(this.iframe);
  }
}

class TweetCapture {
  private observer: MutationObserver | null = null;
  private capturedTweets: Set<string> = new Set();
  private analyzedTweets: Set<string> = new Set(); // 已分析的推文 ID
  private batchQueue: Partial<Tweet>[] = [];
  private BATCH_SIZE = 20; // 小批次分析 - 累积到 20 条就发送（渐进式分析）
  private LIKES_BATCH_SIZE = 100; // Likes 页面的批量大小
  private likesQueue: Partial<Tweet>[] = []; // Likes 专用队列
  private collectedLikesCount = 0; // 已收集的 likes 数量
  private isAutoScrolling: boolean = false; // 是否正在自动滚动
  private scrollInterval: NodeJS.Timeout | null = null; // 滚动定时器
  private scrollAttempts = 0; // 滚动尝试次数
  private maxScrollAttempts = 50; // 最大滚动次数
  private hasSentLikesForAnalysis: boolean = false; // 是否已发送 likes 用于分析
  private isCollectingForAnalysis: boolean = false; // 是否正在收集用于分析
  private lastSendTime: number = 0; // 上次发送时间
  private sendCooldown: number = 5000; // 发送冷却时间 5 秒（加快分析速度）
  private hasSentInitialBatch: boolean = false; // 是否已发送初始批次
  private paused: boolean = false; // 是否暂停捕获

  // 新增：信号统计
  private signalStats = {
    total: 0,      // 总信号数
    highValue: 0,  // 高价值信号数 (score >= 85)
    mediumValue: 0 // 中价值信号数 (score 70-84)
  };

  constructor() {
    this.loadAnalyzedTweets();
    this.start();
  }

  /**
   * 加载已分析的推文列表
   */
  private loadAnalyzedTweets() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['analyzedTweetIds'], (result) => {
        if (result.analyzedTweetIds && Array.isArray(result.analyzedTweetIds)) {
          this.analyzedTweets = new Set(result.analyzedTweetIds);
          console.log(`TSF: Loaded ${this.analyzedTweets.size} analyzed tweet IDs`);
        }
      });
    }
  }

  /**
   * 保存已分析的推文列表
   */
  private saveAnalyzedTweets() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const idsArray = Array.from(this.analyzedTweets);
      // 只保留最近的 10000 条，避免存储过大
      const recentIds = idsArray.slice(-10000);
      chrome.storage.local.set({ analyzedTweetIds: recentIds });
    }
  }

  /**
   * 更新信号统计（新增）
   */
  updateSignalStats(score: number) {
    this.signalStats.total++;

    if (score >= 85) {
      this.signalStats.highValue++;
    } else if (score >= 70) {
      this.signalStats.mediumValue++;
    }

    // 保存到 storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ tsfSignalStats: this.signalStats });
    }

    // 通知侧边栏更新统计
    chrome.runtime.sendMessage({
      type: 'SIGNAL_STATS_UPDATED',
      data: this.signalStats
    }).catch(() => {});
  }

  // Start listening
  start() {
    console.log('TSF Content Script Started');

    // Attempt to detect current user handle periodically
    this.detectCurrentUser();

    // 先收集页面上已存在的推文
    setTimeout(() => {
      this.collectExistingTweets();
    }, 1000);

    // Listen for DOM mutations
    this.observer = new MutationObserver((mutations) => {
      this.detectNewTweets(mutations);
    });

    // Target the primary column (Twitter feed)
    // Note: Twitter's DOM is complex and class names change. data-testid is more reliable.
    const feedContainer = document.querySelector('[data-testid="primaryColumn"]');
    if (feedContainer) {
      this.observer.observe(feedContainer, {
        childList: true,
        subtree: true
      });
      console.log('TSF: Observing feed container');
    } else {
      // Fallback: observe body if feed container not found immediately
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log('TSF: Observing body (fallback)');
    }

    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'START_LIKES_COLLECTION') {
        this.startAutoScroll();
        sendResponse({ success: true });
      } else if (message.type === 'STOP_LIKES_COLLECTION') {
        this.stopAutoScroll();
        sendResponse({ success: true });
      }
      return true;
    });

    // 监听时间线收集请求
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'START_TIMELINE_COLLECTION') {
        this.handleTimelineCollection(message.data);
        sendResponse({ success: true });
      }
      return true;
    });

    // 监听暂停/恢复捕获请求
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'PAUSE_TWEET_CAPTURE') {
        this.pauseCapture();
        sendResponse({ success: true });
      } else if (message.type === 'RESUME_TWEET_CAPTURE') {
        this.resumeCapture();
        sendResponse({ success: true });
      }
      return true;
    });

    // 检查是否在 likes 页面
    this.checkLikesPageAndStartScroll();

    // 检查是否有待处理的时间线分析
    this.checkPendingTimelineAnalysis();
  }

  /**
   * 检查是否有待处理的时间线分析（通常发生在跳转到主页后）
   */
  private checkPendingTimelineAnalysis() {
    const isOnHomepage = window.location.pathname === '/home' ||
                          window.location.pathname === '/';

    if (isOnHomepage) {
      // 延迟检查，确保页面完全加载
      setTimeout(() => {
        try {
          chrome.storage.local.get(['pendingTimelineAnalysis'], (result) => {
            if (result.pendingTimelineAnalysis) {
              console.log('TSF: Found pending timeline analysis, starting now...');
              // 清除标志
              chrome.storage.local.remove(['pendingTimelineAnalysis']);
              
              // 发送消息显示提示，而不是直接开始
              window.postMessage({ type: 'SHOW_TIMELINE_PROMPT' }, '*');
              // 同时通过 chrome.runtime 发送，确保 PromptManager 收到
              chrome.runtime.sendMessage({ type: 'SHOW_TIMELINE_PROMPT' }).catch(() => {});
            }
          });
        } catch (err) {
          // 忽略上下文失效错误
          if (err instanceof Error && !err.message.includes('Extension context invalidated')) {
            console.error('TSF: Check pending analysis error:', err);
          }
        }
      }, 1000);
    }
  }

  /**
   * 处理时间线收集请求
   */
  private handleTimelineCollection(data: { targetCount?: number }) {
    // 从 storage 获取用户设置的收集条数
    chrome.storage.local.get(['tsfCollectionCount'], (result) => {
      const userTargetCount = result.tsfCollectionCount || 100;
      const targetCount = data?.targetCount || userTargetCount;
      this.startTimelineCollection(targetCount);
    });
  }

  /**
   * 开始时间线收集
   */
  private startTimelineCollection(targetCount: number) {

    // 安全的消息发送包装函数
    const safeSendMessage = (message: any) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage(message).catch((err) => {
            // 忽略上下文失效错误
            if (err.message && !err.message.includes('Extension context invalidated')) {
              console.error('TSF: Send message error:', err);
            }
          });
        }
      } catch (err) {
        // 忽略上下文失效错误
        if (err instanceof Error && !err.message.includes('Extension context invalidated')) {
          console.error('TSF: Send message error:', err);
        }
      }
    };

    // 创建时间线收集器
    const collector = new TimelineCollector();

    // 开始收集
    collector.collectTimeline(targetCount).then((tweets) => {
      console.log(`TSF: Timeline collection complete, collected ${tweets.length} tweets`);

      // 保存收集的推文
      try {
        chrome.storage.local.set({ collectedTimeline: tweets }, () => {
          // 立即发送分析请求到 background
          safeSendMessage({
            type: 'ANALYZE_TWEETS',
            data: tweets
          });
        });
      } catch (err) {
        // 忽略上下文失效错误
        if (err instanceof Error && !err.message.includes('Extension context invalidated')) {
          console.error('TSF: Storage error:', err);
        }
      }
    }).catch((error) => {
      // 忽略上下文失效错误
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        console.log('TSF: Collection cancelled due to page navigation');
        return;
      }
      console.error('TSF: Timeline collection failed:', error);

      // 通知分析完成（即使失败也通知，避免界面一直卡住）
      safeSendMessage({
        type: 'TIMELINE_ANALYSIS_COMPLETE'
      });
    });
  }

  // 检查当前是否在 likes 页面，如果是则开始自动滚动
  checkLikesPageAndStartScroll() {
    if (window.location.pathname.endsWith('/likes')) {
      setTimeout(() => {
        this.startAutoScroll();
      }, 2000);
    }
  }

  detectCurrentUser() {
    // Try to find the profile link in the side navigation
    // usually: <a href="/handle" aria-label="Profile" ...>
    // or look for the account switcher button at the bottom left
    
    const findHandle = () => {
      // Strategy 1: Look for Profile link in navigation
      const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        if (href && href.startsWith('/')) {
          const handle = href.substring(1);
          console.log('TSF: Detected user handle from nav:', handle);
          this.saveUserHandle(handle);
          return true;
        }
      }

      // Strategy 2: Look for Account Switcher
      const accountSwitcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (accountSwitcher) {
        // usually contains @handle text
        const text = accountSwitcher.textContent;
        const match = text?.match(/@(\w+)/);
        if (match) {
           console.log('TSF: Detected user handle from switcher:', match[1]);
           this.saveUserHandle(match[1]);
           return true;
        }
      }
      
      return false;
    };

    // Retry a few times if not found immediately (SPA loading)
    let attempts = 0;
    const interval = setInterval(() => {
      if (findHandle() || attempts > 10) {
        clearInterval(interval);
      }
      attempts++;
    }, 2000);
  }

  saveUserHandle(handle: string) {
    chrome.storage.local.set({ currentUserHandle: handle });
  }

  /**
   * 暂停推文捕获
   */
  pauseCapture() {
    this.paused = true;
    console.log('TSF: Tweet capture paused');
  }

  /**
   * 恢复推文捕获
   */
  resumeCapture() {
    this.paused = false;
    console.log('TSF: Tweet capture resumed');
  }

  detectNewTweets(mutations: MutationRecord[]) {
    // 如果暂停捕获，直接返回
    if (this.paused) {
      return;
    }

    // 检查是否在 likes 页面
    const isLikesPage = window.location.pathname.endsWith('/likes');

    // 如果已经发送过分析数据，不再收集 likes
    if (isLikesPage && this.hasSentLikesForAnalysis) {
      return;
    }

    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && this.isTweetElement(node)) {
          // Check if it's a main post or reply
          if (this.isReply(node)) return;

          // It might be the tweet itself or a container containing the tweet
          const tweetNode = node.querySelector('[data-testid="tweet"]') || node;
          if (this.isTweetElement(tweetNode as HTMLElement)) {
             const tweetData = this.extractTweetData(tweetNode as HTMLElement);
             if (tweetData && tweetData.tweetId && !this.capturedTweets.has(tweetData.tweetId)) {
               // 根据页面类型使用不同的队列
               if (isLikesPage && this.isCollectingForAnalysis) {
                 this.likesQueue.push(tweetData);
                 this.collectedLikesCount++;
                 console.log(`TSF: Captured like ${this.collectedLikesCount}/100:`, tweetData.tweetId);

                 // 发送收集进度更新
                 chrome.runtime.sendMessage({
                   type: 'LIKES_COLLECTION_PROGRESS',
                   data: {
                     collected: this.collectedLikesCount,
                     total: this.LIKES_BATCH_SIZE
                   }
                 }).catch(() => {}); // 忽略错误
               } else if (!isLikesPage) {
                 this.batchQueue.push(tweetData);
               }
               this.capturedTweets.add(tweetData.tweetId);
             }
          }
        } else if (node instanceof HTMLElement) {
             // Deep check for tweets inside added nodes
             const tweets = node.querySelectorAll('[data-testid="tweet"]');
             tweets.forEach(tweetNode => {
                 // Check if it's a main post or reply
                 if (this.isReply(tweetNode as HTMLElement)) return;

                 const tweetData = this.extractTweetData(tweetNode as HTMLElement);
                 if (tweetData && tweetData.tweetId && !this.capturedTweets.has(tweetData.tweetId)) {
                    // 根据页面类型使用不同的队列
                    if (isLikesPage && this.isCollectingForAnalysis) {
                      this.likesQueue.push(tweetData);
                      this.collectedLikesCount++;
                      console.log(`TSF: Captured like ${this.collectedLikesCount}/100:`, tweetData.tweetId);

                      // 发送收集进度更新
                      chrome.runtime.sendMessage({
                        type: 'LIKES_COLLECTION_PROGRESS',
                        data: {
                          collected: this.collectedLikesCount,
                          total: this.LIKES_BATCH_SIZE
                        }
                      }).catch(() => {}); // 忽略错误
                    } else if (!isLikesPage) {
                      this.batchQueue.push(tweetData);
                    }
                    this.capturedTweets.add(tweetData.tweetId);
                 }
             });
        }
      });
    });

    // 根据页面类型检查是否需要发送批量
    if (isLikesPage && this.isCollectingForAnalysis) {
      if (this.likesQueue.length >= this.LIKES_BATCH_SIZE && !this.hasSentLikesForAnalysis) {
        this.sendLikesBatch();
      }
    } else if (!isLikesPage) {
      // 渐进式分析：达到批次大小就立即发送，不等待
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        console.log(`TSF: 渐进式分析 - 已收集 ${this.batchQueue.length} 条，立即发送分析`);
        this.sendBatch();
      }
    }
  }

  isReply(element: HTMLElement): boolean {
    // 1. Check for "Replying to" text
    // Usually in a div with dir="ltr" above the tweet text
    const textContent = element.innerText || '';
    if (textContent.includes('Replying to')) {
        // Double check specific DOM structure if needed, but text heuristic is often enough for simple extension
        // A more robust way: check for the specific user link in the replying-to section
        // const replyContext = element.querySelector('[data-testid="socialContext"]'); 
        // Replies usually have a line like "Replying to @..." which might not be in socialContext but in the tweet header
        // Let's look for the specific "Replying to" element
        const replyIndicator = Array.from(element.querySelectorAll('div')).find(div => div.textContent?.startsWith('Replying to @'));
        if (replyIndicator) return true;
    }
    
    return false;
  }

  isTweetElement(node: HTMLElement): boolean {
    return node.getAttribute?.('data-testid') === 'tweet' || node.querySelector?.('[data-testid="tweet"]') !== null;
  }

  extractTweetData(element: HTMLElement): Partial<Tweet> | null {
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
            views: 0 // Views are harder to get sometimes
          },
          media: [], // Todo: implement media extraction
          links: [], // Todo: implement link extraction
          tweetUrl: `https://twitter.com/i/status/${tweetId}`,
          capturedAt: new Date().toISOString()
        };
    } catch (e) {
        console.error('TSF: Failed to extract tweet', e);
        return null;
    }
  }

  sendBatch() {
    // 检查冷却时间
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSendTime;

    // 如果距离上次发送不足冷却时间，跳过
    if (timeSinceLastSend < this.sendCooldown && this.hasSentInitialBatch) {
      console.log(`TSF: 冷却中，距离上次发送 ${timeSinceLastSend}ms，需要 ${this.sendCooldown}ms`);
      return;
    }

    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);

    // 过滤掉已分析的推文（性能优化）
    const unanalyzedBatch = batch.filter(tweet => {
      return tweet.tweetId && !this.analyzedTweets.has(tweet.tweetId);
    });

    if (unanalyzedBatch.length === 0) {
      console.log('TSF: All tweets in batch already analyzed, skipping');
      return;
    }

    // Determine context based on URL
    const isLikesPage = window.location.pathname.endsWith('/likes');
    const messageType = isLikesPage ? 'EXTRACT_INTERESTS' : 'ANALYZE_TWEETS';

    console.log(`TSF: Sending batch (${messageType}), total: ${batch.length}, new: ${unanalyzedBatch.length}`);

    // 标记这些推文为已分析
    unanalyzedBatch.forEach(tweet => {
      if (tweet.tweetId) {
        this.analyzedTweets.add(tweet.tweetId);
      }
    });

    // 保存已分析列表
    this.saveAnalyzedTweets();

    this.lastSendTime = now;
    this.hasSentInitialBatch = true;

    chrome.runtime.sendMessage({
      type: messageType,
      data: unanalyzedBatch
    });
  }

  /**
   * 发送 Likes 批量数据（用于兴趣分析）
   */
  sendLikesBatch() {
    // 防止重复发送
    if (this.hasSentLikesForAnalysis) {
      console.log('TSF: Already sent likes for analysis, skipping');
      return;
    }

    const batch = this.likesQueue.splice(0, this.LIKES_BATCH_SIZE);

    console.log(`TSF: Sending ${batch.length} likes for interest analysis`);

    // 标记为已发送
    this.hasSentLikesForAnalysis = true;
    this.isCollectingForAnalysis = false;

    // 停止自动滚动
    this.stopAutoScroll();

    // 保存完成标记到 storage
    chrome.storage.local.set({ likesCollected: true });

    // 通知收集完成
    chrome.runtime.sendMessage({
      type: 'LIKES_COLLECTION_COMPLETE'
    });

    chrome.runtime.sendMessage({
      type: 'EXTRACT_INTERESTS',
      data: batch
    });

    console.log('TSF: Likes data sent, collection complete');
  }

  /**
   * 初始化时收集页面上已存在的推文
   * 用于处理页面已加载的情况
   */
  collectExistingTweets() {
    const isLikesPage = window.location.pathname.endsWith('/likes');

    // 如果已经发送过分析数据，跳过
    if (isLikesPage && this.hasSentLikesForAnalysis) {
      return;
    }

    // 查找所有已存在的推文
    const tweetElements = document.querySelectorAll('[data-testid="tweet"]');

    console.log(`TSF: Found ${tweetElements.length} existing tweets on page`);

    tweetElements.forEach((tweetNode) => {
      const element = tweetNode as HTMLElement;

      // 跳过回复
      if (this.isReply(element)) return;

      const tweetData = this.extractTweetData(element);
      if (tweetData && tweetData.tweetId && !this.capturedTweets.has(tweetData.tweetId)) {
        // 根据页面类型使用不同的队列
        if (isLikesPage && this.isCollectingForAnalysis) {
          this.likesQueue.push(tweetData);
          this.collectedLikesCount++;
          console.log(`TSF: Collected existing like ${this.collectedLikesCount}/100:`, tweetData.tweetId);
        } else if (!isLikesPage) {
          this.batchQueue.push(tweetData);
        }
        this.capturedTweets.add(tweetData.tweetId);
      }
    });

    // 如果收集到足够的数据，立即发送
    if (isLikesPage && this.isCollectingForAnalysis && this.likesQueue.length >= this.LIKES_BATCH_SIZE && !this.hasSentLikesForAnalysis) {
      this.sendLikesBatch();
    } else if (!isLikesPage && this.batchQueue.length >= this.BATCH_SIZE) {
      this.sendBatch();
    }
  }

  // Helpers
  getTweetId(element: HTMLElement): string | undefined {
    const link = element.querySelector('a[href*="/status/"]');
    return (link as HTMLAnchorElement)?.href.match(/status\/(\d+)/)?.[1];
  }

  getAuthorHandle(element: HTMLElement): string {
    const el = element.querySelector('[data-testid="User-Name"] a[href^="/"]');
    return el?.textContent?.replace('@', '') || '';
  }

  getAuthorName(element: HTMLElement): string {
    const el = element.querySelector('[data-testid="User-Name"] span');
    return el?.textContent || '';
  }

  getContent(element: HTMLElement): string {
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

  getTimestamp(element: HTMLElement): string {
    const timeEl = element.querySelector('time');
    return timeEl?.getAttribute('datetime') || new Date().toISOString();
  }

  getEngagement(element: HTMLElement, type: string): number {
    const testId = type; // reply, retweet, like
    // Selector might need adjustment based on exact Twitter DOM
    // Usually aria-label contains numbers or the text content
    const el = element.querySelector(`[data-testid="${testId}"]`);
    return this.parseEngagementNumber(el?.textContent || '0');
  }

  parseEngagementNumber(text: string): number {
    if (!text) return 0;
    const match = text.match(/([\d.]+)([KMB]?)/);
    if (!match) return 0;

    const num = parseFloat(match[1]);
    const suffix = match[2];
    const multiplier: Record<string, number> = { K: 1000, M: 1000000, B: 1000000000 };
    return Math.round(num * (multiplier[suffix] || 1));
  }

  /**
   * 开始自动滚动以收集更多 Likes 数据
   */
  startAutoScroll() {
    if (this.isAutoScrolling) {
      console.log('TSF: Already auto-scrolling');
      return;
    }

    // 如果已经发送过数据，不再开始
    if (this.hasSentLikesForAnalysis) {
      console.log('TSF: Already sent likes for analysis, not starting scroll');
      return;
    }

    const isLikesPage = window.location.pathname.endsWith('/likes');
    if (!isLikesPage) {
      console.log('TSF: Not on likes page, skipping auto-scroll');
      return;
    }

    this.isAutoScrolling = true;
    this.isCollectingForAnalysis = true;
    this.scrollAttempts = 0;
    console.log('TSF: Starting auto-scroll to collect likes');

    // 先收集已存在的推文
    this.collectExistingTweets();

    // 检查是否已经收集足够
    if (this.likesQueue.length >= this.LIKES_BATCH_SIZE) {
      console.log('TSF: Already have enough likes, sending immediately');
      this.sendLikesBatch();
      return;
    }

    // 开始滚动
    this.scrollInterval = setInterval(() => {
      this.performScroll();
    }, 1500); // 每1.5秒滚动一次
  }

  /**
   * 停止自动滚动
   */
  stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
    this.isAutoScrolling = false;
    console.log('TSF: Stopped auto-scroll');

    // 如果有数据且还没发送，发送数据
    if (this.likesQueue.length > 0 && !this.hasSentLikesForAnalysis && this.isCollectingForAnalysis) {
      console.log('TSF: Sending collected likes before stopping');
      this.sendLikesBatch();
    }
  }

  /**
   * 执行滚动操作
   */
  performScroll() {
    // 如果已经发送过数据，停止滚动
    if (this.hasSentLikesForAnalysis) {
      console.log('TSF: Already sent likes, stopping scroll');
      this.stopAutoScroll();
      return;
    }

    // 检查是否已收集足够的数据
    if (this.collectedLikesCount >= this.LIKES_BATCH_SIZE) {
      console.log(`TSF: Collected ${this.collectedLikesCount} likes, stopping scroll`);
      this.stopAutoScroll();
      return;
    }

    // 检查是否超过最大滚动次数
    if (this.scrollAttempts >= this.maxScrollAttempts) {
      console.log(`TSF: Max scroll attempts reached, stopping scroll`);
      this.stopAutoScroll();
      return;
    }

    this.scrollAttempts++;

    // 执行平滑滚动
    const scrollHeight = document.documentElement.scrollHeight;
    const currentScroll = window.scrollY;
    const windowHeight = window.innerHeight;

    // 滚动到页面底部附近
    window.scrollTo({
      top: scrollHeight,
      behavior: 'smooth'
    });

    console.log(`TSF: Scroll attempt ${this.scrollAttempts}/${this.maxScrollAttempts}, collected: ${this.collectedLikesCount}`);

    // 如果滚动到底部且没有新内容，停止滚动
    setTimeout(() => {
      const newScrollHeight = document.documentElement.scrollHeight;
      if (newScrollHeight === scrollHeight && currentScroll + windowHeight >= scrollHeight - 100) {
        console.log('TSF: Reached bottom of page, stopping scroll');
        this.stopAutoScroll();
      }
    }, 1000);
  }
}

// Initialize
const indicatorManager = new SignalIndicatorManager();
const focusModeController = new FocusModeController();
const tweetCapture = new TweetCapture(); // 保存引用以便访问
new SidebarManager();
new TimelinePromptManager();

// 将 focusModeController 暴露到全局，供其他模块访问
(window as any).focusModeController = focusModeController;
(window as any).tweetCapture = tweetCapture; // 暴露 tweetCapture

// 初始化专注模式控制器
focusModeController.init();

// Listen for signals from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'NEW_SIGNAL') {
    indicatorManager.addSignal(message.data);
    // 更新信号统计
    if (message.data.score) {
      tweetCapture.updateSignalStats(message.data.score);
    }
    // 应用专注模式到新添加信号的推文
    focusModeController.applyToTweets();
    sendResponse({ success: true });
  } else if (message.type === 'REMOVE_SIGNAL') {
    indicatorManager.removeIndicator(message.data.tweetId);
    focusModeController.applyToTweets();
    sendResponse({ success: true });
  } else if (message.type === 'CLEAR_ALL_SIGNALS') {
    indicatorManager.clear();
    focusModeController.applyToTweets();
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});
