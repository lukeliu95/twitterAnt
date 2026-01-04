// SignalIndicatorManager - 管理推文上的趋势信号指示器
import { Signal } from '../types';

export class SignalIndicatorManager {
  private signals: Map<string, Signal> = new Map();
  private expandedCards: Set<string> = new Set();

  /**
   * 添加新信号
   */
  addSignal(signal: Signal) {
    this.signals.set(signal.tweetId, signal);

    // 如果推文在当前页面上，立即添加卡片
    const tweetElement = this.findTweetElement(signal.tweetId);
    if (tweetElement) {
      this.addSignalCard(tweetElement, signal);
    }
  }

  /**
   * 查找推文元素
   */
  private findTweetElement(tweetId: string): HTMLElement | null {
    // Twitter 的推文链接格式: /username/status/123456
    const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
    for (const el of tweetElements) {
      const link = el.querySelector(`a[href*="/status/${tweetId}"]`);
      if (link) {
        return el as HTMLElement;
      }
    }
    return null;
  }

  /**
   * 在推文上直接添加信号卡片
   */
  private addSignalCard(tweetElement: HTMLElement, signal: Signal) {
    // 检查是否已经添加过卡片
    if (tweetElement.querySelector('.tsf-signal-card-wrapper')) {
      return;
    }

    // 创建卡片包装器
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'tsf-signal-card-wrapper';
    cardWrapper.setAttribute('data-tsf-tweet-id', signal.tweetId);
    cardWrapper.setAttribute('data-tsf-score', signal.score.toString());

    // 创建完整的信号卡片
    const card = this.createSignalCard(signal);
    cardWrapper.appendChild(card);

    // 插入卡片到推文中
    this.insertCard(tweetElement, cardWrapper);

    console.log('TSF: Signal card added for tweet', signal.tweetId);

    // 标记为已读
    this.markAsRead(signal.tweetId);
  }

  /**
   * 根据分数获取样式类
   */
  private getIntensityClass(score: number): string {
    return score >= 85 ? 'high' : 'medium';
  }

  /**
   * 创建信号卡片（增强版 - 详细信息展示）
   */
  private createSignalCard(signal: Signal): HTMLElement {
    const card = document.createElement('div');
    card.className = `tsf-signal-card tsf-signal-${this.getIntensityClass(signal.score)}`;
    card.setAttribute('data-tsf-signal-id', signal.signalId);
    card.setAttribute('data-tsf-score', signal.score.toString());

    // 创建卡片内容
    const scoreBadge = this.getScoreBadge(signal.score);
    const reasons = this.getReasonsHTML(signal.matchReasons);
    const summary = signal.aiSummary || '此内容可能与你关注的话题相关';

    card.innerHTML = `
      <div class="tsf-card-header">
        ${scoreBadge}
        <div class="tsf-card-actions">
          <button class="tsf-action-btn tsf-whitelist-btn" title="双击星标添加到白名单">⭐</button>
          <button class="tsf-action-btn tsf-feedback-btn tsf-feedback-up" title="有用">👍</button>
          <button class="tsf-action-btn tsf-feedback-btn tsf-feedback-down" title="无感">👎</button>
        </div>
      </div>

      <!-- AI 总结区域 -->
      <div class="tsf-card-summary">
        <span class="tsf-summary-icon">💡</span>
        <span class="tsf-summary-text">${this.escapeHtml(summary)}</span>
      </div>

      <!-- 匹配原因标签 -->
      <div class="tsf-card-reasons">
        ${reasons}
      </div>

      <!-- 可展开的详情区域 -->
      <div class="tsf-card-expandable">
        <button class="tsf-expand-btn">
          <span class="tsf-expand-icon">▼</span>
          <span class="tsf-expand-text">展开详情</span>
        </button>

        <div class="tsf-card-details" style="display: none;">
          <!-- 详细解读 (如果有) -->
          ${(signal as any).detailedExplanation ? `
            <div class="tsf-detail-section">
              <h4>📄 详细解读</h4>
              <p>${this.escapeHtml((signal as any).detailedExplanation)}</p>
            </div>
          ` : ''}

          <!-- 为什么值得关注 (如果有) -->
          ${(signal as any).whyItMatters ? `
            <div class="tsf-detail-section">
              <h4>💎 为什么值得关注</h4>
              <p>${this.escapeHtml((signal as any).whyItMatters)}</p>
            </div>
          ` : ''}

          <!-- 关键洞察 (如果有) -->
          ${(signal as any).keyInsights && (signal as any).keyInsights.length > 0 ? `
            <div class="tsf-detail-section">
              <h4>🔍 关键洞察</h4>
              <ul>
                ${(signal as any).keyInsights.map((insight: string) =>
                  `<li>${this.escapeHtml(insight)}</li>`
                ).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- 反馈区域 -->
          <div class="tsf-detail-section">
            <h4>📊 帮助我们改进</h4>
            <div class="tsf-feedback-buttons">
              <button class="tsf-feedback-detailed" data-feedback="helpful">
                👍 有用
              </button>
              <button class="tsf-feedback-detailed" data-feedback="neutral">
                😐 一般
              </button>
              <button class="tsf-feedback-detailed" data-feedback="wrong">
                ⚠️ 误判
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 绑定事件监听器
    this.attachCardEventListeners(card, signal);

    return card;
  }

  /**
   * 绑定卡片事件监听器
   */
  private attachCardEventListeners(card: HTMLElement, signal: Signal) {
    // 展开/收起按钮
    const expandBtn = card.querySelector('.tsf-expand-btn');
    const detailsSection = card.querySelector('.tsf-card-details');
    const expandIcon = card.querySelector('.tsf-expand-icon');
    const expandText = card.querySelector('.tsf-expand-text');

    expandBtn?.addEventListener('click', () => {
      const isExpanded = detailsSection && detailsSection instanceof HTMLElement
        ? detailsSection.style.display !== 'none'
        : false;

      if (detailsSection && detailsSection instanceof HTMLElement) {
        detailsSection.style.display = isExpanded ? 'none' : 'block';
      }
      if (expandIcon && expandIcon instanceof HTMLElement) {
        expandIcon.textContent = isExpanded ? '▼' : '▲';
      }
      if (expandText && expandText instanceof HTMLElement) {
        expandText.textContent = isExpanded ? '展开详情' : '收起详情';
      }
    });

    // 星标按钮 (双击添加白名单)
    const whitelistBtn = card.querySelector('.tsf-whitelist-btn');
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout | null = null;

    whitelistBtn?.addEventListener('click', () => {
      clickCount++;

      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          // 单击: 显示提示
          this.showTooltip(whitelistBtn as HTMLElement, '双击添加到白名单');
          clickCount = 0;
        }, 300);
      } else if (clickCount === 2) {
        // 双击: 添加到白名单
        if (clickTimer) clearTimeout(clickTimer);
        this.addToWhitelist(signal.tweetId);
        if (whitelistBtn) {
          whitelistBtn.innerHTML = '⭐';
          whitelistBtn.classList.add('tsf-whitelisted');
        }
        clickCount = 0;
      }
    });

    // 快捷反馈按钮
    const feedbackUpBtn = card.querySelector('.tsf-feedback-up');
    const feedbackDownBtn = card.querySelector('.tsf-feedback-down');

    feedbackUpBtn?.addEventListener('click', () => {
      this.submitFeedback(signal.tweetId, 'helpful');
      feedbackUpBtn.classList.add('tsf-feedback-active');
      this.showTooltip(feedbackUpBtn as HTMLElement, '已反馈 👍');
    });

    feedbackDownBtn?.addEventListener('click', () => {
      this.submitFeedback(signal.tweetId, 'neutral');
      feedbackDownBtn.classList.add('tsf-feedback-active');
      this.showTooltip(feedbackDownBtn as HTMLElement, '已反馈 👎');
    });

    // 详细反馈按钮
    const detailedFeedbackBtns = card.querySelectorAll('.tsf-feedback-detailed');
    detailedFeedbackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const feedback = btn.getAttribute('data-feedback');
        if (feedback) {
          this.submitFeedback(signal.tweetId, feedback);
          detailedFeedbackBtns.forEach(b => b.classList.remove('tsf-feedback-active'));
          btn.classList.add('tsf-feedback-active');
          this.showTooltip(btn as HTMLElement, '感谢反馈！');
        }
      });
    });
  }

  /**
   * 提交反馈
   */
  private submitFeedback(tweetId: string, feedback: string) {
    chrome.runtime.sendMessage({
      type: 'SUBMIT_SIGNAL_FEEDBACK',
      data: { tweetId, feedback, timestamp: Date.now() }
    });
  }

  /**
   * 显示提示
   */
  private showTooltip(element: HTMLElement, message: string) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tsf-tooltip';
    tooltip.textContent = message;

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${rect.top - 30}px`;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.transform = 'translateX(-50%)';

    setTimeout(() => {
      tooltip.remove();
    }, 2000);
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 添加到白名单
   */
  private addToWhitelist(tweetId: string) {
    // 通过消息通知 FocusModeController
    if (typeof window !== 'undefined' && (window as any).focusModeController) {
      (window as any).focusModeController.addToWhitelist(tweetId);
    }

    // 保存到 storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['tsfWhitelist'], (result) => {
        const whitelist = new Set(result.tsfWhitelist || []);
        whitelist.add(tweetId);
        chrome.storage.local.set({
          tsfWhitelist: Array.from(whitelist)
        });
      });
    }
  }

  /**
   * 获取分数徽章
   */
  private getScoreBadge(score: number): string {
    const intensityClass = this.getIntensityClass(score);
    const icon = score >= 85 ? '🔥' : '📊';
    return `
      <div class="tsf-score-badge tsf-score-${intensityClass}">
        <span class="tsf-score-icon">${icon}</span>
        <span class="tsf-score-value">${score}</span>
        <span class="tsf-score-label">趋势信号</span>
      </div>
    `;
  }

  /**
   * 获取匹配原因 HTML
   */
  private getReasonsHTML(matchReasons: any[]): string {
    if (!matchReasons || matchReasons.length === 0) {
      return '<span class="tsf-no-reasons">基于你的兴趣偏好</span>';
    }

    return matchReasons.map(r => `
      <span class="tsf-reason-tag" title="${r.explanation || r.value}">
        ${this.getReasonIcon(r.type)} ${r.value}
      </span>
    `).join('');
  }

  /**
   * 获取匹配原因图标
   */
  private getReasonIcon(type: string): string {
    const icons: Record<string, string> = {
      keyword: '🔑',
      engagement: '💫',
      timing: '⏱️',
      related_account: '👤',
      interest: '💡',
      topic: '📌'
    };
    return icons[type] || '•';
  }

  /**
   * 将卡片插入到推文中
   */
  private insertCard(tweetElement: HTMLElement, cardWrapper: HTMLElement) {
    // 尝试找到推文文本元素
    const tweetText = tweetElement.querySelector('[data-testid="tweetText"]');

    if (tweetText && tweetText.parentElement) {
      // 插入到推文文本之后
      tweetText.parentElement.insertBefore(cardWrapper, tweetText.nextSibling);
    } else {
      // 备选方案：插入到推文内容区域的末尾
      const tweetContent = tweetElement.querySelector('[data-testid="tweet"]');
      if (tweetContent) {
        tweetContent.appendChild(cardWrapper);
      }
    }
  }

  /**
   * 标记信号为已读
   */
  private markAsRead(tweetId: string) {
    const signal = this.signals.get(tweetId);
    if (signal && !signal.read) {
      signal.read = true;
      signal.readAt = new Date().toISOString();

      // 通知 background script 更新
      chrome.runtime.sendMessage({
        type: 'MARK_SIGNAL_READ',
        data: { signalId: signal.signalId }
      });
    }
  }

  /**
   * 移除推文上的信号
   */
  removeIndicator(tweetId: string) {
    const tweetElement = this.findTweetElement(tweetId);
    if (tweetElement) {
      const card = tweetElement.querySelector('.tsf-signal-card-wrapper');
      if (card) card.remove();
    }
  }

  /**
   * 获取所有信号
   */
  getAllSignals(): Signal[] {
    return Array.from(this.signals.values());
  }

  /**
   * 清空所有信号
   */
  clear() {
    this.signals.clear();
    this.expandedCards.clear();
  }
}
