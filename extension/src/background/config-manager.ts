/**
 * 配置管理器 - 负责用户议题配置的读取和保存
 *
 * 功能：
 * - 管理用户选择的议题
 * - 持久化配置到 chrome.storage
 * - 提供配置变更通知
 */

import { DEFAULT_TOPICS, MIN_TOPICS_REQUIRED, MAX_TOPICS_ALLOWED } from '../shared/types/topics';
import { logger } from '../shared/utils/logger';

/**
 * 用户议题配置
 */
export interface TopicConfig {
  enabledTopics: string[];
  lastUpdated: number;
}

/**
 * 配置管理器类
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: TopicConfig | null = null;
  private listeners: Set<(config: TopicConfig) => void> = new Set();

  private constructor() {
    this.loadConfig();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('topicConfig');

      if (result.topicConfig) {
        this.config = result.topicConfig as TopicConfig;
        logger.debug('Loaded existing config:', this.config);
      } else {
        // 首次使用，使用默认配置
        this.config = {
          enabledTopics: DEFAULT_TOPICS,
          lastUpdated: Date.now(),
        };
        await this.saveConfig();
        logger.info('Initialized with default config:', this.config);
      }
    } catch (error) {
      logger.error('Failed to load config:', error);
      // 使用默认配置
      this.config = {
        enabledTopics: DEFAULT_TOPICS,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    if (!this.config) return;

    try {
      await chrome.storage.local.set({ topicConfig: this.config });
      logger.info('Config saved:', this.config);
    } catch (error) {
      logger.error('Failed to save config:', error);
      throw error;
    }
  }

  /**
   * 获取当前配置
   */
  async getConfig(): Promise<TopicConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * 获取已启用的议题列表
   */
  async getEnabledTopics(): Promise<string[]> {
    const config = await this.getConfig();
    return config.enabledTopics;
  }

  /**
   * 更新议题配置
   */
  async updateTopics(topicIds: string[]): Promise<{ success: boolean; error?: string }> {
    // 验证
    if (topicIds.length < MIN_TOPICS_REQUIRED) {
      return {
        success: false,
        error: `至少需要选择 ${MIN_TOPICS_REQUIRED} 个议题`,
      };
    }

    if (topicIds.length > MAX_TOPICS_ALLOWED) {
      return {
        success: false,
        error: `最多只能选择 ${MAX_TOPICS_ALLOWED} 个议题`,
      };
    }

    // 更新配置
    this.config = {
      enabledTopics: topicIds,
      lastUpdated: Date.now(),
    };

    await this.saveConfig();

    // 通知监听器
    this.notifyListeners();

    logger.info('Topics updated:', topicIds);
    return { success: true };
  }

  /**
   * 重置为默认配置
   */
  async resetToDefault(): Promise<void> {
    this.config = {
      enabledTopics: DEFAULT_TOPICS,
      lastUpdated: Date.now(),
    };
    await this.saveConfig();
    this.notifyListeners();
    logger.info('Config reset to default');
  }

  /**
   * 监听配置变更
   */
  onChange(callback: (config: TopicConfig) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    if (this.config) {
      this.listeners.forEach(callback => callback(this.config!));
    }
  }

  /**
   * 检查议题是否已启用
   */
  async isTopicEnabled(topicId: string): Promise<boolean> {
    const enabledTopics = await this.getEnabledTopics();
    return enabledTopics.includes(topicId);
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();
