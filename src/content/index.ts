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
      }
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
  private batchQueue: Partial<Tweet>[] = [];
  private BATCH_SIZE = 5; // Reduced for testing

  constructor() {
    this.start();
  }

  // Start listening
  start() {
    console.log('TSF Content Script Started');
    
    // Attempt to detect current user handle periodically
    this.detectCurrentUser();

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

  detectNewTweets(mutations: MutationRecord[]) {
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
               this.batchQueue.push(tweetData);
               this.capturedTweets.add(tweetData.tweetId);
               console.log('TSF: Captured tweet', tweetData.tweetId);
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
    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    
    // Determine context based on URL
    const isLikesPage = window.location.pathname.endsWith('/likes');
    const messageType = isLikesPage ? 'EXTRACT_INTERESTS' : 'ANALYZE_TWEETS';

    console.log(`TSF: Sending batch (${messageType})`, batch.length);
    
    chrome.runtime.sendMessage({
      type: messageType,
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
