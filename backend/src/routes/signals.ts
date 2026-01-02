/**
 * 信号相关 API 路由
 * Local First 架构 - 数据存储在本地 SQLite
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Signal, APIResponse } from '../types/index.js';
import { signalDAO } from '../database/signal-dao.js';
import { SIGNAL_TYPES } from '../config/signal-rules.js';

const signalsRouter = new Hono();

/**
 * GET /api/v1/signals
 * 获取信号列表
 */
signalsRouter.get('/', async (c) => {
  const type = c.req.query('type');
  const savedOnly = c.req.query('savedOnly') === 'true';
  const limit = parseInt(c.req.query('limit') || '50');

  const signals = await signalDAO.getAll({
    type,
    savedOnly,
    limit,
  });

  console.log(`[API] Total signals from DB: ${signals.length}`);
  if (signals.length > 0) {
    const now = new Date();
    console.log(`[API] Current time: ${now.toISOString()}`);
    console.log(`[API] First signal expiry: ${signals[0].expiresAt.toISOString()}`);
    console.log(`[API] Is expired: ${signals[0].expiresAt <= now}`);
  }

  // 过滤过期信号
  const activeSignals = signals.filter(s => s.expiresAt > new Date());

  console.log(`[API] Retrieved ${activeSignals.length} active signals`);

  return c.json<APIResponse>({
    success: true,
    data: {
      signals: activeSignals,
      total: activeSignals.length,
    },
  });
});

/**
 * GET /api/v1/signals/stats
 * 获取信号统计
 */
signalsRouter.get('/stats', async (c) => {
  const stats = await signalDAO.getStats();

  return c.json<APIResponse>({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/v1/signals/:id
 * 获取单个信号详情
 */
signalsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const signal = await signalDAO.getById(id);

  if (!signal) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'SIGNAL_NOT_FOUND',
        message: 'Signal not found',
      },
    }, 404);
  }

  return c.json<APIResponse>({
    success: true,
    data: signal,
  });
});

/**
 * PATCH /api/v1/signals/:id/bookmark
 * 切换书签状态
 */
signalsRouter.patch('/:id/bookmark', async (c) => {
  const id = c.req.param('id');
  const isSaved = await signalDAO.toggleSaved(id);

  if (isSaved === false) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'SIGNAL_NOT_FOUND',
        message: 'Signal not found',
      },
    }, 404);
  }

  const signal = await signalDAO.getById(id);

  return c.json<APIResponse>({
    success: true,
    data: {
      id,
      saved: isSaved,
      signal,
    },
  });
});

/**
 * DELETE /api/v1/signals/:id
 * 删除信号
 */
signalsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = await signalDAO.delete(id);

  if (!deleted) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'SIGNAL_NOT_FOUND',
        message: 'Signal not found',
      },
    }, 404);
  }

  console.log(`[API] Deleted signal ${id}`);

  return c.json<APIResponse>({
    success: true,
    data: {
      deleted: id,
    },
  });
});

/**
 * POST /api/v1/signals/cleanup
 * 清理过期信号
 */
signalsRouter.post('/cleanup', async (c) => {
  const deletedCount = await signalDAO.deleteExpired();

  console.log(`[API] Cleaned up ${deletedCount} expired signals`);

  return c.json<APIResponse>({
    success: true,
    data: {
      deleted: deletedCount,
    },
  });
});

/**
 * PATCH /api/v1/signals/:id/notes
 * 更新用户备注
 */
signalsRouter.patch('/:id/notes', async (c) => {
  const id = c.req.param('id');
  const { notes } = await c.req.json();

  if (!id) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Signal ID is required',
      },
    }, 400);
  }

  // 验证 notes 是字符串
  if (notes !== null && notes !== undefined && typeof notes !== 'string') {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Notes must be a string',
      },
    }, 400);
  }

  const updated = await signalDAO.updateNotes(id, notes || '');

  if (!updated) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'SIGNAL_NOT_FOUND',
        message: 'Signal not found',
      },
    }, 404);
  }

  console.log(`[API] Updated notes for signal ${id}`);

  return c.json<APIResponse>({
    success: true,
    data: {
      id,
      notes: notes || '',
    },
  });
});

/**
 * POST /api/v1/signals/batch-delete
 * 批量删除信号
 */
signalsRouter.post('/batch-delete', async (c) => {
  const { ids } = await c.req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'IDs array is required',
      },
    }, 400);
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const id of ids) {
    if (typeof id !== 'string') {
      errors.push(`Invalid ID: ${id}`);
      continue;
    }

    const result = await signalDAO.delete(id);
    if (result) {
      deleted++;
    } else {
      errors.push(`Signal not found: ${id}`);
    }
  }

  console.log(`[API] Batch deleted ${deleted}/${ids.length} signals`);

  return c.json<APIResponse>({
    success: true,
    data: {
      deleted,
      total: ids.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
});

/**
 * 创建模拟信号（用于测试）
 */
export function createMockSignal(tweet: any, type: string = SIGNAL_TYPES.TECH_PRODUCT): Signal {
  const score = calculateSignalScore(tweet, type);
  const content = generateSignalContent(tweet, type);

  return {
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tweetId: tweet.id,
    type: type as any,
    score,
    summary: content.summary,
    description: content.description,
    reason: content.reason,
    actionPlan: content.actionPlan,
    matchedSkills: content.skills,
    competition: content.competition,
    originalTweet: tweet,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

/**
 * 计算信号评分
 */
function calculateSignalScore(tweet: any, type: string): number {
  let score = 3;

  if (tweet.author.verified) score += 0.5;
  if (tweet.author.followerCount > 50000) score += 0.5;
  if (tweet.author.followerCount > 100000) score += 0.5;

  const engagementRatio = tweet.engagement.likes / Math.max(tweet.author.followerCount, 1);
  if (engagementRatio > 0.01) score += 0.5;
  if (tweet.engagement.retweets > 50) score += 0.3;
  if (tweet.engagement.likes > 100) score += 0.2;

  const textLength = tweet.text.length;
  if (textLength > 100 && textLength < 500) score += 0.3;
  if (tweet.links && tweet.links.length > 0) score += 0.2;
  if (tweet.media && tweet.media.length > 0) score += 0.1;

  // 热门议题加成
  const typeBonus: Record<string, number> = {
    [SIGNAL_TYPES.TECH_PRODUCT]: 0.5,
    [SIGNAL_TYPES.SOCIAL_VIRAL]: 0.8,
    [SIGNAL_TYPES.BUSINESS_STARTUP]: 0.4,
  };
  score += typeBonus[type] || 0;

  return Math.min(5, Math.max(1, Math.round(score * 10) / 10));
}

/**
 * 根据类型生成信号内容
 */
function generateSignalContent(tweet: any, type: string): any {
  // 根据不同的议题类型生成默认内容
  switch (type) {
    case SIGNAL_TYPES.TECH_PRODUCT:
      return {
        summary: `📱 技术动态: ${tweet.text.slice(0, 40)}...`,
        description: '发现新的技术趋势或产品动态，值得关注。',
        reason: '涉及 AI、Web3 或开发工具的更新',
        actionPlan: ['了解技术细节', '评估应用场景'],
        skills: ['技术调研', '产品分析'],
        competition: '技术迭代快',
      };
    case SIGNAL_TYPES.BUSINESS_STARTUP:
      return {
        summary: `💼 商业机会: ${tweet.text.slice(0, 40)}...`,
        description: '有价值的商业洞察或创业经验分享。',
        reason: '涉及商业模式、增长或融资',
        actionPlan: ['分析商业逻辑', '参考增长策略'],
        skills: ['商业分析', '市场洞察'],
        competition: '商业竞争激烈',
      };
    case SIGNAL_TYPES.INCOME_MONETIZATION:
      return {
        summary: `💰 变现思路: ${tweet.text.slice(0, 40)}...`,
        description: '探索可能的收入渠道或变现模式。',
        reason: '涉及副业、自由职业或被动收入',
        actionPlan: ['验证变现模式', '评估投入产出'],
        skills: ['运营', '销售'],
        competition: '执行力是关键',
      };
    case SIGNAL_TYPES.SOCIAL_VIRAL:
      return {
        summary: `🌍 社会热点: ${tweet.text.slice(0, 40)}...`,
        description: '当前全网关注的热门事件。',
        reason: '短时间内获得大量互动',
        actionPlan: ['关注事态发展', '了解各方观点'],
        skills: ['信息筛选'],
        competition: '热度持续时间短',
      };
    default:
      return {
        summary: `💡 趋势信号: ${tweet.text.slice(0, 40)}...`,
        description: '检测到值得关注的行业动态或观点。',
        reason: '内容具有一定公共价值',
        actionPlan: ['进一步了解', '持续关注'],
        skills: ['学习', '思考'],
        competition: '待评估',
      };
  }
}

export default signalsRouter;
