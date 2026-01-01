/**
 * 信号检测关键词库 - 热门议题版
 * 重构目标：发现用户时间线上最有价值的热门讨论
 */

export interface SignalKeywords {
  // 新版 - 热门议题
  tech: string[];
  industry: string[];
  opinion: string[];
  data: string[];
  discussion: string[];
  tutorial: string[];

  // 旧版 - 保留向后兼容
  demand?: string[];
  revenue?: string[];
  skill?: string[];
  trend?: string[];
  help?: string[];
  willPay?: string[];
}

export const SIGNAL_KEYWORDS: SignalKeywords = {
  // ============================================================
  // 新版 - 热门议题关键词
  // ============================================================

  /** 技术趋势 - 新技术、工具发布 */
  tech: [
    // 中文
    'ai', 'gpt', 'llm', '人工智能', '机器学习',
    'web3', 'blockchain', 'crypto', '区块链',
    'react', 'vue', 'angular', '前端', '后端',
    '发布', 'launch', 'released', 'beta', '公告',
    // 英文
    'artificial intelligence', 'machine learning', 'deep learning',
    'just launched', 'coming soon', 'announcement', 'new release',
    'open source', 'framework', 'library', 'tool',
    // 日文
    'ai', '新しい', '発表',
  ],

  /** 行业动态 - 创业、融资、招聘 */
  industry: [
    // 中文
    '创业', '融资', 'ipo', '收购', '投资',
    '招聘', '裁员', '远程工作', '福利',
    'startup', 'funding', 'series', 'round',
    // 英文
    'startup', 'funding', 'ipo', 'acquisition', 'investment',
    'layoff', 'hiring', 'remote work', 'job opening',
    'product hunt', 'launch', 'y combinator',
    // 日文
    'スタートアップ', '資金調達', '採用', '募集',
  ],

  /** 观点分享 - 独特见解和思考 */
  opinion: [
    // 中文
    '我的看法', '我认为', '观点',
    '框架', '思维模型', '经验',
    // 英文
    'my take', 'i think', 'in my opinion', 'imo',
    'hot take', 'unpopular opinion',
    'thesis', 'framework', 'mental model', 'lesson learned',
    // 日文
    '考え', '意見', 'フレームワーク',
  ],

  /** 数据分享 - 基于数据的观点 */
  data: [
    // 中文
    '数据显示', '根据', '统计', '研究',
    '分析', '增长', '指标', '%',
    // 英文
    'data shows', 'according to', 'statistics', 'research',
    'study', 'analysis', 'breakdown', 'metrics',
    '%', 'growth', 'revenue', 'kpi', 'roi',
    // 日文
    'データ', '統計', '分析', '結果',
  ],

  /** 讨论引发 - 引发互动的话题 */
  discussion: [
    // 中文
    '问题', '想法', '你怎么看',
    '真诚发问', '只有我吗',
    // 英文
    'question', 'thoughts', 'what do you think', 'wdyt',
    'serious question', 'honest question',
    'am i the only one', 'unpopular opinion',
    'discussion thread',
    // 日文
    '質問', '意見', 'どう思う',
  ],

  /** 教程分享 - 知识和经验分享 */
  tutorial: [
    // 中文
    '如何', '教程', '指南', '技巧',
    '学习', '解释', '深入',
    // 英文
    'how to', 'guide', 'tutorial', 'tips', 'tricks',
    'learn', 'explained', 'breakdown', 'deep dive',
    'step by step', 'walkthrough', 'cheat sheet',
    // 日文
    '方法', 'チュートリアル', 'ガイド',
  ],

  // ============================================================
  // 旧版 - 保留用于向后兼容
  // ============================================================
  demand: ['有没有', '求推荐', 'need', 'looking for'],
  revenue: ['收入', 'revenue', 'mrr', '赚'],
  skill: ['招聘', 'hiring', 'freelancer'],
  trend: ['trending', 'ai', '趋势'],
  help: ['求助', 'help', 'how to'],
  willPay: ['愿意付', 'will pay', '付费'],
};

/**
 * 推文类型检测关键词
 */
export const RETWEET_KEYWORDS = ['Retweeted', '转推'];
export const REPLY_KEYWORDS = ['Replying to', '回复'];
