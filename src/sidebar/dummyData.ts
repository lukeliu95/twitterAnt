import { Signal } from '../types';

export const DUMMY_SIGNALS: Signal[] = [
  {
    signalId: '1',
    tweetId: '1234567890',
    userId: 'user1',
    score: 85,
    aiSummary: 'OpenAI 发布新的 Agent SDK，支持多工具调用和流式响应',
    matchReasons: [
      { type: 'keyword', value: 'AI Agent', weight: 0.85 },
      { type: 'engagement', value: '2.3K 转发', weight: 0.70 }
    ],
    tweet: {
      tweetId: '1234567890',
      authorHandle: 'OpenAI',
      authorName: 'OpenAI',
      content: 'Introducing the new Agent SDK. Build powerful AI agents with ease. #AI #Agent',
      timestamp: new Date().toISOString(),
      engagement: { replies: 120, retweets: 2300, likes: 5000, views: 100000 },
      media: [],
      links: [],
      tweetUrl: 'https://twitter.com/OpenAI/status/1234567890',
      capturedAt: new Date().toISOString()
    },
    bookmarked: false,
    read: false,
    detectedAt: new Date().toISOString()
  },
  {
    signalId: '2',
    tweetId: '0987654321',
    userId: 'user1',
    score: 78,
    aiSummary: 'YCombinator S24 批次开放申请，重点关注 AI 垂直应用',
    matchReasons: [
      { type: 'keyword', value: 'Startup', weight: 0.8 },
      { type: 'timing', value: 'Just now', weight: 0.9 }
    ],
    tweet: {
      tweetId: '0987654321',
      authorHandle: 'ycombinator',
      authorName: 'Y Combinator',
      content: 'Applications for S24 are now open. We are looking for the next generation of AI startups.',
      timestamp: new Date().toISOString(),
      engagement: { replies: 50, retweets: 500, likes: 1200, views: 50000 },
      media: [],
      links: [],
      tweetUrl: 'https://twitter.com/ycombinator/status/0987654321',
      capturedAt: new Date().toISOString()
    },
    bookmarked: true,
    read: true,
    detectedAt: new Date().toISOString()
  }
];
