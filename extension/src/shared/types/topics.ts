/**
 * 议题配置类型定义 - 简化版 v0.4
 *
 * 设计原则：
 * - 7大热门议题直接对应信号类型
 * - 用户选择感兴趣的议题类型
 * - 系统根据选择过滤相关信号
 */

/**
 * 议题定义 - 对应7大热门议题
 */
export interface Topic {
  id: string;  // 与 SignalType 一致
  label: string;
  icon: string;
  description: string;
  keywords: string[];
  estimatedSignals: number; // 预估日均信号数
  isRecommended: boolean; // 是否推荐
}

/**
 * 用户议题配置
 */
export interface TopicConfig {
  enabledTopics: string[];
  lastUpdated: number;
}

/**
 * 7大热门议题配置
 */
export const TOPICS: Topic[] = [
  {
    id: 'tech_product',
    label: '技术与产品',
    icon: '📱',
    description: 'AI、Web3、SaaS及开发工具相关的新动态',
    keywords: [
      'ai', 'gpt', 'chatgpt', 'claude', 'llm', 'openai', 'anthropic', '人工智能',
      'machine learning', 'deep learning',
      'web3', 'crypto', 'blockchain', 'bitcoin', 'btc', 'eth', 'ethereum', 'defi', 'nft', '区块链', '加密货币',
      'react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'rust', 'go', 'frontend', 'backend',
      'saas', 'product hunt', 'startup', 'launch', 'product', 'mvp', 'pmf',
      'ios', 'android', 'flutter', 'react native', 'swift', 'kotlin', 'app store', 'play store'
    ],
    estimatedSignals: 50,
    isRecommended: true,
  },
  {
    id: 'business_startup',
    label: '商业与创业',
    icon: '💼',
    description: '创业融资、独立开发与商业增长策略',
    keywords: [
      'funding', 'ipo', 'acquisition', 'vc', 'venture capital', 'angel investor', 'series a', 'seed round', 'valuation',
      'indie hacker', 'solopreneur', 'side project', 'bootstrapped', 'ramen profitable', 'micro saas',
      'marketing', 'growth', 'seo', 'ads', 'funnel', 'conversion', 'cac', 'ltv', 'churn',
      'remote work', 'digital nomad', 'distributed team', 'hybrid', 'async', 'location independent',
      'hiring', 'job', 'career', 'resume', 'interview', 'recruiting', 'we are hiring'
    ],
    estimatedSignals: 45,
    isRecommended: true,
  },
  {
    id: 'income_monetization',
    label: '收入与变现',
    icon: '💰',
    description: '探索副业、自由职业及多元化收入渠道',
    keywords: [
      'passive income', 'side hustle', 'dividend', 'rental income', 'automated income',
      'freelance', 'consulting', 'contractor', 'upwork', 'fiverr', 'remote freelancer',
      'content creator', 'youtuber', 'newsletter', 'podcast', 'substack', 'patreon', 'sponsorship',
      'ecommerce', 'dropshipping', 'shopify', 'amazon fba', 'print on demand', 'd2c',
      'subscription', 'recurring revenue', 'mrr', 'arr', 'churn', 'retention', 'lifecycle',
      'revenue', 'income', 'monetization', 'profit', 'making money'
    ],
    estimatedSignals: 40,
    isRecommended: true,
  },
  {
    id: 'data_insights',
    label: '数据与洞察',
    icon: '📊',
    description: '基于数据分析的行业趋势与市场洞察',
    keywords: [
      'research', 'report', 'survey', 'study', 'analysis', 'whitepaper', 'case study',
      'metrics', 'analytics', 'kpi', 'dashboard', 'data', 'attribution', 'cohort',
      'user behavior', 'psychology', 'habits', 'ux research', 'user interview', 'persona',
      'trend', 'forecast', 'prediction', 'outlook', 'market analysis', 'future of',
      'data', 'insights', 'statistics', 'numbers', 'chart', 'graph'
    ],
    estimatedSignals: 30,
    isRecommended: false,
  },
  {
    id: 'skills_learning',
    label: '技能与学习',
    icon: '🎯',
    description: '提升编程、设计及工作效率的实用技能',
    keywords: [
      'programming', 'coding', 'algorithm', 'code', 'debug', 'best practices', 'clean code',
      'design', 'ui', 'ux', 'figma', 'sketch', 'prototype', 'user interface', 'user experience',
      'productivity', 'tools', 'automation', 'workflow', 'notion', 'obsidian', 'roam research',
      'learning', 'education', 'course', 'tutorial', 'how to', 'guide', 'study tips', 'resources',
      'skill', 'learn', 'master', 'improve', 'develop', 'grow'
    ],
    estimatedSignals: 35,
    isRecommended: false,
  },
  {
    id: 'opinion_discussion',
    label: '观点与讨论',
    icon: '💡',
    description: '引发思考的深度观点与行业争议',
    keywords: [
      'hot take', 'unpopular opinion', 'controversial', 'takes', 'thoughts on', 'my take',
      'mental model', 'framework', 'thesis', 'principle', 'philosophy', 'first principles',
      'debate', 'argument', 'discussion', 'thoughts', 'what do you think', 'serious question',
      'my take', 'lessons learned', 'advice', 'experience', 'things i learned', 'reflection',
      'opinion', 'perspective', 'viewpoint', 'stance', 'position'
    ],
    estimatedSignals: 45,
    isRecommended: false,
  },
  {
    id: 'social_viral',
    label: '社会热点',
    icon: '🌍',
    description: '全网关注的突发新闻与行业大事件',
    keywords: [
      'breaking', 'news', 'announcement', 'just in', 'exclusive', 'official',
      'layoff', 'acquisition', 'bankruptcy', 'scandal', 'crisis', 'shutdown', 'reorg',
      'timeline', 'update', 'developing', 'live', 'ongoing', 'situation',
      'viral', 'trending', 'hot topic', 'everyone is talking about',
      'event', 'happening', 'unfolding'
    ],
    estimatedSignals: 25,
    isRecommended: false,
  },
];

/**
 * 默认配置：新用户默认选择的议题
 */
export const DEFAULT_TOPICS: string[] = ['tech_product', 'business_startup', 'income_monetization'];

/**
 * 最少选择数量
 */
export const MIN_TOPICS_REQUIRED = 2;

/**
 * 最多选择数量
 */
export const MAX_TOPICS_ALLOWED = 7;

/**
 * 估算每日信号数量
 */
export function estimateSignalCount(topicIds: string[]): number {
  let total = 0;

  for (const topic of TOPICS) {
    if (topicIds.includes(topic.id)) {
      total += topic.estimatedSignals;
    }
  }

  return total;
}

/**
 * 根据议题 ID 获取议题
 */
export function getTopicById(id: string): Topic | undefined {
  return TOPICS.find(topic => topic.id === id);
}

/**
 * 根据议题 ID 获取关键词
 */
export function getKeywordsForTopicIds(topicIds: string[]): string[] {
  const keywords: string[] = [];

  for (const topicId of topicIds) {
    const topic = getTopicById(topicId);
    if (topic) {
      keywords.push(...topic.keywords);
    }
  }

  return [...new Set(keywords)];
}
