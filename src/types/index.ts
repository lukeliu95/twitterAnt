export interface UserProfile {
  userId: string;
  persona: 'developer' | 'entrepreneur' | 'creator';
  interests: Interest[];
  customKeywords: string[];
  scanSettings: ScanSettings;
  displaySettings: DisplaySettings;
  createdAt: string;
  lastUpdated: string;
}

export interface Interest {
  categoryId: string;
  label: string;
  weight: number;
  keywords: string[];
  enabled: boolean;
}

export interface ScanSettings {
  autoScanEnabled: boolean;
  scanBatchSize: 10 | 20 | 50;
  sensitivity: 'high' | 'medium' | 'low';
  minScore: number;
}

export interface DisplaySettings {
  theme: 'serene' | 'contrast' | 'dark';
  cardDensity: 'comfortable' | 'compact';
  showEngagement: boolean;
  showMatchReasons: boolean;
  autoExpandTweet: boolean;
}

export interface Tweet {
  tweetId: string;
  authorHandle: string;
  authorName: string;
  content: string;
  timestamp: string;
  engagement: Engagement;
  media: Media[];
  links: string[];
  tweetUrl: string;
  capturedAt: string;
}

export interface Engagement {
  replies: number;
  retweets: number;
  likes: number;
  views: number;
}

export interface Media {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnailUrl?: string;
}

export interface Signal {
  signalId: string;
  tweetId: string;
  userId: string;
  category: string;
  score: number;
  aiSummary: string;
  matchReasons: MatchReason[];
  tweet: Tweet;
  userFeedback?: 'useful' | 'not_interested' | 'wrong';
  bookmarked: boolean;
  read: boolean;
  detectedAt: string;
  readAt?: string;
  feedbackAt?: string;
}

export interface MatchReason {
  type: 'keyword' | 'engagement' | 'timing' | 'related_account';
  value: string;
  weight: number;
  explanation?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  description: string;
  defaultKeywords: string[];
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'tech_products',
    label: '技术与产品',
    icon: '📱',
    description: 'AI突破、新工具发布、Web3动态',
    defaultKeywords: ['AI', 'API', '开源', 'framework', 'library'],
    color: '#3b82f6'
  },
  {
    id: 'business_startup',
    label: '商业与创业',
    icon: '💼',
    description: '融资新闻、独立开发者故事、增长策略',
    defaultKeywords: ['融资', 'IPO', '创业', 'startup', 'founder'],
    color: '#8b5cf6'
  },
  {
    id: 'monetization',
    label: '收入与变现',
    icon: '💰',
    description: '副业机会、收入报告、自由职业',
    defaultKeywords: ['赚钱', '副业', 'MRR', 'revenue', 'freelance'],
    color: '#10b981'
  },
  {
    id: 'data_insights',
    label: '数据与洞察',
    icon: '📊',
    description: '行业报告、增长指标、趋势分析',
    defaultKeywords: ['数据', '报告', 'metrics', 'analytics', 'trends'],
    color: '#f59e0b'
  },
  {
    id: 'skills_learning',
    label: '技能与学习',
    icon: '🎯',
    description: '教程指南、设计技巧、效率工具',
    defaultKeywords: ['教程', '学习', 'tutorial', 'guide', 'tips'],
    color: '#ec4899'
  },
  {
    id: 'opinions',
    label: '观点与讨论',
    icon: '💡',
    description: '深度长文、热门观点、行业争议',
    defaultKeywords: ['思考', '观点', 'opinion', 'debate', 'thread'],
    color: '#6366f1'
  },
  {
    id: 'trending',
    label: '社会热点',
    icon: '🔥',
    description: '突发新闻和重大事件',
    defaultKeywords: ['breaking', '突发', 'news', '热点'],
    color: '#ef4444'
  }
];
