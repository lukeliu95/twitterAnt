/**
 * 信号相关 API 路由
 */

import { Hono } from 'hono';
import type { Signal, APIResponse } from '../types/index.js';

const signalsRouter = new Hono();

// 内存存储（开发阶段）
// 实际项目中会从数据库或 AI 分析获取
let mockSignals: Signal[] = [];

/**
 * GET /api/v1/signals
 * 获取信号列表
 */
signalsRouter.get('/', (c) => {
  const userId = c.req.query('userId');
  const type = c.req.query('type');
  const minScore = c.req.query('minScore');
  const limit = parseInt(c.req.query('limit') || '20');

  let filteredSignals = mockSignals;

  // 过滤活跃信号
  filteredSignals = filteredSignals.filter(s =>
    s.expiresAt > new Date()
  );

  // 按类型过滤
  if (type) {
    filteredSignals = filteredSignals.filter(s => s.type === type);
  }

  // 按分数过滤
  if (minScore) {
    filteredSignals = filteredSignals.filter(s => s.score >= parseInt(minScore));
  }

  // 排序和限制
  filteredSignals = filteredSignals
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  console.log(`[API] Retrieved ${filteredSignals.length} signals for user ${userId || 'anonymous'}`);

  return c.json<APIResponse>({
    success: true,
    data: {
      signals: filteredSignals,
      total: filteredSignals.length,
    },
  });
});

/**
 * GET /api/v1/signals/:id
 * 获取单个信号详情
 */
signalsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const signal = mockSignals.find(s => s.id === id);

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
 * 创建模拟信号（用于测试）
 */
export function createMockSignal(tweet: any, type: string = 'demand'): Signal {
  return {
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tweetId: tweet.id,
    type: type as any,
    score: 4,
    summary: `示例信号: ${tweet.text.slice(0, 50)}...`,
    description: '这是一个模拟的赚钱机会信号，用于测试 API 功能。',
    reason: '这条推文包含潜在的需求缺口',
    actionPlan: [
      '分析推文中的具体需求',
      '评估市场规模',
      '考虑快速实现 MVP',
    ],
    matchedSkills: ['产品开发', '内容创作'],
    competition: '目前竞争较少',
    originalTweet: tweet,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天后过期
  };
}

// 导出路由器
export default signalsRouter;

// 导出 signals 存储供测试使用
export { mockSignals };
