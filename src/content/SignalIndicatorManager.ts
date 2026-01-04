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
  public findTweetElement(tweetId: string): HTMLElement | null {
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
    const summary = signal.aiSummary || '此内容可能与你关注的话题相关';

    card.innerHTML = `
      <div class="tsf-card-header">
        ${scoreBadge}
      </div>

      <!-- AI 总结区域 -->
      <div class="tsf-card-summary">
        <span class="tsf-summary-icon">💡</span>
        <span class="tsf-summary-text">${this.escapeHtml(summary)}</span>
      </div>
    `;

    return card;
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
   * 获取分数徽章
   */
  private getScoreBadge(score: number): string {
    const icon = score >= 85 ? '🔥' : '📊';
    return `
      <div class="tsf-score-badge tsf-score-${this.getIntensityClass(score)}">
        <span class="tsf-score-icon">${icon}</span>
        <span class="tsf-score-value">${score}</span>
        <span class="tsf-score-label">趋势信号 TSF</span>
      </div>
    `;
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
