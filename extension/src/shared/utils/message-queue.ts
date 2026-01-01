/**
 * 消息队列工具
 */

export interface QueuedItem<T> {
  data: T;
  timestamp: number;
  retryCount: number;
}

export class MessageQueue<T> {
  private queue: QueuedItem<T>[] = [];
  private processing = false;
  private flushTimer: number | null = null;

  constructor(
    private readonly batchSize: number,
    private readonly flushInterval: number,
    private readonly maxRetries: number,
    private readonly processor: (items: T[]) => Promise<void>
  ) {}

  /**
   * 添加项目到队列
   */
  add(item: T): void {
    this.queue.push({
      data: item,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // 达到批次大小，立即发送
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * 安排定时刷新
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    // 使用 globalThis 以兼容 Service Worker 环境
    this.flushTimer = globalThis.setTimeout(() => {
      this.flush();
      this.flushTimer = null;
    }, this.flushInterval) as unknown as number;
  }

  /**
   * 刷新队列（处理所有待处理项目）
   */
  async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    const batch = this.queue.splice(0, this.batchSize);
    const items = batch.map((item) => item.data);

    try {
      await this.processor(items);
      console.debug(`[Queue] Processed ${items.length} items`);
    } catch (error) {
      console.error('[Queue] Failed to process batch:', error);

      // 重试逻辑
      batch.forEach((item) => {
        if (item.retryCount < this.maxRetries) {
          item.retryCount++;
          this.queue.push(item);
        }
      });
    } finally {
      this.processing = false;

      // 如果还有待处理的，继续发送
      if (this.queue.length > 0) {
        this.flush();
      }
    }
  }

  /**
   * 强制刷新（用于页面卸载前）
   */
  forceFlush(): void {
    if (this.flushTimer) {
      globalThis.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  /**
   * 获取队列大小
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    if (this.flushTimer) {
      globalThis.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
