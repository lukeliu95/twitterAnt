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
  // category: string; // Removed
  score: number;
  aiSummary: string;
  detailedExplanation?: string;  // 详细解读，用于 hover 显示
  whyItMatters?: string;  // 为什么值得关注
  keyInsights?: string[];  // 关键洞察点
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

