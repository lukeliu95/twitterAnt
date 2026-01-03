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

    // 如果推文在当前页面上，立即添加标记
    const tweetElement = this.findTweetElement(signal.tweetId);
    if (tweetElement) {
      this.addIndicator(tweetElement, signal);
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
   * 在推文上添加指示器
   */
  private addIndicator(tweetElement: HTMLElement, signal: Signal) {
    // 检查是否已经添加过指示器
    if (tweetElement.querySelector('.tsf-indicator')) {
      return;
    }

    // 找到行动栏 (Twitter 使用 role="group" 的元素)
    const actionBar = tweetElement.querySelector('[role="group"]');
    if (!actionBar) {
      console.warn('TSF: Action bar not found for tweet', signal.tweetId);
      return;
    }

    // 创建指示器容器
    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = 'tsf-indicator-container';

    // 创建指示器元素
    const indicator = document.createElement('div');
    indicator.className = `tsf-indicator tsf-indicator-${this.getIntensityClass(signal.score)}`;
    indicator.setAttribute('data-tsf-tweet-id', signal.tweetId);
    indicator.setAttribute('data-tsf-score', signal.score.toString());

    // 创建图标和分数
    indicator.innerHTML = this.getIndicatorHTML(signal);

    // 添加点击事件
    indicator.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.toggleAnalysisCard(tweetElement, signal);
    });

    indicatorContainer.appendChild(indicator);
    actionBar.appendChild(indicatorContainer);

    console.log('TSF: Indicator added for tweet', signal.tweetId);
  }

  /**
   * 根据分数获取样式类
   */
  private getIntensityClass(score: number): string {
    return score >= 85 ? 'high' : 'medium';
  }

  /**
   * 生成指示器HTML
   */
  private getIndicatorHTML(signal: Signal): string {
    const score = signal.score;
    return `📶 <span class="tsf-score">${score}</span>`;
  }

  /**
   * 展开/收起分析卡片
   */
  private toggleAnalysisCard(tweetElement: HTMLElement, signal: Signal) {
    const tweetId = signal.tweetId;
    const existingCard = tweetElement.querySelector('.tsf-analysis-card');

    if (existingCard) {
      // 收起卡片
      existingCard.classList.add('tsf-card-closing');
      setTimeout(() => {
        existingCard.remove();
      }, 300);
      this.expandedCards.delete(tweetId);
      return;
    }

    // 创建卡片
    const card = this.createAnalysisCard(signal);
    this.insertCard(tweetElement, card);
    this.expandedCards.add(tweetId);

    // 标记为已读
    this.markAsRead(tweetId);
  }

  /**
   * 创建分析卡片
   */
  private createAnalysisCard(signal: Signal): HTMLElement {
    const card = document.createElement('div');
    card.className = 'tsf-analysis-card';
    card.setAttribute('data-tsf-signal-id', signal.signalId);

    card.innerHTML = `
      <div class="tsf-card-header">
        <span class="tsf-title">趋势信号 (${signal.score}分)</span>
        <button class="tsf-close-btn" aria-label="关闭">&times;</button>
      </div>
      <div class="tsf-reasons">
        ${signal.matchReasons.map(r => `
          <span class="tsf-reason-tag" title="${r.explanation || r.value}">
            ${this.getReasonIcon(r.type)} ${r.value}
          </span>
        `).join('')}
      </div>
      <div class="tsf-summary">${signal.aiSummary}</div>
    `;

    // 添加关闭按钮事件
    const closeBtn = card.querySelector('.tsf-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.add('tsf-card-closing');
        setTimeout(() => {
          card.remove();
        }, 300);
      });
    }

    return card;
  }

  /**
   * 将卡片插入到推文中
   */
  private insertCard(tweetElement: HTMLElement, card: HTMLElement) {
    // 尝试找到推文文本元素
    const tweetText = tweetElement.querySelector('[data-testid="tweetText"]');

    if (tweetText && tweetText.parentElement) {
      // 插入到推文文本之后
      tweetText.parentElement.insertBefore(card, tweetText.nextSibling);
    } else {
      // 备选方案：插入到推文内容区域的末尾
      const tweetContent = tweetElement.querySelector('[data-testid="tweet"]');
      if (tweetContent) {
        tweetContent.appendChild(card);
      }
    }
  }

  /**
   * 获取匹配原因图标
   */
  private getReasonIcon(type: string): string {
    const icons: Record<string, string> = {
      keyword: '🔑',
      engagement: '🔥',
      timing: '⏱️',
      related_account: '👥'
    };
    return icons[type] || '•';
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
   * 移除推文上的指示器
   */
  removeIndicator(tweetId: string) {
    const tweetElement = this.findTweetElement(tweetId);
    if (tweetElement) {
      const indicator = tweetElement.querySelector('.tsf-indicator-container');
      const card = tweetElement.querySelector('.tsf-analysis-card');
      if (indicator) indicator.remove();
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
