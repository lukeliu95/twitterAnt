/**
 * 共享类型定义
 */

export interface TweetData {
  id: string;
  text: string;
  author: TweetAuthor;
  engagement: TweetEngagement;
  timestamp: string;
  url: string;
  type: TweetType;
  media?: string[];
  links?: string[];
}

export interface TweetAuthor {
  username: string;
  displayName: string;
  verified: boolean;
  followerCount: number;
}

export interface TweetEngagement {
  replies: number;
  retweets: number;
  likes: number;
  views: number;
}

export type TweetType = 'original' | 'retweet' | 'reply' | 'quote';

/**
 * 原始推文 - 尚未完成 AI 分析的推文
 */
export interface RawTweet {
  id: string;
  tweetData: TweetData;
  status: 'pending_analysis' | 'analyzing' | 'completed' | 'failed';
  predictedType?: SignalType;  // 基于规则快速预判的类型
  createdAt: Date;
  signalId?: string;  // 分析完成后的关联 Signal ID
  error?: string;  // 失败时的错误信息
}

/**
 * 信号 - AI 分析完成后的完整结果
 */
export interface Signal {
  id: string;
  tweetId: string;
  type: SignalType;
  score: number;
  summary: string;
  description: string;
  reason: string;
  actionPlan: string[];
  matchedSkills?: string[];
  competition?: string;
  originalTweet: TweetData;
  createdAt: Date;
  expiresAt: Date;
  saved?: boolean;
  userNotes?: string;
  // 新增：分析状态（支持流式显示）
  analysisStatus?: 'pending' | 'analyzing' | 'completed';
  analysisProgress?: number;  // 0-100
}

export type SignalType =
  // 新版 - 7大热门议题
  | 'tech_product'
  | 'business_startup'
  | 'income_monetization'
  | 'data_insights'
  | 'skills_learning'
  | 'opinion_discussion'
  | 'social_viral'
  // 旧版 - 向后兼容
  | 'viral'
  | 'insightful'
  | 'data_driven'
  | 'industry_news'
  | 'controversial'
  | 'demand'
  | 'revenue'
  | 'skill'
  | 'trend';

/**
 * 分析任务 - 用于追踪异步分析进度
 */
export interface AnalysisJob {
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

export interface UserFeedback {
  signalId: string;
  action: 'saved' | 'acted' | 'ignored';
  note?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 批量推文提交响应
 */
export interface BatchTweetsResponse {
  accepted: number;
  rejected: number;
  rawTweets: RawTweet[];
  jobId: string;
}

/**
 * 分析状态响应
 */
export interface AnalysisStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
  rawTweets: RawTweet[];
  signals: Signal[];
}
