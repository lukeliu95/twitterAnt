/**
 * 信号检测关键词库（多语言）
 */

export interface SignalKeywords {
  demand: string[];
  revenue: string[];
  skill: string[];
  trend: string[];
  help: string[];
  willPay: string[];
}

export const SIGNAL_KEYWORDS: SignalKeywords = {
  // 需求缺口 - 人们在寻找解决方案
  demand: [
    // 中文
    '有没有', '求推荐', '需要', '在找', '有人知道', '谁有', '求助',
    '求工具', '求软件', '想找', '找不到', '有人能', '哪里有',
    // 英文
    'looking for', 'anyone know', 'recommend', 'need', 'searching for',
    'does anyone', 'looking for recommendations', 'need a tool', 'want',
    'looking for a', 'is there a', 'cant find', 'any recommendations',
    // 日文
    '探している', '誰か知っている', 'おすすめ', '必要', '見つからない',
  ],
  // 收入验证 - 人们分享收入和商业模式
  revenue: [
    // 中文
    '月收入', '副业', '赚了', '营收', '收入', '变现', '盈利',
    '达到了', '$', 'usd', '突破', '里程碑', '刚刚收到', '付款',
    // 英文
    'mrr', 'arr', 'revenue', 'income', 'made $', 'earning',
    'profit', 'monetize', 'just got paid', 'hit $', 'generated',
    'first customer', 'first sale', 'launch revenue',
    // 日文
    '売上', '収益', '稼', '月収', 'もうけ', '利益',
  ],
  // 技能需求 - 人们对特定技能的需求
  skill: [
    // 中文
    '招聘', '招人', '找工程师', '找开发', '需要会', '求合作',
    '外包', 'freelancer', '兼职', '项目',
    // 英文
    'hiring', 'looking for developer', 'need someone who',
    'freelancer', 'contractor', 'remote work', 'job opening',
    'we need', 'seeking', 'join our team',
    // 日文
    '募集', '求人', 'フリーランス', '案件',
  ],
  // 趋势机会 - 新兴技术和趋势
  trend: [
    // 中文
    'ai', '人工智能', 'gpt', 'chatgpt', 'web3', 'crypto', 'nft',
    '新趋势', '风口', '刚发布', 'beta', '即将推出', '趋势',
    // 英文
    'ai', 'artificial intelligence', 'gpt', 'llm', 'web3',
    'blockchain', 'crypto', 'trending', 'just launched',
    'coming soon', 'new trend', 'emerging', 'growing',
    // 日文
    'トレンド', 'ai', '新しい',
  ],
  // 求助 - 人们需要帮助
  help: [
    // 中文
    '求助', '怎么做', '怎么弄', '有人会', '如何', '怎么',
    // 英文
    'help', 'how to', 'how do i', 'anyone can', 'need help with',
    // 日文
    '助けて', 'どうやって', '方法',
  ],
  // 愿意付费 - 明确的付费意愿
  willPay: [
    // 中文
    '愿意付', '付费', '预算', '找外包', '有偿',
    // 英文
    'will pay', 'paying for', 'budget', 'hiring', 'paid gig',
    // 日文
    '有料', '払う', '依頼', 'お金を出しても',
  ],
};

/**
 * 推文类型检测关键词
 */
export const RETWEET_KEYWORDS = ['Retweeted', '转推'];
export const REPLY_KEYWORDS = ['Replying to', '回复'];
