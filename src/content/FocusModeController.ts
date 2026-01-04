// FocusModeController - 专注模式控制器
// 实现 Alan Cooper 风格的视觉弱化 + 模式切换
// UI 控制已移至侧边栏 FocusModeView，此处只保留逻辑

export interface FocusModeSettings {
  mode: 'focused' | 'balanced' | 'all';
  threshold: number; // 0-100
  shiftKeyActive: boolean;
}

export class FocusModeController {
  private settings: FocusModeSettings;
  private whitelistedTweets: Set<string> = new Set();
  private blurredCount: number = 0;
  private tweetScores: Record<string, number> = {};

  constructor() {
    // 从存储加载设置
    this.settings = {
      mode: 'all',
      threshold: 0,
      shiftKeyActive: false
    };
    this.init();
  }

  /**
   * 初始化控制器
   */
  async init() {
    // 加载设置和分数
    this.loadSettings();

    // 加载分数
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['allTweetScores'], (result) => {
        if (result.allTweetScores) {
          this.tweetScores = result.allTweetScores;
        }
        this.applyToTweets();
      });
    }

    // 加载白名单
    this.loadWhitelist();

    // 监听 Shift 键
    this.setupKeyboardListeners();

    // 监听来自侧边栏的消息
    this.setupMessageListeners();

    console.log('TSF: Focus Mode Controller initialized');
  }

  /**
   * 设置消息监听
   */
  private setupMessageListeners() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'SET_FOCUS_MODE') {
          this.settings = { ...this.settings, ...message.data };
          this.applyToTweets();
          this.notifyUpdate();
        } else if (message.type === 'UPDATE_TWEET_SCORES') {
          this.tweetScores = message.data;
          this.applyToTweets();
        } else if (message.type === 'RESET_FOCUS_MODE') {
          this.resetAll();
        }
      });
    }
  }

  /**
   * 通知侧边栏更新
   */
  private notifyUpdate() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'FOCUS_MODE_UPDATED',
        data: {
          blurredCount: this.blurredCount
        }
      }).catch(() => {});
    }
  }

  /**
   * 设置键盘监听
   */
  private setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift' && !this.settings.shiftKeyActive) {
        this.settings.shiftKeyActive = true;
        this.updateBlurredState();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.settings.shiftKeyActive = false;
        this.updateBlurredState();
      }
    });
  }

  /**
   * 设置模式
   */
  setMode(mode: 'focused' | 'balanced' | 'all') {
    this.settings.mode = mode;

    // 更新滑块值
    switch (mode) {
      case 'focused':
        this.settings.threshold = 70;
        break;
      case 'balanced':
        this.settings.threshold = 50;
        break;
      case 'all':
        this.settings.threshold = 0;
        break;
    }

    // 应用到推文并发送通知
    this.applyToTweets();

    // 保存设置
    this.saveSettings();
  }

  /**
   * 设置阈值
   */
  setThreshold(value: number) {
    this.settings.threshold = value;

    // 根据阈值自动更新模式
    if (value >= 70) {
      this.settings.mode = 'focused';
    } else if (value >= 50) {
      this.settings.mode = 'balanced';
    } else {
      this.settings.mode = 'all';
    }

    // 应用到推文并发送通知
    this.applyToTweets();

    // 保存设置
    this.saveSettings();
  }

  /**
   * 将逻辑应用到推文
   */
  public applyToTweets() {
    const tweets = document.querySelectorAll('[data-testid="tweet"]');
    this.blurredCount = 0;

    // 先从存储同步一次分数，确保获取到最新持久化的数据
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['allTweetScores'], (result) => {
        if (result.allTweetScores) {
          this.tweetScores = { ...this.tweetScores, ...result.allTweetScores };
        }
        this._executeApply(tweets);
      });
    } else {
      this._executeApply(tweets);
    }
  }

  /**
   * 真正的应用逻辑
   */
  private _executeApply(tweets: NodeListOf<Element>) {
    tweets.forEach((tweet) => {
      const tweetElement = tweet as HTMLElement;
      const tweetId = this.getTweetId(tweetElement);
      
      // Alan Cooper 设计原则：通过透明度弱化，而不是完全移除
      // 这样用户仍然能感觉到推文的存在，保持空间感
      let opacity = 1;

      // 检查是否在白名单
      if (tweetId && this.whitelistedTweets.has(tweetId)) {
        tweetElement.style.opacity = '1';
        tweetElement.style.filter = 'none';
        return;
      }

      // 暂时按住 Shift 键显示全部
      if (this.settings.shiftKeyActive) {
        tweetElement.style.opacity = '1';
        tweetElement.style.filter = 'none';
        return;
      }

      const score = this.getTweetScore(tweetElement);

      if (this.settings.mode === 'focused') {
        if (score === null || score < this.settings.threshold) {
          opacity = 0.15; // 几乎看不见
          this.blurredCount++;
        }
      } else if (this.settings.mode === 'balanced') {
        if (score !== null && score < this.settings.threshold) {
          opacity = 0.4; // 弱化显示
          this.blurredCount++;
        }
      }

      tweetElement.style.opacity = opacity.toString();
      tweetElement.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
    });

    this.notifyUpdate();
  }



  /**
   * 获取推文 ID
   */
  private getTweetId(tweet: HTMLElement): string {
    const link = tweet.querySelector('a[href*="/status/"]');
    const match = link?.getAttribute('href')?.match(/status\/(\d+)/);
    return match?.[1] || '';
  }

  /**
   * 获取推文分数
   */
  private getTweetScore(tweet: HTMLElement): number | null {
    const tweetId = this.getTweetId(tweet);
    if (tweetId && this.tweetScores[tweetId] !== undefined) {
      return this.tweetScores[tweetId];
    }

    // 备选：检查是否有信号卡片
    const signalCard = tweet.querySelector('.tsf-signal-card');
    if (signalCard) {
      const scoreAttr = signalCard.getAttribute('data-tsf-score');
      return scoreAttr ? parseInt(scoreAttr) : null;
    }
    return null;
  }

  /**
   * 更新弱化状态
   */
  private updateBlurredState() {
    this.applyToTweets();
  }

  /**
   * 添加到白名单
   */
  addToWhitelist(tweetId: string) {
    this.whitelistedTweets.add(tweetId);
    this.applyToTweets();
    this.saveWhitelist();
  }

  /**
   * 清除所有逻辑
   */
  resetAll() {
    const tweets = document.querySelectorAll('[data-testid="tweet"]');
    tweets.forEach((tweet) => {
      const tweetElement = tweet as HTMLElement;
      tweetElement.style.opacity = '1';
      tweetElement.style.filter = 'none';
    });
    this.blurredCount = 0;
    this.notifyUpdate();
  }

  /**
   * 获取当前设置
   */
  getSettings(): FocusModeSettings {
    return { ...this.settings };
  }

  /**
   * 获取弱化计数
   */
  getBlurredCount(): number {
    return this.blurredCount;
  }

  /**
   * 保存设置
   */
  private saveSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        tsfFocusSettings: this.settings
      });
    }
  }

  /**
   * 加载设置
   */
  private loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tsfFocusSettings'], (result) => {
        if (result.tsfFocusSettings) {
          this.settings = { ...this.settings, ...result.tsfFocusSettings };
        }
      });
    }
  }

  /**
   * 保存白名单
   */
  private saveWhitelist() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        tsfWhitelist: Array.from(this.whitelistedTweets)
      });
    }
  }

  /**
   * 加载白名单
   */
  private loadWhitelist() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tsfWhitelist'], (result) => {
        if (result.tsfWhitelist) {
          this.whitelistedTweets = new Set(result.tsfWhitelist);
        }
      });
    }
  }
}
