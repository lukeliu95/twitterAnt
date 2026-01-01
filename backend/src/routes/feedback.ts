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

export default feedbackRouter;
