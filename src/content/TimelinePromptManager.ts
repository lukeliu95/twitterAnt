// TimelinePromptManager - 时间线页面提示管理器
// 当用户进入时间线页面时，显示分析提示

export class TimelinePromptManager {
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
          chrome.storage.local.set({ timelinePromptShown: true });
        } else if (message.type === 'SHOW_TIMELINE_PROMPT') {
          this.showPrompt();
        }
      });
    }
  }

  private checkHomepageAndShowPrompt() {
    // 逻辑已迁移至专注模式控制面板，此处不再主动显示引导
    return;
  }

  public showPrompt() {
    // 逻辑已迁移，不再显示 Banner
    return;
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
}
