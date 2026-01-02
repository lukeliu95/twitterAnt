/**
 * 推文相关 API 路由
 *
 * v0.3 - 支持混合分析模式：
 * 1. 立即返回原始推文（RawTweet）
 * 2. 异步执行 AI 分析
 * 3. 支持查询分析状态
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type {
  TweetData,
  APIResponse,
  BatchTweetsResponse,
  AnalysisStatusResponse,
  RawTweet,
  SignalType,
} from '../types/index.js';
import { createMockSignal } from './signals.js';
import { OrchestratorAgent } from '../agents/orchestrator-agent.js';
import { isAIConfigured } from '../config/ai.js';
import { signalDAO } from '../database/signal-dao.js';
import { RawTweetDAO } from '../database/raw-tweets-dao.js';
import { calculateRawViralityScore, adjustForAuthorInfluence, getViralityTier, HOT_TOPIC_KEYWORDS } from '../config/signal-rules.js';
import { logger } from '../utils/logger.js';

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

// 内存存储（保留用于调试）
const tweetStorage = new Map<string, TweetData>();

// 分析任务存储
const analysisJobs = new Map<string, AnalysisJob>();

// RawTweet DAO（懒加载，需要 db 实例）
let rawTweetDAO: RawTweetDAO | null = null;

// AI Agent（如果配置了）
let orchestratorAgent: OrchestratorAgent | null = null;
if (isAIConfigured()) {
  try {
    orchestratorAgent = new OrchestratorAgent();
    logger.info('[API] AI Agent initialized successfully');
  } catch (error) {
    logger.error('[API] Failed to initialize AI Agent:', error);
  }
}

/**
 * 设置数据库实例（由主 app 调用）
 */
export function setRawTweetDAO(dao: RawTweetDAO): void {
  rawTweetDAO = dao;
}

/**
 * 快速分类推文类型（基于规则的预判，< 100ms）
 */
function quickClassifyTweet(tweet: TweetData): SignalType {
  const text = tweet.text.toLowerCase();

  // 计算热度分数作为辅助判断
  const rawScore = calculateRawViralityScore(
    tweet.engagement.likes,
    tweet.engagement.retweets,
    tweet.engagement.replies,
    tweet.engagement.views
  );
  const adjustedScore = adjustForAuthorInfluence(
    rawScore,
    tweet.author.verified,
    tweet.author.followerCount
  );
  const viralityTier = getViralityTier(adjustedScore);

  // 使用配置中的关键词
  const keywords = HOT_TOPIC_KEYWORDS;

  // 计算每种类型的得分
  const scores: Record<string, number> = {};

  for (const [type, typeKeywords] of Object.entries(keywords)) {
    scores[type] = 0;
    for (const keyword of typeKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[type] += 1;
      }
    }
  }

  // 热度加成：高热度推文更可能是 social_viral
  if (viralityTier === 'viral' || viralityTier === 'high') {
    scores.social_viral = (scores.social_viral || 0) + 2;
  }

  // 作者影响力加成
  if (tweet.author.verified) {
    scores.opinion_discussion = (scores.opinion_discussion || 0) + 1;
    scores.industry_news = (scores.industry_news || 0) + 1;
  }

  // 找最高分的类型
  let maxScore = 0;
  let selectedType: SignalType = 'tech_product'; // 默认为技术产品

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedType = type as SignalType;
    }
  }

  // 如果没有任何关键词匹配，根据热度随机分配
  if (maxScore === 0) {
    if (viralityTier === 'viral' || viralityTier === 'high') {
      selectedType = 'social_viral';
    } else {
      const types: SignalType[] = ['tech_product', 'business_startup', 'opinion_discussion'];
      selectedType = types[Math.floor(Math.random() * types.length)];
    }
  }

  return selectedType;
}

/**
 * POST /api/v1/tweets
 * 提交单条推文（立即返回 RawTweet，异步分析）
 */
tweetsRouter.post('/', zValidator('json', tweetSchema), async (c) => {
  const tweet = c.req.valid('json');

  // 存储推文（保留用于调试）
  tweetStorage.set(tweet.id, tweet);

  if (!rawTweetDAO) {
    logger.warn('[API] RawTweetDAO not initialized, falling back to sync mode');
    // 降级到同步模式
    return c.json<APIResponse>({
      success: true,
      data: {
        tweetId: tweet.id,
        status: 'queued',
      },
    });
  }

  // 快速分类（< 100ms）
  const predictedType = quickClassifyTweet(tweet);

  // 创建 RawTweet 记录
  const rawTweet = await rawTweetDAO.create(tweet, predictedType);

  // 启动异步分析
  if (orchestratorAgent) {
    setImmediate(() => analyzeSingleTweet(rawTweet.id, tweet));
  }

  logger.info(`[API] Received tweet: ${tweet.id}, predicted type: ${predictedType}`);

  return c.json<APIResponse<{ rawTweet: RawTweet }>>({
    success: true,
    data: {
      rawTweet,
    },
  });
});

/**
 * POST /api/v1/tweets/batch
 * 批量提交推文（立即返回 RawTweets，异步分析）
 */
tweetsRouter.post('/batch', zValidator('json', batchTweetsSchema), async (c) => {
  const { tweets } = c.req.valid('json');

  const useAI = orchestratorAgent !== null;
  logger.info(`[API] Processing ${tweets.length} tweets using ${useAI ? 'AI Agent (hybrid)' : 'rule-based analysis'}`);

  // 存储推文
  for (const tweet of tweets) {
    tweetStorage.set(tweet.id, tweet);
  }

  if (!rawTweetDAO) {
    logger.warn('[API] RawTweetDAO not initialized, falling back to sync mode');
    // 降级到同步模式（旧版逻辑）
    return processBatchSync(tweets, useAI);
  }

  // === 混合模式：立即返回 RawTweets ===

  // 1. 快速分类所有推文（< 100ms）
  const predictedTypes = new Map<string, SignalType>();
  for (const tweet of tweets) {
    predictedTypes.set(tweet.id, quickClassifyTweet(tweet));
  }

  // 2. 批量创建 RawTweet 记录
  const rawTweets = await rawTweetDAO.createBatch(tweets, predictedTypes);

  // 3. 创建分析任务
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  analysisJobs.set(jobId, {
    id: jobId,
    tweetIds: rawTweets.map(rt => rt.tweetData.id),
    status: 'pending',
    createdAt: new Date(),
  });

  // 4. 启动异步分析
  if (useAI && orchestratorAgent) {
    setImmediate(() => analyzeBatch(rawTweets, jobId));
  } else {
    // 无 AI 时使用规则分析（仍然异步）
    setImmediate(() => analyzeBatchWithRules(rawTweets, jobId));
  }

  logger.info(`[API] Created ${rawTweets.length} raw tweets, job: ${jobId}`);

  return c.json<APIResponse<BatchTweetsResponse>>({
    success: true,
    data: {
      accepted: tweets.length,
      rejected: 0,
      rawTweets,
      jobId,
    },
  });
});

/**
 * 同步模式处理（降级方案）
 */
async function processBatchSync(tweets: TweetData[], useAI: boolean) {
  let signalsGenerated = 0;

  for (const tweet of tweets) {
    try {
      let signal;
      if (useAI && orchestratorAgent) {
        signal = await orchestratorAgent.analyze(tweet);
        if (signal) {
          await signalDAO.upsert(signal);
          signalsGenerated++;
        }
      }

      if (!signal) {
        const signalType = quickClassifyTweet(tweet);
        signal = createMockSignal(tweet, signalType);
        await signalDAO.upsert(signal);
        signalsGenerated++;
      }
    } catch (error) {
      logger.error(`[API] Failed to process tweet ${tweet.id}:`, error);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        accepted: tweets.length,
        rejected: 0,
        generated: signalsGenerated,
        analysisMethod: useAI ? 'ai' : 'rule',
        jobId: `job_${Date.now()}`,
      },
    } satisfies APIResponse),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * 异步分析单条推文
 */
async function analyzeSingleTweet(rawTweetId: string, tweet: TweetData): Promise<void> {
  if (!rawTweetDAO) return;

  try {
    // 更新状态为分析中
    await rawTweetDAO.updateStatusToAnalyzing(rawTweetId);

    // AI 分析
    const signal = await orchestratorAgent!.analyze(tweet);

    if (signal) {
      await signalDAO.upsert(signal);
      // 标记完成并关联 Signal
      await rawTweetDAO.markCompleted(rawTweetId, signal.id);
      logger.info(`[API] Analysis completed for ${rawTweetId}, signal: ${signal.id}`);
    } else {
      // AI 跳过，使用规则回退
      const signalType = quickClassifyTweet(tweet);
      const signal = createMockSignal(tweet, signalType);
      await signalDAO.upsert(signal);
      await rawTweetDAO.markCompleted(rawTweetId, signal.id);
      logger.info(`[API] Rule fallback for ${rawTweetId}, signal: ${signal.id}`);
    }
  } catch (error) {
    logger.error(`[API] Analysis failed for ${rawTweetId}:`, error);
    await rawTweetDAO.markFailed(rawTweetId, String(error));
  }
}

/**
 * 异步分析批量推文
 */
async function analyzeBatch(rawTweets: RawTweet[], jobId: string): Promise<void> {
  if (!rawTweetDAO) return;

  const job = analysisJobs.get(jobId);
  if (!job) return;

  job.status = 'processing';

  let completed = 0;
  let failed = 0;

  for (const rawTweet of rawTweets) {
    try {
      // 更新状态为分析中
      await rawTweetDAO.updateStatusToAnalyzing(rawTweet.id);

      // AI 分析
      const signal = await orchestratorAgent!.analyze(rawTweet.tweetData);

      if (signal) {
        await signalDAO.upsert(signal);
        await rawTweetDAO.markCompleted(rawTweet.id, signal.id);
        completed++;
      } else {
        // AI 跳过，使用规则回退
        const signalType = rawTweet.predictedType || 'viral';
        const signal = createMockSignal(rawTweet.tweetData, signalType);
        await signalDAO.upsert(signal);
        await rawTweetDAO.markCompleted(rawTweet.id, signal.id);
        completed++;
      }
    } catch (error) {
      logger.error(`[API] Analysis failed for ${rawTweet.id}:`, error);
      await rawTweetDAO.markFailed(rawTweet.id, String(error));
      failed++;
    }
  }

  // 更新任务状态
  job.status = 'completed';
  job.completedAt = new Date();
  job.results = { successful: completed, failed };

  logger.info(`[API] Job ${jobId} completed: ${completed} success, ${failed} failed`);
}

/**
 * 使用规则分析批量推文（无 AI 时的回退）
 */
async function analyzeBatchWithRules(rawTweets: RawTweet[], jobId: string): Promise<void> {
  if (!rawTweetDAO) return;

  const job = analysisJobs.get(jobId);
  if (!job) return;

  job.status = 'processing';

  let completed = 0;

  for (const rawTweet of rawTweets) {
    try {
      await rawTweetDAO.updateStatusToAnalyzing(rawTweet.id);

      const signalType = rawTweet.predictedType || 'viral';
      const signal = createMockSignal(rawTweet.tweetData, signalType);
      await signalDAO.upsert(signal);
      await rawTweetDAO.markCompleted(rawTweet.id, signal.id);
      completed++;
    } catch (error) {
      logger.error(`[API] Rule analysis failed for ${rawTweet.id}:`, error);
      await rawTweetDAO.markFailed(rawTweet.id, String(error));
    }
  }

  job.status = 'completed';
  job.completedAt = new Date();
  job.results = { successful: completed, failed: 0 };

  logger.info(`[API] Job ${jobId} completed with rules: ${completed} success`);
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

/**
 * GET /api/v1/analysis/status/:jobId
 * 查询分析任务状态
 */
tweetsRouter.get('/analysis/status/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const job = analysisJobs.get(jobId);

  if (!job) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'JOB_NOT_FOUND',
        message: 'Analysis job not found',
      },
    }, 404);
  }

  // 获取相关的 RawTweets 和 Signals
  let rawTweets: RawTweet[] = [];
  let signals: any[] = [];

  if (rawTweetDAO) {
    rawTweets = rawTweetDAO.getRecent(100, true);
    // 获取已完成的 Signals
    signals = await Promise.all(
      rawTweets
        .filter(rt => rt.signalId)
        .map(async rt => {
          try {
            return await signalDAO.getById(rt.signalId!);
          } catch {
            return null;
          }
        })
    ).then(results => results.filter(s => s !== null));
  }

  const response: AnalysisStatusResponse = {
    jobId: job.id,
    status: job.status,
    total: job.tweetIds.length,
    completed: job.results?.successful || 0,
    failed: job.results?.failed || 0,
    rawTweets,
    signals,
  };

  return c.json<APIResponse<AnalysisStatusResponse>>({
    success: true,
    data: response,
  });
});

/**
 * GET /api/v1/raw-tweets
 * 获取最近的原始推文
 */
tweetsRouter.get('/raw/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  const includeCompleted = c.req.query('includeCompleted') === 'true';

  if (!rawTweetDAO) {
    return c.json<APIResponse>({
      success: false,
      error: {
        code: 'DAO_NOT_INITIALIZED',
        message: 'RawTweetDAO not initialized',
      },
    }, 503);
  }

  const rawTweets = await rawTweetDAO.getRecent(limit, includeCompleted);

  return c.json<APIResponse>({
    success: true,
    data: {
      rawTweets,
      total: rawTweets.length,
    },
  });
});

/**
 * AnalysisJob 类型定义（内部使用）
 */
interface AnalysisJob {
  id: string;
  tweetIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  results?: {
    successful: number;
    failed: number;
  };
}

export default tweetsRouter;
