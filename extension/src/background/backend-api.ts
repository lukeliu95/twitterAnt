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
  async getSignals(userId?: string): Promise<Signal[]> {
    const url = new URL(`${CONFIG.API_BASE_URL}/api/v1/signals`);
    if (userId) {
      url.searchParams.set('userId', userId);
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
      throw new Error(`Network error: ${error}`);
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
    return `anon_${crypto.randomUUID()}`;
  }
}
