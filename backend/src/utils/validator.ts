/**
 * 数据验证工具
 * Type Strict 验证，确保数据完整性
 */

import type { Signal, TweetData } from '../types/index.js';
import { logger } from './logger.js';

/**
 * Signal 类型守卫
 */
export const SIGNAL_TYPES = ['demand', 'revenue', 'skill', 'trend'] as const;
export type SignalType = typeof SIGNAL_TYPES[number];

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Signal 验证器
 * 使用 TypeScript 类型守卫确保数据完整性
 */
export class SignalValidator {
  /**
   * 验证 Signal 类型
   */
  static isValidSignalType(value: unknown): value is SignalType {
    return typeof value === 'string' && SIGNAL_TYPES.includes(value as SignalType);
  }

  /**
   * 验证并清理 Signal 对象
   * 使用类型守卫确保返回的是有效的 Signal
   */
  static validate(signal: Partial<Signal>): Signal {
    const errors: string[] = [];

    // 验证 id
    if (!signal.id || typeof signal.id !== 'string') {
      errors.push('id is required and must be a string');
    }

    // 验证 tweetId
    if (!signal.tweetId || typeof signal.tweetId !== 'string') {
      errors.push('tweetId is required and must be a string');
    }

    // 验证 type
    if (!signal.type || !this.isValidSignalType(signal.type)) {
      errors.push(`type must be one of: ${SIGNAL_TYPES.join(', ')}`);
    }

    // 验证 score
    if (typeof signal.score !== 'number' || signal.score < 0 || signal.score > 100) {
      errors.push('score must be a number between 0 and 100');
    }

    // 验证 summary
    if (!signal.summary || typeof signal.summary !== 'string') {
      errors.push('summary is required and must be a string');
    }

    if (errors.length > 0) {
      logger.error(`Signal validation failed: ${errors.join(', ')}`);
      throw new ValidationError(`Invalid signal: ${errors.join(', ')}`, 'signal', 'VALIDATION_ERROR');
    }

    // 返回清理后的 Signal 对象
    return {
      id: signal.id!,
      tweetId: signal.tweetId!,
      type: signal.type!,
      score: signal.score!,  // 已验证，非 undefined
      summary: signal.summary!,  // 已验证，非 undefined
      description: this.cleanString(signal.description ?? ''),
      reason: this.cleanString(signal.reason ?? ''),
      actionPlan: this.cleanArray(signal.actionPlan ?? []),
      matchedSkills: this.cleanArray(signal.matchedSkills ?? []),
      competition: this.cleanString(signal.competition ?? ''),
      originalTweet: signal.originalTweet || {} as TweetData,
      createdAt: signal.createdAt instanceof Date ? signal.createdAt : new Date(),
      expiresAt: signal.expiresAt instanceof Date ? signal.expiresAt : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      saved: signal.saved ?? false,
      userNotes: signal.userNotes ?? '',
    };
  }

  /**
   * 验证 TweetData
   */
  static validateTweet(tweet: any): TweetData {
    const errors: string[] = [];

    if (!tweet.id || typeof tweet.id !== 'string') {
      errors.push('tweet.id is required');
    }

    if (!tweet.text || typeof tweet.text !== 'string') {
      errors.push('tweet.text is required');
    }

    if (errors.length > 0) {
      throw new ValidationError(`Invalid tweet: ${errors.join(', ')}`, 'tweet', 'INVALID_TWEET');
    }

    return {
      id: tweet.id,
      text: tweet.text,
      author: {
        username: tweet.author?.username || 'unknown',
        displayName: tweet.author?.displayName || 'Unknown',
        verified: tweet.author?.verified ?? false,
        followerCount: tweet.author?.followerCount ?? 0,
      },
      engagement: {
        replies: tweet.engagement?.replies ?? 0,
        retweets: tweet.engagement?.retweets ?? 0,
        likes: tweet.engagement?.likes ?? 0,
        views: tweet.engagement?.views ?? 0,
      },
      timestamp: tweet.timestamp ?? new Date().toISOString(),
      url: tweet.url ?? '',
      type: tweet.type ?? 'unknown',
      media: tweet.media,
      links: tweet.links,
    };
  }

  /**
   * 清理字符串值
   */
  private static cleanString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value !== 'string') {
      logger.warn(`Expected string, got ${typeof value}, converting to string`);
      return String(value);
    }
    return value;
  }

  /**
   * 清理数组值
   */
  private static cleanArray(value: any): string[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string');
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item: any) => typeof item === 'string') : [];
      } catch {
        return [];
      }
    }
    logger.warn(`Expected array, got ${typeof value}, returning empty array`);
    return [];
  }
}

/**
 * Result 类型 - 函数式错误处理
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 创建成功的 Result
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * 创建失败的 Result
 */
export function err<E extends Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * 安全的 Signal 验证（返回 Result 类型）
 */
export function safeValidateSignal(signal: Partial<Signal>): Result<Signal, ValidationError> {
  try {
    return ok(SignalValidator.validate(signal));
  } catch (error) {
    return err(error as ValidationError);
  }
}
