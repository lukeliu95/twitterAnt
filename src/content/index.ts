// Content Script
import { Tweet } from '../types';

// Sidebar Manager to handle iframe injection
class SidebarManager {
  private iframe: HTMLIFrameElement | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.init();
  }

  init() {
    // Listen for toggle message
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'TOGGLE_SIDEBAR') {
        this.toggle();
        sendResponse({ success: true }); // Respond to acknowledge receipt
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
    }
  }

  hide() {
    if (this.iframe) {
      this.iframe.style.transform = 'translateX(100%)';
      this.isVisible = false;
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
  private batchQueue: Partial<Tweet>[] = [];
  private BATCH_SIZE = 5; // Reduced for testing

  constructor() {
    this.start();
  }

  // Start listening
  start() {
    console.log('TSF Content Script Started');
    
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
  }

  detectNewTweets(mutations: MutationRecord[]) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && this.isTweetElement(node)) {
          // It might be the tweet itself or a container containing the tweet
          const tweetNode = node.querySelector('[data-testid="tweet"]') || node;
          if (this.isTweetElement(tweetNode as HTMLElement)) {
             const tweetData = this.extractTweetData(tweetNode as HTMLElement);
             if (tweetData && tweetData.tweetId && !this.capturedTweets.has(tweetData.tweetId)) {
               this.batchQueue.push(tweetData);
               this.capturedTweets.add(tweetData.tweetId);
               console.log('TSF: Captured tweet', tweetData.tweetId);
             }
          }
        } else if (node instanceof HTMLElement) {
             // Deep check for tweets inside added nodes
             const tweets = node.querySelectorAll('[data-testid="tweet"]');
             tweets.forEach(tweetNode => {
                 const tweetData = this.extractTweetData(tweetNode as HTMLElement);
                 if (tweetData && tweetData.tweetId && !this.capturedTweets.has(tweetData.tweetId)) {
                    this.batchQueue.push(tweetData);
                    this.capturedTweets.add(tweetData.tweetId);
                    console.log('TSF: Captured tweet', tweetData.tweetId);
                 }
             });
        }
      });
    });

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.sendBatch();
    }
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
    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    console.log('TSF: Sending batch', batch);
    
    chrome.runtime.sendMessage({
      type: 'ANALYZE_TWEETS',
      data: batch
    });
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
    return element.querySelector('[data-testid="tweetText"]')?.textContent || '';
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
}

// Initialize
new TweetCapture();
new SidebarManager();
