/**
 * 全局错误处理中间件
 * Type-safe error handling for Hono
 */

import type { Context, Next } from 'hono';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/validator.js';

/**
 * API Error 接口
 */
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * HTTP 状态码映射
 */
const HTTP_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  SIGNAL_NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

/**
 * 全局错误处理中间件
 */
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    logger.error('Unhandled error:', error);

    // 处理 ValidationError
    if (error instanceof ValidationError) {
      const status = (HTTP_STATUS[error.code || 'VALIDATION_ERROR'] || 400) as any;
      return c.json({
        success: false,
        error: {
          message: error.message,
          code: error.code || 'VALIDATION_ERROR',
          field: error.field,
        }
      }, status);
    }

    // 处理普通 Error
    if (error instanceof Error) {
      const appError = error as AppError;
      const statusCode = (appError.statusCode || 500) as any;
      const code = appError.code || 'INTERNAL_ERROR';

      return c.json({
        success: false,
        error: {
          message: appError.message || 'An unexpected error occurred',
          code,
          details: appError.details,
        }
      }, statusCode);
    }

    // 处理未知错误
    return c.json({
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      }
    }, 500);
  }
};

/**
 * 404 处理器
 */
export const notFoundHandler = (c: Context) => {
  return c.json({
    success: false,
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
    }
  }, 404);
};
