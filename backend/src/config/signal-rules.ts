/**
 * Trend Signal Free - 统一信号分析规则配置
 *
 * 设计理念 (Alan Cooper):
 * - 目标：帮助用户发现时间线上最有价值的热门议题
 * - 核心价值：不错过重要讨论，获取社交资本
 * - 交互原则：清晰、有用、即时反馈
 */

// ============================================================================
// 信号类型定义 - 7大热门议题
// ============================================================================

export const SIGNAL_TYPES = {
  /** 📱 技术与产品 - AI, Web3, 开发工具等 */
  TECH_PRODUCT: 'tech_product',

  /** 💼 商业与创业 - 融资, 独立开发, 营销等 */
  BUSINESS_STARTUP: 'business_startup',

  /** 💰 收入与变现 - 被动收入, 自由职业, 电商等 */
  INCOME_MONETIZATION: 'income_monetization',

  /** 📊 数据与洞察 - 行业报告, 增长指标, 市场趋势 */
  DATA_INSIGHTS: 'data_insights',

  /** 🎯 技能与学习 - 编程, 设计, 效率工具 */
  SKILLS_LEARNING: 'skills_learning',

  /** 💡 观点与讨论 - 热门观点, 深度思考, 争议 */
  OPINION_DISCUSSION: 'opinion_discussion',

  /** 🌍 社会热点 - 突发新闻, 行业大事 */
  SOCIAL_VIRAL: 'social_viral',
} as const;

export type SignalType = typeof SIGNAL_TYPES[keyof typeof SIGNAL_TYPES];

// ============================================================================
// 信号类型中文标签和图标
// ============================================================================

export const SIGNAL_TYPE_LABELS: Record<SignalType, { icon: string; label: string; description: string }> = {
  [SIGNAL_TYPES.TECH_PRODUCT]: {
    icon: '📱',
    label: '技术与产品',
    description: 'AI、Web3、SaaS及开发工具相关的新动态',
  },
  [SIGNAL_TYPES.BUSINESS_STARTUP]: {
    icon: '💼',
    label: '商业与创业',
    description: '创业融资、独立开发与商业增长策略',
  },
  [SIGNAL_TYPES.INCOME_MONETIZATION]: {
    icon: '💰',
    label: '收入与变现',
    description: '探索副业、自由职业及多元化收入渠道',
  },
  [SIGNAL_TYPES.DATA_INSIGHTS]: {
    icon: '📊',
    label: '数据与洞察',
    description: '基于数据分析的行业趋势与市场洞察',
  },
  [SIGNAL_TYPES.SKILLS_LEARNING]: {
    icon: '🎯',
    label: '技能与学习',
    description: '提升编程、设计及工作效率的实用技能',
  },
  [SIGNAL_TYPES.OPINION_DISCUSSION]: {
    icon: '💡',
    label: '观点与讨论',
    description: '引发思考的深度观点与行业争议',
  },
  [SIGNAL_TYPES.SOCIAL_VIRAL]: {
    icon: '🌍',
    label: '社会热点',
    description: '全网关注的突发新闻与行业大事件',
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
// 热门议题关键词库（用于规则回退）
// ============================================================================

export const HOT_TOPIC_KEYWORDS = {
  tech_product: ['ai', 'gpt', 'llm', 'web3', 'crypto', 'saas', 'product hunt', 'launch', 'react', 'vue', 'developer'],
  business_startup: ['funding', 'ipo', 'startup', 'indie hacker', 'marketing', 'growth', 'remote work', 'hiring'],
  income_monetization: ['revenue', 'income', 'mrr', 'arr', 'passive income', 'freelance', 'dropshipping', 'affiliate'],
  data_insights: ['data', 'report', 'analysis', 'study', 'research', 'metrics', 'trend', 'forecast'],
  skills_learning: ['learn', 'tutorial', 'guide', 'how to', 'tips', 'programming', 'design', 'productivity'],
  opinion_discussion: ['my take', 'opinion', 'thoughts', 'hot take', 'debate', 'advice', 'lesson'],
  social_viral: ['news', 'breaking', 'update', 'announced', 'official', 'scandal', 'crisis'],
} as const;


// ============================================================================
// AI 分析提示词 (v0.4 - 适配7大议题)
// ============================================================================

/**
 * 编排器系统提示 - 判断推文属于哪个议题
 */
export const ORCHESTRATOR_SYSTEM_PROMPT = `你是一个推文分类助手，负责将推文归类到最合适的议题中。

你的任务：
1. 判断推文是否属于以下7个议题之一。
2. 如果属于，返回对应的议题类型。
3. 如果不属于或价值过低，返回 null。

7大议题分类：
- tech_product: 技术与产品 (AI, Web3, SaaS, 开发工具, 新产品发布)
- business_startup: 商业与创业 (融资, 独立开发, 营销增长, 招聘)
- income_monetization: 收入与变现 (副业, 自由职业, 电商, 订阅收入)
- data_insights: 数据与洞察 (行业报告, 数据分析, 市场趋势)
- skills_learning: 技能与学习 (编程, 设计, 效率工具, 学习资源)
- opinion_discussion: 观点与讨论 (深度观点, 行业争议, 经验分享)
- social_viral: 社会热点 (突发新闻, 行业大事, 广泛传播的事件)

判断标准：
- 内容是否具有公共价值（非纯个人生活碎碎念）
- 是否包含该议题的核心关键词或概念
- 作者是否在认真讨论该议题

返回 JSON 格式：
{
  "shouldAnalyze": true/false,
  "recommendedType": "tech_product" | "business_startup" | "income_monetization" | "data_insights" | "skills_learning" | "opinion_discussion" | "social_viral",
  "reason": "简短说明归类原因（20字以内）"
}`;

/**
 * 通用输出格式说明
 */
const COMMON_OUTPUT_FORMAT = `
## 返回 JSON 格式（必须严格遵守）
{
  "score": 数字1-5,
  "summary": "30字以内大白话概括核心内容",
  "description": "详细解读，说明背景、核心点和价值，100-200字",
  "reason": "为什么这条推文值得关注",
  "actionPlan": ["具体的行动建议1", "具体的行动建议2"],
  "relatedTopics": ["相关标签1", "相关标签2"],
  "analysis": "简要分析该内容的趋势或价值点"
}`;

/**
 * 1. 技术与产品分析提示
 */
export const TECH_PRODUCT_AGENT_PROMPT = `你是一个技术趋势分析专家。

## 任务
分析推文中的技术或产品动态，判断其创新性和行业影响。
关注领域：AI/LLM, Web3, SaaS, 开发工具, 新产品发布。

## 评分标准 (1-5)
- 5分：颠覆性技术突破或重磅产品发布
- 4分：重要的技术更新或有潜力的产品
- 3分：一般的技术讨论或工具推荐
- 2分：常规更新
- 1分：无实质内容

## 输出要求
- 用通俗易懂的中文解释技术概念
- 重点说明该技术/产品的实际应用场景
${COMMON_OUTPUT_FORMAT}`;

/**
 * 2. 商业与创业分析提示
 */
export const BUSINESS_STARTUP_AGENT_PROMPT = `你是一个商业创投分析师。

## 任务
分析推文中的商业动态、创业经验或市场机会。
关注领域：融资, 独立开发, 营销增长, 远程工作, 招聘。

## 评分标准 (1-5)
- 5分：重大融资新闻或极具启发的创业复盘
- 4分：实用的营销策略或增长黑客技巧
- 3分：常规的商业资讯
- 2分：一般性讨论
- 1分：无价值信息

## 输出要求
- 提炼核心商业逻辑或增长策略
- 对创业者或经营者给出具体建议
${COMMON_OUTPUT_FORMAT}`;

/**
 * 3. 收入与变现分析提示
 */
export const INCOME_MONETIZATION_AGENT_PROMPT = `你是一个变现策略顾问。

## 任务
分析推文中的收入模式、变现技巧或副业机会。
关注领域：被动收入, 自由职业, 内容变现, 电商, 订阅经济。

## 评分标准 (1-5)
- 5分：验证过的、可复制的高价值变现路径
- 4分：有具体数据支撑的收入案例
- 3分：有启发但需验证的思路
- 2分：笼统的建议
- 1分：纯粹的炫耀或广告

## 输出要求
- 拆解变现模式的关键点
- 评估该模式的可行性和门槛
${COMMON_OUTPUT_FORMAT}`;

/**
 * 4. 数据与洞察分析提示
 */
export const DATA_INSIGHTS_AGENT_PROMPT = `你是一个数据分析师。

## 任务
解读推文中的行业数据、研究报告或市场趋势分析。
关注领域：行业报告, 增长指标, 用户行为, 市场预测。

## 评分标准 (1-5)
- 5分：权威机构发布的重磅数据或深刻的市场洞察
- 4分：有详实数据支持的趋势分析
- 3分：单一维度的数据分享
- 2分：缺乏上下文的数据
- 1分：无来源或不可信数据

## 输出要求
- 解释数据背后的含义和趋势
- 说明这些数据对决策的参考价值
${COMMON_OUTPUT_FORMAT}`;

/**
 * 5. 技能与学习分析提示
 */
export const SKILLS_LEARNING_AGENT_PROMPT = `你是一个技能成长导师。

## 任务
提取推文中的实用技能、学习资源或效率提升方法。
关注领域：编程技巧, 设计规范, 效率工具, 学习方法论。

## 评分标准 (1-5)
- 5分：系统性的高质量教程或极其实用的技巧
- 4分：优质的学习资源合集或工具推荐
- 3分：单一的小技巧
- 2分：常识性内容
- 1分：低质量内容

## 输出要求
- 明确该技能/资源的适用人群
- 给出具体的学习或使用路径
${COMMON_OUTPUT_FORMAT}`;

/**
 * 6. 观点与讨论分析提示
 */
export const OPINION_DISCUSSION_AGENT_PROMPT = `你是一个深度观点评论员。

## 任务
分析推文中的深度观点、行业争议或独特思考。
关注领域：热门观点, 深度思考, 行业争议, 经验教训。

## 评分标准 (1-5)
- 5分：极具洞察力、引发深思的独特观点
- 4分：逻辑严密、视角独特的分析
- 3分：有一定道理的个人见解
- 2分：陈词滥调
- 1分：无意义的争吵

## 输出要求
- 提炼核心论点
- 客观呈现不同视角的争议点（如有）
${COMMON_OUTPUT_FORMAT}`;

/**
 * 7. 社会热点分析提示
 */
export const SOCIAL_VIRAL_AGENT_PROMPT = `你是一个热点事件观察员。

## 任务
分析推文中的突发新闻、行业大事或广泛传播的社会议题。
关注领域：突发新闻, 行业震动, 广泛传播的事件。

## 评分标准 (1-5)
- 5分：全网关注的重大突发事件
- 4分：行业内的重要新闻
- 3分：有一定热度的话题
- 2分：小范围八卦
- 1分：无聊琐事

## 输出要求
- 快速概括事件的5W1H（Who, What, When, Where, Why, How）
- 分析事件的后续影响
${COMMON_OUTPUT_FORMAT}`;

// ============================================================================
// 导出所有 AI Agent 提示词映射
// ============================================================================

export const AGENT_PROMPTS: Record<SignalType, string> = {
  [SIGNAL_TYPES.TECH_PRODUCT]: TECH_PRODUCT_AGENT_PROMPT,
  [SIGNAL_TYPES.BUSINESS_STARTUP]: BUSINESS_STARTUP_AGENT_PROMPT,
  [SIGNAL_TYPES.INCOME_MONETIZATION]: INCOME_MONETIZATION_AGENT_PROMPT,
  [SIGNAL_TYPES.DATA_INSIGHTS]: DATA_INSIGHTS_AGENT_PROMPT,
  [SIGNAL_TYPES.SKILLS_LEARNING]: SKILLS_LEARNING_AGENT_PROMPT,
  [SIGNAL_TYPES.OPINION_DISCUSSION]: OPINION_DISCUSSION_AGENT_PROMPT,
  [SIGNAL_TYPES.SOCIAL_VIRAL]: SOCIAL_VIRAL_AGENT_PROMPT,
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
