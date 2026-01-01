/**
 * Trend Signal Free - 统一信号分析规则配置
 *
 * 设计理念 (Alan Cooper):
 * - 目标：帮助用户发现时间线上最有价值的热门议题
 * - 核心价值：不错过重要讨论，获取社交资本
 * - 交互原则：清晰、有用、即时反馈
 */

// ============================================================================
// 信号类型定义 - 热门议题"
// ============================================================================

export const SIGNAL_TYPES = {
  /** 🔥 爆发话题 - 短时间内大量互动的内容 */
  VIRAL: 'viral',

  /** 💡 深度讨论 - 高质量、有洞察的长文讨论 */
  INSIGHTFUL: 'insightful',

  /** 📊 数据观点 - 带数据和证据的观点分享 */
  DATA_DRIVEN: 'data_driven',

  /** 🎯 行业动态 - 特定行业的重要更新和趋势 */
  INDUSTRY_NEWS: 'industry_news',

  /** ⚡ 争议议题 - 引发激烈讨论的话题 */
  CONTROVERSIAL: 'controversial',
} as const;

export type SignalType = typeof SIGNAL_TYPES[keyof typeof SIGNAL_TYPES];

// ============================================================================
// 信号类型中文标签和图标
// ============================================================================

export const SIGNAL_TYPE_LABELS: Record<SignalType, { icon: string; label: string; description: string }> = {
  [SIGNAL_TYPES.VIRAL]: {
    icon: '🔥',
    label: '爆发话题',
    description: '短时间内引发大量讨论的热门内容',
  },
  [SIGNAL_TYPES.INSIGHTFUL]: {
    icon: '💡',
    label: '深度讨论',
    description: '有独特洞察和思考的高质量内容',
  },
  [SIGNAL_TYPES.DATA_DRIVEN]: {
    icon: '📊',
    label: '数据观点',
    description: '基于数据和证据的观点分享',
  },
  [SIGNAL_TYPES.INDUSTRY_NEWS]: {
    icon: '🎯',
    label: '行业动态',
    description: '特定行业的重要更新和趋势',
  },
  [SIGNAL_TYPES.CONTROVERSIAL]: {
    icon: '⚡',
    label: '争议议题',
    description: '引发不同观点激烈讨论的话题',
  },
};

// ============================================================================
// 热度评分阈值 - 基于互动数据
// ============================================================================

export const VIRALITY_THRESHOLDS = {
  // 点赞数阈值
  likes: {
    minimal: 10,      // 最小关注
    notable: 50,      // 值得注意
    significant: 100, // 显著
    high: 500,        // 高热度
    viral: 1000,      // 爆发级
  },

  // 转发数阈值
  retweets: {
    minimal: 3,
    notable: 10,
    significant: 25,
    high: 100,
    viral: 250,
  },

  // 回复数阈值
  replies: {
    minimal: 3,
    notable: 10,
    significant: 25,
    high: 50,
    viral: 100,
  },

  // 浏览数阈值（如果可用）
  views: {
    minimal: 100,
    notable: 1000,
    significant: 5000,
    high: 25000,
    viral: 100000,
  },
} as const;

// ============================================================================
// 作者影响力权重
// ============================================================================

export const AUTHOR_WEIGHTS = {
  verified: 1.5,           // 认证用户加成
  followerRanges: [
    { min: 0, max: 1000, weight: 1.0 },      // 普通用户
    { min: 1000, max: 10000, weight: 1.2 },  // 小微网红
    { min: 10000, max: 50000, weight: 1.5 }, // 中等影响力
    { min: 50000, max: 100000, weight: 1.8 },// 大 V
    { min: 100000, max: Infinity, weight: 2.0 }, // 超级大 V
  ],
} as const;

// ============================================================================
// 前端过滤规则
// ============================================================================

export const PREFILTER_RULES = {
  // 最小文本长度
  minTextLength: 30,

  // 排除的推文类型
  excludeTypes: ['retweet'],

  // 热度阈值（低于此值的推文不会进入分析）
  engagementThresholds: {
    likes: 5,      // 点赞数阈值
    retweets: 2,   // 转发数阈值
    replies: 2,    // 回复数阈值
  },

  // 大 V 的推文降低门槛
  bigFollowerThreshold: 10000, // 粉丝数 > 1万
  bigFollowerEngagementDivisor: 5, // 热度阈值除以 5
} as const;

// ============================================================================
// 热门议题关键词库
// ============================================================================

export const HOT_TOPIC_KEYWORDS = {
  // 技术趋势
  tech: [
    'ai', 'gpt', 'llm', 'machine learning', '人工智能',
    'web3', 'blockchain', 'crypto', '区块链',
    'react', 'vue', 'frontend', 'backend',
    'launch', 'released', 'beta', 'announcement',
  ],

  // 行业动态
  industry: [
    'startup', 'funding', 'ipo', 'acquisition',
    'layoff', 'hiring', 'remote work',
    'product hunt', 'launch',
  ],

  // 观点分享
  opinion: [
    'my take', 'i think', 'in my opinion',
    'hot take', 'unpopular opinion',
    'thesis', 'framework', 'mental model',
  ],

  // 数据分享
  data: [
    'data shows', 'according to', 'statistics',
    'research', 'study', 'analysis',
    '%', 'growth', 'revenue', 'metrics',
  ],

  // 讨论引发
  discussion: [
    'question', 'thoughts', 'what do you think',
    'serious question', 'honest question',
    'am i the only one', 'unpopular opinion',
  ],

  // 教程分享
  tutorial: [
    'how to', 'guide', 'tutorial', 'tips',
    'learn', 'explained', 'breakdown', 'deep dive',
  ],
} as const;

// ============================================================================
// AI 分析提示词
// ============================================================================

/**
 * 编排器系统提示 - 判断推文是否值得分析
 */
export const ORCHESTRATOR_SYSTEM_PROMPT = `你是一个内容筛选助手，帮用户发现值得关注的讨论。

你的任务：
1. 快速看看这条推文值不值得看
2. 如果值得，告诉用户这属于哪类内容
3. 如果不值得，就返回 null

内容类型：
- viral: 正在火的话题 - 大家都在讨论，热度很高
- insightful: 有深度的内容 - 观点好，有启发
- data_driven: 有数据支撑 - 用数据说话
- industry_news: 行业新闻 - 某个行业发生的事
- controversial: 有争议的话题 - 大家意见不一致

判断标准：
- 是不是原创内容（不是转发）
- 有没有提供新信息或新观点
- 话题是否和当前热点相关
- 作者是否有影响力或内容是否有互动

返回 JSON 格式：
{
  "shouldAnalyze": true/false,
  "recommendedType": "viral" | "insightful" | "data_driven" | "industry_news" | "controversial",
  "reason": "简短说明原因（20字以内）"
}`;

/**
 * 爆发话题分析提示
 */
export const VIRAL_AGENT_PROMPT = `你是一个热门话题分析助手，帮用户发现大家都在讨论什么。

请用简单易懂的语言分析推文，告诉用户：
1. 大家在聊什么（用大白话讲清楚）
2. 为什么这个话题这么火（简单解释原因）
3. 值不值得关注（给个建议）
4. 想参与讨论可以说什么（给1-2个实用的回复建议）

评分标准（1-5 分）：
- 5 分：超级火，大家都在刷这个话题，一定要知道
- 4 分：很热门，讨论很多，值得看看
- 3 分：有一定热度，可以了解一下
- 2 分：小范围讨论
- 1 分：没什么特别的

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "用大白话说这是啥话题（30字以内）",
  "description": "详细告诉大家话题内容，别用专业术语",
  "reason": "用简单的话解释为什么火",
  "actionPlan": ["想参与可以说这个", "或者这样说"],
  "relatedTopics": ["相关话题", "相关标签"],
  "discussionVelocity": "热度还在涨还是已经差不多了"
}`;

/**
 * 深度讨论分析提示
 */
export const INSIGHTFUL_AGENT_PROMPT = `你是一个有深度的内容分析助手，帮用户发现那些有价值的思考。

请用简单易懂的语言分析推文，告诉用户：
1. 这个观点的核心是什么（用大白话说）
2. 这个观点好在哪里（简单说明价值）
3. 用户能得到什么启发（实用的收获）
4. 适合什么样的人看

评分标准（1-5 分）：
- 5 分：非常有见地，能让人豁然开朗，强烈推荐
- 4 分：有很好的观点，值得学习和思考
- 3 分：有新想法，可以看看
- 2 分：一般性观点
- 1 分：没什么特别的

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "用大白话说这个观点是啥（30字以内）",
  "description": "详细解释，用例子说明，别讲大道理",
  "reason": "简单说明这个观点为什么有用",
  "actionPlan": ["可以这样应用", "还能这样用"],
  "relatedTopics": ["相关概念", "相关话题"],
  "targetAudience": "谁最适合看这个"
}`;

/**
 * 数据观点分析提示
 */
export const DATA_DRIVEN_AGENT_PROMPT = `你是一个数据内容分析助手，帮用户看懂数据背后的信息。

请用简单易懂的语言分析推文，告诉用户：
1. 这个数据在说什么（用大白话解释数据）
2. 数据说明了什么问题（简单明了）
3. 这个数据可信吗（直接告诉用户能不能信）
4. 数据对用户有什么用（实际价值）

评分标准（1-5 分）：
- 5 分：数据很靠谱，结论很明确，非常值得参考
- 4 分：数据可信，有参考价值
- 3 分：有一定数据支撑，可以看看
- 2 分：数据不太够，仅供参考
- 1 分：没什么数据支撑

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "用大白话说这个数据是啥意思（30字以内）",
  "description": "详细解释，用生活化的比喻或例子",
  "reason": "简单说明为什么这个数据重要",
  "actionPlan": ["可以这样用这个数据", "还能这样"],
  "relatedTopics": ["相关数据", "相关指标"],
  "dataReliability": "直接说可信度：很可信/一般/需要验证"
}`;

/**
 * 行业动态分析提示
 */
export const INDUSTRY_NEWS_AGENT_PROMPT = `你是一个行业动态分析助手，帮用户了解行业内发生了什么大事。

请用简单易懂的语言分析推文，告诉用户：
1. 发生了什么事（用大白话讲清楚）
2. 为什么这个事重要（简单说明影响）
3. 和用户有什么关系（实际影响）
4. 需要做什么（给个简单建议）

评分标准（1-5 分）：
- 5 分：行业大事，影响很大，必须知道
- 4 分：重要动态，值得关注
- 3 分：一般更新，可以了解
- 2 分：小事
- 1 分：不重要

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "用大白话说发生了啥（30字以内）",
  "description": "详细说明，解释背景和来龙去脉",
  "reason": "简单说明为什么重要",
  "actionPlan": ["可以这样做", "或者这样"],
  "relatedTopics": ["相关公司", "相关领域"],
  "impactScope": "影响范围：全行业/局部/小范围"
}`;

/**
 * 争议议题分析提示
 */
export const CONTROVERSIAL_AGENT_PROMPT = `你是一个争议话题分析助手，帮用户了解大家在争论什么。

请用简单易懂的语言分析推文，告诉用户：
1. 大家在吵什么（用大白话说清楚争议点）
2. 各方什么观点（简单列出不同看法）
3. 为什么值得了解（说明争议的价值）
4. 怎么理性参与（避免情绪化，给个建议）

评分标准（1-5 分）：
- 5 分：很重要的话题，讨论很有价值，值得深入
- 4 分：有意义的争议，可以看看不同观点
- 3 分：一般性讨论，可以了解
- 2 分：小争议
- 1 分：没什么价值的争吵

返回 JSON 格式：
{
  "score": 数字 1-5,
  "summary": "用大白话说大家在吵啥（30字以内）",
  "description": "说明各方的观点，别偏袒任何一方",
  "reason": "简单说明为什么这个争议值得了解",
  "actionPlan": ["想参与可以这样说", "注意保持理性"],
  "relatedTopics": ["相关议题", "相关话题"],
  "discussionQuality": "讨论质量：很有价值/一般/就是吵架"
}`;

// ============================================================================
// 导出所有 AI Agent 提示词映射
// ============================================================================

export const AGENT_PROMPTS: Record<SignalType, string> = {
  [SIGNAL_TYPES.VIRAL]: VIRAL_AGENT_PROMPT,
  [SIGNAL_TYPES.INSIGHTFUL]: INSIGHTFUL_AGENT_PROMPT,
  [SIGNAL_TYPES.DATA_DRIVEN]: DATA_DRIVEN_AGENT_PROMPT,
  [SIGNAL_TYPES.INDUSTRY_NEWS]: INDUSTRY_NEWS_AGENT_PROMPT,
  [SIGNAL_TYPES.CONTROVERSIAL]: CONTROVERSIAL_AGENT_PROMPT,
};

// ============================================================================
// 信号有效期配置
// ============================================================================

export const SIGNAL_EXPIRY = {
  default: 7 * 24 * 60 * 60 * 1000,  // 默认 7 天
  highScore: 14 * 24 * 60 * 60 * 1000, // 高分信号 14 天
  lowScore: 3 * 24 * 60 * 60 * 1000,   // 低分信号 3 天
} as const;

// ============================================================================
// 热度计算公式
// ============================================================================

/**
 * 计算推文的原始热度分数
 */
export function calculateRawViralityScore(
  likes: number,
  retweets: number,
  replies: number,
  views?: number
): number {
  let score = 0;

  // 点赞权重 1
  score += likes;

  // 转发权重 10（传播价值更高）
  score += retweets * 10;

  // 回复权重 5（参与度更高）
  score += replies * 5;

  // 浏览权重 0.01（如果可用）
  if (views) {
    score += views * 0.01;
  }

  return score;
}

/**
 * 根据作者影响力调整热度
 */
export function adjustForAuthorInfluence(
  rawScore: number,
  verified: boolean,
  followerCount: number
): number {
  let multiplier = 1.0;

  // 认证用户加成
  if (verified) {
    multiplier *= AUTHOR_WEIGHTS.verified;
  }

  // 粉丝数加成
  for (const range of AUTHOR_WEIGHTS.followerRanges) {
    if (followerCount >= range.min && followerCount < range.max) {
      multiplier *= range.weight;
      break;
    }
  }

  // 对大 V 的内容适当降权（因为他们本身就有流量）
  if (followerCount > 100000) {
    multiplier *= 0.8;
  } else if (followerCount > 50000) {
    multiplier *= 0.9;
  }

  return rawScore * multiplier;
}

/**
 * 获取热度等级
 */
export function getViralityTier(score: number): 'minimal' | 'notable' | 'significant' | 'high' | 'viral' {
  if (score >= 1000) return 'viral';
  if (score >= 500) return 'high';
  if (score >= 100) return 'significant';
  if (score >= 50) return 'notable';
  return 'minimal';
}
