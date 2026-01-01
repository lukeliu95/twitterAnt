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
}

export type SignalType =
  // 新版 - 热门议题类型
  | 'viral'           // 爆发话题
  | 'insightful'      // 深度讨论
  | 'data_driven'     // 数据观点
  | 'industry_news'   // 行业动态
  | 'controversial'   // 争议议题
  // 旧版 - 保留用于向后兼容
  | 'demand'
  | 'revenue'
  | 'skill'
  | 'trend';

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
