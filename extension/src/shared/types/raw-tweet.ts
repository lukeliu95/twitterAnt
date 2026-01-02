/**
 * RawTweet 类型定义 - 前端版本
 *
 * 尚未完成 AI 分析的推文
 */

export interface RawTweet {
  id: string;
  tweetData: TweetData;
  status: 'pending_analysis' | 'analyzing' | 'completed' | 'failed';
  predictedType?: SignalType;
  createdAt: string;
  signalId?: string;
  error?: string;
}

export interface TweetData {
  id: string;
  text: string;
  author: TweetAuthor;
  engagement: TweetEngagement;
  timestamp: string;
  url: string;
  type: 'original' | 'retweet' | 'reply' | 'quote';
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

export type SignalType =
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
 * 格式化数字为中文
 */
export function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}千`;
  return `${num}`;
}

/**
 * 获取信号类型标签
 */
export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  viral: '🔥 爆发话题',
  insightful: '💡 深度讨论',
  data_driven: '📊 数据观点',
  industry_news: '🎯 行业动态',
  controversial: '⚡ 争议议题',
  demand: '💰 需求',
  revenue: '📈 收入',
  skill: '🎯 技能',
  trend: '🔥 趋势',
};
