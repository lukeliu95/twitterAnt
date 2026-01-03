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
   * 创建信号卡片
   */
  private createSignalCard(signal: Signal): HTMLElement {
    const card = document.createElement('div');
    card.className = `tsf-signal-card tsf-signal-${this.getIntensityClass(signal.score)}`;
    card.setAttribute('data-tsf-signal-id', signal.signalId);

    // 创建卡片内容
    const scoreBadge = this.getScoreBadge(signal.score);
    const reasons = this.getReasonsHTML(signal.matchReasons);
    const summary = signal.aiSummary || '此内容可能与你关注的话题相关';

    card.innerHTML = `
      <div class="tsf-card-content">
        <div class="tsf-card-top">
          ${scoreBadge}
          <button class="tsf-toggle-btn" aria-label="展开/收起" title="展开详情">
            <span class="tsf-toggle-icon">▼</span>
          </button>
        </div>
        <div class="tsf-card-details">
          <div class="tsf-reasons">${reasons}</div>
          <div class="tsf-summary">${summary}</div>
          <div class="tsf-card-footer">
            <span class="tsf-signal-meta">匹配度 ${signal.score}%</span>
          </div>
        </div>
      </div>
    `;

    // 添加展开/收起功能
    const toggleBtn = card.querySelector('.tsf-toggle-btn');
    const details = card.querySelector('.tsf-card-details');
    const toggleIcon = card.querySelector('.tsf-toggle-icon');

    if (toggleBtn && details && toggleIcon) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = card.classList.toggle('tsf-expanded');
        if (isExpanded) {
          toggleIcon.textContent = '▲';
        } else {
          toggleIcon.textContent = '▼';
        }
      });
    }

    // 默认展开状态
    card.classList.add('tsf-expanded');
    const icon = card.querySelector('.tsf-toggle-icon');
    if (icon) {
      icon.textContent = '▲';
    }

    return card;
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
