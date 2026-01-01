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
  const sortBy = c.req.query('sort') || 'score'; // score | time

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

  // 排序：先按评分降序，评分相同时按时间降序（最新的在前）
  filteredSignals = filteredSignals.sort((a, b) => {
    if (sortBy === 'time') {
      // 按时间排序：最新的在前
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    } else {
      // 默认按评分排序，评分相同时按时间
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 评分相同时，新的在前
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    }
  });

  // 限制数量
  filteredSignals = filteredSignals.slice(0, limit);

  console.log(`[API] Retrieved ${filteredSignals.length} signals for user ${userId || 'anonymous'} (sort: ${sortBy})`);

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
 * DELETE /api/v1/signals/:id
 * 删除信号（用户反馈后移除）
 */
signalsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  const index = mockSignals.findIndex(s => s.id === id);

  if (index === -1) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'SIGNAL_NOT_FOUND',
        message: 'Signal not found',
      },
    }, 404);
  }

  mockSignals.splice(index, 1);
  console.log(`[API] Deleted signal ${id}`);

  return c.json<APIResponse>({
    success: true,
    data: {
      deleted: id,
    },
  });
});

/**
 * 创建模拟信号（用于测试）
 * 根据推文内容智能生成信号和评分
 */
export function createMockSignal(tweet: any, type: string = 'demand'): Signal {
  // 计算信号评分（基于多个因素）
  const score = calculateSignalScore(tweet, type);

  // 根据类型生成不同的内容
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
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天后过期
  };
}

/**
 * 计算信号评分
 */
function calculateSignalScore(tweet: any, type: string): number {
  let score = 3; // 基础分

  // 1. 作者影响力
  if (tweet.author.verified) score += 0.5;
  if (tweet.author.followerCount > 50000) score += 0.5;
  if (tweet.author.followerCount > 100000) score += 0.5;

  // 2. 互动数据
  const engagementRatio = tweet.engagement.likes / Math.max(tweet.author.followerCount, 1);
  if (engagementRatio > 0.01) score += 0.5; // 高互动率
  if (tweet.engagement.retweets > 50) score += 0.3;
  if (tweet.engagement.likes > 100) score += 0.2;

  // 3. 内容质量
  const textLength = tweet.text.length;
  if (textLength > 100 && textLength < 500) score += 0.3; // 适中长度
  if (tweet.links && tweet.links.length > 0) score += 0.2; // 包含链接
  if (tweet.media && tweet.media.length > 0) score += 0.1; // 包含媒体

  // 4. 类型加成
  const typeBonus: Record<string, number> = {
    demand: 0.5,   // 需求缺口最有价值
    revenue: 0.8,  // 收入验证最重要
    skill: 0.3,    // 技能需求
    trend: 0.4,    // 趋势机会
  };
  score += typeBonus[type] || 0;

  // 限制在 1-5 分
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
          '查找示威项目和作品集',
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

// 导出路由器
export default signalsRouter;

// 导出 signals 存储供测试使用
export { mockSignals };
