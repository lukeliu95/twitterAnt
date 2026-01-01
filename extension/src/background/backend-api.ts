/**
 * 后端 API 通信模块
 */

import type { TweetData, Signal, UserFeedback } from '../shared/types/tweet';
import { CONFIG } from '../shared/constants/config';
import { logger } from '../shared/utils/logger';

export class BackendAPI {
  private authToken: string | null = null;

  constructor() {
    this.loadAuthToken();
  }

  /**
   * 发送推文到后端
   */
  async sendTweets(tweets: TweetData[]): Promise<void> {
    const url = `${CONFIG.API_BASE_URL}/api/v1/tweets/batch`;
    const token = await this.getAuthToken();

    logger.info(`Sending ${tweets.length} tweets to ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tweets }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('API error:', response.status, error);
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    logger.info('API response:', result);
    return result.data;
  }

  /**
   * 获取信号列表
   */
  async getSignals(savedOnly?: boolean, type?: string): Promise<Signal[]> {
    const url = new URL(`${CONFIG.API_BASE_URL}/api/v1/signals`);
    if (savedOnly) {
      url.searchParams.set('savedOnly', 'true');
    }
    if (type) {
      url.searchParams.set('type', type);
    }

    const urlStr = url.toString();
    logger.info('Fetching signals from:', urlStr);

    const token = await this.getAuthToken();

    let response: Response;
    try {
      response = await fetch(urlStr, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      logger.info('Fetch response status:', response.status, response.statusText);
    } catch (error) {
      logger.error('Fetch failed:', error);
      throw new Error(`Failed to fetch: ${error}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API response error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    try {
      const result = await response.json();
      logger.info('API response data:', result);

      if (result.success && result.data) {
        return result.data.signals || [];
      } else {
        logger.warn('API returned success=false or no data');
        return [];
      }
    } catch (error) {
      logger.error('Failed to parse JSON:', error);
      throw error;
    }
  }

  /**
   * 发送用户反馈
   */
  async sendFeedback(feedback: UserFeedback & { userId?: string }): Promise<void> {
    const url = `${CONFIG.API_BASE_URL}/api/v1/feedback`;
    const token = await this.getAuthToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  }

  /**
   * 删除信号（用户反馈后移除）
   */
  async deleteSignal(signalId: string): Promise<void> {
    const url = `${CONFIG.API_BASE_URL}/api/v1/signals/${signalId}`;
    const token = await this.getAuthToken();

    logger.info(`Deleting signal ${signalId}`);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Delete signal error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    logger.info(`Signal ${signalId} deleted successfully`);
  }

  /**
   * 切换书签状态（保存/取消保存）
   */
  async toggleBookmark(signalId: string): Promise<boolean> {
    const url = `${CONFIG.API_BASE_URL}/api/v1/signals/${signalId}/bookmark`;
    const token = await this.getAuthToken();

    logger.info(`Toggling bookmark for signal ${signalId}`);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Toggle bookmark error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      logger.info(`Bookmark ${result.data.saved ? 'added' : 'removed'} for signal ${signalId}`);
      return result.data.saved;
    }

    throw new Error('Invalid API response');
  }

  /**
   * 更新备注
   */
  async updateNotes(signalId: string, notes: string): Promise<void> {
    const url = `${CONFIG.API_BASE_URL}/api/v1/signals/${signalId}/notes`;
    const token = await this.getAuthToken();

    logger.info(`Updating notes for signal ${signalId}`);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Update notes error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    logger.info(`Notes updated for signal ${signalId}`);
  }

  /**
   * 批量删除信号
   */
  async batchDeleteSignals(ids: string[]): Promise<{ deleted: number; total: number }> {
    const url = `${CONFIG.API_BASE_URL}/api/v1/signals/batch-delete`;
    const token = await this.getAuthToken();

    logger.info(`Batch deleting ${ids.length} signals`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Batch delete error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      logger.info(`Batch deleted ${result.data.deleted}/${result.data.total} signals`);
      return result.data;
    }

    throw new Error('Invalid API response');
  }

  /**
   * 获取认证 token
   */
  private async getAuthToken(): Promise<string> {
    if (this.authToken) {
      return this.authToken;
    }

    // 从 storage 获取或生成新的
    return new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], (result) => {
        let token = result.authToken as string | undefined;

        if (!token) {
          // 生成匿名 token
          token = this.generateAnonymousToken();
          chrome.storage.local.set({ authToken: token });
          logger.info('Generated new auth token');
        }

        this.authToken = token;
        resolve(token);
      });
    });
  }

  /**
   * 加载已保存的 token
   */
  private loadAuthToken(): void {
    chrome.storage.local.get(['authToken'], (result) => {
      this.authToken = (result.authToken as string | undefined) || null;
      logger.debug('Loaded auth token from storage');
    });
  }

  /**
   * 生成匿名 token
   */
  private generateAnonymousToken(): string {
    // 使用更兼容的 UUID 生成方式
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
