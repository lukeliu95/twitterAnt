/**
 * 议题配置类型定义
 *
 * 从 backend/src/config/signal-rules.ts 复制
 * 用于前端配置页面
 */

/**
 * 议题定义
 */
export interface Topic {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
  estimatedSignals: number; // 预估日均信号数
  isRecommended: boolean; // 是否推荐
}

/**
 * 议题分类
 */
export interface TopicCategory {
  id: string;
  label: string;
  icon: string;
  topics: Topic[];
}

/**
 * 用户议题配置
 */
export interface TopicConfig {
  enabledTopics: string[];
  lastUpdated: number;
}

/**
 * 完整的议题分类配置
 */
export const TOPIC_CATEGORIES: Record<string, TopicCategory> = {
  // 📱 技术与产品
  tech_product: {
    id: 'tech_product',
    label: '技术与产品',
    icon: '📱',
    topics: [
      {
        id: 'ai_llm',
        label: 'AI/LLM',
        icon: '🤖',
        keywords: ['ai', 'gpt', 'chatgpt', 'claude', 'llm', 'openai', 'anthropic', '人工智能', 'machine learning', 'deep learning'],
        estimatedSignals: 50,
        isRecommended: true,
      },
      {
        id: 'web3_crypto',
        label: 'Web3/Crypto',
        icon: '💰',
        keywords: ['web3', 'crypto', 'blockchain', 'bitcoin', 'btc', 'eth', 'ethereum', 'defi', 'nft', '区块链', '加密货币'],
        estimatedSignals: 30,
        isRecommended: false,
      },
      {
        id: 'dev_tools',
        label: '开发工具',
        icon: '💻',
        keywords: ['react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'rust', 'go', 'frontend', 'backend', 'fullstack'],
        estimatedSignals: 20,
        isRecommended: false,
      },
      {
        id: 'saas_product',
        label: 'SaaS/产品',
        icon: '🚀',
        keywords: ['saas', 'product hunt', 'startup', 'launch', 'product', 'mvp', 'pmf', 'iteration'],
        estimatedSignals: 15,
        isRecommended: false,
      },
      {
        id: 'mobile_dev',
        label: '移动开发',
        icon: '📲',
        keywords: ['ios', 'android', 'flutter', 'react native', 'swift', 'kotlin', 'app store', 'play store'],
        estimatedSignals: 12,
        isRecommended: false,
      },
    ],
  },

  // 💼 商业与创业
  business_startup: {
    id: 'business_startup',
    label: '商业与创业',
    icon: '💼',
    topics: [
      {
        id: 'funding',
        label: '创业融资',
        icon: '💵',
        keywords: ['funding', 'ipo', 'acquisition', 'vc', 'venture capital', 'angel investor', 'series a', 'seed round', 'valuation'],
        estimatedSignals: 25,
        isRecommended: true,
      },
      {
        id: 'indie_hacker',
        label: '独立开发',
        icon: '👤',
        keywords: ['indie hacker', 'solopreneur', 'side project', 'bootstrapped', 'ramen profitable', 'micro saas'],
        estimatedSignals: 18,
        isRecommended: true,
      },
      {
        id: 'marketing',
        label: '营销增长',
        icon: '📈',
        keywords: ['marketing', 'growth', 'seo', 'ads', 'funnel', 'conversion', 'cac', 'ltv', 'churn'],
        estimatedSignals: 12,
        isRecommended: false,
      },
      {
        id: 'remote_work',
        label: '远程工作',
        icon: '🏠',
        keywords: ['remote work', 'digital nomad', 'distributed team', 'hybrid', 'async', 'location independent'],
        estimatedSignals: 15,
        isRecommended: false,
      },
      {
        id: 'hiring',
        label: '招聘求职',
        icon: '💼',
        keywords: ['hiring', 'job', 'career', 'resume', 'interview', 'recruiting', 'we are hiring'],
        estimatedSignals: 20,
        isRecommended: false,
      },
    ],
  },

  // 💰 收入与变现
  income_monetization: {
    id: 'income_monetization',
    label: '收入与变现',
    icon: '💰',
    topics: [
      {
        id: 'passive_income',
        label: '被动收入',
        icon: '💎',
        keywords: ['passive income', 'side hustle', 'dividend', 'rental income', 'automated income'],
        estimatedSignals: 35,
        isRecommended: false,
      },
      {
        id: 'freelance',
        label: '自由职业',
        icon: '🔧',
        keywords: ['freelance', 'consulting', 'contractor', 'upwork', 'fiverr', 'remote freelancer'],
        estimatedSignals: 22,
        isRecommended: false,
      },
      {
        id: 'content_creator',
        label: '内容创作',
        icon: '📹',
        keywords: ['content creator', 'youtuber', 'newsletter', 'podcast', 'substack', 'patreon', 'sponsorship'],
        estimatedSignals: 22,
        isRecommended: false,
      },
      {
        id: 'ecommerce',
        label: '电商模式',
        icon: '🛒',
        keywords: ['ecommerce', 'dropshipping', 'shopify', 'amazon fba', 'print on demand', 'd2c'],
        estimatedSignals: 18,
        isRecommended: false,
      },
      {
        id: 'subscription',
        label: '订阅经济',
        icon: '🔄',
        keywords: ['subscription', 'recurring revenue', 'mrr', 'arr', 'churn', 'retention', 'lifecycle'],
        estimatedSignals: 15,
        isRecommended: false,
      },
    ],
  },

  // 📊 数据与洞察
  data_insights: {
    id: 'data_insights',
    label: '数据与洞察',
    icon: '📊',
    topics: [
      {
        id: 'research',
        label: '行业报告',
        icon: '📋',
        keywords: ['research', 'report', 'survey', 'study', 'analysis', 'whitepaper', 'case study'],
        estimatedSignals: 20,
        isRecommended: false,
      },
      {
        id: 'metrics',
        label: '增长指标',
        icon: '📊',
        keywords: ['metrics', 'analytics', 'kpi', 'dashboard', 'data', 'attribution', 'cohort'],
        estimatedSignals: 18,
        isRecommended: false,
      },
      {
        id: 'user_behavior',
        label: '用户行为',
        icon: '🧠',
        keywords: ['user behavior', 'psychology', 'habits', 'ux research', 'user interview', 'persona'],
        estimatedSignals: 15,
        isRecommended: false,
      },
      {
        id: 'market_trend',
        label: '市场趋势',
        icon: '📈',
        keywords: ['trend', 'forecast', 'prediction', 'outlook', 'market analysis', 'future of'],
        estimatedSignals: 12,
        isRecommended: false,
      },
    ],
  },

  // 🎯 技能与学习
  skills_learning: {
    id: 'skills_learning',
    label: '技能与学习',
    icon: '🎯',
    topics: [
      {
        id: 'programming',
        label: '编程技能',
        icon: '⌨️',
        keywords: ['programming', 'coding', 'algorithm', 'code', 'debug', 'best practices', 'clean code'],
        estimatedSignals: 25,
        isRecommended: false,
      },
      {
        id: 'design',
        label: '设计能力',
        icon: '🎨',
        keywords: ['design', 'ui', 'ux', 'figma', 'sketch', 'prototype', 'user interface', 'user experience'],
        estimatedSignals: 20,
        isRecommended: false,
      },
      {
        id: 'productivity',
        label: '效率工具',
        icon: '⚡',
        keywords: ['productivity', 'tools', 'automation', 'workflow', 'notion', 'obsidian', 'roam research'],
        estimatedSignals: 22,
        isRecommended: false,
      },
      {
        id: 'learning',
        label: '学习方法',
        icon: '📚',
        keywords: ['learning', 'education', 'course', 'tutorial', 'how to learn', 'study tips', 'resources'],
        estimatedSignals: 18,
        isRecommended: false,
      },
    ],
  },

  // 💡 观点与讨论
  opinion_discussion: {
    id: 'opinion_discussion',
    label: '观点与讨论',
    icon: '💡',
    topics: [
      {
        id: 'hot_take',
        label: '热门观点',
        icon: '🔥',
        keywords: ['hot take', 'unpopular opinion', 'controversial', 'takes', 'thoughts on', 'my take'],
        estimatedSignals: 30,
        isRecommended: false,
      },
      {
        id: 'mental_model',
        label: '深度思考',
        icon: '🧠',
        keywords: ['mental model', 'framework', 'thesis', 'principle', 'philosophy', 'first principles'],
        estimatedSignals: 15,
        isRecommended: false,
      },
      {
        id: 'debate',
        label: '行业争议',
        icon: '⚔️',
        keywords: ['debate', 'argument', 'discussion', 'thoughts', 'what do you think', 'serious question'],
        estimatedSignals: 20,
        isRecommended: false,
      },
      {
        id: 'advice',
        label: '经验分享',
        icon: '💬',
        keywords: ['my take', 'lessons learned', 'advice', 'experience', 'things i learned', 'reflection'],
        estimatedSignals: 25,
        isRecommended: false,
      },
    ],
  },

  // 🌍 社会热点
  social_viral: {
    id: 'social_viral',
    label: '社会热点',
    icon: '🌍',
    topics: [
      {
        id: 'breaking_news',
        label: '突发新闻',
        icon: '📰',
        keywords: ['breaking', 'news', 'announcement', 'just in', 'exclusive', 'official'],
        estimatedSignals: 40,
        isRecommended: false,
      },
      {
        id: 'industry_event',
        label: '行业大事',
        icon: '⚡',
        keywords: ['layoff', 'acquisition', 'bankruptcy', 'scandal', 'crisis', 'shutdown', 'reorg'],
        estimatedSignals: 15,
        isRecommended: false,
      },
      {
        id: 'trending',
        label: '议题追踪',
        icon: '📈',
        keywords: ['timeline', 'update', 'developing', 'live', 'ongoing', 'situation'],
        estimatedSignals: 10,
        isRecommended: false,
      },
    ],
  },
};

/**
 * 默认配置：新用户默认选择的议题
 */
export const DEFAULT_TOPICS: string[] = ['ai_llm', 'funding', 'indie_hacker'];

/**
 * 最少选择数量
 */
export const MIN_TOPICS_REQUIRED = 2;

/**
 * 最多选择数量
 */
export const MAX_TOPICS_ALLOWED = 10;

/**
 * 估算每日信号数量
 */
export function estimateSignalCount(topicIds: string[]): number {
  let total = 0;

  for (const categoryId in TOPIC_CATEGORIES) {
    const category = TOPIC_CATEGORIES[categoryId];
    for (const topic of category.topics) {
      if (topicIds.includes(topic.id)) {
        total += topic.estimatedSignals;
      }
    }
  }

  return total;
}
