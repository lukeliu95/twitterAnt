/**
 * 推文相关 API 路由
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { TweetData, APIResponse } from '../types/index.js';
import { createMockSignal, mockSignals } from './signals.js';
import { OrchestratorAgent } from '../agents/orchestrator-agent.js';
import { isAIConfigured } from '../config/ai.js';

const tweetsRouter = new Hono();

// 验证推文数据的 schema
const tweetSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  author: z.object({
    username: z.string(),
    displayName: z.string(),
    verified: z.boolean(),
    followerCount: z.number().int().min(0),
  }),
  engagement: z.object({
    replies: z.number().int().min(0),
    retweets: z.number().int().min(0),
    likes: z.number().int().min(0),
    views: z.number().int().min(0),
  }),
  timestamp: z.string(),
  url: z.string().url(),
  type: z.enum(['original', 'retweet', 'reply', 'quote']),
  media: z.array(z.string().url()).optional(),
  links: z.array(z.string().url()).optional(),
});

const batchTweetsSchema = z.object({
  tweets: z.array(tweetSchema).min(1).max(50),
});

// 内存存储（开发阶段）
const tweetStorage = new Map<string, TweetData>();

// AI Agent（如果配置了）
let orchestratorAgent: OrchestratorAgent | null = null;
if (isAIConfigured()) {
  try {
    orchestratorAgent = new OrchestratorAgent();
    console.log('[API] AI Agent initialized successfully');
  } catch (error) {
    console.error('[API] Failed to initialize AI Agent:', error);
  }
}

/**
 * POST /api/v1/tweets
 * 提交单条推文
 */
tweetsRouter.post('/', zValidator('json', tweetSchema), async (c) => {
  const tweet = c.req.valid('json');

  // 存储推文
  tweetStorage.set(tweet.id, tweet);

  console.log(`[API] Received tweet: ${tweet.id} by @${tweet.author.username}`);

  return c.json<APIResponse>({
    success: true,
    data: {
      tweetId: tweet.id,
      status: 'queued',
    },
  });
});

/**
 * POST /api/v1/tweets/batch
 * 批量提交推文
 */
tweetsRouter.post('/batch', zValidator('json', batchTweetsSchema), async (c) => {
  const { tweets } = c.req.valid('json');

  const useAI = orchestratorAgent !== null;
  console.log(`[API] Processing ${tweets.length} tweets using ${useAI ? 'AI Agent' : 'rule-based analysis'}`);

  let signalsGenerated = 0;

  // 存储推文并生成信号
  for (const tweet of tweets) {
    tweetStorage.set(tweet.id, tweet);

    try {
      let signal;

      if (useAI && orchestratorAgent) {
        // 使用 AI Agent 分析
        signal = await orchestratorAgent.analyze(tweet);
        if (signal) {
          mockSignals.push(signal);
          console.log(`[API] AI Generated ${signal.type} signal ${signal.id} (score: ${signal.score}) from tweet ${tweet.id}`);
          signalsGenerated++;
        } else {
          console.log(`[API] AI skipped tweet ${tweet.id}`);
        }
      } else {
        // 回退到规则分析
        const signalType = classifyTweet(tweet);
        signal = createMockSignal(tweet, signalType);
        mockSignals.push(signal);
        console.log(`[API] Rule Generated ${signalType} signal ${signal.id} from tweet ${tweet.id}`);
        signalsGenerated++;
      }
    } catch (error) {
      console.error(`[API] Failed to process tweet ${tweet.id}:`, error);
      // 出错时使用规则回退
      const signalType = classifyTweet(tweet);
      const signal = createMockSignal(tweet, signalType);
      mockSignals.push(signal);
      signalsGenerated++;
    }
  }

  console.log(`[API] Received ${tweets.length} tweets, generated ${signalsGenerated} signals`);

  return c.json<APIResponse>({
    success: true,
    data: {
      accepted: tweets.length,
      rejected: 0,
      generated: signalsGenerated,
      analysisMethod: useAI ? 'ai' : 'rule',
      jobId: `job_${Date.now()}`,
    },
  });
});

/**
 * 智能分类推文类型
 */
function classifyTweet(tweet: TweetData): string {
  const text = tweet.text.toLowerCase();

  // 关键词匹配权重
  const scores: Record<string, number> = {
    demand: 0,
    revenue: 0,
    skill: 0,
    trend: 0,
  };

  // 需求缺口关键词
  const demandKeywords = ['looking for', 'need', 'want', '有没有', '需要', '求', 'find', 'recommend'];
  // 收入验证关键词
  const revenueKeywords = ['revenue', 'income', 'mrr', 'arr', 'made', 'earning', '赚', '收入', '$', 'profit'];
  // 技能需求关键词
  const skillKeywords = ['hiring', 'freelancer', 'developer', 'engineer', '招聘', '外包', 'contractor'];
  // 趋势机会关键词
  const trendKeywords = ['ai', 'gpt', 'trending', 'launch', 'web3', 'crypto', 'trend', '趋势', 'beta'];

  // 计算每种类型的得分
  for (const keyword of demandKeywords) {
    if (text.includes(keyword)) scores.demand += 1;
  }
  for (const keyword of revenueKeywords) {
    if (text.includes(keyword)) scores.revenue += 1.5; // 收入类权重更高
  }
  for (const keyword of skillKeywords) {
    if (text.includes(keyword)) scores.skill += 1;
  }
  for (const keyword of trendKeywords) {
    if (text.includes(keyword)) scores.trend += 0.8;
  }

  // 特殊规则
  // 包含金额符号的优先判断为收入验证
  if (text.includes('$') || text.includes('usd') || /\d+k\s*usd/i.test(text)) {
    scores.revenue += 2;
  }

  // 招聘类判断为技能需求
  if (text.includes('hiring') || text.includes('招聘') || text.includes('we need')) {
    scores.skill += 2;
  }

  // 找最高分的类型
  let maxScore = 0;
  let selectedType = 'demand'; // 默认为需求缺口

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedType = type;
    }
  }

  // 如果没有任何关键词匹配，根据作者影响力随机分配
  if (maxScore === 0) {
    const types = ['demand', 'trend', 'skill'];
    selectedType = types[Math.floor(Math.random() * types.length)];
  }

  return selectedType;
}

/**
 * GET /api/v1/tweets
 * 获取所有推文（调试用）
 */
tweetsRouter.get('/', (c) => {
  const tweets = Array.from(tweetStorage.values());

  return c.json<APIResponse>({
    success: true,
    data: {
      tweets,
      total: tweets.length,
    },
  });
});

/**
 * GET /api/v1/tweets/:id
 * 获取单条推文
 */
tweetsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const tweet = tweetStorage.get(id);

  if (!tweet) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'TWEET_NOT_FOUND',
        message: 'Tweet not found',
      },
    }, 404);
  }

  return c.json<APIResponse>({
    success: true,
    data: tweet,
  });
});

export default tweetsRouter;
