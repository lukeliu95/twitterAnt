/**
 * 推文相关 API 路由
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { TweetData, APIResponse } from '../types/index.js';
import { createMockSignal, mockSignals } from './signals.js';

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

  // 存储推文并生成信号
  for (const tweet of tweets) {
    tweetStorage.set(tweet.id, tweet);

    // 为每条推文生成一个 mock 信号
    const signalTypes = ['demand', 'revenue', 'skill', 'trend'];
    const randomType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
    const signal = createMockSignal(tweet, randomType);
    mockSignals.push(signal);

    console.log(`[API] Generated signal ${signal.id} from tweet ${tweet.id}`);
  }

  console.log(`[API] Received ${tweets.length} tweets, generated ${tweets.length} signals`);

  return c.json<APIResponse>({
    success: true,
    data: {
      accepted: tweets.length,
      rejected: 0,
      jobId: `job_${Date.now()}`,
    },
  });
});

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
