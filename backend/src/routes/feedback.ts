/**
 * 用户反馈 API 路由
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { APIResponse } from '../types/index.js';

const feedbackRouter = new Hono();

// 验证反馈数据
const feedbackSchema = z.object({
  signalId: z.string().min(1),
  action: z.enum(['saved', 'acted', 'ignored']),
  note: z.string().optional(),
});

const batchFeedbackSchema = z.object({
  feedbacks: z.array(feedbackSchema).min(1).max(50),
});

// 内存存储（开发阶段）
const feedbackStorage = new Map<string, any>();
const savedSignalsStorage = new Set<string>(); // 存储已保存的信号 ID

/**
 * POST /api/v1/feedback
 * 提交单个反馈
 */
feedbackRouter.post('/', zValidator('json', feedbackSchema), async (c) => {
  const feedback = c.req.valid('json');
  const feedbackId = `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 存储反馈
  feedbackStorage.set(feedbackId, {
    ...feedback,
    id: feedbackId,
    createdAt: new Date(),
  });

  console.log(`[API] Received feedback: ${feedback.action} for signal ${feedback.signalId}`);

  // 如果是保存操作，添加到保存列表
  if (feedback.action === 'saved') {
    savedSignalsStorage.add(feedback.signalId);
    console.log(`[API] Signal ${feedback.signalId} saved`);
  }

  return c.json<APIResponse>({
    success: true,
    data: {
      feedbackId,
      signalId: feedback.signalId,
      action: feedback.action,
    },
  });
});

/**
 * POST /api/v1/feedback/batch
 * 批量提交反馈
 */
feedbackRouter.post('/batch', zValidator('json', batchFeedbackSchema), async (c) => {
  const { feedbacks } = c.req.valid('json');

  for (const feedback of feedbacks) {
    const feedbackId = `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    feedbackStorage.set(feedbackId, {
      ...feedback,
      id: feedbackId,
      createdAt: new Date(),
    });
  }

  console.log(`[API] Received ${feedbacks.length} feedbacks`);

  return c.json<APIResponse>({
    success: true,
    data: {
      accepted: feedbacks.length,
    },
  });
});

/**
 * GET /api/v1/feedback
 * 获取所有反馈（调试用）
 */
feedbackRouter.get('/', (c) => {
  const feedbacks = Array.from(feedbackStorage.values());

  return c.json<APIResponse>({
    success: true,
    data: {
      feedbacks,
      total: feedbacks.length,
    },
  });
});

/**
 * GET /api/v1/feedback/saved
 * 获取已保存的信号 ID 列表
 */
feedbackRouter.get('/saved', (c) => {
  const savedIds = Array.from(savedSignalsStorage);

  return c.json<APIResponse>({
    success: true,
    data: {
      savedIds,
      total: savedIds.length,
    },
  });
});

/**
 * DELETE /api/v1/feedback/saved/:signalId
 * 取消保存信号
 */
feedbackRouter.delete('/saved/:signalId', (c) => {
  const signalId = c.req.param('signalId');

  if (!signalId) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'INVALID_SIGNAL_ID',
        message: 'Signal ID is required',
      },
    }, 400);
  }

  const wasSaved = savedSignalsStorage.has(signalId);
  savedSignalsStorage.delete(signalId);

  console.log(`[API] Signal ${signalId} unsaved (was ${wasSaved ? 'saved' : 'not saved'})`);

  return c.json<APIResponse>({
    success: true,
    data: {
      signalId,
      unsaved: wasSaved,
    },
  });
});

export default feedbackRouter;
