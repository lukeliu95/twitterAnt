/**
 * 信号相关 API 路由
 * Local First 架构 - 数据存储在本地 SQLite
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Signal, APIResponse } from '../types/index.js';
import { signalDAO } from '../database/signal-dao.js';

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
export function createMockSignal(tweet: any, type: string = 'demand'): Signal {
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

  const typeBonus: Record<string, number> = {
    demand: 0.5,
    revenue: 0.8,
    skill: 0.3,
    trend: 0.4,
  };
  score += typeBonus[type] || 0;

  return Math.min(5, Math.max(1, Math.round(score * 10) / 10));
}

/**
 * 根据类型生成信号内容
 */
function generateSignalContent(tweet: any, type: string): any {
  const text = tweet.text.toLowerCase();

  switch (type) {
    case 'demand':
      return {
        summary: `💡 需求缺口: ${tweet.text.slice(0, 40)}...`,
        description: '检测到明确的市场需求，用户愿意为此付费或寻找解决方案。',
        reason: '推文表达了具体的痛点或未满足的需求',
        actionPlan: [
          '验证需求规模和目标受众',
          '调研现有解决方案的不足',
          '设计最小可行产品 (MVP)',
          '快速推向市场获取反馈',
        ],
        skills: ['产品管理', '用户调研', 'MVP 开发'],
        competition: '需求明确，执行是关键',
      };

    case 'revenue':
      return {
        summary: `💰 收入验证: ${tweet.text.slice(0, 40)}...`,
        description: '真实的收入分享，证明商业模式可行。',
        reason: '作者分享了具体的收入数字和增长趋势',
        actionPlan: [
          '分析其商业模式和获客渠道',
          '评估是否可以复制或改进',
          '寻找差异化竞争点',
          '小规模验证自己的想法',
        ],
        skills: ['商业模式分析', '竞品研究', '数据驱动'],
        competition: '已验证可行，需要差异化',
      };

    case 'skill':
      return {
        summary: `🛠️ 技能需求: ${tweet.text.slice(0, 40)}...`,
        description: '市场对特定技能的需求正在增长。',
        reason: '推文提到特定技能的稀缺性或高价值',
        actionPlan: [
          '评估该技能的学习成本',
          '查找示范项目和作品集',
          '考虑兼职或自由职业验证',
          '建立个人品牌',
        ],
        skills: ['技能学习', '个人品牌', '自由职业'],
        competition: '技能门槛决定竞争程度',
      };

    case 'trend':
      return {
        summary: `📈 趋势机会: ${tweet.text.slice(0, 40)}...`,
        description: '新兴趋势或市场变化，存在早期机会。',
        reason: '推文反映了新的趋势或市场变化',
        actionPlan: [
          '深入研究趋势背后的驱动因素',
          '判断是短期热点还是长期趋势',
          '寻找可以快速切入的细分领域',
          '建立先发优势',
        ],
        skills: ['趋势分析', '快速执行', '内容营销'],
        competition: '早期进入者优势明显',
      };

    default:
      return {
        summary: `信号: ${tweet.text.slice(0, 50)}...`,
        description: '检测到潜在的赚钱机会',
        reason: '基于推文内容分析',
        actionPlan: ['进一步分析', '验证假设', '小规模测试'],
        skills: ['分析', '执行'],
        competition: '待评估',
      };
  }
}

export default signalsRouter;
