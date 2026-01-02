/**
 * 推文数据结构定义
 */

export interface TweetData {
  /** 推文 ID */
  id: string;
  /** 推文文本内容 */
  text: string;
  /** 作者信息 */
  author: TweetAuthor;
  /** 互动数据 */
  engagement: TweetEngagement;
  /** 发布时间 */
  timestamp: string;
  /** 推文链接 */
  url: string;
  /** 推文类型 */
  type: TweetType;
  /** 媒体文件 */
  media?: string[];
  /** 外部链接 */
  links?: string[];
}

export interface TweetAuthor {
  /** 用户名 */
  username: string;
  /** 显示名称 */
  displayName: string;
  /** 是否认证 */
  verified: boolean;
  /** 粉丝数 */
  followerCount: number;
}

export interface TweetEngagement {
  /** 回复数 */
  replies: number;
  /** 转发数 */
  retweets: number;
  /** 点赞数 */
  likes: number;
  /** 浏览数 */
  views: number;
}

export type TweetType = 'original' | 'retweet' | 'reply' | 'quote';

/**
 * 信号数据结构定义
 */
export interface Signal {
  /** 信号 ID */
  id: string;
  /** 关联的推文 ID */
  tweetId: string;
  /** 信号类型 */
  type: SignalType;
  /** 信号评分 (1-5) */
  score: number;
  /** 一句话摘要 */
  summary: string;
  /** 详细描述 */
  description: string;
  /** 为什么推给用户 */
  reason: string;
  /** 行动建议 */
  actionPlan: string[];
  /** 匹配的技能 */
  matchedSkills?: string[];
  /** 竞品分析 */
  competition?: string;
  /** 原始推文 */
  originalTweet: TweetData;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 是否已保存 */
  saved?: boolean;
  /** 是否已行动 */
  acted?: boolean;
  /** 用户备注 */
  userNotes?: string;
}

export type SignalType =
  // 新版 - 7大热门议题（匹配后端）
  | 'tech_product'        // 技术与产品
  | 'business_startup'    // 商业与创投
  | 'income_monetization' // 搞钱与副业
  | 'data_insights'       // 数据与洞察
  | 'skills_learning'     // 技能与成长
  | 'opinion_discussion'  // 观点与讨论
  | 'social_viral'        // 爆发与热点
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
 * 用户反馈类型
 */
export type FeedbackAction = 'saved' | 'acted' | 'ignored';

export interface UserFeedback {
  /** 信号 ID */
  signalId: string;
  /** 用户操作 */
  action: FeedbackAction;
  /** 用户备注 */
  note?: string;
}

/**
 * Chrome 消息类型
 */
export type MessageType =
  | 'NEW_TWEET'
  | 'GET_SIGNALS'
  | 'SEND_FEEDBACK'
  | 'TWEETS_BATCH';

export interface ChromeMessage {
  type: MessageType;
  data?: unknown;
}
