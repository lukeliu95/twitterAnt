// TimelinePromptManager - 时间线页面提示管理器
// 当用户进入时间线页面时，显示分析提示

export class TimelinePromptManager {
  private promptShown: boolean = false;
  private bannerElement: HTMLElement | null = null;
  private isAnalyzing: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // 检查是否在主页
    this.checkHomepageAndShowPrompt();

    // 监听 URL 变化（SPA 导航）
    const observer = new MutationObserver(() => {
      this.checkHomepageAndShowPrompt();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // 监听消息
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'TIMELINE_ANALYSIS_STARTED') {
          this.isAnalyzing = true;
          this.updateBanner();
        } else if (message.type === 'TIMELINE_ANALYSIS_COMPLETE') {
          this.isAnalyzing = false;
          this.hideBanner();
        } else if (message.type === 'HIDE_TIMELINE_PROMPT') {
          this.hideBanner();
          this.promptShown = true;
          chrome.storage.local.set({ timelinePromptShown: true });
        }
      });
    }

    // 检查是否已显示过提示
    chrome.storage.local.get(['timelinePromptShown'], (result) => {
      this.promptShown = result.timelinePromptShown || false;
    });
  }

  private checkHomepageAndShowPrompt() {
    const isHomepage = window.location.pathname === '/home' || window.location.pathname === '/';

    // 只在主页显示，且未显示过
    if (isHomepage && !this.promptShown && !this.isAnalyzing) {
      // 延迟显示，等待页面加载完成
      setTimeout(() => {
        this.showPrompt();
      }, 2000);
    }
  }

  private showPrompt() {
    // 如果已经存在 banner，不重复创建
    if (this.bannerElement) return;

    // 检查用户是否有兴趣数据
    chrome.storage.local.get(['interests'], (result) => {
      const hasInterests = result.interests && result.interests.length > 0;

      this.createBanner(hasInterests);
    });
  }

  private createBanner(hasInterests: boolean) {
    // 创建 banner 元素
    this.bannerElement = document.createElement('div');
    this.bannerElement.id = 'tsf-timeline-prompt';
    this.bannerElement.className = 'tsf-timeline-banner';

    const message = hasInterests
      ? 'TSF 将根据你的兴趣，自动获取并分析接下来的 100 条推文'
      : 'TSF 建议先完成兴趣分析，以获得更精准的推荐。前往设置？';

    this.bannerElement.innerHTML = `
      <div class="tsf-banner-content">
        <div class="tsf-banner-icon">🎯</div>
        <div class="tsf-banner-text">
          <div class="tsf-banner-title">趋势信号分析</div>
          <div class="tsf-banner-message">${message}</div>
        </div>
        <div class="tsf-banner-actions">
          ${hasInterests ? `
            <button class="tsf-banner-btn-primary" id="tsf-start-analysis">
              开始分析
            </button>
            <button class="tsf-banner-btn-secondary" id="tsf-dismiss-later">
              稍后提醒
            </button>
          ` : `
            <button class="tsf-banner-btn-primary" id="tsf-go-settings">
              前往设置
            </button>
            <button class="tsf-banner-btn-secondary" id="tsf-dismiss">
              关闭
            </button>
          `}
        </div>
        <button class="tsf-banner-close" id="tsf-close-banner">×</button>
      </div>
    `;

    // 插入到页面
    this.insertBanner();

    // 绑定事件
    this.bindBannerEvents(hasInterests);
  }

  private insertBanner() {
    if (!this.bannerElement) return;

    // 尝试插入到页面顶部
    const target = document.querySelector('[data-testid="primaryColumn"]');
    if (target && target.firstChild) {
      target.insertBefore(this.bannerElement, target.firstChild);
    } else {
      // 备选：插入到 body
      document.body.insertBefore(this.bannerElement, document.body.firstChild);
    }

    // 添加样式
    this.injectStyles();
  }

  private bindBannerEvents(hasInterests: boolean) {
    if (!this.bannerElement) return;

    // 关闭按钮
    const closeBtn = this.bannerElement.querySelector('#tsf-close-banner');
    closeBtn?.addEventListener('click', () => {
      this.hideBanner();
      this.promptShown = true;
      chrome.storage.local.set({ timelinePromptShown: true });
    });

    if (hasInterests) {
      // 开始分析按钮
      const startBtn = this.bannerElement.querySelector('#tsf-start-analysis');
      startBtn?.addEventListener('click', () => {
        this.startAnalysis();
      });

      // 稍后提醒按钮
      const dismissBtn = this.bannerElement.querySelector('#tsf-dismiss-later');
      dismissBtn?.addEventListener('click', () => {
        this.hideBanner();
        // 不标记为已显示，下次进入主页还会提示
      });
    } else {
      // 前往设置按钮
      const settingsBtn = this.bannerElement.querySelector('#tsf-go-settings');
      settingsBtn?.addEventListener('click', () => {
        // 通知侧边栏打开设置
        chrome.runtime.sendMessage({
          type: 'SHOW_SIDEBAR',
          data: { view: 'settings' }
        }).catch(() => {});
        this.hideBanner();
      });

      // 关闭按钮
      const dismissBtn = this.bannerElement.querySelector('#tsf-dismiss');
      dismissBtn?.addEventListener('click', () => {
        this.hideBanner();
        this.promptShown = true;
        chrome.storage.local.set({ timelinePromptShown: true });
      });
    }
  }

  private startAnalysis() {
    this.isAnalyzing = true;
    this.updateBanner();

    // 通知 background 开始分析
    chrome.runtime.sendMessage({
      type: 'START_TIMELINE_ANALYSIS'
    }).catch(() => {});
  }

  private updateBanner() {
    if (!this.bannerElement) return;

    if (this.isAnalyzing) {
      this.bannerElement.innerHTML = `
        <div class="tsf-banner-content">
          <div class="tsf-banner-icon">⏳</div>
          <div class="tsf-banner-text">
            <div class="tsf-banner-title">正在分析中...</div>
            <div class="tsf-banner-message">正在收集并分析推文，请稍候</div>
          </div>
        </div>
      `;
    }
  }

  private hideBanner() {
    if (this.bannerElement) {
      this.bannerElement.remove();
      this.bannerElement = null;
    }
  }

  private injectStyles() {
    // 检查样式是否已注入
    if (document.getElementById('tsf-timeline-prompt-styles')) return;

    const style = document.createElement('style');
    style.id = 'tsf-timeline-prompt-styles';
    style.textContent = `
      .tsf-timeline-banner {
        background: linear-gradient(135deg, #f7dc6f 0%, #f0d965 100%);
        border: 1px solid #e8cc50;
        border-radius: 12px;
        padding: 12px 16px;
        margin: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        animation: tsf-slide-down 0.3s ease-out;
      }

      @keyframes tsf-slide-down {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .tsf-banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        position: relative;
      }

      .tsf-banner-close {
        position: absolute;
        top: -8px;
        right: -8px;
        background: rgba(0, 0, 0, 0.1);
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .tsf-banner-close:hover {
        background: rgba(0, 0, 0, 0.2);
      }

      .tsf-banner-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .tsf-banner-text {
        flex: 1;
      }

      .tsf-banner-title {
        font-weight: 600;
        font-size: 15px;
        color: #0f1419;
        margin-bottom: 2px;
      }

      .tsf-banner-message {
        font-size: 13px;
        color: #536471;
      }

      .tsf-banner-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }

      .tsf-banner-btn-primary,
      .tsf-banner-btn-secondary {
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }

      .tsf-banner-btn-primary {
        background: #0f1419;
        color: white;
      }

      .tsf-banner-btn-primary:hover {
        background: #272c30;
      }

      .tsf-banner-btn-secondary {
        background: transparent;
        color: #0f1419;
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .tsf-banner-btn-secondary:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    `;

    document.head.appendChild(style);
  }

  destroy() {
    this.hideBanner();
  }
}
